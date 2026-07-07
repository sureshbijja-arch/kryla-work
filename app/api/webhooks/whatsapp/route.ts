import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendWhatsAppMessage, waLink, downloadWhatsAppMedia } from '@/lib/whatsapp'
import { transcribeAudio, TranscribeError } from '@/lib/transcribe'
import { getPlanGate } from '@/lib/plans'
import { normalizeHandle, normalizeNextdoorUrl } from '@/lib/social'
import { sendEmail } from '@/lib/email'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

// ── Webhook verification (Meta calls this once when you register the webhook) ──
export async function GET(req: NextRequest) {
  const mode      = req.nextUrl.searchParams.get('hub.mode')
  const token     = req.nextUrl.searchParams.get('hub.verify_token')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? '', { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

// ── Inbound message handler ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || body.object !== 'whatsapp_business_account') {
    return NextResponse.json({ ok: true })
  }

  const msg = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
  if (!msg || (msg.type !== 'text' && msg.type !== 'audio')) return NextResponse.json({ ok: true })

  const senderPhone = msg.from as string   // bare digits from Meta, e.g. "14695550112"
  const messageText = msg.type === 'text' ? ((msg.text?.body as string)?.trim() ?? '') : ''
  const audioId     = msg.type === 'audio' ? (msg.audio?.id as string | undefined) : undefined

  if (!senderPhone) return NextResponse.json({ ok: true })
  if (!messageText && !audioId) return NextResponse.json({ ok: true })

  await handleInbound(senderPhone, messageText, audioId)

  return NextResponse.json({ ok: true })
}

// ─────────────────────────────────────────────────────────────────────────────

const WA_SYSTEM_PROMPT = `You are Kryla, a helpful assistant for small business owners updating their public profile page via WhatsApp.

Respond with ONLY valid JSON — no extra text before or after. Shape:
{
  "message": "string — short friendly plain-text reply (2-3 sentences, no markdown, no asterisks)",
  "patch_pages": {},
  "patch_providers": {},
  "set_language": null,
  "patch_availability": null,
  "delete_availability": null,
  "new_ad": null,
  "patch_booking": null,
  "new_suggestion": null
}

new_suggestion: a plain-English Kryla platform feature wish — or null.
- Only set this when the member is wishing for a Kryla product capability (something Kryla the platform should build), not when they are editing their own page.
- Acknowledge warmly in message (e.g. "Thanks! I've noted your idea — the Kryla team will love hearing that.").
- Leave null for all normal page/booking/availability edits.

patch_booking: { "id": "<booking-uuid>", "status": "accepted" | "rejected" | "cancelled" } — or null.
- Use this when the member wants to accept, decline, or cancel a booking.
- Resolve the customer name or service from the bookings list in context to find the matching id.
- "accept" → accepted, "decline" / "reject" → rejected, "cancel" → cancelled.
- If the request matches more than one pending booking, ask a short clarifying question instead of guessing.
- If exactly one booking is pending and the member says just "accept" or "decline", use that one.
- If no matching booking is found, say so clearly and do not set patch_booking.
- The bookings list includes each customer's phone number. If the member asks how to contact a customer, give them a tap-to-chat link: https://wa.me/<digits only, no + or spaces>.

TODAY'S DATE: {{TODAY}}

set_language: ISO code string or null. Use this when the member wants to change the page language.
Valid codes: "en" (English), "hi" (Hindi), "ta" (Tamil), "te" (Telugu), "kn" (Kannada), "ml" (Malayalam), "mr" (Marathi), "gu" (Gujarati), "es" (Spanish).
Setting "en" resets to English. Any other code triggers a full translation of all page content.

Fields you can update in patch_pages:
- headline, subheadline, bio, cta_primary, cta_secondary
- services: FULL array [{name, description, duration_or_unit, price}]
- highlights: FULL array [{icon, title, body}]
- faq: FULL array [{question, answer}]

Fields you can update in patch_providers:
- location (city or address)
- business_hours: USE THIS whenever the member mentions a holiday, closure, day off, leave, or special hours for a specific date — these appear as a visible notice on their PUBLIC PAGE for visitors to see.
  Full schedule object (weekly template + optional per-date exceptions):
  {
    timezone: "America/New_York" (or any IANA tz),
    enabled: true,
    mon: {open:"09:00", close:"17:00"} or null if closed,
    tue: ..., wed: ..., thu: ..., fri: ..., sat: ..., sun: ...,
    exceptions: [
      {date:"YYYY-MM-DD", closed:true, note:"Christmas"},
      {date:"YYYY-MM-DD", open:"10:00", close:"14:00", note:"Half day"}
    ]
  }
  Time format is 24-hour "HH:MM". null means closed that weekday.
  exceptions override the weekly schedule for specific calendar dates (holidays, leave, special hours).
  When adding/removing exceptions, preserve ALL existing exceptions AND all weekly day entries.
  Examples that require business_hours.exceptions (NOT patch_availability):
    "mark July 10 as closed" → exceptions: [{date:"2026-07-10",closed:true}]
    "I'm closed on Dec 25 for Christmas" → exceptions: [{date:"2026-12-25",closed:true,note:"Christmas"}]
    "I'll be on leave this Friday" → exceptions: [{date:"<resolved>",closed:true,note:"On leave"}]
    "half-day on July 15" → exceptions: [{date:"2026-07-15",open:"09:00",close:"13:00"}]
    "open Mon-Fri 9am to 6pm, closed weekends" → mon..fri with open/close, sat/sun null
- instagram_handle: bare username without @ (e.g. "celinabakes"). Shows Instagram icon on page.
- nextdoor_url: full nextdoor.com business-page URL (must be a valid nextdoor.com URL).

patch_availability: USE THIS ONLY for managing appointment booking slots on the calendar. This does NOT show anything on the public page — use business_hours.exceptions for public-facing closures instead.
- Array of { dayKey: "YYYY-MM-DD", active: boolean, slots: ["09:00","10:00",...] }
- Resolve natural language ("next Monday", "this Friday") to YYYY-MM-DD using TODAY'S DATE above.
- active:true = day is open; active:false = closed. slots use 24h format.
- To add slots include all existing slots PLUS the new ones.
delete_availability: array of "YYYY-MM-DD" strings to remove entirely from the booking calendar (different from business_hours exceptions).

new_ad: { title: string, description?: string, linkUrl?: string } — Thrive+ plan only.
- No image upload via WhatsApp — text/link ads only.
- For Grow members, explain it is a Thrive feature. Leave new_ad as null.

Rules:
- Always return the COMPLETE array for services / highlights / faq (never partial)
- For business_hours: always return the COMPLETE object with all 7 days AND preserve all existing exceptions
- WhatsApp edits go live immediately
- When changes are made, your message should clearly state what was updated (e.g. "Got it! Haircut is now $30 and eyebrow threading is $15.")
- For things you cannot do (upload photo, change colour/layout/template), say so briefly and tell them to open My Chat at kryla.work/mychat
- Keep message short — this is WhatsApp
- If the request is unclear, ask one short clarifying question
- Leave patch_pages and patch_providers as empty objects {} when no change is needed
- Leave set_language, patch_availability, delete_availability, new_ad as null when not used

Current page content:
{{PROFILE}}`

async function handleInbound(senderPhone: string, messageText: string, audioId?: string) {
  // Look up provider by whatsapp_number — stored as bare digits matching Meta's format
  const { data: matches } = await supabaseAdmin
    .from('providers')
    .select('id, slug, first_name, plan, wa_undo, page_language, instagram_handle, nextdoor_url')
    .eq('whatsapp_number', senderPhone)

  if (!matches || matches.length === 0) {
    await sendWhatsAppMessage({
      to: senderPhone,
      text: "This number isn't linked to a Kryla account. Visit kryla.work to get started.",
    })
    return
  }

  if (matches.length > 1) {
    await sendWhatsAppMessage({
      to: senderPhone,
      text: "This number is linked to more than one Kryla page. Please make changes from your dashboard at kryla.work.",
    })
    return
  }

  const provider = matches[0]

  // ── Plan gate — Thrive+ only ─────────────────────────────────────────────
  const gate = await getPlanGate()
  if (!gate.allows('whatsapp_edit', provider.plan ?? 'grow')) {
    await sendWhatsAppMessage({
      to: senderPhone,
      text: `Hi ${provider.first_name}! WhatsApp editing is available on the Thrive plan and above. Upgrade at kryla.work/${provider.slug} to unlock it.`,
    })
    return
  }

  // ── Voice note transcription (Thrive+ gate already passed above) ─────────
  if (audioId && !messageText) {
    try {
      const { bytes, mimeType } = await downloadWhatsAppMedia(audioId)
      // Derive file extension from MIME (e.g. "audio/ogg; codecs=opus" → "ogg")
      const ext = mimeType.split('/')[1]?.split(';')[0]?.trim() ?? 'ogg'
      messageText = await transcribeAudio(bytes, `voice.${ext}`, mimeType)
      // Echo back what we heard so the member can confirm before the edit applies
      await sendWhatsAppMessage({
        to: senderPhone,
        text: `🎙 Heard: "${messageText}"`,
      })
    } catch (err) {
      console.error('[wa-webhook] voice transcription failed:', err)
      const errMsg =
        err instanceof TranscribeError && err.code === 'no_key'
          ? "Voice messages aren't set up yet. Please type your request for now."
          : "Sorry, I couldn't understand that voice note. Please type your request or resend the voice note."
      await sendWhatsAppMessage({ to: senderPhone, text: errMsg })
      return
    }
  }

  // ── PUBLISH command — flush pending mychat draft to live ─────────────────
  if (/^publish$/i.test(messageText)) {
    await applyDraftAndPublish(provider.id, provider.slug)
    await sendWhatsAppMessage({
      to: senderPhone,
      text: `Published! Your page is live at kryla.work/${provider.slug}`,
    })
    return
  }

  // ── UNDO command — revert the last WhatsApp edit ─────────────────────────
  if (/^undo$/i.test(messageText)) {
    type UndoShape = { pages?: Record<string, unknown>; providers?: Record<string, unknown>; at?: string }
    const undo = provider.wa_undo as UndoShape | null

    if (!undo?.at) {
      await sendWhatsAppMessage({ to: senderPhone, text: "Nothing to undo — no recent WhatsApp edit found." })
      return
    }

    const ageMs = Date.now() - new Date(undo.at).getTime()
    if (ageMs > 10 * 60 * 1000) {
      await sendWhatsAppMessage({ to: senderPhone, text: "The 10-minute undo window has passed. Changes are locked in." })
      return
    }

    if (undo.pages && Object.keys(undo.pages).length > 0) {
      await supabaseAdmin.from('pages').update(undo.pages).eq('provider_id', provider.id)
    }
    if (undo.providers && Object.keys(undo.providers).length > 0) {
      const allowed = ['location', 'business_hours', 'page_language', 'instagram_handle', 'nextdoor_url']
      const safe = Object.fromEntries(Object.entries(undo.providers).filter(([k]) => allowed.includes(k)))
      if (Object.keys(safe).length > 0) {
        await supabaseAdmin.from('providers').update(safe).eq('id', provider.id)
      }
    }

    await supabaseAdmin.from('providers').update({ wa_undo: null }).eq('id', provider.id)
    revalidatePath(`/${provider.slug}`)
    await sendWhatsAppMessage({ to: senderPhone, text: "Done! Your last change has been reverted." })
    return
  }

  // ── Fetch current live content for AI context ────────────────────────────
  const [{ data: page }, { data: prov }, { data: availRows }, { data: bookingRows }] = await Promise.all([
    supabaseAdmin
      .from('pages')
      .select('headline, subheadline, bio, cta_primary, cta_secondary, services, highlights, faq, translations')
      .eq('provider_id', provider.id)
      .single(),
    supabaseAdmin
      .from('providers')
      .select('location, business_hours, page_language, instagram_handle, nextdoor_url')
      .eq('id', provider.id)
      .single(),
    supabaseAdmin
      .from('availability')
      .select('day_key, active, slots')
      .eq('provider_id', provider.id)
      .order('day_key'),
    supabaseAdmin
      .from('bookings')
      .select('id, created_at, customer_name, client_email, customer_phone, service, preferred_date, status')
      .eq('provider_id', provider.id)
      .order('created_at', { ascending: false })
      .limit(15),
  ])

  const bookings = (bookingRows ?? []).map(b => ({
    id:       b.id,
    customer: b.customer_name,
    email:    b.client_email ?? null,
    phone:    b.customer_phone ?? null,
    service:  b.service,
    date:     b.preferred_date ?? null,
    status:   b.status,
  }))

  const profile = {
    firstName:       provider.first_name,
    location:        prov?.location          ?? null,
    business_hours:  prov?.business_hours    ?? null,
    page_language:   prov?.page_language     ?? 'en',
    instagram_handle: prov?.instagram_handle ?? null,
    nextdoor_url:    prov?.nextdoor_url       ?? null,
    availability:    availRows               ?? [],
    bookings,
    ...(page ?? {}),
  }

  const today = new Date().toISOString().slice(0, 10)
  const systemPrompt = WA_SYSTEM_PROMPT
    .replace('{{TODAY}}', today)
    .replace('{{PROFILE}}', JSON.stringify(profile, null, 2))

  const completion = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: 'user', content: messageText }],
  })

  const raw = completion.content[0].type === 'text' ? completion.content[0].text : ''

  let parsed: {
    message: string
    patch_pages?: Record<string, unknown>
    patch_providers?: Record<string, unknown>
    set_language?: string | null
    patch_availability?: { dayKey: string; active: boolean; slots: string[] }[] | null
    delete_availability?: string[] | null
    new_ad?: { title: string; description?: string; linkUrl?: string } | null
    patch_booking?: { id: string; status: string } | null
    new_suggestion?: string | null
  }
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
  } catch {
    await sendWhatsAppMessage({
      to: senderPhone,
      text: "Got your message! Could you rephrase what you'd like to update on your page?",
    })
    return
  }

  const {
    message,
    patch_pages        = {},
    patch_providers    = {},
    set_language       = null,
    patch_availability = null,
    delete_availability = null,
    new_ad             = null,
    patch_booking      = null,
    new_suggestion     = null,
  } = parsed

  console.log('[wa] patch_providers keys:', Object.keys(patch_providers))
  console.log('[wa] patch_availability:', patch_availability ? JSON.stringify(patch_availability) : 'null')
  if (patch_providers?.business_hours) {
    const bh = patch_providers.business_hours as Record<string, unknown>
    console.log('[wa] business_hours.enabled:', bh.enabled, '| exceptions count:', Array.isArray(bh.exceptions) ? (bh.exceptions as unknown[]).length : 'none')
  }

  const allowedPages     = ['headline', 'subheadline', 'bio', 'cta_primary', 'cta_secondary', 'services', 'highlights', 'faq']
  const allowedProviders = ['location', 'business_hours', 'instagram_handle', 'nextdoor_url']

  const safePatchPages = Object.fromEntries(
    Object.entries(patch_pages).filter(([k]) => allowedPages.includes(k))
  )

  const safePatchProviders: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch_providers)) {
    if (!allowedProviders.includes(k)) continue
    if (k === 'instagram_handle' && typeof v === 'string') {
      const h = normalizeHandle(v)
      if (h) safePatchProviders[k] = h
    } else if (k === 'nextdoor_url' && typeof v === 'string') {
      const u = normalizeNextdoorUrl(v)
      if (u) safePatchProviders[k] = u
    } else if (k === 'business_hours' && v && typeof v === 'object' && !Array.isArray(v)) {
      // Always force enabled:true via WhatsApp — if you're asking to mark a closure you want it visible
      const bh = v as Record<string, unknown>
      safePatchProviders[k] = { ...bh, enabled: true }
    } else {
      safePatchProviders[k] = v
    }
  }

  const hasPageChanges     = Object.keys(safePatchPages).length > 0
  const hasProviderChanges = Object.keys(safePatchProviders).length > 0

  // ── Language change (live immediately) ──────────────────────────────────
  const validLangs = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'mr', 'gu', 'es']
  const LANG_NAMES: Record<string, string> = {
    hi: 'Hindi', ta: 'Tamil', te: 'Telugu', kn: 'Kannada',
    ml: 'Malayalam', mr: 'Marathi', gu: 'Gujarati', es: 'Spanish',
  }
  if (set_language && validLangs.includes(set_language)) {
    if (set_language === 'en') {
      await supabaseAdmin.from('providers').update({ page_language: 'en' }).eq('id', provider.id)
    } else {
      const langName = LANG_NAMES[set_language]
      if (page && langName) {
        const content = {
          headline:      (page as Record<string,unknown>).headline      ?? '',
          subheadline:   (page as Record<string,unknown>).subheadline   ?? '',
          bio:           (page as Record<string,unknown>).bio           ?? '',
          cta_primary:   (page as Record<string,unknown>).cta_primary   ?? '',
          cta_secondary: (page as Record<string,unknown>).cta_secondary ?? '',
          services:  (Array.isArray((page as Record<string,unknown>).services)   ? (page as Record<string,unknown>).services   as unknown[] : []).map((s) => ({ name: (s as Record<string,unknown>).name ?? '', description: (s as Record<string,unknown>).description ?? '' })),
          highlights: (Array.isArray((page as Record<string,unknown>).highlights) ? (page as Record<string,unknown>).highlights as unknown[] : []).map((h) => ({ title: (h as Record<string,unknown>).title ?? '', body: (h as Record<string,unknown>).body ?? '' })),
          faq:        (Array.isArray((page as Record<string,unknown>).faq)        ? (page as Record<string,unknown>).faq        as unknown[] : []).map((f) => ({ question: (f as Record<string,unknown>).question ?? '', answer: (f as Record<string,unknown>).answer ?? '' })),
        }
        try {
          const tc = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            messages: [{ role: 'user', content: `Translate the following JSON to ${langName}. Return ONLY valid JSON in exactly the same shape. Keep all JSON keys in English. Do not translate proper nouns, brand names, currency. Keep arrays same length.\n\n${JSON.stringify(content, null, 2)}` }],
          })
          const tRaw = tc.content[0].type === 'text' ? tc.content[0].text : ''
          const tMatch = tRaw.match(/\{[\s\S]*\}/)
          const translated = JSON.parse(tMatch ? tMatch[0] : tRaw)
          const existing = (((page as Record<string,unknown>).translations ?? {}) as Record<string, unknown>)
          await Promise.all([
            supabaseAdmin.from('pages').update({ translations: { ...existing, [set_language]: translated } }).eq('provider_id', provider.id),
            supabaseAdmin.from('providers').update({ page_language: set_language }).eq('id', provider.id),
          ])
        } catch (err) {
          console.error('[wa-webhook] translation failed:', err)
        }
      }
    }
    revalidatePath(`/${provider.slug}`)
    await sendWhatsAppMessage({ to: senderPhone, text: message })
    return
  }

  // ── Booking status update (live immediately) ────────────────────────────
  const validStatuses = ['accepted', 'rejected', 'cancelled']
  if (patch_booking?.id && patch_booking?.status && validStatuses.includes(patch_booking.status)) {
    const { data: bk } = await supabaseAdmin
      .from('bookings')
      .select('customer_name, client_email, customer_phone, service, preferred_date')
      .eq('id', patch_booking.id)
      .eq('provider_id', provider.id)
      .single()

    const { error: bkErr } = await supabaseAdmin
      .from('bookings')
      .update({ status: patch_booking.status, status_updated_at: new Date().toISOString() })
      .eq('id', patch_booking.id)
      .eq('provider_id', provider.id)

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
                <p style="color:#666;font-size:13px">Reach out on WhatsApp: <a href="https://wa.me/${senderPhone}" style="color:#F5A623">+${senderPhone}</a></p>
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
        console.error('[wa-webhook] booking email failed (non-fatal):', err)
      }
    }

    // On accept: append a tap-to-chat link for the customer
    let memberReply = message
    if (patch_booking.status === 'accepted') {
      const custLink = waLink(bk?.customer_phone)
      if (custLink && bk?.customer_name) {
        memberReply = memberReply.trimEnd() + `\n\n💬 Message ${bk.customer_name}: ${custLink}`
      }
    }
    await sendWhatsAppMessage({ to: senderPhone, text: memberReply })
    return
  }

  // ── Suggestions capture (live immediately, non-fatal) ───────────────────
  if (new_suggestion?.trim()) {
    try {
      await supabaseAdmin.from('suggestions').insert({ provider_id: provider.id, description: new_suggestion.trim() })
    } catch { /* non-fatal */ }
    await sendWhatsAppMessage({ to: senderPhone, text: message })
    return
  }

  const hasAvailability = Array.isArray(patch_availability) && patch_availability.length > 0
  const hasDeleteAvail  = Array.isArray(delete_availability) && delete_availability.length > 0
  const hasNewAd        = !!(new_ad?.title?.trim())

  if (!hasPageChanges && !hasProviderChanges && !hasAvailability && !hasDeleteAvail && !hasNewAd) {
    // No changes — just send the AI reply (e.g. clarifying question or "can't do that")
    await sendWhatsAppMessage({ to: senderPhone, text: message })
    return
  }

  // ── Capture undo snapshot of current values ──────────────────────────────
  const undoPages: Record<string, unknown>     = {}
  const undoProviders: Record<string, unknown> = {}

  if (hasPageChanges) {
    for (const k of Object.keys(safePatchPages)) {
      undoPages[k] = (page as Record<string, unknown> | null)?.[k] ?? null
    }
  }
  if (hasProviderChanges) {
    for (const k of Object.keys(safePatchProviders)) {
      undoProviders[k] = (prov as Record<string, unknown> | null)?.[k] ?? null
    }
  }

  // ── Write changes ────────────────────────────────────────────────────────
  if (hasPageChanges) {
    await supabaseAdmin.from('pages').update(safePatchPages).eq('provider_id', provider.id)
  }
  if (hasProviderChanges) {
    await supabaseAdmin.from('providers').update(safePatchProviders).eq('id', provider.id)
  }

  // ── Availability upserts (live immediately) ──────────────────────────────
  if (hasAvailability) {
    for (const entry of patch_availability!) {
      if (!entry.dayKey || !/^\d{4}-\d{2}-\d{2}$/.test(entry.dayKey)) continue
      await supabaseAdmin
        .from('availability')
        .upsert(
          { provider_id: provider.id, day_key: entry.dayKey, active: entry.active ?? true, slots: entry.slots ?? [], updated_at: new Date().toISOString() },
          { onConflict: 'provider_id,day_key' }
        )
    }
  }

  // ── Availability deletes (live immediately) ──────────────────────────────
  if (hasDeleteAvail) {
    for (const dayKey of delete_availability!) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) continue
      await supabaseAdmin.from('availability').delete().eq('provider_id', provider.id).eq('day_key', dayKey)
    }
  }

  // ── New ad (live immediately, plan-gated) ────────────────────────────────
  if (hasNewAd) {
    const gate = await getPlanGate()
    if (gate.allows('ads', provider.plan ?? 'grow')) {
      await supabaseAdmin.from('ads').insert({
        provider_id: provider.id,
        title:       new_ad!.title.trim().slice(0, 100),
        description: new_ad!.description?.trim().slice(0, 500) ?? null,
        link_url:    new_ad!.linkUrl ?? null,
        status:      'approved',
      })
    }
  }

  // Save undo snapshot on provider row
  await supabaseAdmin.from('providers').update({
    wa_undo: {
      pages:     undoPages,
      providers: undoProviders,
      at:        new Date().toISOString(),
    },
  }).eq('id', provider.id)

  revalidatePath(`/${provider.slug}`)

  // Append undo hint to reply
  const replyText = message.trimEnd() + '\n\nReply UNDO within 10 min to revert.'
  await sendWhatsAppMessage({ to: senderPhone, text: replyText })
}

// ── Publish: apply any pending mychat draft_data to live tables ───────────────
async function applyDraftAndPublish(providerId: string, slug: string) {
  const { data: pageRow } = await supabaseAdmin
    .from('pages')
    .select('draft_data')
    .eq('provider_id', providerId)
    .single()

  type DraftShape = { pages?: Record<string, unknown>; providers?: Record<string, unknown> }
  const draft = (pageRow?.draft_data ?? {}) as DraftShape
  const dp  = draft.pages     ?? {}
  const dpr = draft.providers ?? {}

  if (Object.keys(dp).length > 0) {
    await supabaseAdmin.from('pages').update(dp).eq('provider_id', providerId)
  }

  const allowed = ['location', 'whatsapp_number', 'business_hours', 'instagram_handle', 'nextdoor_url']
  const safe = Object.fromEntries(Object.entries(dpr).filter(([k]) => allowed.includes(k)))
  if (Object.keys(safe).length > 0) {
    await supabaseAdmin.from('providers').update(safe).eq('id', providerId)
  }

  await supabaseAdmin.from('pages').update({ draft_data: null }).eq('provider_id', providerId)
  revalidatePath(`/${slug}`)
}
