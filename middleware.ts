import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'kryla.work'

export async function middleware(req: NextRequest) {
  const host     = req.headers.get('host') ?? ''
  const url      = req.nextUrl.clone()
  const hostname = host.split(':')[0]

  // Known app domains — serve normally, but protect /my-space and /{slug}/mychat
  if (
    hostname === APP_DOMAIN ||
    hostname === 'www.' + APP_DOMAIN ||
    hostname === 'localhost'
  ) {
    if (url.pathname.startsWith('/my-space') || /^\/[^/]+\/mychat(\/|$)/.test(url.pathname)) {
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

    // API routes and Next.js internals must not get the slug prefix
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/_next')) {
      return NextResponse.next()
    }

    // Don't double-prefix
    if (url.pathname === `/${slug}` || url.pathname.startsWith(`/${slug}/`)) {
      return NextResponse.next()
    }

    url.pathname = `/${slug}${url.pathname === '/' ? '' : url.pathname}`
    return NextResponse.rewrite(url)
  }

  // Custom domain (e.g. priya.com) — look up provider by custom_domain
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/_next')) {
    return NextResponse.next()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (supabaseUrl && serviceKey) {
    try {
      const lookupRes = await fetch(
        `${supabaseUrl}/rest/v1/providers?custom_domain=eq.${encodeURIComponent(hostname)}&select=slug&limit=1`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
          cache: 'no-store',
        }
      )
      if (lookupRes.ok) {
        const rows = await lookupRes.json() as Array<{ slug: string }>
        if (rows[0]?.slug) {
          const targetSlug = rows[0].slug
          url.pathname = `/${targetSlug}${url.pathname === '/' ? '' : url.pathname}`
          return NextResponse.rewrite(url)
        }
      }
    } catch {
      // fail open — serve normally
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
