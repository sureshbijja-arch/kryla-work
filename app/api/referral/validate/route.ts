import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  // 5-char codes are guessable via brute force — throttle harder than the other public endpoints
  const { allowed, retryAfterSeconds } = await checkRateLimit('referral-validate', getClientIp(req), 20, 3600)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts — please try again later' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
    )
  }

  const { code } = await req.json()
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Code required' }, { status: 400 })
  }

  const normalized = code.trim().toUpperCase()
  if (!/^[A-Z0-9]{5}$/.test(normalized)) {
    return NextResponse.json({ error: 'Invalid code format' }, { status: 400 })
  }

  const { data } = await supabaseAdmin
    .from('providers')
    .select('referral_code')
    .eq('referral_code', normalized)
    .maybeSingle()

  if (!data) {
    return NextResponse.json({ error: 'Code not found — check and try again' }, { status: 404 })
  }

  return NextResponse.json({ valid: true, code: normalized })
}
