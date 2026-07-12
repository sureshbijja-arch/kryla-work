/**
 * GET /api/mychat/clinical-templates?providerId=&persona=physio
 *
 * Returns system-seeded + member-owned clinical document templates
 * for the Working Studio report picker.
 */

import { createClient }   from '@/lib/supabase/server'
import { supabaseAdmin }  from '@/lib/supabase/admin'
import { getAllVerticals } from '@/config/verticals'
import { NextResponse }   from 'next/server'

const VALID_PERSONAS = new Set(getAllVerticals().map(v => v.id))

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  const persona    = searchParams.get('persona') ?? 'physio'

  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })
  if (!VALID_PERSONAS.has(persona)) return NextResponse.json({ error: 'Invalid persona' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id')
    .eq('id', providerId)
    .eq('email', user.email)
    .single()
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const COLS = 'id, doc_type, label, description, fields, body_scaffold, is_system, provider_id'

  const [systemRes, memberRes] = await Promise.all([
    supabaseAdmin
      .from('clinical_doc_templates')
      .select(COLS)
      .eq('persona', persona)
      .eq('is_system', true)
      .order('label', { ascending: true }),

    supabaseAdmin
      .from('clinical_doc_templates')
      .select(COLS)
      .eq('provider_id', providerId)
      .eq('is_system', false)
      .order('label', { ascending: true }),
  ])

  if (systemRes.error) return NextResponse.json({ error: systemRes.error.message }, { status: 500 })
  if (memberRes.error) return NextResponse.json({ error: memberRes.error.message }, { status: 500 })

  const templates = [...(systemRes.data ?? []), ...(memberRes.data ?? [])]
  return NextResponse.json({ templates })
}
