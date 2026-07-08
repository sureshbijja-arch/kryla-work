/**
 * GET /api/mychat/draft-templates?providerId=&persona=
 *
 * Returns system-seeded + member-owned draft templates for the Studio picker.
 */

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse }  from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  const persona    = searchParams.get('persona') ?? 'advocate'

  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  // Auth
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Ownership
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id')
    .eq('id', providerId)
    .eq('email', user.email)
    .single()
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // Fetch system templates for this persona + member's own templates
  const { data, error } = await supabaseAdmin
    .from('draft_templates')
    .select('id, doc_type, label, description, fields, body_scaffold, is_system, provider_id')
    .or(`and(persona.eq.${persona},is_system.eq.true),provider_id.eq.${providerId}`)
    .order('is_system', { ascending: false })
    .order('label', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data ?? [] })
}
