/**
 * lib/personas.ts — DB-backed persona catalog loader (server-only).
 *
 * The personas table owns the catalog: which personas exist, whether they're
 * enabled, their display label/emoji, ordering, and visual defaults
 * (template/palette/font). Rich behavioral config (onboarding questions,
 * AI guidance prompts) stays in config/verticals/index.ts, keyed by persona id.
 *
 * This file MUST only be imported in server components, API routes, or server
 * actions. Do NOT import from 'use client' components — pass data as props.
 */

import { cache } from 'react'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { PaletteTokens } from '@/lib/layouts'
import { parseOrderConfig, DEFAULT_ORDER_CONFIG } from '@/lib/orderConfig'
import type { OrderConfig } from '@/lib/orderConfig'
export type { OrderConfig, FulfillmentOption, CustomOrderConfig } from '@/lib/orderConfig'
export { parseOrderConfig } from '@/lib/orderConfig'

// ── Types ────────────────────────────────────────────────────────────────────

export interface PersonaRow {
  id:               string
  label:            string
  emoji:            string
  enabled:          boolean
  sort_order:       number
  template:         string
  palette:          string
  font:             string
  needs_config:     boolean
  /** Archetype for the Practitioner Studio ('rehab'|'counseling'|'holistic'|'careplan'). Null = no studio. */
  studio_archetype: string | null
  /** Persona-level prompt layer merged over the archetype base_guidance. */
  studio_guidance:  string | null
  /** Vocab/config: {patient_noun, patient_noun_plural, library_label, library_categories} */
  studio_config:    Record<string, unknown>
}

// ── Studio types ──────────────────────────────────────────────────────────────

export interface StudioArchetype {
  id:            string
  label:         string
  base_guidance: string
  disclaimer:    string
  has_library:   boolean
  library_label: string
  feature_key:   string
}

export interface StudioMode {
  id:                   string
  archetype_id:         string
  key:                  string
  label:                string
  sort_order:           number
  form_schema:          FormField[]
  prompt_instructions:  string
  output_format:        'html' | 'json' | 'redline'
  streaming:            boolean
}

export interface FormField {
  id:          string
  label:       string
  type:        'text' | 'textarea' | 'select' | 'library'
  placeholder: string
  required:    boolean
  group:       string
  rows?:       number
  options?:    { value: string; label: string }[]
}

/** Minimal shape passed as props to client components (serializable). */
export interface PersonaDef {
  id:    string
  label: string
  emoji: string
}

// ── Loaders ─────────────────────────────────────────────────────────────────

/**
 * All personas (including disabled), ordered by sort_order.
 * Wrapped in React cache() for per-request deduplication in server components.
 */
const PERSONA_SELECT = 'id, label, emoji, enabled, sort_order, template, palette, font, needs_config, studio_archetype, studio_guidance, studio_config'

export const getPersonas = cache(async (): Promise<PersonaRow[]> => {
  const { data, error } = await supabaseAdmin
    .from('personas')
    .select(PERSONA_SELECT)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[personas] getPersonas failed:', error.message)
    return []
  }
  return (data ?? []) as PersonaRow[]
})

/**
 * Only enabled personas, ordered by sort_order.
 * Use this for onboarding grid and landing page.
 */
export const getEnabledPersonas = cache(async (): Promise<PersonaRow[]> => {
  const { data, error } = await supabaseAdmin
    .from('personas')
    .select(PERSONA_SELECT)
    .eq('enabled', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[personas] getEnabledPersonas failed:', error.message)
    return []
  }
  return (data ?? []) as PersonaRow[]
})

/**
 * Fetch a single persona's visual defaults from the DB.
 * Falls back to 'other' values if the id is not found.
 * Safe to call from Inngest / non-React contexts (no React cache dependency).
 */
export interface PersonaDefaults {
  template: string
  palette: string
  font: string
  defaultGallery: string[]
  /** Per-persona curated color identity (see palette_tokens on layout_presets/pages). Null = use the flat ACCENT enum. */
  paletteTokens: PaletteTokens | null
  signatureColor: string | null
  /** Ganesh-only override example: full CSS font-family stack, not a bare family name. Null = use the shared [data-mode] default. */
  displayFont: string | null
  bodyFont: string | null
  /** Ganesh-only override: literal CSS length values (e.g. '2px'). Null = use the shared [data-mode] default. */
  radiusCard: string | null
  radiusBtn: string | null
  /** Ganesh v3-only override: curated page background/surface/border, for
   * personas whose ground color is specific enough that the flat
   * PAGE_BG[palette] enum fallback (e.g. PAGE_BG.warm '#FFF7ED') isn't close
   * enough. Null = use that fallback, same as every other persona. */
  pageBg: string | null
  surface: string | null
  borderColor: string | null
}

const PERSONA_DEFAULTS_SELECT = 'template, palette, font, default_gallery, palette_tokens, signature_color, display_font, body_font, radius_card, radius_btn, page_bg, surface, border_color'

export async function fetchPersonaDefaults(id: string): Promise<PersonaDefaults> {
  const { data } = await supabaseAdmin
    .from('personas')
    .select(PERSONA_DEFAULTS_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (data) {
    return {
      template: data.template,
      palette: data.palette,
      font: data.font,
      defaultGallery: Array.isArray(data.default_gallery) ? data.default_gallery : [],
      paletteTokens: (data.palette_tokens as unknown as PaletteTokens | null) ?? null,
      signatureColor: data.signature_color ?? null,
      displayFont: data.display_font ?? null,
      bodyFont: data.body_font ?? null,
      radiusCard: data.radius_card ?? null,
      radiusBtn: data.radius_btn ?? null,
      pageBg: data.page_bg ?? null,
      surface: data.surface ?? null,
      borderColor: data.border_color ?? null,
    }
  }

  // Fall back to 'other' row
  const { data: fallback } = await supabaseAdmin
    .from('personas')
    .select(PERSONA_DEFAULTS_SELECT)
    .eq('id', 'other')
    .maybeSingle()

  return {
    template: fallback?.template ?? 'focus',
    palette:  fallback?.palette  ?? 'professional',
    font:     fallback?.font     ?? 'inter',
    defaultGallery: Array.isArray(fallback?.default_gallery) ? fallback.default_gallery : [],
    paletteTokens: (fallback?.palette_tokens as unknown as PaletteTokens | null) ?? null,
    signatureColor: fallback?.signature_color ?? null,
    displayFont: fallback?.display_font ?? null,
    bodyFont: fallback?.body_font ?? null,
    radiusCard: fallback?.radius_card ?? null,
    radiusBtn: fallback?.radius_btn ?? null,
    pageBg: fallback?.page_bg ?? null,
    surface: fallback?.surface ?? null,
    borderColor: fallback?.border_color ?? null,
  }
}

/**
 * Load the studio archetype + modes for a given archetype id.
 * Returns null if the archetype doesn't exist in DB.
 */
export async function getStudioArchetype(
  archetypeId: string
): Promise<(StudioArchetype & { modes: StudioMode[] }) | null> {
  const [archetypeRes, modesRes] = await Promise.all([
    supabaseAdmin
      .from('studio_archetypes')
      .select('id, label, base_guidance, disclaimer, has_library, library_label, feature_key')
      .eq('id', archetypeId)
      .eq('active', true)
      .single(),
    supabaseAdmin
      .from('studio_modes')
      .select('id, archetype_id, key, label, sort_order, form_schema, prompt_instructions, output_format, streaming')
      .eq('archetype_id', archetypeId)
      .eq('active', true)
      .order('sort_order', { ascending: true }),
  ])

  if (archetypeRes.error || !archetypeRes.data) return null
  return {
    ...(archetypeRes.data as StudioArchetype),
    modes: (modesRes.data ?? []) as StudioMode[],
  }
}

// ── Order-form config (occasions, fulfillment, custom-order vocabulary) ────────
//
// Types + parseOrderConfig() live in lib/orderConfig.ts (pure, no Supabase/
// react import, so it's directly unit-testable and safe to import from
// 'use client' components). This is just the DB fetch wrapper.

/**
 * Fetch + validate one persona's order-form vocabulary. Safe to call from
 * both the live page and the preview route — always returns a usable
 * config, defaulting to today's bakery copy for any unseeded persona.
 */
export async function getOrderConfig(personaId: string): Promise<OrderConfig> {
  const { data } = await supabaseAdmin
    .from('personas')
    .select('order_config')
    .eq('id', personaId)
    .maybeSingle()

  return parseOrderConfig(data?.order_config) ?? DEFAULT_ORDER_CONFIG
}

/**
 * Load a single persona's full studio config: persona row + archetype + modes.
 * Returns null if this persona has no studio_archetype configured.
 */
export async function getPersonaStudioConfig(personaId: string): Promise<{
  persona: PersonaRow
  archetype: StudioArchetype
  modes:     StudioMode[]
} | null> {
  const { data: p, error } = await supabaseAdmin
    .from('personas')
    .select(PERSONA_SELECT)
    .eq('id', personaId)
    .single()

  if (error || !p || !p.studio_archetype) return null

  const persona = p as PersonaRow
  const archetypeData = await getStudioArchetype(persona.studio_archetype!)
  if (!archetypeData) return null

  const { modes, ...archetype } = archetypeData
  return { persona, archetype, modes }
}
