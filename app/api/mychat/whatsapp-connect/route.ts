import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase'

async function getAuthedProvider(providerId: string) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null

  const { data } = await supabaseAdmin
    .from('providers')
    .select('id')
    .eq('id', providerId)
    .eq('email', user.email)
    .maybeSingle()
  return data ?? null
}

// POST — connect Business API credentials
const connectSchema = z.object({
  providerId:          z.string().uuid(),
  phoneNumberId:       z.string().min(1),
  accessToken:         z.string().min(1),
  displayPhoneNumber:  z.string().nullable().optional(),
})

export async function POST(req: NextRequest) {
  let parsed: z.infer<typeof connectSchema>
  try { parsed = connectSchema.parse(await req.json()) }
  catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 422 })
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const provider = await getAuthedProvider(parsed.providerId)
  if (!provider) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Validate credentials against Meta Graph API before saving
  try {
    const metaRes = await fetch(
      `https://graph.facebook.com/v19.0/${parsed.phoneNumberId}?fields=display_phone_number,verified_name&access_token=${parsed.accessToken}`,
      { method: 'GET' }
    )
    if (!metaRes.ok) {
      const errData = await metaRes.json().catch(() => ({}))
      const msg = (errData as { error?: { message?: string } }).error?.message ?? 'Invalid credentials'
      return NextResponse.json({ error: `Meta API: ${msg}` }, { status: 422 })
    }
    // Use the verified display number from Meta if member didn't provide one
    if (!parsed.displayPhoneNumber) {
      const metaData = await metaRes.json() as { display_phone_number?: string }
      parsed = { ...parsed, displayPhoneNumber: metaData.display_phone_number ?? null }
    }
  } catch {
    return NextResponse.json({ error: 'Could not reach Meta API — check your credentials and try again' }, { status: 502 })
  }

  const { error } = await supabaseAdmin
    .from('whatsapp_connections')
    .upsert({
      provider_id:          parsed.providerId,
      phone_number_id:      parsed.phoneNumberId,
      access_token:         parsed.accessToken,
      display_phone_number: parsed.displayPhoneNumber ?? null,
      connected_at:         new Date().toISOString(),
    }, { onConflict: 'provider_id' })

  if (error) {
    console.error('[wa-connect] upsert error:', error)
    return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// DELETE — disconnect Business API
const deleteSchema = z.object({ providerId: z.string().uuid() })

export async function DELETE(req: NextRequest) {
  let parsed: z.infer<typeof deleteSchema>
  try { parsed = deleteSchema.parse(await req.json()) }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const provider = await getAuthedProvider(parsed.providerId)
  if (!provider) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await supabaseAdmin
    .from('whatsapp_connections')
    .delete()
    .eq('provider_id', parsed.providerId)

  return NextResponse.json({ ok: true })
}

// PATCH — toggle whatsapp_public visibility
const patchSchema = z.object({
  providerId:    z.string().uuid(),
  whatsappPublic: z.boolean(),
})

export async function PATCH(req: NextRequest) {
  let parsed: z.infer<typeof patchSchema>
  try { parsed = patchSchema.parse(await req.json()) }
  catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 422 })
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const provider = await getAuthedProvider(parsed.providerId)
  if (!provider) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabaseAdmin
    .from('providers')
    .update({ whatsapp_public: parsed.whatsappPublic })
    .eq('id', parsed.providerId)

  if (error) return NextResponse.json({ error: 'Failed to update' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
