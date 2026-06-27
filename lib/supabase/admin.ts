import { createClient } from "@supabase/supabase-js"

/**
 * Service-role client — bypasses RLS.
 * Never import this in client components or expose to the browser.
 * Only used inside API routes and Inngest jobs.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
