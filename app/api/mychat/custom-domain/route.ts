import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getPlanGate } from '@/lib/plans'
import { toSlug, validateSlug, RESERVED_SLUGS } from '@/lib/slug'

async function assertOwner(providerId: string, userEmail: string) {
  const { data } = await supabaseAdmin
    .from('providers')
    .select('id')
    .eq('id', providerId)
    .eq('email', userEmail)
    .maybeSingle()
  return !!data
}

/** Turns any user input into a bare vanity label, or null if invalid. */
function normalizeLabel(raw: string): string | null {
  // Strip protocol + www
  let cleaned = raw.trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
  // Cut at the first dot so "krityabijja.com" → "krityabijja"
  const dotIndex = cleaned.indexOf('.')
  if (dotIndex !== -1) cleaned = cleaned.slice(0, dotIndex)
  // Remove non-alphanumeric via toSlug
  return toSlug(cleaned) || null
}

async function isLabelAvailable(label: string, excludeProviderId?: string): Promise<boolean> {
  // Must not collide with any slug
  const { data: slugMatch } = await supabaseAdmin
    .from('providers')
    .select('id')
    .eq('slug', label)
    .maybeSingle()
  if (slugMatch && slugMatch.id !== excludeProviderId) return false

  // Must not collide with any other custom_domain
  const { data: domainMatch } = await supabaseAdmin
    .from('providers')
    .select('id')
    .eq('custom_domain', label)
    .maybeSingle()
  if (domainMatch && domainMatch.id !== excludeProviderId) return false

  return true
}

// GET — availability check (used for live debounced feedback in the card)
export async function GET(req: NextRequest) {
  const label = req.nextUrl.searchParams.get('label') ?? ''
  const providerId = req.nextUrl.searchParams.get('providerId') ?? undefined

  const normalized = normalizeLabel(label)
  if (!normalized) return NextResponse.json({ available: false, error: 'Invalid name' })

  const validationError = validateSlug(normalized)
  if (validationError) return NextResponse.json({ available: false, error: validationError })

  if (RESERVED_SLUGS.has(normalized)) return NextResponse.json({ available: false, error: 'That name is reserved' })

  const available = await isLabelAvailable(normalized, providerId)
  return NextResponse.json({ available, label: normalized })
}

// POST — save vanity label
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId, domain: rawLabel } = body

  if (!providerId || !rawLabel) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const ok = await assertOwner(providerId, user.email)
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Enforce plan gate — custom_domain feature_key must be on the member's plan
  const { data: prov } = await supabaseAdmin.from('providers').select('plan').eq('id', providerId).single()
  const gate = await getPlanGate()
  if (!gate.allows('custom_domain', prov?.plan ?? 'grow'))
    return NextResponse.json({ error: 'Custom links are available on the Thrive plan and above' }, { status: 403 })

  const label = normalizeLabel(rawLabel)
  if (!label) return NextResponse.json({ error: 'Invalid name — use letters and numbers only' }, { status: 400 })

  const validationError = validateSlug(label)
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

  if (RESERVED_SLUGS.has(label)) return NextResponse.json({ error: 'That name is reserved' }, { status: 400 })

  const available = await isLabelAvailable(label, providerId)
  if (!available) return NextResponse.json({ error: 'That name is already taken — try another' }, { status: 409 })

  const { error } = await supabaseAdmin
    .from('providers')
    .update({ custom_domain: label })
    .eq('id', providerId)

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'That name is already taken — try another' }, { status: 409 })
    console.error('[custom-domain] update error:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, domain: label })
}

// DELETE — remove vanity label
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId } = body
  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const ok = await assertOwner(providerId, user.email)
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await supabaseAdmin
    .from('providers')
    .update({ custom_domain: null })
    .eq('id', providerId)

  return NextResponse.json({ ok: true })
}
