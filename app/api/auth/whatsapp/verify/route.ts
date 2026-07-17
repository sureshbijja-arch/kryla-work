import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

function hashOtp(code: string): string {
  return createHmac('sha256', process.env.OTP_SECRET!)
    .update(code)
    .digest('hex')
}

function normalisePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kryla.work'

export async function POST(req: NextRequest) {
  const { phone, code } = await req.json() as { phone?: string; code?: string }

  if (!phone || !code || code.length !== 6) {
    return NextResponse.json({ error: 'Phone and 6-digit code required' }, { status: 400 })
  }

  const normalised = normalisePhone(phone)

  // Find the latest valid OTP for this phone
  const { data: otpRow } = await supabaseAdmin
    .from('wa_auth_otps')
    .select('id, code_hash, attempts, consumed')
    .eq('phone', normalised)
    .eq('consumed', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!otpRow) {
    return NextResponse.json({ error: 'Code expired or not found — request a new one' }, { status: 401 })
  }

  // Increment attempts
  const newAttempts = otpRow.attempts + 1
  await supabaseAdmin.from('wa_auth_otps').update({ attempts: newAttempts }).eq('id', otpRow.id)

  if (newAttempts > 5) {
    await supabaseAdmin.from('wa_auth_otps').update({ consumed: true }).eq('id', otpRow.id)
    return NextResponse.json({ error: 'Too many attempts — request a new code' }, { status: 429 })
  }

  // Verify code
  const expectedHash = hashOtp(code)
  if (expectedHash !== otpRow.code_hash) {
    const remaining = 5 - newAttempts
    return NextResponse.json(
      { error: `Incorrect code — ${remaining} attempt${remaining === 1 ? '' : 's'} remaining` },
      { status: 401 }
    )
  }

  // Code is correct — mark consumed
  await supabaseAdmin.from('wa_auth_otps').update({ consumed: true }).eq('id', otpRow.id)

  // Look up the provider's email for this phone
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('email, first_name')
    .eq('whatsapp_number', normalised)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!provider?.email) {
    return NextResponse.json({ error: 'Account has no email — contact support' }, { status: 500 })
  }

  // Mint a Supabase magic-link token for this email via admin
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type:  'magiclink',
    email: provider.email,
  })

  if (linkError || !linkData?.properties?.action_link) {
    return NextResponse.json({ error: 'Session creation failed' }, { status: 500 })
  }

  // Extract token_hash directly from properties (avoids fragile URL parsing)
  const token_hash = linkData.properties.hashed_token
  if (!token_hash) {
    return NextResponse.json({ error: 'Invalid magic link token' }, { status: 500 })
  }

  // Verify the token using the SSR client (sets auth cookies)
  const supabase = createClient()
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash,
    type: 'magiclink',
  })

  if (verifyError) {
    return NextResponse.json({ error: 'Failed to establish session' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, redirect: `${SITE_URL}/mykryla` })
}
