/**
 * app/api/webhooks/resend-inbound/route.ts
 *
 * Receives inbound email from Resend and persists it to the `emails` table
 * so it appears in the advocate's Email tab in MyChat.
 *
 * Setup:
 *   1. In Resend dashboard: Domains → kryla.work → Receiving → set this URL
 *      as the inbound webhook endpoint.
 *   2. Copy the Svix signing secret and set RESEND_WEBHOOK_SECRET in Vercel env.
 *
 * Resend fires this on every email arriving at any @kryla.work address.
 * We look up the provider by the `to` address; reserved addresses are skipped.
 */

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient as createStorageClient } from '@supabase/supabase-js'

// Addresses that should never route into a provider inbox
const RESERVED_PREFIXES = ['hello', 'no-reply', 'noreply', 'support', 'admin', 'postmaster', 'abuse']

function isReserved(address: string): boolean {
  const local = address.split('@')[0]?.toLowerCase() ?? ''
  return RESERVED_PREFIXES.some(p => local === p || local.startsWith(p + '+'))
}

// Extract a display name from a "Name <email>" string
function parseSender(raw: string): { name: string | null; email: string } {
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/)
  if (match) return { name: match[1].trim() || null, email: match[2].trim().toLowerCase() }
  return { name: null, email: raw.trim().toLowerCase() }
}

export async function POST(req: NextRequest) {
  // ── 1. Read raw body (required for Svix signature verification) ───────────
  const rawBody = await req.text()

  // ── 2. Verify Resend webhook signature (Svix) ─────────────────────────────
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.error('[resend-inbound] RESEND_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const svixId        = req.headers.get('svix-id') ?? ''
  const svixTimestamp = req.headers.get('svix-timestamp') ?? ''
  const svixSignature = req.headers.get('svix-signature') ?? ''

  let event: Record<string, unknown>
  try {
    const wh = new Webhook(secret)
    event = wh.verify(rawBody, {
      'svix-id':        svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as Record<string, unknown>
  } catch (err) {
    console.error('[resend-inbound] signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // We only care about received emails
  if (event.type !== 'email.received') {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const data = event.data as Record<string, unknown>

  // ── 3. Parse inbound metadata ─────────────────────────────────────────────
  // Resend includes text/html body directly in the webhook payload for inbound emails.
  const emailId   = data.email_id as string
  const fromRaw   = (data.from as string | undefined) ?? ''
  const subject   = (data.subject as string | undefined) ?? '(no subject)'
  const messageId = (data.message_id as string | undefined) ?? emailId
  const inReplyTo = (data.in_reply_to as string | undefined) ?? null
  const bodyText  = (data.text as string | undefined) ?? ''
  const bodyHtml  = (data.html as string | undefined) ?? ''

  // `to` can be a plain email or "Name <email>" — parse out just the address
  const toRaw     = ((data.to as string[] | undefined)?.[0] ?? '')
  const toAddress = parseSender(toRaw).email   // normalised lowercase email only

  // Skip reserved addresses
  if (!toAddress || isReserved(toAddress)) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  // ── 4. Look up provider by the `to` address ───────────────────────────────
  const { data: providerEmail } = await supabaseAdmin
    .from('provider_email')
    .select('provider_id, enabled')
    .eq('address', toAddress)
    .maybeSingle()

  if (!providerEmail || !providerEmail.enabled) {
    // Not a registered / enabled provider address — silently accept (200) to
    // stop Resend retrying, but don't store anything.
    return NextResponse.json({ ok: true, skipped: true })
  }

  const providerId = providerEmail.provider_id as string
  const sender     = parseSender(fromRaw)

  // ── 5. Attachments from webhook payload ───────────────────────────────────
  // Resend inbound webhook includes attachment metadata directly in the payload.
  type ResendAttachment = { filename?: string; name?: string; size?: number; content?: string }
  const rawAttachments = (data.attachments as ResendAttachment[] | undefined) ?? []

  // ── 6. Upload attachments to Supabase Storage ─────────────────────────────
  const storedAttachments: { name: string; size: number; url: string }[] = []

  if (rawAttachments.length > 0) {
    const storageClient = createStorageClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    for (const att of rawAttachments) {
      try {
        const filename = att.filename ?? att.name ?? 'attachment'
        const size     = att.size ?? 0
        // Resend inbound attachments include base64-encoded content in `content`
        if (!att.content) continue
        const buffer = Buffer.from(att.content, 'base64')
        const path   = `${providerId}/${emailId}/${filename}`

        const { error: uploadErr } = await storageClient.storage
          .from('email-attachments')
          .upload(path, buffer, { upsert: true })

        if (uploadErr) {
          console.error('[resend-inbound] attachment upload error:', uploadErr.message)
          continue
        }

        const { data: signed } = await storageClient.storage
          .from('email-attachments')
          .createSignedUrl(path, 60 * 60 * 24 * 7)

        storedAttachments.push({ name: filename, size, url: signed?.signedUrl ?? '' })
      } catch (err) {
        console.error('[resend-inbound] attachment processing error:', err)
      }
    }
  }

  // ── 7. Insert email row (idempotent on message_id) ────────────────────────
  const { error: insertErr } = await supabaseAdmin
    .from('emails')
    .insert({
      provider_id:    providerId,
      customer_email: sender.email,
      customer_name:  sender.name,
      direction:      'inbound',
      subject,
      body_text:      bodyText,
      body_html:      bodyHtml,
      message_id:     messageId,
      in_reply_to:    inReplyTo,
      attachments:    storedAttachments,
      read:           false,
    })

  if (insertErr) {
    if (insertErr.code === '23505') {
      // Duplicate message_id — webhook retry; safe to 200
      return NextResponse.json({ ok: true, skipped: true, reason: 'duplicate' })
    }
    console.error('[resend-inbound] insert error:', insertErr.message)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  // Supabase Realtime will push the new row to any open EmailTab subscription
  return NextResponse.json({ ok: true })
}
