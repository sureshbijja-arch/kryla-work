import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { RESERVED_SLUGS, validateSlug } from '@/lib/slug'

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'kryla.work'

// Top-level app routes that are NOT member slugs — never redirect these,
// even though some (e.g. 'onboarding') aren't in RESERVED_SLUGS (that set is
// for slug-picking at signup, this one is for routing).
const APP_ROUTES = new Set([
  ...RESERVED_SLUGS,
  'mykryla', 'mychat', 'print', 'consent', 'welcome', 'get-app',
  'onboarding', 'login', 'join', 'directory', 'auth',
])

async function findLiveSlug(firstSegment: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
      .from('providers')
      .select('slug')
      .or(`slug.eq.${firstSegment},custom_domain.eq.${firstSegment}`)
      .eq('page_live', true)
      .eq('suspended', false)
      .maybeSingle()
    return (data?.slug as string | undefined) ?? null
  } catch (err) {
    // DB unreachable — fail open so a transient outage never 500s every
    // apex-path request; the path just falls through to normal app routing.
    console.error('middleware findLiveSlug failed, failing open:', err)
    return null
  }
}

export async function middleware(req: NextRequest) {
  const host     = req.headers.get('host') ?? ''
  const url      = req.nextUrl.clone()
  const hostname = host.split(':')[0]

  // Known app domains — serve normally, but protect /mychat, /mykryla,
  // /{slug}/mychat, and /{slug}/mykryla
  if (
    hostname === APP_DOMAIN ||
    hostname === 'www.' + APP_DOMAIN ||
    hostname === 'localhost'
  ) {
    const segments = url.pathname.split('/').filter(Boolean)
    const firstSegment = segments[0]

    if (
      firstSegment &&
      !APP_ROUTES.has(firstSegment) &&
      !url.pathname.startsWith('/api') &&
      validateSlug(firstSegment) === null
    ) {
      const liveSlug = await findLiveSlug(firstSegment)
      if (liveSlug) {
        const rest = '/' + segments.slice(1).join('/')
        const redirectUrl = new URL(
          `https://${liveSlug}.${APP_DOMAIN}${rest === '/' ? '' : rest}${url.search}`
        )
        return NextResponse.redirect(redirectUrl, 308)
      }
    }

    // /admin has its own client-side OTP screen (app/admin/AdminLayoutClient.tsx)
    // and does its own session check with the browser Supabase client — it is
    // deliberately NOT included below. Running a SECOND getUser()/refresh in
    // this middleware on every admin navigation raced the browser's own
    // refresh against the same single-use refresh token: whichever side lost
    // got "Invalid Refresh Token: Already Used" and had its session wiped,
    // bouncing the admin panel back to the OTP screen on every tab click.
    if (
      url.pathname.startsWith('/mychat') ||
      url.pathname.startsWith('/mykryla') ||
      url.pathname.startsWith('/print') ||
      /^\/[^/]+\/(mychat|mykryla)(\/|$)/.test(url.pathname)
    ) {
      // Build the response ONCE — never rebuild it inside set/remove, or
      // chunked refresh cookies (sb-<ref>-auth-token.0/.1) get dropped and
      // the next request's getUser() sees a partial/broken session, 401s.
      const response = NextResponse.next({ request: { headers: req.headers } })
      const cookieDomain = hostname.endsWith(APP_DOMAIN) ? `.${APP_DOMAIN}` : undefined

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookieOptions: { domain: cookieDomain },
          cookies: {
            get(name: string) {
              return req.cookies.get(name)?.value
            },
            set(name: string, value: string, options: CookieOptions) {
              req.cookies.set({ name, value, ...options })
              response.cookies.set({ name, value, ...options })
            },
            remove(name: string, options: CookieOptions) {
              req.cookies.set({ name, value: '', ...options })
              response.cookies.set({ name, value: '', ...options })
            },
          },
        }
      )

      const { data: { user } } = await supabase.auth.getUser()

      // Every path in this block (/mychat, /mykryla, /print) is member-auth-
      // gated and /login is the correct destination when unauthenticated.
      if (!user) {
        url.pathname = '/login'
        return NextResponse.redirect(url)
      }

      return response
    }

    return NextResponse.next()
  }

  // Subdomain of kryla.work (e.g. priya.kryla.work) — rewrite to /{slug}/...
  if (hostname.endsWith('.' + APP_DOMAIN)) {
    const slug = hostname.replace('.' + APP_DOMAIN, '')

    if (!slug) return NextResponse.next()

    // API routes, Next.js internals, public static files, and PWA assets
    // must not get the slug prefix injected
    if (
      url.pathname.startsWith('/api') ||
      url.pathname.startsWith('/_next') ||
      url.pathname.startsWith('/images/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname.startsWith('/get-app') ||
      url.pathname === '/sw.js' ||
      url.pathname === '/sw-register.js'
    ) {
      return NextResponse.next()
    }

    // Don't double-prefix
    if (url.pathname === `/${slug}` || url.pathname.startsWith(`/${slug}/`)) {
      return NextResponse.next()
    }

    url.pathname = `/${slug}${url.pathname === '/' ? '' : url.pathname}`
    return NextResponse.rewrite(url)
  }

  // Unknown hostname — serve normally (no external custom-domain routing)
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
