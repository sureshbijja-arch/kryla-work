import { inngest, GENERATE_PERSONA_EVENT } from '@/lib/inngest'
import { createServerClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import type { GeneratePersonaPayload } from '@/lib/inngest'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const VALID_TEMPLATES = new Set(['focus', 'portfolio', 'storefront', 'clinic'])
const VALID_PALETTES  = new Set(['professional', 'fresh', 'warm', 'minimal', 'creative', 'calm'])

export const generatePersonaFunction = inngest.createFunction(
  {
    id: 'generate-persona-template',
    retries: 2,
    onFailure: async ({ event }) => {
      const payload = (event.data as unknown as { event: { data: GeneratePersonaPayload } }).event.data
      const supabase = createServerClient()
      await supabase
        .from('persona_templates')
        .update({ status: 'failed' })
        .eq('persona_name', payload.personaName)
    },
  },
  { event: GENERATE_PERSONA_EVENT },
  async ({ event, step }) => {
    const { personaName, slug } = event.data as GeneratePersonaPayload
    const supabase = createServerClient()

    // Strip characters that could manipulate the prompt
    const safePersonaName = personaName.replace(/["\\]/g, '').slice(0, 60)

    const chosen = await step.run('pick-template', async () => {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `You are assigning a page layout for a ${safePersonaName} professional on Kryla.
Pick the best layout from: focus (personal brand, coaching, teaching, services), portfolio (creative work, photography, art, baking), storefront (products, retail, food orders, physical goods), clinic (appointments, health, consulting, legal).
Respond ONLY with valid JSON — no markdown, no explanation:
{"template":"focus|portfolio|storefront|clinic","palette":"professional|fresh|warm|minimal|creative|calm"}`,
        }],
      })
      const raw = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim()
      let parsed: { template: string; palette: string }
      try { parsed = JSON.parse(raw) } catch { parsed = { template: 'focus', palette: 'professional' } }

      return {
        template: VALID_TEMPLATES.has(parsed.template) ? parsed.template : 'focus',
        palette:  VALID_PALETTES.has(parsed.palette)   ? parsed.palette  : 'professional',
      }
    })

    // Wait for build-page to finish writing the pages row before upgrading template
    await step.sleep('wait-for-build-page', '90s')

    // Upgrade pages for ALL providers who joined with this custom persona
    await step.run('upgrade-all-pages', async () => {
      const { data: providers, error: queryError } = await supabase
        .from('providers')
        .select('id')
        .eq('custom_persona_name', personaName)
      if (queryError) throw new Error('providers query failed: ' + queryError.message)

      if (providers && providers.length > 0) {
        const ids = providers.map((p: { id: string }) => p.id)
        const { error } = await supabase
          .from('pages')
          .update({ template: chosen.template, palette: chosen.palette })
          .in('provider_id', ids)
        if (error) throw new Error('pages update failed: ' + error.message)
      }
    })

    await step.run('mark-ready', async () => {
      const { error } = await supabase
        .from('persona_templates')
        .update({ status: 'ready', template: chosen.template, palette: chosen.palette })
        .eq('persona_name', personaName)
      if (error) throw new Error('persona_templates mark-ready failed: ' + error.message)
    })

    await step.run('revalidate', async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/revalidate?slug=${encodeURIComponent(slug)}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.REVALIDATE_SECRET ?? ''}` },
        }
      )
      if (!res.ok) throw new Error(`revalidate failed: ${res.status}`)
    })

    return { ok: true, personaName, template: chosen.template }
  }
)
