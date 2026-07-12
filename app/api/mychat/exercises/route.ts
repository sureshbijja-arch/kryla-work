/**
 * /api/mychat/exercises
 *
 * CRUD for exercise library (system + member exercises).
 * Gated to the physio persona.
 *
 * GET    ?providerId=&category=  → list system + member exercises
 * POST   { providerId, category, name, description, instructions, default_sets, default_reps, default_hold, default_duration, tags }  → save custom exercise
 * DELETE ?providerId=&id=  → delete a member's own exercise (not system)
 */

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse }  from 'next/server'

async function getPhysioProvider(providerId: string, email: string) {
  const { data } = await supabaseAdmin
    .from('providers')
    .select('id, email, persona')
    .eq('id', providerId)
    .eq('email', email)
    .single()
  if (!data || data.persona !== 'physio') return null
  return data
}

const COLS = 'id, provider_id, persona, category, name, description, instructions, default_sets, default_reps, default_hold, default_duration, media_url, is_system, tags, created_at'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  const category   = searchParams.get('category')

  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const provider = await getPhysioProvider(providerId, user.email)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  let systemQuery = supabaseAdmin
    .from('exercise_library')
    .select(COLS)
    .eq('persona', 'physio')
    .eq('is_system', true)
    .order('name', { ascending: true })

  let memberQuery = supabaseAdmin
    .from('exercise_library')
    .select(COLS)
    .eq('provider_id', providerId)
    .eq('is_system', false)
    .order('name', { ascending: true })

  if (category) {
    systemQuery = systemQuery.eq('category', category)
    memberQuery = memberQuery.eq('category', category)
  }

  const [sysRes, memRes] = await Promise.all([systemQuery, memberQuery])
  if (sysRes.error) return NextResponse.json({ error: sysRes.error.message }, { status: 500 })
  if (memRes.error) return NextResponse.json({ error: memRes.error.message }, { status: 500 })

  return NextResponse.json({ exercises: [...(sysRes.data ?? []), ...(memRes.data ?? [])] })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId, category, name, description, instructions, default_sets, default_reps, default_hold, default_duration, tags } = body

  if (!providerId || !category || !name) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const provider = await getPhysioProvider(providerId, user.email)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('exercise_library')
    .insert({
      provider_id:      providerId,
      persona:          'physio',
      category,
      name,
      description:      description ?? '',
      instructions:     instructions ?? '',
      default_sets:     default_sets ?? 3,
      default_reps:     default_reps ?? null,
      default_hold:     default_hold ?? null,
      default_duration: default_duration ?? null,
      tags:             tags ?? [],
      is_system:        false,
    })
    .select(COLS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ exercise: data })
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  const id         = searchParams.get('id')

  if (!providerId || !id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const provider = await getPhysioProvider(providerId, user.email)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // Only allow deleting member's own exercises (not system)
  const { error } = await supabaseAdmin
    .from('exercise_library')
    .delete()
    .eq('id', id)
    .eq('provider_id', providerId)
    .eq('is_system', false)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
