import { inngest, IMPORT_CONTENT_EVENT } from '@/lib/inngest'
import { createServerClient } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'
import type { ImportContentPayload } from '@/lib/inngest'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MAX_IMPORTED_IMAGES = 6
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg':  'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
  'image/gif':  'gif',
}

interface ScrapeResult {
  markdown: string
  images:   string[]
}

async function scrapeSource(sourceUrl: string): Promise<ScrapeResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) {
    throw new Error('Firecrawl is not configured — set FIRECRAWL_API_KEY to enable content import')
  }

  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      Authorization:   `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ url: sourceUrl, formats: ['markdown', 'links'] }),
  })

  if (!res.ok) {
    throw new Error(`Firecrawl scrape failed (${res.status}): ${await res.text()}`)
  }

  const json = await res.json() as {
    data?: { markdown?: string; metadata?: { ogImage?: string } }
  }
  const markdown = json.data?.markdown ?? ''
  if (!markdown.trim()) {
    throw new Error('Firecrawl returned no readable content for this URL')
  }

  // Pull image URLs referenced in the markdown (![alt](url)) plus the og:image if present
  const images = Array.from(markdown.matchAll(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g)).map(m => m[1])
  const ogImage = json.data?.metadata?.ogImage
  if (ogImage) images.unshift(ogImage)

  return { markdown, images: Array.from(new Set(images)).slice(0, MAX_IMPORTED_IMAGES) }
}

interface ExtractedContent {
  headline?:        string
  subheadline?:     string
  bio?:              string
  seo_title?:        string
  seo_description?:  string
  services?: { name: string; description?: string; price?: string; image_index?: number }[]
  highlights?: { icon: string; title: string; body: string }[]
  faq?: { question: string; answer: string }[]
}

function buildExtractionPrompt(markdown: string): string {
  return `Below is the scraped content of a small business's existing website. Extract what you can into a Kryla member page.

SCRAPED CONTENT:
"""
${markdown.slice(0, 12000)}
"""

Respond with ONLY a valid JSON object, no markdown fences, no explanation. Shape:
{
  "seo_title": "max 60 chars",
  "seo_description": "max 155 chars",
  "headline": "4-8 word punchy headline capturing what this business does",
  "subheadline": "1-2 sentences",
  "bio": "2-4 sentences, first person, warm, based on the real content found",
  "services": [
    { "name": "string", "description": "1 sentence", "price": "string or omit if not found", "image_index": "0-based index into the images list below this business's photo most represents this service, or omit" }
  ],
  "highlights": [ { "icon": "single emoji", "title": "2-4 words", "body": "1 sentence" } ],
  "faq": [ { "question": "string", "answer": "1-2 sentences" } ]
}

Rules: extract as many real services/products as you can find (do not invent a fixed count — if you find 12, return 12; if you find 2, return 2). Use only information actually present in the scraped content — do not invent business details. If a field genuinely can't be determined, omit it rather than guessing.`
}

async function rehostImage(providerId: string, imageUrl: string, index: number): Promise<string | null> {
  try {
    const res = await fetch(imageUrl)
    if (!res.ok) return null
    const contentType = res.headers.get('content-type')?.split(';')[0] ?? ''
    const ext = ALLOWED_IMAGE_TYPES[contentType]
    if (!ext) return null

    const bytes = await res.arrayBuffer()
    const path = `${providerId}/imported/${Date.now()}-${index}.${ext}`
    const { error } = await supabaseAdmin.storage
      .from('profile-media')
      .upload(path, bytes, { contentType })
    if (error) return null

    const { data: { publicUrl } } = supabaseAdmin.storage.from('profile-media').getPublicUrl(path)
    return publicUrl
  } catch {
    return null
  }
}

export const importContentFunction = inngest.createFunction(
  {
    id: 'import-website-content',
    retries: 3,
    concurrency: { limit: 3 },
    onFailure: async ({ event }) => {
      const payload = (event.data as unknown as { event: { data: ImportContentPayload } }).event.data
      await supabaseAdmin
        .from('website_copy_requests')
        .update({ admin_note: 'Import failed after retries — build the page manually in MyKryla.' })
        .eq('id', payload.requestId)
    },
  },
  { event: IMPORT_CONTENT_EVENT },
  async ({ event, step }) => {
    const payload = event.data as ImportContentPayload
    const { providerId, requestId, sourceUrl } = payload
    const supabase = createServerClient()

    const scraped = await step.run('scrape-source', () => scrapeSource(sourceUrl))

    const content = await step.run('extract-content', async () => {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: buildExtractionPrompt(scraped.markdown) }],
      })
      const rawText = msg.content.filter(b => b.type === 'text').map(b => b.text).join('')
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      try {
        return JSON.parse(jsonMatch ? jsonMatch[0] : rawText) as ExtractedContent
      } catch {
        throw new Error('Claude returned invalid JSON — retrying')
      }
    })

    const rehostedImages = await step.run('rehost-images', async () => {
      const urls: (string | null)[] = []
      for (let i = 0; i < scraped.images.length; i++) {
        urls.push(await rehostImage(providerId, scraped.images[i], i))
      }
      return urls.filter((u): u is string => u !== null)
    })

    await step.run('write-draft', async () => {
      const services = (content.services ?? []).map(s => {
        const imageUrl = typeof s.image_index === 'number' ? rehostedImages[s.image_index] : undefined
        return {
          name: s.name,
          description: s.description ?? '',
          price: s.price,
          ...(imageUrl ? { image_url: imageUrl } : {}),
        }
      })

      const pagesPatch: Record<string, unknown> = {
        headline:        content.headline,
        subheadline:     content.subheadline,
        bio:             content.bio,
        seo_title:       content.seo_title,
        seo_description: content.seo_description,
        services,
        highlights:      content.highlights ?? [],
        faq:             content.faq ?? [],
      }
      if (rehostedImages.length > 0) pagesPatch.gallery = rehostedImages

      const { data: freshPage } = await supabase
        .from('pages')
        .select('draft_data')
        .eq('provider_id', providerId)
        .maybeSingle()

      const existingDraft = (freshPage?.draft_data ?? {}) as { pages?: Record<string, unknown>; providers?: Record<string, unknown> }

      const { error } = await supabase
        .from('pages')
        .update({
          draft_data: {
            pages:     { ...(existingDraft.pages     ?? {}), ...pagesPatch },
            providers: existingDraft.providers ?? {},
          },
        })
        .eq('provider_id', providerId)
      if (error) throw new Error('draft_data write failed: ' + error.message)
    })

    await step.run('mark-imported', async () => {
      await supabase
        .from('website_copy_requests')
        .update({ admin_note: `Imported ${new Date().toISOString().slice(0, 10)} — review in MyKryla preview, then Publish.` })
        .eq('id', requestId)
    })

    return { ok: true, providerId, requestId }
  }
)
