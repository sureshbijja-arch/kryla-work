import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Email is both the login identity AND the app's ownership key (every
// api/mychat/* route checks provider.email === session user.email — see
// e.g. api/mychat/profile/route.ts:22). Until now there was no edit path
// at all: a typo at onboarding meant permanent lockout. This route starts
// a Supabase Auth email change (which sends its own confirmation email —
// no custom email-sending needed here) and stashes the intended new
// address on the provider row so app/auth/callback/route.ts can sync
// providers.email once the change is actually confirmed.
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { providerId?: string; newEmail?: string }
  const { providerId, newEmail } = body
  if (!providerId || !newEmail) return NextResponse.json({ error: 'Missing providerId or newEmail' }, { status: 400 })

  const trimmed = newEmail.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
  }
  if (trimmed === user.email.toLowerCase()) {
    return NextResponse.json({ error: 'That is already your current email' }, { status: 400 })
  }

  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, email')
    .eq('id', providerId)
    .maybeSingle()

  if (!provider || provider.email !== user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Stash the intended address so the auth callback can find this provider
  // row and sync it once Supabase confirms the change.
  const { error: stashError } = await supabaseAdmin
    .from('providers')
    .update({ pending_email: trimmed })
    .eq('id', providerId)
  if (stashError) return NextResponse.json({ error: stashError.message }, { status: 500 })

  // Triggers Supabase's own confirmation email flow (typically to both the
  // old and new address, depending on project auth settings) — the actual
  // providers.email update only happens once that's confirmed, via the
  // auth callback route.
  const { error: authError } = await supabase.auth.updateUser({ email: trimmed })
  if (authError) {
    // Roll back the stash so a failed request doesn't leave a stale pending value.
    await supabaseAdmin.from('providers').update({ pending_email: null }).eq('id', providerId)
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, pendingEmail: trimmed })
}
