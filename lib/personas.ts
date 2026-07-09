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

// ── Types ────────────────────────────────────────────────────────────────────

export interface PersonaRow {
  id:           string
  label:        string
  emoji:        string
  enabled:      boolean
  sort_order:   number
  template:     string
  palette:      string
  font:         string
  needs_config: boolean
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
export const getPersonas = cache(async (): Promise<PersonaRow[]> => {
  const { data, error } = await supabaseAdmin
    .from('personas')
    .select('id, label, emoji, enabled, sort_order, template, palette, font, needs_config')
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
    .select('id, label, emoji, enabled, sort_order, template, palette, font, needs_config')
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
export async function fetchPersonaDefaults(
  id: string
): Promise<{ template: string; palette: string; font: string }> {
  const { data } = await supabaseAdmin
    .from('personas')
    .select('template, palette, font')
    .eq('id', id)
    .maybeSingle()

  if (data) return { template: data.template, palette: data.palette, font: data.font }

  // Fall back to 'other' row
  const { data: fallback } = await supabaseAdmin
    .from('personas')
    .select('template, palette, font')
    .eq('id', 'other')
    .maybeSingle()

  return {
    template: fallback?.template ?? 'focus',
    palette:  fallback?.palette  ?? 'professional',
    font:     fallback?.font     ?? 'inter',
  }
}
