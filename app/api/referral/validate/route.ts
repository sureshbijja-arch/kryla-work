import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
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
