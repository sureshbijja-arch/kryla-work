/**
 * lib/plan.ts — Plan helpers.
 *
 * Feature gating is now data-driven from the `plan_features` DB table.
 * Use getPlanGate() from lib/plans.ts in server routes and server components.
 * Client components should receive gating booleans as props (never call DB client-side).
 */

// Re-export the DB-backed loader so existing server-side imports keep working.
export { getPlans, getPlanGate } from '@/lib/plans'
export type { PlanDef, PlanFeature, PlanGate, PlanId } from '@/lib/plans'
