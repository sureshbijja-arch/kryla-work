import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { deleteStorageFolder } from '@/lib/storage'

const ADMIN_EMAILS = (process.env.ADMIN_EMAIL ?? '').split(',').map(e => e.trim()).filter(Boolean)

async function assertAdmin(): Promise<{ email: string } | NextResponse> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ADMIN_EMAILS.includes(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return { email: user.email }
}

// PATCH { page_live?: boolean, suspended?: boolean, referral_code?: string,
// referred_by?: string } — the two kill-switches (page resolves only when
// page_live=true AND suspended=false — see middleware.ts findLiveSlug /
// app/[slug]/page.tsx findProvider) plus the two invite/referral codes.
// referral_code is the member's own shareable code (globally unique — see
// app/api/mychat/referral-code/route.ts, the member-side equivalent);
// referred_by is the code they signed up with (not unique).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await assertAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await req.json() as Record<string, unknown>

  // Booleans: the two kill-switches (unchanged behavior).
  const patch: Record<string, unknown> = Object.fromEntries(
    Object.entries(body).filter(([k, v]) => ['page_live', 'suspended'].includes(k) && typeof v === 'boolean')
  )

  // Codes: 5-char [A-Z0-9], normalized; empty clears to null. Same rules as
  // the member-side ReferTab (app/api/mychat/referral-code/route.ts).
  for (const field of ['referral_code', 'referred_by'] as const) {
    if (typeof body[field] === 'string') {
      const clean = (body[field] as string).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)
      if (clean === '') {
        patch[field] = null
      } else if (/^[A-Z0-9]{5}$/.test(clean)) {
        patch[field] = clean
      } else {
        return NextResponse.json({ error: 'Code must be exactly 5 letters or numbers' }, { status: 400 })
      }
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('providers')
    .update(patch)
    .eq('id', params.id)
    .select('id, slug, first_name, last_name, email, plan, page_live, suspended, referral_code, referred_by, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'That code is already taken — try another' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ member: data })
}

// DELETE body: { slug: string } — slug must match the provider being deleted,
// a server-side confirmation so a stray call can't wipe the wrong row.
// Permanently removes the provider and every linked table via cascade
// (bookings, reviews, documents, WhatsApp history, etc.) — no undo.
// onboarding_answers and website_copy_requests aren't cascade-configured on
// this FK, so their rows are deleted explicitly first. The provider's
// profile-media storage folder is purged too (see deleteStorageFolder call
// below) — Storage has no FK cascade of its own.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await assertAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({})) as { slug?: string }

  const { data: provider, error: fetchError } = await supabaseAdmin
    .from('providers')
    .select('id, slug')
    .eq('id', params.id)
    .single()

  if (fetchError || !provider) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (body.slug !== provider.slug) {
    return NextResponse.json({ error: 'Slug confirmation does not match' }, { status: 400 })
  }

  await supabaseAdmin.from('onboarding_answers').delete().eq('provider_id', params.id)
  await supabaseAdmin.from('website_copy_requests').delete().eq('provider_id', params.id)

  // Storage has no FK cascade — the provider's avatar/gallery/service/menu/
  // imported files must be purged explicitly, or they're stranded forever
  // (and untraceable, since the DB rows that referenced them are about to
  // be gone too). Best-effort: never blocks the row delete below.
  await deleteStorageFolder(`${params.id}/`)

  const { error } = await supabaseAdmin.from('providers').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
