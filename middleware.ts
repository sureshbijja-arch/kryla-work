import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || ''
  const url = req.nextUrl.clone()

  const hostname = host.split(':')[0]
  const baseDomain = 'kryla.work'

  const isSubdomain =
    hostname.endsWith(`.${baseDomain}`) &&
    hostname !== `www.${baseDomain}`

  if (isSubdomain) {
    const slug = hostname.replace(`.${baseDomain}`, '')
    url.pathname = `/${slug}${url.pathname}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
