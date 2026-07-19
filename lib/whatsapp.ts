/**
 * lib/whatsapp.ts — ALL WhatsApp API calls go through here.
 * Never call the Meta API directly from route handlers.
 *
 * Only available on Sprout plan and above. Seed members get email only.
 */

const WA_API_URL = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`

interface SendMessageOptions {
  to: string          // E.164 format: +14155552671
  text: string
}

interface SendMessageResult {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendWhatsAppMessage(
  opts: SendMessageOptions
): Promise<SendMessageResult> {
  try {
    const res = await fetch(WA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: opts.to,
        type: "text",
        text: { body: opts.text },
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.error("[whatsapp] API error:", body)
      return { success: false, error: JSON.stringify(body) }
    }

    const data = await res.json()
    return { success: true, messageId: data?.messages?.[0]?.id }
  } catch (err) {
    console.error("[whatsapp] Unexpected error:", err)
    return { success: false, error: String(err) }
  }
}

/**
 * Build a tap-to-chat wa.me link from a free-text phone number.
 * Strips all non-digits; returns '' if fewer than 7 digits remain.
 * wa.me requires bare digits with no +, spaces, or dashes.
 */
export function waLink(phone?: string | null): string {
  const digits = (phone ?? '').replace(/\D/g, '')
  return digits.length >= 7 ? `https://wa.me/${digits}` : ''
}

/** Notify a member about a new booking */
export function buildNewBookingMessage(opts: {
  memberName: string
  customerName: string
  service: string
  preferredDate?: string
  bookingId: string
  customerPhone?: string | null
}) {
  const date    = opts.preferredDate ? ` for ${opts.preferredDate}` : ""
  const chatUrl = waLink(opts.customerPhone)
  const chatLine = chatUrl ? `\n💬 Message ${opts.customerName}: ${chatUrl}\n` : "\n"
  return (
    `${opts.memberName}, someone wants to book you! 🎉\n\n` +
    `*${opts.customerName}* wants ${opts.service}${date}.` +
    chatLine +
    `\nReply *accept* or *decline* to respond here, or manage in MyKryla: https://kryla.work/mykryla`
  )
}

/**
 * Download a WhatsApp media attachment (e.g. voice note) by its media ID.
 * Step 1: resolve the temporary download URL from the Graph API.
 * Step 2: fetch the binary from that URL using the same Bearer token.
 */
export async function downloadWhatsAppMedia(
  mediaId: string,
): Promise<{ bytes: Buffer; mimeType: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  if (!token) throw new Error('WHATSAPP_ACCESS_TOKEN not set')

  const metaRes = await fetch(
    `https://graph.facebook.com/v19.0/${mediaId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!metaRes.ok) throw new Error(`Media metadata fetch failed: ${metaRes.status}`)
  const meta = await metaRes.json() as { url: string; mime_type: string }

  const dlRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!dlRes.ok) throw new Error(`Media download failed: ${dlRes.status}`)

  const bytes = Buffer.from(await dlRes.arrayBuffer())
  return { bytes, mimeType: meta.mime_type ?? 'audio/ogg' }
}

/** Notify a member that their page just went live */
export function buildPageLiveMessage(opts: {
  memberName: string
  slug: string
}) {
  const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'kryla.work'
  return (
    `Hi ${opts.memberName}, your Kryla page is live! 🚀\n\n` +
    `Share it with your customers: https://${opts.slug}.${APP_DOMAIN}\n\n` +
    `Log in to manage your page: https://kryla.work/mykryla`
  )
}

/** Install links message — sent to member when their page goes live */
export function buildInstallLinksMessage(opts: {
  memberName: string
  slug:       string
}) {
  const base = `https://${opts.slug}.kryla.work`
  return (
    `Hi ${opts.memberName}! 🎉 Your Kryla apps are ready to install.\n\n` +
    `📱 *MyKryla* (your business dashboard):\n${base}/get-app?app=mychat\n\n` +
    `🌐 *Your customer page app* (share this link with customers):\n${base}/get-app?app=customer\n\n` +
    `Tap either link on your phone to install the app in one tap.`
  )
}

/** Reminder sent to a customer ahead of their accepted booking. */
export function buildBookingReminderMessage(opts: {
  customerName: string
  memberName: string
  service: string
  startAt: string
  windowLabel: '24 hours' | '2 hours'
}) {
  const when = new Date(opts.startAt).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
  return (
    `Hi ${opts.customerName}! Reminder: you have *${opts.service}* with ${opts.memberName} ` +
    `in *${opts.windowLabel}* — ${when}.\n\n` +
    `Reply *CONFIRM* to keep it, *CANCEL* to cancel, or *RESCHEDULE* to pick a new time.`
  )
}

interface SendInteractiveOptions {
  to: string
  bodyText: string
  buttons: { id: string; title: string }[]   // max 3 — WhatsApp button-message limit
}

/** Send a WhatsApp interactive button message (max 3 buttons). */
export async function sendWhatsAppInteractiveMessage(
  opts: SendInteractiveOptions
): Promise<SendMessageResult> {
  try {
    const res = await fetch(WA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: opts.to,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: opts.bodyText },
          action: {
            buttons: opts.buttons.slice(0, 3).map(b => ({
              type: "reply",
              reply: { id: b.id, title: b.title },
            })),
          },
        },
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.error("[whatsapp] Interactive API error:", body)
      return { success: false, error: JSON.stringify(body) }
    }

    const data = await res.json()
    return { success: true, messageId: data?.messages?.[0]?.id }
  } catch (err) {
    console.error("[whatsapp] Unexpected interactive error:", err)
    return { success: false, error: String(err) }
  }
}

/**
 * Parse an inbound WhatsApp booking-action reply — either an interactive button
 * tap (payload id: 'booking_confirm' | 'booking_cancel' | 'booking_reschedule')
 * or a plain-text keyword fallback ("confirm", "cancel", "reschedule",
 * case-insensitive, ignoring surrounding whitespace/punctuation).
 * Returns null if the text/payload doesn't match a known booking action.
 */
export function parseBookingReply(input: { buttonPayloadId?: string; text?: string }):
  'confirm' | 'cancel' | 'reschedule' | null {
  if (input.buttonPayloadId === 'booking_confirm')    return 'confirm'
  if (input.buttonPayloadId === 'booking_cancel')     return 'cancel'
  if (input.buttonPayloadId === 'booking_reschedule') return 'reschedule'

  const t = (input.text ?? '').trim().toLowerCase().replace(/[^a-z]/g, '')
  if (t === 'confirm' || t === 'yes' || t === 'accept') return 'confirm'
  if (t === 'cancel' || t === 'no')                     return 'cancel'
  if (t === 'reschedule' || t === 'resched')            return 'reschedule'
  return null
}
