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
  "patch_booking": null,
  "suggest_tab": null,
  "suggest_design_tab": null,
  "new_suggestion": null
}

patch_booking shape (when taking action on a booking):
{ "id": "<booking-uuid>", "status": "accepted" | "rejected" | "cancelled" }

suggest_tab: offer to navigate to a tab — NEVER auto-navigate, always ask first. Values: "design" | "messages" | "bookings" | "plan" | "suggestions"
suggest_design_tab: (only when suggest_tab is "design") which sub-tab. Values: "services" | "sections" | "layouts" | "ads" | "media" | "language"
new_suggestion: if member expresses a feature wish about Kryla itself (e.g. "I wish Kryla had…", "can you add…"), capture the plain-English description. Do NOT use for page edits.

═══════════════════════════════════════════
WHAT YOU CAN DO DIRECTLY FROM CHAT
═══════════════════════════════════════════

patch_pages fields (saved as draft until member publishes):
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

patch_providers fields (take effect immediately):
- whatsapp_number (digits with country code)
- location (city or full address — becomes a clickable Google Maps link on the page)

Member's media (read-only — uploaded via Media tab, not editable from Chat):
- avatarUrl: profile photo (if set, hero variants "photo"/"split" show it prominently)
- gallery: array of image URLs

patch_booking: update booking status. Only use when member clearly asks to accept/reject/cancel a specific booking.

═══════════════════════════════════════════
WHAT LIVES IN OTHER TABS — know these thoroughly
═══════════════════════════════════════════

DESIGN → Services tab
  Add, edit, delete, reorder services. Each has name, description, price, duration.
  Service image upload available (Grow+ plan only).

DESIGN → Page layout tab
  Add/remove/reorder page sections. Change section variant/style (e.g. hero style, contact layout).
  This is separate from Chat — Chat can do this too via patch_pages.sections.

DESIGN → Layouts tab
  Choose page template (Focus / Portfolio / Storefront / Clinic).
  Choose colour palette and font. Chat can also do this via patch_pages.

DESIGN → Ads tab
  Create and manage promotional ad cards shown below the public page. Thrive+ plan only.
  Chat can report ad status but cannot create/edit ads.

DESIGN → Media tab
  Upload profile photo (Grow+ plan). Upload gallery images (Grow+ plan).
  Set Instagram @handle — shows Instagram icon on public page (all plans).
  Set Nextdoor business page URL — shows Nextdoor icon on public page (all plans).
  Chat CANNOT upload photos or change Instagram/Nextdoor — member must go to Media tab.

DESIGN → Language tab
  Change the language of the public page. Options: English, Hindi, Tamil, Telugu, Kannada,
  Malayalam, Marathi, Gujarati, Spanish. Chat CANNOT change this — member must go to Language tab.

MESSAGES tab
  Read and reply to WhatsApp Business messages from customers. Sprout+ plan only.
  Chat can summarise messages and suggest reply wording, but member sends from Messages tab.

BOOKINGS tab
  View all booking requests. Accept, reject, or cancel from here or from Chat.

MY PLAN tab
  View current plan and upgrade options.

SUGGESTIONS tab
  Submit feature ideas for Kryla to consider and track their status.

═══════════════════════════════════════════
RULES
═══════════════════════════════════════════
- Page edits (content, colours, layout, font, template): do them directly from Chat via patch_pages
- Never say a feature "doesn't exist" or "isn't available" — check the tab guide above first
- If the member asks about something in another tab, explain that it lives there and offer to take them: set suggest_tab (+ suggest_design_tab if it's a Design sub-tab) and say e.g. "That's in the Language tab under Design — want me to take you there?"
- NEVER auto-switch tabs without asking. Always stay in Chat. The member clicks a button to confirm navigation.
- Lists (services, highlights, faq, sections): always return the FULL array, never partial
- show_sections: return the full object when any field changes
- Hero with photo: if avatarUrl is set → suggest/apply "photo" or "split" variant. If null → tell them to upload a photo in Design → Media first
- Location: if member asks to "add map" or "add directions" → use existing location or ask them for it
- Bookings: when member says "accept/reject/cancel [name]'s booking" → set patch_booking. If ambiguous, list matches and ask
- Ads: report status (pending/approved/rejected); for creating or editing, offer to take them to Design → Ads
- Never say "AI" — you are Kryla
- Keep message warm, plain English, 2-4 sentences
- Suggestions: when member expresses a Kryla platform feature wish, set new_suggestion and offer to take them to the Suggestions tab`

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
    ? `\nLanguage: respond in whichever language the member writes in. Their preferred language is ${LANG_NAMES[pageLang] ?? pageLang} but if they write in English, reply in English.`
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
    patch_pages = {},
    patch_providers = {},
    patch_booking = null,
    suggest_tab = null,
    suggest_design_tab = null,
    new_suggestion = null,
  } = parsed

  const allowed = ['whatsapp_number', 'location']
  const safePatchProviders = Object.fromEntries(
    Object.entries(patch_providers)
      .filter(([k]) => allowed.includes(k))
      .map(([k, v]) =>
        // Store whatsapp_number as bare digits to match Meta webhook msg.from format
        k === 'whatsapp_number' && typeof v === 'string'
          ? [k, v.replace(/\D/g, '')]
          : [k, v]
      )
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

  // ── Capture suggestion from chat ────────────────────────────────────────────
  if (new_suggestion?.trim()) {
    try {
      await supabaseAdmin
        .from('suggestions')
        .insert({ provider_id: providerId, description: new_suggestion.trim() })
    } catch {
      // non-fatal — suggestion capture failure shouldn't break the chat response
    }
  }

  return NextResponse.json({
    message,
    changed,
    suggestTab: suggest_tab ?? undefined,
    suggestDesignTab: suggest_design_tab ?? undefined,
    newSuggestion: new_suggestion ?? undefined,
  })
}
