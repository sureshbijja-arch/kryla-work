/**
 * middleware.ts — Kryla subdomain router
 *
 * Reads the subdomain from the incoming request host and rewrites
 * it to the internal /[slug] route so Next.js can render the
 * member's profile page.
 *
 * priya.kryla.work  →  kryla.work/[slug]  (internal rewrite)
 * kryla.work        →  served normally
 * kryla.work/v1     →  served normally
 */

import { NextRequest, NextResponse } from "next/server"

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "kryla.work"

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? ""
  const url  = req.nextUrl.clone()

  // Strip port for local dev (e.g. localhost:3000)
  const hostname = host.split(":")[0]

  // Not a subdomain — let through
  if (hostname === APP_DOMAIN || hostname === "www." + APP_DOMAIN || hostname === "localhost") {
    return NextResponse.next()
  }

  // Extract slug: priya.kryla.work → "priya"
  const slug = hostname.replace(`.${APP_DOMAIN}`, "")

  if (!slug || slug === hostname) {
    return NextResponse.next()
  }

  // Rewrite /  →  /priya  (preserves path segments after /)
  url.pathname = `/${slug}${url.pathname === "/" ? "" : url.pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  // Run on every route except Next.js internals and static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
