/**
 * GET /api/mychat/studio/config?persona=<id>
 *
 * Returns the studio config for a persona: archetype + ordered modes + vocab.
 * Used by PractitionerStudio on mount to load the correct form schema and mode list.
 *
 * No auth required (static configuration data, not provider-specific).
 * Returns null archetype (204) when the persona has no studio_archetype configured.
 */

import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse }  from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const personaId = searchParams.get('persona')

  if (!personaId) return NextResponse.json({ error: 'Missing persona' }, { status: 400 })

  // Load persona row
  const { data: persona, error: pErr } = await supabaseAdmin
    .from('personas')
    .select('id, label, studio_archetype, studio_guidance, studio_config')
    .eq('id', personaId)
    .single()

  if (pErr || !persona) return NextResponse.json({ error: 'Persona not found' }, { status: 404 })
  if (!persona.studio_archetype) return NextResponse.json({ archetype: null, modes: [] })

  // Load archetype
  const { data: archetype, error: aErr } = await supabaseAdmin
    .from('studio_archetypes')
    .select('id, label, disclaimer, has_library, library_label, feature_key')
    .eq('id', persona.studio_archetype)
    .eq('active', true)
    .single()

  if (aErr || !archetype) return NextResponse.json({ error: 'Archetype not found' }, { status: 404 })

  // Load modes
  const { data: modes } = await supabaseAdmin
    .from('studio_modes')
    .select('id, archetype_id, key, label, sort_order, form_schema, prompt_instructions, output_format, streaming')
    .eq('archetype_id', persona.studio_archetype)
    .eq('active', true)
    .order('sort_order', { ascending: true })

  const cfg = (persona.studio_config ?? {}) as Record<string, unknown>

  return NextResponse.json({
    archetype,
    modes:             modes ?? [],
    patient_noun:      cfg.patient_noun      ?? 'client',
    patient_noun_plural: cfg.patient_noun_plural ?? 'clients',
    library_label:     cfg.library_label     ?? archetype.library_label,
    library_categories: cfg.library_categories ?? [],
  })
}
