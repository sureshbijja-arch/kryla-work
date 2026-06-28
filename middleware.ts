import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'kryla.work'

export async function middleware(req: NextRequest) {
  const host     = req.headers.get('host') ?? ''
  const url      = req.nextUrl.clone()
  const hostname = host.split(':')[0]

  // Not a subdomain — serve normally, but protect /my-space
  if (
    hostname === APP_DOMAIN ||
    hostname === 'www.' + APP_DOMAIN ||
    hostname === 'localhost'
  ) {
    if (url.pathname.startsWith('/my-space')) {
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

  // Extract slug from subdomain: priya.kryla.work → "priya"
  const slug = hostname.replace(`.${APP_DOMAIN}`, '')

  if (!slug || slug === hostname) {
    return NextResponse.next()
  }

  url.pathname = `/${slug}${url.pathname === '/' ? '' : url.pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
