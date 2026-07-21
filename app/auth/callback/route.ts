import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Handles both the login OTP link and the email-change confirmation link —
// Supabase routes both through this same code-exchange flow. When it's an
// email change, auth.getUser() after the exchange reflects the *new*
// address; providers.email (the app's separate ownership key — see
// api/mychat/*/route.ts's email-based ownership checks) must be kept in
// sync or the member would be locked out of their own page post-change.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient()
    const { data } = await supabase.auth.exchangeCodeForSession(code)
    const newEmail = data.user?.email

    if (newEmail) {
      // Sync any provider row whose stored email no longer matches this
      // user's current auth email but whose user id we can't directly
      // join on (providers has no auth FK). We instead key off the
      // pending-change request written at request time — see
      // api/mychat/email-change/route.ts, which stashes the intended new
      // email alongside the provider id before calling updateUser().
      const { data: pending } = await supabaseAdmin
        .from('providers')
        .select('id, email')
        .eq('pending_email', newEmail)
        .maybeSingle()

      if (pending) {
        await supabaseAdmin
          .from('providers')
          .update({ email: newEmail, pending_email: null })
          .eq('id', pending.id)
      }
    }
  }

  return NextResponse.redirect(`${origin}/mykryla`)
}
