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

/** Notify a Member about a new booking */
export function buildNewBookingMessage(opts: {
  memberName: string
  customerName: string
  service: string
  preferredDate?: string
  bookingId: string
}) {
  const date = opts.preferredDate ? ` for ${opts.preferredDate}` : ""
  return (
    `${opts.memberName}, someone wants to book you! 🎉\n\n` +
    `*${opts.customerName}* wants ${opts.service}${date}.\n\n` +
    `Reply ACCEPT or REJECT, or tap here to manage it on Kryla.`
  )
}
