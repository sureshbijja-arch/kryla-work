import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { memberUrl } from '@/lib/links'
import { defaultSeoTitle, defaultSeoDescription } from '@/lib/seo/defaults'

type DraftShape = { pages: Record<string, unknown>; providers: Record<string, unknown> }

// Hard caps — enforced server-side regardless of what the UI already guards.
const TITLE_MAX = 70
const DESCRIPTION_MAX = 320

async function getOwnedProvider(providerId: string, email: string) {
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, email, first_name, last_name, persona, location, slug, page_live')
    .eq('id', providerId)
    .single()

  if (!provider) return { provider: null, forbidden: true as const }

  if (provider.email === null) {
    await supabaseAdmin.from('providers').update({ email }).eq('id', providerId)
  } else if (provider.email !== email) {
    return { provider: null, forbidden: true as const }
  }

  return { provider, forbidden: false as const }
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const providerId = req.nextUrl.searchParams.get('providerId')
  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const { provider, forbidden } = await getOwnedProvider(providerId, user.email)
  if (forbidden || !provider) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: page } = await supabaseAdmin
    .from('pages')
    .select('seo_title, seo_description, schema_type, services, faq, draft_data')
    .eq('provider_id', providerId)
    .single()

  const draft = (page?.draft_data ?? {}) as Partial<DraftShape>
  const draftPages = (draft.pages ?? {}) as Record<string, unknown>

  const defaults = {
    seoTitle: defaultSeoTitle({
      firstName: provider.first_name, lastName: provider.last_name,
      persona: provider.persona, location: provider.location,
    }),
    seoDescription: defaultSeoDescription({ firstName: provider.first_name }),
  }

  return NextResponse.json({
    live: {
      seoTitle: page?.seo_title ?? null,
      seoDescription: page?.seo_description ?? null,
      schemaType: page?.schema_type ?? null,
    },
    draft: {
      seoTitle: (draftPages.seo_title as string | undefined) ?? null,
      seoDescription: (draftPages.seo_description as string | undefined) ?? null,
      schemaType: (draftPages.schema_type as string | undefined) ?? null,
    },
    defaults,
    pageUrl: memberUrl(provider.slug),
    pageLive: provider.page_live === true,
    hasServices: Array.isArray(page?.services) && (page.services as unknown[]).length > 0,
    hasFaq: Array.isArray(page?.faq) && (page.faq as unknown[]).length > 0,
  })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId, seoTitle, seoDescription } = body as {
    providerId: string; seoTitle?: string | null; seoDescription?: string | null
  }

  if (!providerId) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  if (typeof seoTitle === 'string' && seoTitle.length > TITLE_MAX) {
    return NextResponse.json({ error: `Title must be ${TITLE_MAX} characters or fewer` }, { status: 400 })
  }
  if (typeof seoDescription === 'string' && seoDescription.length > DESCRIPTION_MAX) {
    return NextResponse.json({ error: `Description must be ${DESCRIPTION_MAX} characters or fewer` }, { status: 400 })
  }

  const { forbidden } = await getOwnedProvider(providerId, user.email)
  if (forbidden) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: currentPage } = await supabaseAdmin
    .from('pages')
    .select('draft_data')
    .eq('provider_id', providerId)
    .maybeSingle()

  const existing = (currentPage?.draft_data ?? {}) as Partial<DraftShape>

  const newDraft: DraftShape = {
    pages: {
      ...(existing.pages ?? {}),
      // Empty string means "clear the override, fall back to computed default"
      seo_title: seoTitle?.trim() || null,
      seo_description: seoDescription?.trim() || null,
    },
    providers: existing.providers ?? {},
  }

  const { error } = await supabaseAdmin
    .from('pages')
    .update({ draft_data: newDraft })
    .eq('provider_id', providerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
