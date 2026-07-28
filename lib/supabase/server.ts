import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies, headers } from "next/headers"

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "kryla.work"

function cookieDomain() {
  const host = headers().get("host")?.split(":")[0] ?? ""
  return host.endsWith(APP_DOMAIN) ? `.${APP_DOMAIN}` : undefined
}

// For Server Components (page.tsx/layout.tsx rendering) ONLY. Next's
// cookies() store is genuinely read-only during Server Component rendering —
// writing throws "Cookies can only be modified in a Server Action or Route
// Handler." auth-js calls set/remove internally when refreshing or clearing
// a session (e.g. after an invalid refresh token), from inside an async
// promise chain; an uncaught throw there becomes an unhandled rejection and
// crashes the whole serverless process instead of hitting app/error.tsx.
// Swallow it — middleware.ts is the one place that can actually persist a
// refreshed session for this app. A refreshed/cleared session is silently
// NOT persisted when called from here — that's expected and fine for a
// Server Component, which only reads auth state, never establishes it.
export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { domain: cookieDomain() },
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          try { cookieStore.set({ name, value, ...options }) } catch { /* read-only context — see comment above */ }
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore.set({ name, value: "", ...options }) } catch { /* read-only context — see comment above */ }
        },
      },
    }
  )
}

// For Route Handlers (app/api/**/route.ts, app/**/route.ts) ONLY. Unlike
// Server Components, cookies() IS writable for the full lifetime of a Route
// Handler request (Next.js sets an isAppRoute AsyncLocalStorage flag around
// the whole awaited handler invocation, which propagates through nested
// async calls — including auth-js's internal token-refresh cookie writes
// triggered from inside supabase.auth.getUser()/verifyOtp()/
// exchangeCodeForSession()). Writing for real here — instead of the
// swallow-on-error above — is what lets a refreshed session actually reach
// the browser via this response's Set-Cookie headers; silently dropping it
// (the old shared-factory behavior) caused every subsequent request to see
// a stale/expired access token, cascading into repeated 401s.
export function createRouteClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { domain: cookieDomain() },
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options })
        },
      },
    }
  )
}
