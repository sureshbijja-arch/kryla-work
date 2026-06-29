import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { ProfileData, PaletteKey, FontKey, ShowSections } from '../types'
import AdsScroller from '../components/AdsScroller'
import StudioTemplate from '../components/templates/StudioTemplate'
import FocusTemplate from '../components/templates/FocusTemplate'
import PortfolioTemplate from '../components/templates/PortfolioTemplate'
import StorefrontTemplate from '../components/templates/StorefrontTemplate'
import ClinicTemplate from '../components/templates/ClinicTemplate'

// Always renders fresh from DB — never cached. Used as the draft preview.
export const dynamic = 'force-dynamic'

interface Props {
  params: { slug: string }
}

export default async function PreviewPage({ params }: Props) {
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, first_name, last_name, persona, location, whatsapp_number, email, plan')
    .eq('slug', params.slug)
    .eq('page_live', true)
    .single()

  if (!provider) return notFound()

  const { data: page } = await supabaseAdmin
    .from('pages')
    .select('headline, subheadline, bio, cta_primary, cta_secondary, services, highlights, faq, schema_type, template, palette, font, show_sections, draft_data')
    .eq('provider_id', provider.id)
    .single()

  if (!page) return notFound()

  // Merge draft over live columns so the preview shows pending changes
  type DraftShape = { pages?: Record<string, unknown>; providers?: Record<string, unknown> }
  const draft = (page.draft_data ?? {}) as DraftShape
  const dp    = draft.pages     ?? {}
  const dpr   = draft.providers ?? {}

  const [avatarRes, galleryRes] = await Promise.allSettled([
    supabaseAdmin.from('providers').select('avatar_url').eq('id', provider.id).single(),
    supabaseAdmin.from('pages').select('gallery').eq('provider_id', provider.id).single(),
  ])

  const avatarUrl  = avatarRes.status  === 'fulfilled' ? (avatarRes.value.data?.avatar_url  ?? null) : null
  const galleryRaw = galleryRes.status === 'fulfilled' ? (galleryRes.value.data?.gallery     ?? [])   : []
  const gallery    = Array.isArray(galleryRaw) ? (galleryRaw as string[]) : []

  const defaultShowSections: ShowSections = {
    hero: true, services: true, highlights: true,
    booking: true, faq: true, contact: true,
  }

  // Draft show_sections overlays the live value
  const rawSections: ShowSections = {
    ...(page.show_sections as ShowSections ?? defaultShowSections),
    ...(dp.show_sections as ShowSections ?? {}),
  }
  const isSeed = !provider.plan || provider.plan === 'seed'
  const showSections: ShowSections = {
    ...rawSections,
    booking: isSeed ? false : rawSections.booking,
  }

  const profileData: ProfileData = {
    providerId:   provider.id,
    firstName:    provider.first_name ?? '',
    lastName:     provider.last_name  ?? '',
    persona:      provider.persona    ?? '',
    location:        ((dpr.location        as string) ?? provider.location)       ?? '',
    whatsappNumber:  ((dpr.whatsapp_number as string) ?? provider.whatsapp_number) ?? null,
    email:        provider.email ?? null,
    headline:     (dp.headline     as string) ?? page.headline     ?? '',
    subheadline:  (dp.subheadline  as string) ?? page.subheadline  ?? '',
    bio:          (dp.bio          as string) ?? page.bio          ?? '',
    ctaPrimary:   (dp.cta_primary  as string) ?? page.cta_primary  ?? 'Book now',
    ctaSecondary: (dp.cta_secondary as string) ?? page.cta_secondary ?? 'Get in touch',
    services:   Array.isArray(dp.services)   ? dp.services   as ProfileData['services']   : (Array.isArray(page.services)   ? page.services   : []),
    highlights: Array.isArray(dp.highlights) ? dp.highlights as ProfileData['highlights'] : (Array.isArray(page.highlights) ? page.highlights : []),
    faq:        Array.isArray(dp.faq)        ? dp.faq        as ProfileData['faq']        : (Array.isArray(page.faq)        ? page.faq        : []),
    palette:    ((dp.palette as PaletteKey) ?? (page.palette as PaletteKey)) ?? 'professional',
    font:       ((dp.font    as FontKey)    ?? (page.font    as FontKey))    ?? 'inter',
    showSections,
    avatarUrl,
    gallery,
  }

  const isTutor  = provider.persona === 'tutor'
  const template = ((dp.template as string) ?? page.template) as string

  return (
    <>
      {isTutor ? (
        <StudioTemplate data={profileData} />
      ) : template === 'portfolio' ? (
        <PortfolioTemplate data={profileData} />
      ) : template === 'storefront' ? (
        <StorefrontTemplate data={profileData} />
      ) : template === 'clinic' ? (
        <ClinicTemplate data={profileData} />
      ) : (
        <FocusTemplate data={profileData} />
      )}
      <AdsScroller slug={params.slug} />
    </>
  )
}
