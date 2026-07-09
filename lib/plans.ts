/**
 * lib/plans.ts — DB-backed plan loader (server-only).
 *
 * All plan/feature data lives in the `plans` and `plan_features` Supabase tables,
 * managed at /admin/plans. Call getPlans() in server components/routes to read.
 * Call getPlanGate() to derive feature gating from the same data.
 *
 * This file MUST only be imported in server components, API routes, or server actions.
 * Do NOT import from 'use client' components — pass data as props instead.
 */

import { cache } from 'react'
import { supabaseAdmin } from '@/lib/supabase/admin'

// ── Types ───────────────────────────────────────────────────────────────────

export type PlanId = 'grow' | 'thrive' | 'elevate'

export interface PlanFeature {
  label:       string
  description: string | null
  key:         string | null
}

export interface PlanDef {
  id:          string
  name:        string
  emoji:       string
  tagline:     string
  usaPrice:    string | null   // null when isQuote = true
  indiaPrice:  string | null
  isQuote:     boolean         // true = "Contact for quote", no price shown
  popular:     boolean
  sortOrder:   number
  features:    PlanFeature[]
}

export interface PlanGate {
  /** Ordered plan IDs from cheapest to most expensive. */
  order: string[]
  /**
   * Returns true if `plan` has access to the feature identified by `featureKey`.
   * A plan has access when its sort_order >= the minimum sort_order of the plan
   * that first introduces that feature_key.
   */
  allows(featureKey: string, plan: string | null | undefined): boolean
}

// ── DB row types ─────────────────────────────────────────────────────────────

interface PlanRow {
  id:          string
  name:        string
  emoji:       string
  tagline:     string
  usa_price:   string | null
  india_price: string | null
  is_quote:    boolean
  popular:     boolean
  sort_order:  number
}

interface FeatureRow {
  plan_id:     string
  label:       string
  description: string | null
  feature_key: string | null
  sort_order:  number
  persona?:    string | null
}

// ── Loader ───────────────────────────────────────────────────────────────────

/**
 * Fetches all active plans + features from Supabase, ordered by sort_order.
 * Wrapped in React cache() for per-request deduplication in server components.
 */
export const getPlans = cache(async (): Promise<PlanDef[]> => {
  const [plansRes, featuresRes] = await Promise.all([
    supabaseAdmin
      .from('plans')
      .select('id, name, emoji, tagline, usa_price, india_price, is_quote, popular, sort_order')
      .eq('active', true)
      .order('sort_order', { ascending: true }),
    supabaseAdmin
      .from('plan_features')
      .select('plan_id, label, description, feature_key, sort_order')
      .is('persona', null)
      .order('sort_order', { ascending: true }),
  ])

  const planRows    = (plansRes.data   ?? []) as PlanRow[]
  const featureRows = (featuresRes.data ?? []) as FeatureRow[]

  // Group features by plan_id
  const featuresByPlan = new Map<string, PlanFeature[]>()
  for (const f of featureRows) {
    if (!featuresByPlan.has(f.plan_id)) featuresByPlan.set(f.plan_id, [])
    featuresByPlan.get(f.plan_id)!.push({
      label:       f.label,
      description: f.description,
      key:         f.feature_key,
    })
  }

  return planRows.map(p => ({
    id:         p.id,
    name:       p.name,
    emoji:      p.emoji,
    tagline:    p.tagline,
    usaPrice:   p.usa_price,
    indiaPrice: p.india_price,
    isQuote:    p.is_quote,
    popular:    p.popular,
    sortOrder:  p.sort_order,
    features:   featuresByPlan.get(p.id) ?? [],
  }))
})

/**
 * Returns all persona-specific feature labels grouped by persona → plan_id.
 * Used in the onboarding server page to pass the full map to the client so
 * step 4 can show persona-relevant features without an extra API call.
 * Rows with persona IS NULL are excluded (those come from getPlans).
 */
export const getPersonaFeatureMap = cache(async (): Promise<
  Record<string, Record<string, PlanFeature[]>>
> => {
  const { data } = await supabaseAdmin
    .from('plan_features')
    .select('plan_id, label, description, feature_key, sort_order, persona')
    .not('persona', 'is', null)
    .order('sort_order', { ascending: true })

  const map: Record<string, Record<string, PlanFeature[]>> = {}
  for (const f of (data ?? []) as FeatureRow[]) {
    const p = f.persona!
    if (!map[p]) map[p] = {}
    if (!map[p][f.plan_id]) map[p][f.plan_id] = []
    map[p][f.plan_id].push({ label: f.label, description: f.description, key: f.feature_key })
  }
  return map
})

/**
 * Returns plans with persona-specific feature labels where configured,
 * falling back to generic features for any plan that has no persona overrides.
 * Used in the mychat server route so PlanSection shows relevant copy.
 */
export const getPersonaPlans = cache(async (persona: string): Promise<PlanDef[]> => {
  const [genericPlans, specificRes] = await Promise.all([
    getPlans(),
    supabaseAdmin
      .from('plan_features')
      .select('plan_id, label, description, feature_key, sort_order')
      .eq('persona', persona)
      .order('sort_order', { ascending: true }),
  ])

  const specific = (specificRes.data ?? []) as FeatureRow[]
  if (!specific.length) return genericPlans

  const specificByPlan = new Map<string, PlanFeature[]>()
  for (const f of specific) {
    if (!specificByPlan.has(f.plan_id)) specificByPlan.set(f.plan_id, [])
    specificByPlan.get(f.plan_id)!.push({ label: f.label, description: f.description, key: f.feature_key })
  }

  return genericPlans.map(plan => ({
    ...plan,
    features: specificByPlan.get(plan.id) ?? plan.features,
  }))
})

/**
 * Returns a PlanGate built from the DB-backed plan data.
 * Use in server routes/pages to check feature access.
 *
 * Example:
 *   const gate = await getPlanGate()
 *   if (!gate.allows('ads', provider.plan)) return 403
 */
export const getPlanGate = cache(async (): Promise<PlanGate> => {
  const plans = await getPlans()

  // Build order (array of plan ids, cheapest first)
  const order = plans.map(p => p.id)

  // Build minimum-sort_order map for each feature_key
  // { 'ads' → 1, 'team' → 1, 'custom_work' → 2, ... }
  const keyToMinOrder = new Map<string, number>()
  for (const plan of plans) {
    for (const feature of plan.features) {
      if (feature.key && !keyToMinOrder.has(feature.key)) {
        keyToMinOrder.set(feature.key, plan.sortOrder)
      }
    }
  }

  function allows(featureKey: string, plan: string | null | undefined): boolean {
    const requiredOrder = keyToMinOrder.get(featureKey)
    if (requiredOrder === undefined) return true  // unknown key = always allowed

    const memberPlan = plans.find(p => p.id === (plan ?? ''))
    if (!memberPlan) return false  // unknown plan = deny

    return memberPlan.sortOrder >= requiredOrder
  }

  return { order, allows }
})
