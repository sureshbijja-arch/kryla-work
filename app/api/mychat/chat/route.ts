import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { getPlanGate } from '@/lib/plans'
import { normalizeHandle, normalizeNextdoorUrl } from '@/lib/social'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

const anthropic = new Anthropic()

const LANG_NAMES: Record<string, string> = {
  hi: 'Hindi', ta: 'Tamil', te: 'Telugu', kn: 'Kannada',
  ml: 'Malayalam', mr: 'Marathi', gu: 'Gujarati', es: 'Spanish',
}

const SYSTEM_PROMPT = `You are Kryla's member assistant. You help members manage both their public presence page and their day-to-day business — all in one conversation.

You MUST respond with ONLY valid JSON — no extra text before or after. Shape:
{
  "message": "string — your warm, plain-English reply (2-4 sentences max)",
  "patch_pages": {},
  "patch_providers": {},
  "patch_booking": null,
  "set_language": null,
  "patch_availability": null,
  "delete_availability": null,
  "new_ad": null,
  "suggest_tab": null,
  "suggest_design_tab": null,
  "new_suggestion": null
}

patch_booking shape: { "id": "<booking-uuid>", "status": "accepted" | "rejected" | "cancelled" }
set_language: ISO code — "en" | "hi" | "ta" | "te" | "kn" | "ml" | "mr" | "gu" | "es" — or null
patch_availability: array of { dayKey: "YYYY-MM-DD", active: boolean, slots: ["09:00","10:00",...] } — or null
delete_availability: array of "YYYY-MM-DD" strings to remove — or null
new_ad: { title: string, description?: string, linkUrl?: string } — or null (Thrive+ only)
suggest_tab: "design" | "messages" | "bookings" | "plan" | "suggestions" — or null (NEVER auto-navigate)
suggest_design_tab: "services" | "sections" | "layouts" | "ads" | "media" — or null (only with suggest_tab "design")
new_suggestion: plain-English Kryla platform feature wish — or null

TODAY'S DATE: {TODAY}

═══════════════════════════════════════════
WHAT YOU CAN DO DIRECTLY FROM CHAT
═══════════════════════════════════════════

── Page content (saved as draft → member clicks Publish to go live) ──
patch_pages fields:
- headline, subheadline, bio, cta_primary, cta_secondary
- services (full array: [{name, description, price, duration_or_unit}])
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

── Provider settings (saved as draft → Publish to go live) ──
patch_providers fields:
- whatsapp_number (digits with country code — stored as bare digits)
- location (city or full address — becomes a clickable Google Maps link)
- business_hours: full object {timezone, enabled, mon..sun: {open:"HH:MM", close:"HH:MM"} | null}
  Days with no hours → null. Use "HH:MM" 24h format. Return the COMPLETE object.
  Example: {"timezone":"America/Chicago","enabled":true,"mon":{"open":"09:00","close":"17:00"},"tue":{"open":"09:00","close":"17:00"},"wed":null,"thu":{"open":"09:00","close":"17:00"},"fri":{"open":"09:00","close":"17:00"},"sat":null,"sun":null}
- instagram_handle: bare username without @ (e.g. "celinabakes"). Shows Instagram icon on page.
- nextdoor_url: full nextdoor.com business-page URL. Shows Nextdoor icon on page. Must be a valid nextdoor.com URL.

── Language (takes effect immediately — triggers full page translation) ──
set_language: ISO code string.
- "en" resets to English (no translation call).
- Other codes translate ALL page content (headline, bio, services, etc.) into that language.
- Options: en (English), hi (Hindi), ta (Tamil), te (Telugu), kn (Kannada), ml (Malayalam), mr (Marathi), gu (Gujarati), es (Spanish)
- Current language is shown in member context below.

── Availability / schedule (takes effect immediately) ──
patch_availability: set or update specific dates.
- Resolve natural language ("next Monday", "this Friday") to YYYY-MM-DD using TODAY'S DATE above.
- slots: array of time strings e.g. ["09:00","10:00","14:00"] (24h, on the hour or half-hour).
- active:true means the day is open; active:false means closed.
- To close a date: { dayKey:"YYYY-MM-DD", active:false, slots:[] }
- To add slots: include all existing slots PLUS the new ones.
delete_availability: remove a date entirely (different from closing — deletes the row).

── Ads (takes effect immediately — Thrive+ plan only) ──
new_ad: { title, description?, linkUrl? }
- Only set this for Thrive/Elevate plan members. For Grow members, explain it's a Thrive feature.
- No image upload via chat — Chat can create text/link ads only.
- After creating, confirm and let member know it's live.

Member's media (read-only — uploaded via Media tab):
- avatarUrl: profile photo. If set, suggest "photo" or "split" hero variant.
- gallery: array of image URLs.

═══════════════════════════════════════════
WHAT REQUIRES A DIFFERENT TAB
═══════════════════════════════════════════

DESIGN → Media tab (Chat CANNOT do these — file upload required):
  Upload/change profile photo, gallery images, service images.
  When asked: explain it's an upload and offer to take them to Media tab (suggest_tab:"design", suggest_design_tab:"media").

MY PLAN tab (Chat CANNOT do this — payment required):
  Upgrade plan. When asked: offer to take them to the Plan tab (suggest_tab:"plan").

MESSAGES tab:
  Chat can summarise customer WhatsApp threads and draft reply wording, but the member sends from Messages tab.
  When asked to "reply to [customer]": draft the wording in your message reply, then offer to take them to Messages tab.

BOOKINGS tab:
  View all bookings. Accept, reject, or cancel from here or from Chat via patch_booking.

SUGGESTIONS tab:
  Submit Kryla platform feature wishes. When member expresses a wish, set new_suggestion and offer to take them there.

═══════════════════════════════════════════
RULES
═══════════════════════════════════════════
- Do all page/provider/language/hours/availability/ad edits DIRECTLY — never send to a tab for these
- NEVER auto-switch tabs. Always ask first. Member clicks the button to confirm.
- Lists (services, highlights, faq, sections): ALWAYS return the FULL array
- show_sections: return the full object when any field changes
- business_hours: return the COMPLETE object for ALL days (even unchanged ones)
- Hero with photo: if avatarUrl set → suggest/apply "photo" or "split" variant; if null → tell them to upload in Design → Media
- Location: if member says "add map" or "add directions" → use existing location or ask for it
- Bookings: when member says "accept/reject/cancel [name]'s booking" → set patch_booking. If ambiguous, list matches and ask.
- Never say "AI" — you are Kryla
- Keep message warm, plain English, 2-4 sentences
- For Kryla platform wishes, set new_suggestion`

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

  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, slug, email, avatar_url, first_name, whatsapp_number, page_language, plan, business_hours, instagram_handle, nextdoor_url')
    .eq('id', providerId)
    .eq('email', user.email)
    .single()

  if (!provider) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const [pageRow, bookingsRow, messagesRow, adsRow, availabilityRow] = await Promise.all([
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

    supabaseAdmin
      .from('availability')
      .select('day_key, active, slots')
      .eq('provider_id', providerId)
      .order('day_key'),
  ])

  type DraftShape = { pages?: Record<string, unknown>; providers?: Record<string, unknown> }
  const draft = (pageRow.data?.draft_data ?? {}) as DraftShape
  const dp    = draft.pages ?? {}
  const gallery = Array.isArray(pageRow.data?.gallery) ? pageRow.data.gallery : []

  const enrichedProfile = {
    ...currentProfile,
    ...dp,
    avatarUrl:       provider.avatar_url     ?? null,
    gallery,
    businessHours:   provider.business_hours ?? null,
    instagramHandle: provider.instagram_handle ?? null,
    nextdoorUrl:     provider.nextdoor_url   ?? null,
    pageLanguage:    provider.page_language  ?? 'en',
  }

  const bookings   = bookingsRow.data   ?? []
  const waMessages = messagesRow.data   ?? []
  const ads        = adsRow.data        ?? []
  const availability = availabilityRow.data ?? []

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
    availability,
  }

  const pageLang = (provider.page_language as string) ?? 'en'
  const langInstruction = pageLang !== 'en'
    ? `\nLanguage: respond in whichever language the member writes in. Their preferred language is ${LANG_NAMES[pageLang] ?? pageLang} but if they write in English, reply in English.`
    : ''

  const today = new Date().toISOString().slice(0, 10)
  const promptWithDate = SYSTEM_PROMPT.replace('{TODAY}', today)

  const systemWithContext = `${promptWithDate}${langInstruction}

Current page content (JSON):
${JSON.stringify(enrichedProfile, null, 2)}

Business data (bookings, messages, ads, availability):
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
    set_language: string | null
    patch_availability: { dayKey: string; active: boolean; slots: string[] }[] | null
    delete_availability: string[] | null
    new_ad: { title: string; description?: string; linkUrl?: string } | null
    suggest_tab: string | null
    suggest_design_tab: string | null
    new_suggestion: string | null
  }
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
  } catch {
    return NextResponse.json({ message: raw, changed: false })
  }

  const {
    message,
    patch_pages       = {},
    patch_providers   = {},
    patch_booking     = null,
    set_language      = null,
    patch_availability = null,
    delete_availability = null,
    new_ad            = null,
    suggest_tab       = null,
    suggest_design_tab = null,
    new_suggestion    = null,
  } = parsed

  // ── Normalise provider patch ────────────────────────────────────────────────
  const allowed = ['whatsapp_number', 'location', 'business_hours', 'instagram_handle', 'nextdoor_url']
  const safePatchProviders: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch_providers)) {
    if (!allowed.includes(k)) continue
    if (k === 'whatsapp_number' && typeof v === 'string') {
      safePatchProviders[k] = v.replace(/\D/g, '')
    } else if (k === 'instagram_handle' && typeof v === 'string') {
      const h = normalizeHandle(v)
      if (h) safePatchProviders[k] = h
    } else if (k === 'nextdoor_url' && typeof v === 'string') {
      const u = normalizeNextdoorUrl(v)
      if (u) safePatchProviders[k] = u
    } else if (k === 'business_hours' && v && typeof v === 'object' && !Array.isArray(v)) {
      // Default enabled:true when AI omits the flag — ensures hours show on the page
      const bh = v as Record<string, unknown>
      safePatchProviders[k] = bh['enabled'] === undefined ? { ...bh, enabled: true } : bh
    } else {
      safePatchProviders[k] = v
    }
  }

  let changed = false

  // ── Page + provider draft update ────────────────────────────────────────────
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

  // ── Language change (live immediately) ─────────────────────────────────────
  if (set_language) {
    const validLangs = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'mr', 'gu', 'es']
    if (validLangs.includes(set_language)) {
      if (set_language === 'en') {
        await supabaseAdmin.from('providers').update({ page_language: 'en' }).eq('id', providerId)
      } else {
        const langName = LANG_NAMES[set_language]
        const { data: page } = await supabaseAdmin
          .from('pages')
          .select('headline, subheadline, bio, cta_primary, cta_secondary, services, highlights, faq, translations')
          .eq('provider_id', providerId)
          .single()

        if (page) {
          const content = {
            headline:      page.headline      ?? '',
            subheadline:   page.subheadline   ?? '',
            bio:           page.bio           ?? '',
            cta_primary:   page.cta_primary   ?? '',
            cta_secondary: page.cta_secondary ?? '',
            services:  (Array.isArray(page.services)   ? page.services   : []).map((s: Record<string, unknown>) => ({ name: s.name ?? '', description: s.description ?? '' })),
            highlights: (Array.isArray(page.highlights) ? page.highlights : []).map((h: Record<string, unknown>) => ({ title: h.title ?? '', body: h.body ?? '' })),
            faq:        (Array.isArray(page.faq)        ? page.faq        : []).map((f: Record<string, unknown>) => ({ question: f.question ?? '', answer: f.answer ?? '' })),
          }

          try {
            const tc = await anthropic.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 4096,
              messages: [{
                role: 'user',
                content: `Translate the following JSON to ${langName}. Return ONLY valid JSON in exactly the same shape. Rules:
- Keep all JSON keys in English exactly as-is
- Do not translate proper nouns, brand names, currency, contact info
- Keep arrays the same length and order
- Do not add or remove fields

${JSON.stringify(content, null, 2)}`,
              }],
            })
            const tRaw = tc.content[0].type === 'text' ? tc.content[0].text : ''
            const tMatch = tRaw.match(/\{[\s\S]*\}/)
            const translated = JSON.parse(tMatch ? tMatch[0] : tRaw)
            const existing = ((page.translations ?? {}) as Record<string, unknown>)
            await Promise.all([
              supabaseAdmin.from('pages').update({ translations: { ...existing, [set_language]: translated } }).eq('provider_id', providerId),
              supabaseAdmin.from('providers').update({ page_language: set_language }).eq('id', providerId),
            ])
          } catch (err) {
            console.error('[chat] translation failed (non-fatal):', err)
          }
        }
      }
      revalidatePath(`/${provider.slug}`)
      changed = true
    }
  }

  // ── Availability upserts (live immediately) ─────────────────────────────────
  if (Array.isArray(patch_availability) && patch_availability.length > 0) {
    for (const entry of patch_availability) {
      if (!entry.dayKey || !/^\d{4}-\d{2}-\d{2}$/.test(entry.dayKey)) continue
      await supabaseAdmin
        .from('availability')
        .upsert(
          { provider_id: providerId, day_key: entry.dayKey, active: entry.active ?? true, slots: entry.slots ?? [], updated_at: new Date().toISOString() },
          { onConflict: 'provider_id,day_key' }
        )
    }
    changed = true
  }

  // ── Availability deletes (live immediately) ─────────────────────────────────
  if (Array.isArray(delete_availability) && delete_availability.length > 0) {
    for (const dayKey of delete_availability) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) continue
      await supabaseAdmin
        .from('availability')
        .delete()
        .eq('provider_id', providerId)
        .eq('day_key', dayKey)
    }
    changed = true
  }

  // ── New ad (live immediately, gated) ────────────────────────────────────────
  if (new_ad?.title?.trim()) {
    const gate = await getPlanGate()
    if (gate.allows('ads', provider.plan ?? 'grow')) {
      const { error: adErr } = await supabaseAdmin
        .from('ads')
        .insert({
          provider_id: providerId,
          title:       new_ad.title.trim().slice(0, 100),
          description: new_ad.description?.trim().slice(0, 500) ?? null,
          link_url:    new_ad.linkUrl ?? null,
          status:      'approved',
        })
      if (!adErr) {
        revalidatePath(`/${provider.slug}`)
        changed = true
      }
    }
  }

  // ── Booking status update ───────────────────────────────────────────────────
  if (patch_booking?.id && patch_booking?.status) {
    const validStatuses = ['accepted', 'rejected', 'cancelled']
    if (validStatuses.includes(patch_booking.status)) {
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

  // ── Capture suggestion ──────────────────────────────────────────────────────
  if (new_suggestion?.trim()) {
    try {
      await supabaseAdmin
        .from('suggestions')
        .insert({ provider_id: providerId, description: new_suggestion.trim() })
    } catch {
      // non-fatal
    }
  }

  return NextResponse.json({
    message,
    changed,
    suggestTab:       suggest_tab       ?? undefined,
    suggestDesignTab: suggest_design_tab ?? undefined,
    newSuggestion:    new_suggestion    ?? undefined,
  })
}
