import { inngest, BUILD_PAGE_EVENT } from '@/lib/inngest'
import { createServerClient } from '@/lib/supabase'
import { getAllVerticals } from '@/config/verticals'
import { fetchPersonaDefaults } from '@/lib/personas'
import Anthropic from '@anthropic-ai/sdk'
import type { BuildPageJobPayload } from '@/lib/inngest'
import { sendWhatsAppMessage, buildPageLiveMessage, buildInstallLinksMessage } from '@/lib/whatsapp'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Code-derived fallbacks — used only when the DB lookup fails
const TEMPLATE_MAP: Record<string, string> = Object.fromEntries(
  getAllVerticals().map((v) => [v.id, v.defaultTemplate])
)
const PALETTE_MAP: Record<string, string> = Object.fromEntries(
  getAllVerticals().map((v) => [v.id, v.defaultPalette])
)
const DESIGN_MODE_MAP: Record<string, string> = {
  baker: 'craft', chef: 'craft', salon: 'craft', trainer: 'craft', other: 'craft',
  photographer: 'editorial', doctor: 'editorial', musician: 'editorial', tutor: 'editorial',
  advocate: 'editorial',
  // Commerce / storefront expansion — all craft (warm, product-oriented)
  tiffin: 'craft', sellganeshidols: 'craft', makeup: 'craft', tailor: 'craft', mehndi: 'craft',
  maker: 'craft', gifting: 'craft', florist: 'craft', jeweller: 'craft',
  // Distributor personas — editorial (professional B2B feel)
  fmcgdist: 'editorial', pharmadist: 'editorial', electronicsdist: 'editorial',
  autopartsdist: 'editorial', buildingdist: 'editorial', agridist: 'editorial',
  distributor: 'editorial',
  // Agency personas — editorial (professional / portfolio)
  travel: 'editorial', realestate: 'editorial', insurance: 'editorial',
  staffing: 'editorial', marketing: 'editorial', immigration: 'editorial',
  events: 'editorial', logistics: 'editorial', agency: 'editorial',
}

type Section = { sectionKey: string; variant: string; order: number }

// Smart defaults per persona — hero is 'auto' (resolveVariant() picks the right
// layout) for every persona except sellganeshidols, which stores a literal
// variant ('shadu') directly: resolveVariant() only ever transforms 'auto' for
// sectionKey 'hero', so a new literal variant is reachable only by being
// stored here — it can never be auto-selected the way 'photo'/'dark'/etc. are.
const PERSONA_SECTIONS: Record<string, Section[]> = {
  baker: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'menu',      order: 2 },
    { sectionKey: 'gallery',    variant: 'grid',      order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'highlights', variant: 'icons',     order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'enquiry',   order: 7 },
  ],
  chef: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'menu',      order: 2 },
    { sectionKey: 'gallery',    variant: 'grid',      order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'highlights', variant: 'icons',     order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'enquiry',   order: 7 },
  ],
  salon: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'pricing',   order: 2 },
    { sectionKey: 'gallery',    variant: 'scroll',    order: 3 },
    { sectionKey: 'highlights', variant: 'icons',     order: 4 },
    { sectionKey: 'bio',        variant: 'paragraph', order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
  trainer: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'highlights', variant: 'numbered',  order: 2 },
    { sectionKey: 'services',   variant: 'features',  order: 3 },
    { sectionKey: 'bio',        variant: 'accent',    order: 4 },
    { sectionKey: 'faq',        variant: 'accordion', order: 5 },
    { sectionKey: 'contact',    variant: 'both',      order: 6 },
  ],
  photographer: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'gallery',    variant: 'featured',  order: 2 },
    { sectionKey: 'bio',        variant: 'dark',      order: 3 },
    { sectionKey: 'services',   variant: 'list',      order: 4 },
    { sectionKey: 'highlights', variant: 'icons',     order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
  doctor: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'highlights', variant: 'numbered',  order: 2 },
    { sectionKey: 'services',   variant: 'grid',      order: 3 },
    { sectionKey: 'bio',        variant: 'paragraph', order: 4 },
    { sectionKey: 'faq',        variant: 'accordion', order: 5 },
    { sectionKey: 'contact',    variant: 'both',      order: 6 },
  ],
  musician: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'bio',        variant: 'dark',      order: 2 },
    { sectionKey: 'gallery',    variant: 'scroll',    order: 3 },
    { sectionKey: 'services',   variant: 'list',      order: 4 },
    { sectionKey: 'highlights', variant: 'stats',     order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
  tutor: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'highlights', variant: 'numbered',  order: 2 },
    { sectionKey: 'services',   variant: 'features',  order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'reviews',    variant: 'cards',     order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
  advocate: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'highlights', variant: 'numbered',  order: 2 },
    { sectionKey: 'services',   variant: 'grid',      order: 3 },
    { sectionKey: 'bio',        variant: 'paragraph', order: 4 },
    { sectionKey: 'faq',        variant: 'accordion', order: 5 },
    { sectionKey: 'contact',    variant: 'both',      order: 6 },
  ],
  other: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'features',  order: 2 },
    { sectionKey: 'highlights', variant: 'icons',     order: 3 },
    { sectionKey: 'bio',        variant: 'paragraph', order: 4 },
    { sectionKey: 'faq',        variant: 'accordion', order: 5 },
    { sectionKey: 'contact',    variant: 'both',      order: 6 },
  ],
  // ── Commerce / storefront expansion ──────────────────────────────────────
  // Service/booking personas (pricing layout + booking section)
  tiffin: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'pricing',   order: 2 },
    { sectionKey: 'gallery',    variant: 'grid',      order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'highlights', variant: 'icons',     order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
  makeup: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'pricing',   order: 2 },
    { sectionKey: 'gallery',    variant: 'scroll',    order: 3 },
    { sectionKey: 'highlights', variant: 'icons',     order: 4 },
    { sectionKey: 'bio',        variant: 'paragraph', order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
  tailor: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'pricing',   order: 2 },
    { sectionKey: 'gallery',    variant: 'scroll',    order: 3 },
    { sectionKey: 'highlights', variant: 'icons',     order: 4 },
    { sectionKey: 'bio',        variant: 'paragraph', order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
  mehndi: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'pricing',   order: 2 },
    { sectionKey: 'gallery',    variant: 'scroll',    order: 3 },
    { sectionKey: 'highlights', variant: 'icons',     order: 4 },
    { sectionKey: 'bio',        variant: 'paragraph', order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
  // Ganesh idol-seller signature (see HeroSection.tsx's HeroShadu, ServicesSection.tsx's
  // Sizes): hero 'auto' would otherwise resolve to 'photo' here (default_gallery
  // was previously 4 seeded images), never 'dark' — so 'auto' was never actually
  // giving this persona the flat-field look. 'shadu'/'sizes' are literal, not
  // auto-selectable; gallery section stays so a member's first real uploaded
  // photo still appears there (default_gallery is now emptied, see the
  // 20260731090000 migration — GallerySection renders nothing for an empty array).
  sellganeshidols: [
    { sectionKey: 'hero',       variant: 'shadu',     order: 1 },
    { sectionKey: 'facts',      variant: 'strip',     order: 2 },
    { sectionKey: 'services',   variant: 'sizes',     order: 3 },
    { sectionKey: 'gallery',    variant: 'grid',      order: 4 },
    { sectionKey: 'bio',        variant: 'callout',   order: 5 },
    { sectionKey: 'highlights', variant: 'icons',     order: 6 },
    { sectionKey: 'faq',        variant: 'accordion', order: 7 },
    { sectionKey: 'contact',    variant: 'enquiry',   order: 8 },
  ],
  maker: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'menu',      order: 2 },
    { sectionKey: 'gallery',    variant: 'grid',      order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'highlights', variant: 'icons',     order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'enquiry',   order: 7 },
  ],
  gifting: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'menu',      order: 2 },
    { sectionKey: 'gallery',    variant: 'grid',      order: 3 },
    { sectionKey: 'highlights', variant: 'icons',     order: 4 },
    { sectionKey: 'bio',        variant: 'paragraph', order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'enquiry',   order: 7 },
  ],
  florist: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'menu',      order: 2 },
    { sectionKey: 'gallery',    variant: 'grid',      order: 3 },
    { sectionKey: 'highlights', variant: 'icons',     order: 4 },
    { sectionKey: 'bio',        variant: 'paragraph', order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
  jeweller: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'menu',      order: 2 },
    { sectionKey: 'gallery',    variant: 'grid',      order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'highlights', variant: 'icons',     order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'enquiry',   order: 7 },
  ],
  // ── Distributor personas — storefront layout
  // hero(auto) → services(menu) → gallery(grid) → bio(callout) → highlights(icons) → faq → contact
  fmcgdist: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'menu',      order: 2 },
    { sectionKey: 'gallery',    variant: 'grid',      order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'highlights', variant: 'icons',     order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'enquiry',   order: 7 },
  ],
  pharmadist: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'menu',      order: 2 },
    { sectionKey: 'gallery',    variant: 'grid',      order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'highlights', variant: 'icons',     order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'enquiry',   order: 7 },
  ],
  electronicsdist: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'menu',      order: 2 },
    { sectionKey: 'gallery',    variant: 'grid',      order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'highlights', variant: 'icons',     order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'enquiry',   order: 7 },
  ],
  autopartsdist: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'menu',      order: 2 },
    { sectionKey: 'highlights', variant: 'icons',     order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'faq',        variant: 'accordion', order: 5 },
    { sectionKey: 'contact',    variant: 'enquiry',   order: 6 },
  ],
  buildingdist: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'menu',      order: 2 },
    { sectionKey: 'highlights', variant: 'icons',     order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'faq',        variant: 'accordion', order: 5 },
    { sectionKey: 'contact',    variant: 'enquiry',   order: 6 },
  ],
  agridist: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'menu',      order: 2 },
    { sectionKey: 'highlights', variant: 'icons',     order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'faq',        variant: 'accordion', order: 5 },
    { sectionKey: 'contact',    variant: 'enquiry',   order: 6 },
  ],
  distributor: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'menu',      order: 2 },
    { sectionKey: 'highlights', variant: 'icons',     order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'faq',        variant: 'accordion', order: 5 },
    { sectionKey: 'contact',    variant: 'enquiry',   order: 6 },
  ],
  // ── Agency personas — portfolio style (gallery-forward)
  travel: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'gallery',    variant: 'grid',      order: 2 },
    { sectionKey: 'services',   variant: 'grid',      order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'highlights', variant: 'icons',     order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
  realestate: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'gallery',    variant: 'grid',      order: 2 },
    { sectionKey: 'services',   variant: 'grid',      order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'highlights', variant: 'icons',     order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
  marketing: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'gallery',    variant: 'masonry',   order: 2 },
    { sectionKey: 'services',   variant: 'grid',      order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'highlights', variant: 'icons',     order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
  events: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'gallery',    variant: 'grid',      order: 2 },
    { sectionKey: 'services',   variant: 'grid',      order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'highlights', variant: 'icons',     order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
  // ── Agency personas — focus style (services-first)
  insurance: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'list',      order: 2 },
    { sectionKey: 'highlights', variant: 'icons',     order: 3 },
    { sectionKey: 'bio',        variant: 'paragraph', order: 4 },
    { sectionKey: 'faq',        variant: 'accordion', order: 5 },
    { sectionKey: 'booking',    variant: 'minimal',   order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
  staffing: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'list',      order: 2 },
    { sectionKey: 'highlights', variant: 'icons',     order: 3 },
    { sectionKey: 'bio',        variant: 'paragraph', order: 4 },
    { sectionKey: 'faq',        variant: 'accordion', order: 5 },
    { sectionKey: 'booking',    variant: 'minimal',   order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
  immigration: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'list',      order: 2 },
    { sectionKey: 'highlights', variant: 'icons',     order: 3 },
    { sectionKey: 'bio',        variant: 'paragraph', order: 4 },
    { sectionKey: 'faq',        variant: 'accordion', order: 5 },
    { sectionKey: 'booking',    variant: 'minimal',   order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
  logistics: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'list',      order: 2 },
    { sectionKey: 'highlights', variant: 'icons',     order: 3 },
    { sectionKey: 'bio',        variant: 'paragraph', order: 4 },
    { sectionKey: 'faq',        variant: 'accordion', order: 5 },
    { sectionKey: 'booking',    variant: 'minimal',   order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
  agency: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'list',      order: 2 },
    { sectionKey: 'highlights', variant: 'icons',     order: 3 },
    { sectionKey: 'bio',        variant: 'paragraph', order: 4 },
    { sectionKey: 'faq',        variant: 'accordion', order: 5 },
    { sectionKey: 'booking',    variant: 'minimal',   order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
}

function buildPrompt(p: BuildPageJobPayload): string {
  const name = `${p.firstName} ${p.lastName}`.trim()
  return `You are building a professional online presence for ${name}, a ${p.persona} based in ${p.location || 'their city'}.
They offer: "${p.tagline}"

Respond with ONLY a valid JSON object. No markdown. No explanation. Follow this exact shape:
{
  "seo_title": "max 60 chars with name + profession + location",
  "seo_description": "max 155 chars compelling description",
  "headline": "4-8 word punchy value-focused headline",
  "subheadline": "1-2 warm specific sentences",
  "bio": "2-3 sentences first person warm personal mentions location",
  "cta_primary": "2-4 words e.g. Book a session",
  "cta_secondary": "2-4 words e.g. See my work",
  "services": [
    { "name": "string", "description": "1 sentence", "duration_or_unit": "string or null" }
  ],
  "highlights": [
    { "icon": "single emoji", "title": "2-4 words", "body": "1 sentence" }
  ],
  "faq": [
    { "question": "string", "answer": "1-2 sentences" }
  ],
  "schema_type": "one of: LocalBusiness, HealthAndBeautyBusiness, EducationalOrganization, FoodEstablishment, ProfessionalService"
}

Rules: exactly 3-5 services, exactly 3 highlights, exactly 3 FAQ items. First person bio. Warm tone. No prices. No jargon.`
}

export const buildPageFunction = inngest.createFunction(
  {
    id: 'build-member-page',
    retries: 3,
    concurrency: { limit: 5 },
    onFailure: async ({ event }) => {
      const payload = (event.data as unknown as { event: { data: BuildPageJobPayload } }).event.data
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notify/build-failed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: payload.providerId }),
      })
    },
  },
  { event: BUILD_PAGE_EVENT },
  async ({ event, step }) => {
    const payload = event.data as BuildPageJobPayload
    const { providerId, slug } = payload
    const supabase = createServerClient()

    const rawText = await step.run('call-claude-api', async () => {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: buildPrompt(payload) }],
      })
      return msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
    })

    const content = await step.run('parse-response', async () => {
      const clean = rawText.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
      try { return JSON.parse(clean) }
      catch { throw new Error('Claude returned invalid JSON — retrying') }
    })

    await step.run('save-raw', async () => {
      await supabase
        .from('onboarding_answers')
        .update({ claude_prompt: buildPrompt(payload), claude_response: rawText })
        .eq('provider_id', providerId)
    })

    await step.run('write-pages-row', async () => {
      // Fetch visual defaults from DB (admin-editable); fall back to code-derived maps on error
      const defaults = await fetchPersonaDefaults(payload.persona)
      const template    = defaults.template ?? TEMPLATE_MAP[payload.persona] ?? 'focus'
      const palette     = defaults.palette  ?? PALETTE_MAP[payload.persona] ?? 'professional'
      const font        = defaults.font     ?? 'inter'

      const { error } = await supabase.from('pages').upsert({
        provider_id: providerId,
        headline: content.headline,
        subheadline: content.subheadline,
        bio: content.bio,
        cta_primary: content.cta_primary,
        cta_secondary: content.cta_secondary,
        services: content.services,
        highlights: content.highlights,
        faq: content.faq,
        seo_title: content.seo_title,
        seo_description: content.seo_description,
        schema_type: content.schema_type,
        template,
        palette,
        font,
        design_mode: DESIGN_MODE_MAP[payload.persona] ?? 'craft',
        sections: PERSONA_SECTIONS[payload.persona] ?? PERSONA_SECTIONS.other,
        gallery: defaults.defaultGallery,
        // Per-persona curated color/font identity (null for every persona that
        // doesn't have one — see supabase/migrations/20260731090000_ganesh_theme_font_columns.sql).
        // Without this, a new signup would render the flat ACCENT-enum color
        // and default font even when a curated identity exists in `personas`.
        palette_tokens: defaults.paletteTokens,
        signature_color: defaults.signatureColor,
        display_font: defaults.displayFont,
        body_font: defaults.bodyFont,
        radius_card: defaults.radiusCard,
        radius_btn: defaults.radiusBtn,
        show_sections: {
          hero: true, services: true, highlights: true,
          booking: payload.plan !== 'seed', faq: true, contact: true,
        },
        build_version: 1,
      })
      if (error) throw new Error('pages upsert failed: ' + error.message)
    })

    await step.run('mark-page-live', async () => {
      const { error } = await supabase
        .from('providers')
        .update({ page_live: true })
        .eq('id', providerId)
      if (error) throw new Error('mark live failed: ' + error.message)
    })

    await step.run('notify-member-page-live', async () => {
      const { data: provider } = await supabase
        .from('providers')
        .select('first_name, whatsapp_number')
        .eq('id', providerId)
        .single()
      if (!provider?.whatsapp_number) return

      // First message: page is live
      const liveMsg = buildPageLiveMessage({ memberName: provider.first_name ?? 'there', slug })
      await sendWhatsAppMessage({ to: provider.whatsapp_number, text: liveMsg })

      // Second message: install links (slight delay so they arrive as separate bubbles)
      await new Promise(r => setTimeout(r, 2000))
      const installMsg = buildInstallLinksMessage({ memberName: provider.first_name ?? 'there', slug })
      await sendWhatsAppMessage({ to: provider.whatsapp_number, text: installMsg })
    })

    return { ok: true, providerId, slug }
  }
)
