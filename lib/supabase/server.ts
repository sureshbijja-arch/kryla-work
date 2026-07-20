import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies, headers } from "next/headers"

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "kryla.work"

export function createClient() {
  const cookieStore = cookies()
  const host = headers().get("host")?.split(":")[0] ?? ""
  const cookieDomain = host.endsWith(APP_DOMAIN) ? `.${APP_DOMAIN}` : undefined

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { domain: cookieDomain },
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        // Server Components get a read-only cookies() store — writing throws
        // "Cookies can only be modified in a Server Action or Route Handler."
        // auth-js calls set/remove internally when refreshing or clearing a
        // session (e.g. after an invalid refresh token), from inside an
        // async promise chain; an uncaught throw there becomes an unhandled
        // rejection and crashes the whole serverless process instead of
        // hitting app/error.tsx. Swallow it — middleware.ts is the one place
        // that can actually persist a refreshed session for this app.
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
