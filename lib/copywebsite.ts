import { supabaseAdmin } from '@/lib/supabase/admin'

export type CopyWebsiteGateMode = 'none' | 'all' | 'list'

export interface CopyWebsiteGate {
  mode:  CopyWebsiteGateMode
  codes: string[]
}

export const DEFAULT_COPYWEBSITE_GATE: CopyWebsiteGate = { mode: 'none', codes: [] }

export async function getCopyWebsiteGate(admin: typeof supabaseAdmin = supabaseAdmin): Promise<CopyWebsiteGate> {
  const { data } = await admin
    .from('system_config')
    .select('value')
    .eq('key', 'copywebsite_gate')
    .single()
  const dbGate = (data?.value ?? {}) as Partial<CopyWebsiteGate>
  return { ...DEFAULT_COPYWEBSITE_GATE, ...dbGate }
}

// Single source of truth for whether a member (identified by the referral code
// they signed up under) is allowed to see/use the "bring your website over" option.
// Used by both the public onboarding gate-check endpoint and the submit route
// (which re-checks server-side so a spoofed client can't file a request).
export async function isCopyWebsiteAllowed(referredBy: string | null | undefined): Promise<boolean> {
  const gate = await getCopyWebsiteGate()
  if (gate.mode === 'all')  return true
  if (gate.mode === 'none') return false
  const code = referredBy?.trim().toUpperCase()
  if (!code) return false
  return gate.codes.includes(code)
}
