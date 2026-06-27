/**
 * lib/plan.ts — Feature gating by membership plan.
 *
 * Plan order: seed < sprout < grow < thrive < elevate
 * Use these helpers everywhere instead of string comparisons.
 */

import type { Plan } from "@/types"

const PLAN_ORDER: Plan[] = ["seed", "sprout", "grow", "thrive", "elevate"]

export function planLevel(plan: Plan): number {
  return PLAN_ORDER.indexOf(plan)
}

export function isAtLeast(memberPlan: Plan, required: Plan): boolean {
  return planLevel(memberPlan) >= planLevel(required)
}

// Feature gates — derived from CLAUDE.md pricing table
export const can = {
  /** WhatsApp notifications — Sprout and above only */
  receiveWhatsApp: (plan: Plan) => isAtLeast(plan, "sprout"),

  /** Booking system — Sprout and above */
  acceptBookings: (plan: Plan) => isAtLeast(plan, "sprout"),

  /** Custom domain (priya.com) — Grow and above */
  useCustomDomain: (plan: Plan) => isAtLeast(plan, "grow"),

  /** Analytics — Grow and above */
  viewAnalytics: (plan: Plan) => isAtLeast(plan, "grow"),

  /** Update profile via WhatsApp — Thrive and above */
  updateViaWhatsApp: (plan: Plan) => isAtLeast(plan, "thrive"),

  /** All 6 AI agents — Thrive and above */
  useAllAgents: (plan: Plan) => isAtLeast(plan, "thrive"),

  /** Online payments — Elevate only */
  acceptPayments: (plan: Plan) => isAtLeast(plan, "elevate"),

  /** Team access — Elevate only */
  addTeamMembers: (plan: Plan) => isAtLeast(plan, "elevate"),
}
