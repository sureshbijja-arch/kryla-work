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
