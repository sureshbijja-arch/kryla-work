import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Lazy singleton — defers URL check to call time so builds don't fail with blank env vars.
let _client: SupabaseClient | null = null

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_client) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!url || !key) throw new Error('Missing Supabase env vars')
      _client = createClient(url, key, {
        auth: { persistSession: false },
        global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
      })
    }
    return (_client as any)[prop]
  },
})
