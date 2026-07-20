import { createBrowserClient } from "@supabase/ssr"

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "kryla.work"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        domain: window.location.hostname.endsWith(APP_DOMAIN) ? `.${APP_DOMAIN}` : undefined,
      },
    }
  )
}
