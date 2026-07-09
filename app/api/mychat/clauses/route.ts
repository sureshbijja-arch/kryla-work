/**
 * /api/mychat/clauses — clause library CRUD.
 *
 * GET  ?providerId=&persona=   → system + member clauses
 * POST { providerId, title, body, category?, tags? }  → save member clause
 * DELETE { providerId, clauseId }  → delete member clause
 */

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getAllVerticals } from '@/config/verticals'
import { NextResponse }  from 'next/server'

const VALID_PERSONAS = new Set(getAllVerticals().map(v => v.id))

const COLS = 'id, provider_id, persona, category, title, body, tags, is_system, created_at'

async function getAuthedProvider(providerId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id')
    .eq('id', providerId)
    .eq('email', user.email)
    .single()
  return provider
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  const persona    = searchParams.get('persona') ?? 'advocate'

  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })
  if (!VALID_PERSONAS.has(persona)) return NextResponse.json({ error: 'Invalid persona' }, { status: 400 })

  const provider = await getAuthedProvider(providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Two separate typed queries — no string interpolation into PostgREST filter syntax
  const [systemRes, memberRes] = await Promise.all([
    supabaseAdmin
      .from('clause_library')
      .select(COLS)
      .eq('persona', persona)
      .eq('is_system', true)
      .order('category', { ascending: true })
      .order('title',    { ascending: true }),

    supabaseAdmin
      .from('clause_library')
      .select(COLS)
      .eq('provider_id', providerId)
      .eq('is_system', false)
      .order('created_at', { ascending: false }),
  ])

  if (systemRes.error) return NextResponse.json({ error: systemRes.error.message }, { status: 500 })
  if (memberRes.error) return NextResponse.json({ error: memberRes.error.message }, { status: 500 })

  const clauses = [...(memberRes.data ?? []), ...(systemRes.data ?? [])]
  return NextResponse.json({ clauses })
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const body = await req.json()
  const { providerId, title, clauseBody, category, tags, persona } = body as {
    providerId:  string
    title:       string
    clauseBody:  string
    category?:   string
    tags?:       string[]
    persona?:    string
  }

  if (!providerId || !title || !clauseBody) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const provider = await getAuthedProvider(providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('clause_library')
    .insert({
      provider_id: providerId,
      persona:     persona ?? 'advocate',
      category:    category ?? 'member',
      title:       title.trim(),
      body:        clauseBody.trim(),
      tags:        tags ?? [],
      is_system:   false,
    })
    .select(COLS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ clause: data })
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(req: Request) {
  const body = await req.json()
  const { providerId, clauseId } = body as { providerId: string; clauseId: string }

  if (!providerId || !clauseId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const provider = await getAuthedProvider(providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only allow deleting own clauses (not system clauses)
  const { error } = await supabaseAdmin
    .from('clause_library')
    .delete()
    .eq('id',          clauseId)
    .eq('provider_id', providerId)
    .eq('is_system',   false)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
