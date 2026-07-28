import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { SectionEntry } from '@/lib/layouts'

const PLAN_RANK: Record<string, number> = { seed: 0, sprout: 1, grow: 2, thrive: 3, elevate: 4 }

const VALID_TEMPLATES    = new Set(['focus', 'portfolio', 'storefront', 'clinic'])
const VALID_PALETTES     = new Set(['professional', 'fresh', 'warm', 'minimal', 'creative', 'calm'])
const VALID_FONTS        = new Set(['inter', 'georgia', 'trebuchet'])
const VALID_DESIGN_MODES = new Set(['craft', 'editorial', 'product'])

export async function POST(req: NextRequest) {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    slug: string; template: string; palette: string; font: string
    designMode?: string
    sections?: SectionEntry[] | null
  }
  const { slug, template, palette, font, designMode, sections } = body
  if (!slug || !template || !palette || !font)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  if (!VALID_TEMPLATES.has(template) || !VALID_PALETTES.has(palette) || !VALID_FONTS.has(font))
    return NextResponse.json({ error: 'Invalid layout values' }, { status: 400 })

  if (designMode !== undefined && !VALID_DESIGN_MODES.has(designMode))
    return NextResponse.json({ error: 'Invalid design mode' }, { status: 400 })

  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, plan')
    .eq('slug', slug)
    .eq('email', user.email)
    .single()

  if (!provider) return NextResponse.json({ error: 'Not your page' }, { status: 403 })

  const rank = PLAN_RANK[provider.plan ?? 'seed'] ?? 0
  if (rank < 1) return NextResponse.json({ error: 'Sprout plan or above required' }, { status: 403 })

  const { data: currentPage } = await supabaseAdmin
    .from('pages')
    .select('draft_data')
    .eq('provider_id', provider.id)
    .maybeSingle()

  type DraftShape = { pages: Record<string, unknown>; providers: Record<string, unknown> }
  const existing = (currentPage?.draft_data ?? {}) as Partial<DraftShape>

  const pageUpdates: Record<string, unknown> = { template, palette, font }
  if (designMode) pageUpdates.design_mode = designMode
  if (sections && Array.isArray(sections)) pageUpdates.sections = sections

  const newDraft: DraftShape = {
    pages:     { ...(existing.pages ?? {}), ...pageUpdates },
    providers: existing.providers ?? {},
  }

  const { error } = await supabaseAdmin
    .from('pages')
    .update({ draft_data: newDraft })
    .eq('provider_id', provider.id)

  if (error) return NextResponse.json({ error: 'Failed to save layout' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
