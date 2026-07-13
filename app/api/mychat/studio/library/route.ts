/**
 * /api/mychat/studio/library
 *
 * CRUD for studio_library (exercises, interventions, remedies, care tasks — per persona).
 * Replaces /api/mychat/exercises.
 *
 * GET    ?providerId=&[persona=]&[category=]&[q=]  → search/list library items
 * POST   { providerId, persona?, category, name, description, instructions, meta, tags } → create
 * PATCH  { providerId, id, ...fields }  → update provider item
 * DELETE ?providerId=&id=  → delete provider item (system items cannot be deleted)
 */

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse }  from 'next/server'

async function getStudioProvider(providerId: string, email: string) {
  const { data } = await supabaseAdmin
    .from('providers')
    .select('id, email, persona')
    .eq('id', providerId)
    .eq('email', email)
    .single()
  return data ?? null
}

const COLS = 'id, persona, category, name, description, instructions, meta, media_url, tags, is_system, provider_id, created_at'

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  const persona    = searchParams.get('persona')
  const category   = searchParams.get('category')
  const q          = searchParams.get('q')

  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const provider = await getStudioProvider(providerId, user.email)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const targetPersona = persona ?? provider.persona

  let query = supabaseAdmin
    .from('studio_library')
    .select(COLS)
    .eq('persona', targetPersona)
    .or(`is_system.eq.true,provider_id.eq.${providerId}`)
    .order('is_system', { ascending: false })
    .order('name', { ascending: true })

  if (category) query = query.eq('category', category)
  if (q)        query = query.ilike('name', `%${q}%`)

  const { data, error } = await query.limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId, persona, category, name, description, instructions, meta, media_url, tags } = body

  if (!providerId || !category || !name) {
    return NextResponse.json({ error: 'Missing required fields (category, name)' }, { status: 400 })
  }

  const provider = await getStudioProvider(providerId, user.email)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('studio_library')
    .insert({
      persona:      persona ?? provider.persona,
      category,
      name,
      description:  description ?? '',
      instructions: instructions ?? '',
      meta:         meta ?? {},
      media_url:    media_url ?? null,
      tags:         tags ?? [],
      is_system:    false,
      provider_id:  providerId,
    })
    .select(COLS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId, id, ...rest } = body

  if (!providerId || !id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const provider = await getStudioProvider(providerId, user.email)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // Verify ownership — cannot edit system items
  const { data: existing } = await supabaseAdmin
    .from('studio_library')
    .select('id, is_system, provider_id')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.is_system) return NextResponse.json({ error: 'System library items cannot be edited.' }, { status: 403 })
  if (existing.provider_id !== providerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('studio_library')
    .update(rest)
    .eq('id', id)
    .select(COLS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  const id         = searchParams.get('id')

  if (!providerId || !id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const provider = await getStudioProvider(providerId, user.email)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { data: existing } = await supabaseAdmin
    .from('studio_library')
    .select('id, is_system, provider_id')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.is_system) return NextResponse.json({ error: 'System library items cannot be deleted.' }, { status: 403 })
  if (existing.provider_id !== providerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { error } = await supabaseAdmin
    .from('studio_library')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
