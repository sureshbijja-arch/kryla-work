import { NextRequest, NextResponse } from 'next/server'
import { createHmac, randomInt } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

function hashOtp(code: string): string {
  return createHmac('sha256', process.env.OTP_SECRET!)
    .update(code)
    .digest('hex')
}

// Normalise phone: strip everything except digits, ensure no leading + or spaces
function normalisePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

export async function POST(req: NextRequest) {
  const { phone } = await req.json() as { phone?: string }
  if (!phone || phone.trim().length < 7) {
    return NextResponse.json({ error: 'Valid phone number required' }, { status: 400 })
  }

  const normalised = normalisePhone(phone)

  // Rate limit: reject if a valid OTP was sent for this phone in the last 60s
  const { data: recent } = await supabaseAdmin
    .from('wa_auth_otps')
    .select('created_at')
    .eq('phone', normalised)
    .eq('consumed', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (recent) {
    const ageMs = Date.now() - new Date(recent.created_at).getTime()
    if (ageMs < 60_000) {
      return NextResponse.json({ error: 'Please wait 60 seconds before requesting a new code' }, { status: 429 })
    }
  }

  // Look up provider by whatsapp_number (same rule as dashboard: most recent)
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, first_name, email, whatsapp_number')
    .eq('whatsapp_number', normalised)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!provider) {
    return NextResponse.json({ error: 'No Kryla account found for this number' }, { status: 404 })
  }

  // Generate 6-digit code
  const code     = String(randomInt(100000, 999999))
  const codeHash = hashOtp(code)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  // Expire old OTPs for this phone
  await supabaseAdmin
    .from('wa_auth_otps')
    .update({ consumed: true })
    .eq('phone', normalised)
    .eq('consumed', false)

  // Insert new OTP
  const { error: insertError } = await supabaseAdmin
    .from('wa_auth_otps')
    .insert({ phone: normalised, code_hash: codeHash, expires_at: expiresAt })

  if (insertError) {
    return NextResponse.json({ error: 'Failed to create OTP' }, { status: 500 })
  }

  // Send via WhatsApp
  const msg = `Your Kryla verification code is: *${code}*\n\nExpires in 10 minutes. Do not share this code with anyone.`
  const result = await sendWhatsAppMessage({ to: normalised, text: msg })

  if (!result.success) {
    return NextResponse.json({ error: 'Failed to send WhatsApp message' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
