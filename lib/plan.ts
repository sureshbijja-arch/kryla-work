/**
 * lib/plan.ts — Feature gating by membership plan.
 *
 * Plan order: grow < thrive < elevate
 * Use these helpers everywhere instead of local PLAN_RANK maps.
 */

import type { Plan } from "@/types"

export const PLAN_ORDER: Plan[] = ["grow", "thrive", "elevate"]

export function planLevel(plan: Plan | string | null | undefined): number {
  if (!plan) return 0
  const idx = PLAN_ORDER.indexOf(plan as Plan)
  return idx === -1 ? 0 : idx
}

export function isAtLeast(memberPlan: Plan | string | null | undefined, required: Plan): boolean {
  return planLevel(memberPlan) >= planLevel(required)
}

// Feature gates
export const can = {
  /** Booking system — all plans (Grow is the floor) */
  acceptBookings: (_plan: Plan | string | null | undefined) => true,

  /** WhatsApp booking notifications — all plans (Grow is the floor) */
  receiveWhatsApp: (_plan: Plan | string | null | undefined) => true,

  /** Photo & gallery upload — all plans (Grow is the floor) */
  uploadMedia: (_plan: Plan | string | null | undefined) => true,

  /** Analytics — all plans (Grow is the floor) */
  viewAnalytics: (_plan: Plan | string | null | undefined) => true,

  /** Custom domain (priya.com) — Thrive and above */
  useCustomDomain: (plan: Plan | string | null | undefined) => isAtLeast(plan, "thrive"),

  /** Update profile via WhatsApp — Thrive and above */
  updateViaWhatsApp: (plan: Plan | string | null | undefined) => isAtLeast(plan, "thrive"),

  /** Scrolling ads on page — Thrive and above */
  postAds: (plan: Plan | string | null | undefined) => isAtLeast(plan, "thrive"),

  /** All 6 AI agents — Thrive and above */
  useAllAgents: (plan: Plan | string | null | undefined) => isAtLeast(plan, "thrive"),

  /** Online payments on page — Thrive and above */
  acceptPayments: (plan: Plan | string | null | undefined) => isAtLeast(plan, "thrive"),

  /** Team access & branded email — Thrive and above */
  addTeamMembers: (plan: Plan | string | null | undefined) => isAtLeast(plan, "thrive"),

  /** Custom changes — Elevate only (handled manually, no self-serve checkout) */
  requestCustomWork: (plan: Plan | string | null | undefined) => isAtLeast(plan, "elevate"),
}
