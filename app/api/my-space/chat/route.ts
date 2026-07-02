import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic()

const SYSTEM_PROMPT = `You are Kryla's member assistant. You help members manage both their public presence page and their day-to-day business — all in one conversation.

You MUST respond with ONLY valid JSON — no extra text before or after. Shape:
{
  "message": "string — your warm, plain-English reply (2-4 sentences max)",
  "patch_pages": {},
  "patch_providers": {},
  "patch_booking": null
}

patch_booking shape (when taking action on a booking):
{ "id": "<booking-uuid>", "status": "accepted" | "rejected" | "cancelled" }

═══════════════════════════════════════════
PAGE CONTENT — saved as draft until member publishes
═══════════════════════════════════════════

patch_pages fields:
- headline, subheadline, bio, cta_primary, cta_secondary
- services (full array: [{name, description, duration_or_unit}])
- highlights (full array: [{icon, title, body}])
- faq (full array: [{question, answer}])
- palette ("professional" | "fresh" | "warm" | "minimal" | "creative" | "calm")
- font ("inter" | "georgia" | "trebuchet")
- template ("focus" | "portfolio" | "storefront" | "clinic")
- show_sections (full object: {hero, services, highlights, booking, faq, contact} — all booleans)
- sections: full layout array [{sectionKey, variant, order}]. ALWAYS return the complete array.
  Variants — hero: auto|photo|split|centered|dark|gradient|banner|minimal
  services: list|grid|menu|pricing|features | highlights: icons|cards|stats|numbered|strip
  bio: paragraph|accent|callout|dark | gallery: grid|featured|masonry|scroll
  faq: accordion|twocol | contact: both|form|whatsapp|minimal|dark

patch_providers fields:
- whatsapp_number (digits with country code)
- location (city or full address — becomes a clickable Google Maps link on the page)

Member's media (read-only — uploaded via Media tab):
- avatarUrl: profile photo (if set, hero variants "photo"/"split" show it prominently)
- gallery: array of image URLs

═══════════════════════════════════════════
BUSINESS OPERATIONS — take effect immediately
═══════════════════════════════════════════

patch_booking: update a booking status. A confirmation email is automatically sent to the customer.
Only use when the member clearly asks to accept, reject, or cancel a specific booking.

═══════════════════════════════════════════
RULES
═══════════════════════════════════════════
- Page edits: never invent content — preserve member's words and voice
- Lists (services, highlights, faq, sections): always return the FULL array, never partial
- show_sections: return the full object when any field changes
- Hero with photo: if avatarUrl is set → suggest/apply "photo" or "split" variant. If null → suggest uploading in Media tab first
- Location: if member asks to "add map" or "add directions" → use existing location or ask them for it
- Bookings: when member says "accept/reject/cancel [name]'s booking" → set patch_booking. If ambiguous (multiple matches), list them and ask which one
- Messages: summarise unread threads; suggest reply wording if asked — member sends from the Messages tab
- Ads: report status (pending/approved/rejected); member manages them in the Ads tab
- Never say "AI" — you are Kryla
- Keep message warm, plain English, 2-4 sentences`

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { providerId, messages, currentProfile } = body

  if (!providerId || !messages || !currentProfile) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Verify ownership + get provider details needed for emails / media
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, slug, email, avatar_url, first_name, whatsapp_number, page_language')
    .eq('id', providerId)
    .eq('email', user.email)
    .single()

  if (!provider) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Fetch all tab data in parallel — gives Claude full context on every call
  const [pageRow, bookingsRow, messagesRow, adsRow] = await Promise.all([
    supabaseAdmin
      .from('pages')
      .select('gallery, draft_data')
      .eq('provider_id', providerId)
      .maybeSingle(),

    supabaseAdmin
      .from('bookings')
      .select('id, created_at, customer_name, customer_phone, client_email, service, preferred_date, message, status')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })
      .limit(20),

    supabaseAdmin
      .from('whatsapp_messages')
      .select('id, customer_phone, customer_name, body, direction, read, msg_timestamp')
      .eq('provider_id', providerId)
      .order('msg_timestamp', { ascending: false })
      .limit(30),

    supabaseAdmin
      .from('ads')
      .select('id, title, description, status, created_at')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false }),
  ])

  // Merge draft over live page content
  type DraftShape = { pages?: Record<string, unknown>; providers?: Record<string, unknown> }
  const draft = (pageRow.data?.draft_data ?? {}) as DraftShape
  const dp    = draft.pages ?? {}
  const gallery = Array.isArray(pageRow.data?.gallery) ? pageRow.data.gallery : []

  const enrichedProfile = {
    ...currentProfile,
    ...dp,
    avatarUrl: provider.avatar_url ?? null,
    gallery,
  }

  // Build business context for Claude
  const bookings  = bookingsRow.data  ?? []
  const waMessages = messagesRow.data ?? []
  const ads        = adsRow.data      ?? []

  // Group WhatsApp messages into threads (one entry per customer)
  const threadMap = new Map<string, { name: string | null; lastMsg: string; unread: number; ts: string }>()
  for (const m of waMessages) {
    if (!threadMap.has(m.customer_phone)) {
      threadMap.set(m.customer_phone, { name: m.customer_name, lastMsg: m.body, unread: 0, ts: m.msg_timestamp })
    }
    if (m.direction === 'inbound' && !m.read) {
      threadMap.get(m.customer_phone)!.unread++
    }
  }
  const messageThreads = Array.from(threadMap.entries()).map(([phone, t]) => ({
    customer: t.name ?? phone,
    lastMessage: t.lastMsg,
    unreadCount: t.unread,
    lastAt: t.ts,
  }))

  const businessContext = {
    bookings: bookings.map(b => ({
      id: b.id,
      customer: b.customer_name,
      phone: b.customer_phone,
      email: b.client_email,
      service: b.service,
      date: b.preferred_date,
      note: b.message,
      status: b.status,
      receivedAt: b.created_at,
    })),
    messageThreads,
    ads: ads.map(a => ({ id: a.id, title: a.title, status: a.status })),
  }

  const LANG_NAMES: Record<string, string> = {
    hi: 'Hindi', ta: 'Tamil', te: 'Telugu', kn: 'Kannada',
    ml: 'Malayalam', mr: 'Marathi', gu: 'Gujarati', es: 'Spanish',
  }
  const pageLang = (provider.page_language as string) ?? 'en'
  const langInstruction = pageLang !== 'en'
    ? `\nMember's preferred language: ${LANG_NAMES[pageLang] ?? pageLang}. Respond in ${LANG_NAMES[pageLang] ?? pageLang} unless the member writes in English.`
    : ''

  const systemWithContext = `${SYSTEM_PROMPT}${langInstruction}

Current page content (JSON):
${JSON.stringify(enrichedProfile, null, 2)}

Business data (bookings, messages, ads):
${JSON.stringify(businessContext, null, 2)}`

  const completion = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemWithContext,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  })

  const raw = completion.content[0].type === 'text' ? completion.content[0].text : ''

  let parsed: {
    message: string
    patch_pages: Record<string, unknown>
    patch_providers: Record<string, unknown>
    patch_booking: { id: string; status: string } | null
  }
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
  } catch {
    return NextResponse.json({ message: raw, changed: false })
  }

  const { message, patch_pages = {}, patch_providers = {}, patch_booking = null } = parsed

  const allowed = ['whatsapp_number', 'location']
  const safePatchProviders = Object.fromEntries(
    Object.entries(patch_providers).filter(([k]) => allowed.includes(k))
  )

  let changed = false

  // ── Page draft updates ──────────────────────────────────────────────────────
  const hasPatchPages     = Object.keys(patch_pages).length > 0
  const hasPatchProviders = Object.keys(safePatchProviders).length > 0

  if (hasPatchPages || hasPatchProviders) {
    const { data: freshPage } = await supabaseAdmin
      .from('pages')
      .select('draft_data')
      .eq('provider_id', providerId)
      .maybeSingle()

    const existingDraft = (freshPage?.draft_data ?? {}) as Partial<DraftShape>

    await supabaseAdmin
      .from('pages')
      .update({
        draft_data: {
          pages:     { ...(existingDraft.pages     ?? {}), ...patch_pages },
          providers: { ...(existingDraft.providers ?? {}), ...safePatchProviders },
        },
      })
      .eq('provider_id', providerId)

    changed = true
  }

  // ── Booking status update ───────────────────────────────────────────────────
  if (patch_booking?.id && patch_booking?.status) {
    const validStatuses = ['accepted', 'rejected', 'cancelled']
    if (validStatuses.includes(patch_booking.status)) {
      // Fetch booking for email
      const { data: bk } = await supabaseAdmin
        .from('bookings')
        .select('customer_name, client_email, service, preferred_date')
        .eq('id', patch_booking.id)
        .eq('provider_id', providerId)
        .single()

      const { error: bkErr } = await supabaseAdmin
        .from('bookings')
        .update({ status: patch_booking.status, status_updated_at: new Date().toISOString() })
        .eq('id', patch_booking.id)
        .eq('provider_id', providerId)

      if (!bkErr && bk?.client_email) {
        try {
          const dateLine = bk.preferred_date
            ? `<p style="margin:6px 0"><strong>Date requested:</strong> ${bk.preferred_date}</p>` : ''

          if (patch_booking.status === 'accepted') {
            await sendEmail({
              to: bk.client_email,
              subject: `Your booking with ${provider.first_name} is confirmed!`,
              html: `
                <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#0D0D0D">
                  <p style="font-size:20px;font-weight:700;margin-bottom:4px">Booking confirmed</p>
                  <p style="color:#666;margin-top:0">Hi ${bk.customer_name}, your booking has been accepted.</p>
                  <hr style="border:none;border-top:1px solid #E5E5E5;margin:16px 0"/>
                  <p style="margin:6px 0"><strong>Service:</strong> ${bk.service}</p>
                  ${dateLine}
                  <p style="margin:6px 0"><strong>With:</strong> ${provider.first_name}</p>
                  <hr style="border:none;border-top:1px solid #E5E5E5;margin:16px 0"/>
                  ${provider.whatsapp_number
                    ? `<p style="color:#666;font-size:13px">Reach out on WhatsApp: <a href="https://wa.me/${provider.whatsapp_number}" style="color:#F5A623">+${provider.whatsapp_number}</a></p>`
                    : ''}
                </div>`,
            })
          } else if (patch_booking.status === 'rejected') {
            await sendEmail({
              to: bk.client_email,
              subject: `Update on your booking request with ${provider.first_name}`,
              html: `
                <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#0D0D0D">
                  <p style="font-size:20px;font-weight:700;margin-bottom:4px">Booking update</p>
                  <p style="color:#666;margin-top:0">Hi ${bk.customer_name},</p>
                  <p style="color:#444">Unfortunately, ${provider.first_name} isn't able to take your booking for <strong>${bk.service}</strong> at this time.</p>
                  <p style="color:#666;font-size:13px;margin-top:20px">You're welcome to visit their page and submit a new request.</p>
                </div>`,
            })
          }
        } catch (err) {
          console.error('[chat] booking email failed (non-fatal):', err)
        }
      }

      changed = true
    }
  }

  return NextResponse.json({ message, changed })
}
