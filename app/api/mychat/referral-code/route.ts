import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function assertOwner(providerId: string, userEmail: string) {
  const { data } = await supabaseAdmin
    .from('providers')
    .select('id')
    .eq('id', providerId)
    .eq('email', userEmail)
    .maybeSingle()
  return !!data
}

// GET — fetch current code + referral count
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const providerId = req.nextUrl.searchParams.get('providerId')
  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const ok = await assertOwner(providerId, user.email)
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('referral_code')
    .eq('id', providerId)
    .single()

  const code = (provider?.referral_code as string | null) ?? null

  let referralCount = 0
  if (code) {
    const { count } = await supabaseAdmin
      .from('providers')
      .select('id', { count: 'exact', head: true })
      .eq('referred_by', code)
    referralCount = count ?? 0
  }

  return NextResponse.json({ code, referralCount })
}

// POST — save or update referral code
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { providerId, code: rawCode } = await req.json()
  if (!providerId || !rawCode) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const ok = await assertOwner(providerId, user.email)
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const code = rawCode.trim().toUpperCase()
  if (!/^[A-Z0-9]{5}$/.test(code)) {
    return NextResponse.json({ error: 'Code must be exactly 5 letters or numbers (e.g. LUCKY, GT123)' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('providers')
    .update({ referral_code: code })
    .eq('id', providerId)

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'That code is already taken — try another' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, code })
}
