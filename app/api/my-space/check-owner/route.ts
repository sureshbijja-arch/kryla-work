import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  if (!slug) return NextResponse.json({ isOwner: false })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ isOwner: false })

  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, slug, first_name, last_name, persona, custom_persona_name, location, whatsapp_number, email, plan, plan_status, region, page_live')
    .eq('slug', slug)
    .eq('email', user.email)
    .single()

  if (!provider) return NextResponse.json({ isOwner: false })

  let personaTemplateStatus: 'generating' | 'ready' | 'failed' | null = null
  if (provider.persona === 'other' && provider.custom_persona_name) {
    const { data: pt } = await supabaseAdmin
      .from('persona_templates')
      .select('status')
      .eq('persona_name', provider.custom_persona_name)
      .maybeSingle()
    const s = pt?.status
    personaTemplateStatus = (s === 'generating' || s === 'ready' || s === 'failed') ? s : null
  }

  const [pageRes, avatarRes, galleryRes, adsRes] = await Promise.allSettled([
    supabaseAdmin
      .from('pages')
      .select('headline, subheadline, bio, cta_primary, cta_secondary, services, highlights, faq, palette, font, template, show_sections, sections, draft_data')
      .eq('provider_id', provider.id)
      .maybeSingle(),
    supabaseAdmin.from('providers').select('avatar_url').eq('id', provider.id).single(),
    supabaseAdmin.from('pages').select('gallery').eq('provider_id', provider.id).maybeSingle(),
    supabaseAdmin
      .from('ads')
      .select('id, title, description, image_url, link_url, status')
      .eq('provider_id', provider.id)
      .order('created_at', { ascending: false }),
  ])

  const page      = pageRes.status === 'fulfilled' ? pageRes.value.data : null
  type DraftShape = { pages?: Record<string, unknown>; providers?: Record<string, unknown> }
  const draft     = (page?.draft_data ?? {}) as DraftShape
  const dp        = draft.pages     ?? {}   // draft page fields
  const dpr       = draft.providers ?? {}   // draft provider fields
  const hasDraft  = Object.keys(dp).length > 0 || Object.keys(dpr).length > 0
  const avatarUrl = avatarRes.status   === 'fulfilled' ? (avatarRes.value.data?.avatar_url ?? null) : null
  const gallery   = galleryRes.status  === 'fulfilled' && Array.isArray(galleryRes.value.data?.gallery)
    ? (galleryRes.value.data!.gallery as string[])
    : []
  const ads  = (adsRes.status === 'fulfilled' ? (adsRes.value.data ?? []) : []).map(a => ({
    id:          a.id,
    title:       a.title,
    description: a.description ?? null,
    imageUrl:    a.image_url  ?? null,
    linkUrl:     a.link_url   ?? null,
    status:      a.status as 'pending' | 'approved' | 'rejected',
  }))

  return NextResponse.json({
    isOwner: true,
    personaTemplateStatus,
    ads,
    provider: {
      id: provider.id,
      slug: provider.slug,
      firstName: provider.first_name,
      lastName: provider.last_name,
      persona: provider.persona,
      customPersonaName: provider.custom_persona_name ?? null,
      location: provider.location,
      whatsappNumber: provider.whatsapp_number,
      plan: provider.plan ?? 'seed',
      planStatus: provider.plan_status ?? 'active',
      region: (provider.region ?? 'india') as 'india' | 'usa',
      pageLive: provider.page_live ?? false,
      avatarUrl: avatarUrl,
    },
    hasDraft,
    currentProfile: page ? {
      firstName:    provider.first_name,
      lastName:     provider.last_name,
      persona:      provider.persona,
      // draft provider fields overlay live values
      location:        (dpr.location        as string) ?? provider.location,
      whatsappNumber:  (dpr.whatsapp_number as string) ?? provider.whatsapp_number,
      email:        provider.email,
      // draft page fields overlay live values
      headline:     (dp.headline     as string) ?? page.headline     ?? '',
      subheadline:  (dp.subheadline  as string) ?? page.subheadline  ?? '',
      bio:          (dp.bio          as string) ?? page.bio          ?? '',
      ctaPrimary:   (dp.cta_primary  as string) ?? page.cta_primary  ?? '',
      ctaSecondary: (dp.cta_secondary as string) ?? page.cta_secondary ?? '',
      services:   Array.isArray(dp.services)   ? dp.services   : (Array.isArray(page.services)   ? page.services   : []),
      highlights: Array.isArray(dp.highlights) ? dp.highlights : (Array.isArray(page.highlights) ? page.highlights : []),
      faq:        Array.isArray(dp.faq)        ? dp.faq        : (Array.isArray(page.faq)        ? page.faq        : []),
      palette:    (dp.palette  as string) ?? page.palette  ?? 'professional',
      font:       (dp.font     as string) ?? page.font     ?? 'inter',
      template:   (dp.template as string) ?? page.template ?? 'focus',
      showSections: { ...(page.show_sections ?? {}), ...(dp.show_sections ?? {}) },
      sections: Array.isArray(page.sections) ? page.sections : null,
      gallery,
    } : null,
  })
}
