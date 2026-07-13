/**
 * /api/mychat/studio/templates
 *
 * CRUD for studio_templates (report type templates per persona).
 * Replaces /api/mychat/clinical-templates.
 *
 * GET    ?providerId=&[persona=]  → list system + provider templates
 * POST   { providerId, persona, doc_type, label, description, fields } → create provider template
 * DELETE ?providerId=&id=  → delete provider template (system templates cannot be deleted)
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

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  const persona    = searchParams.get('persona')

  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const provider = await getStudioProvider(providerId, user.email)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const targetPersona = persona ?? provider.persona

  // System templates for this persona + provider's own custom templates
  const { data, error } = await supabaseAdmin
    .from('studio_templates')
    .select('id, persona, doc_type, label, description, fields, body_scaffold, is_system, provider_id, created_at')
    .eq('persona', targetPersona)
    .or(`is_system.eq.true,provider_id.eq.${providerId}`)
    .order('is_system', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data ?? [] })
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId, persona, doc_type, label, description, fields, body_scaffold } = body

  if (!providerId || !doc_type || !label) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const provider = await getStudioProvider(providerId, user.email)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('studio_templates')
    .insert({
      persona:       persona ?? provider.persona,
      doc_type,
      label,
      description:   description ?? '',
      fields:        fields ?? [],
      body_scaffold: body_scaffold ?? null,
      is_system:     false,
      provider_id:   providerId,
    })
    .select('id, persona, doc_type, label, description, fields, body_scaffold, is_system, provider_id, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
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

  // Cannot delete system templates
  const { data: existing } = await supabaseAdmin
    .from('studio_templates')
    .select('id, is_system, provider_id')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.is_system) return NextResponse.json({ error: 'System templates cannot be deleted.' }, { status: 403 })
  if (existing.provider_id !== providerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { error } = await supabaseAdmin
    .from('studio_templates')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
