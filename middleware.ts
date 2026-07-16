import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'kryla.work'

export async function middleware(req: NextRequest) {
  const host     = req.headers.get('host') ?? ''
  const url      = req.nextUrl.clone()
  const hostname = host.split(':')[0]

  // Known app domains — serve normally, but protect /mychat and /{slug}/mychat
  if (
    hostname === APP_DOMAIN ||
    hostname === 'www.' + APP_DOMAIN ||
    hostname === 'localhost'
  ) {
    if (url.pathname.startsWith('/mychat') || url.pathname.startsWith('/print') || /^\/[^/]+\/mychat(\/|$)/.test(url.pathname)) {
      let response = NextResponse.next({ request: { headers: req.headers } })

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return req.cookies.get(name)?.value
            },
            set(name: string, value: string, options: CookieOptions) {
              req.cookies.set(name, value)
              response = NextResponse.next({ request: { headers: req.headers } })
              response.cookies.set(name, value, options)
            },
            remove(name: string, options: CookieOptions) {
              req.cookies.set(name, '')
              response = NextResponse.next({ request: { headers: req.headers } })
              response.cookies.set(name, '', options)
            },
          },
        }
      )

      const { data: { user } } = await supabase.auth.getUser()

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
