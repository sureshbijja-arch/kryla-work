import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { ProfileData, PaletteKey, FontKey, DesignMode, ShowSections } from '../types'
import type { PaletteTokens } from '@/lib/layouts'
import AdsScroller from '../components/AdsScroller'
import LanguagePage from '../components/LanguagePage'
import type { SectionEntry } from '../components/LayoutRenderer'
import { getHeroFitCropTolerance } from '@/lib/heroFit'
import { getOrderConfig } from '@/lib/personas'

// Always renders fresh from DB — never cached. Used as the draft preview.
export const dynamic = 'force-dynamic'

// Keep draft previews out of search engines and social crawlers.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

interface Props {
  params: { slug: string }
}

export default async function PreviewPage({ params }: Props) {
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, first_name, last_name, persona, location, whatsapp_number, email, plan, page_language')
    .eq('slug', params.slug)
    .single()

  if (!provider) return notFound()

  const { data: page } = await supabaseAdmin
    .from('pages')
    .select('headline, subheadline, bio, cta_primary, cta_secondary, services, highlights, faq, schema_type, template, palette, font, design_mode, page_bg, surface, border_color, accent_color, palette_tokens, signature_color, display_font, body_font, radius_card, radius_btn, facts, footer_note, includes, story_tabs, show_sections, sections, draft_data, translations')
    .eq('provider_id', provider.id)
    .single()

  if (!page) return notFound()

  // Merge draft over live columns so the preview shows pending changes
  type DraftShape = { pages?: Record<string, unknown>; providers?: Record<string, unknown> }
  const draft = (page.draft_data ?? {}) as DraftShape
  const dp    = draft.pages     ?? {}
  const dpr   = draft.providers ?? {}

  const [avatarRes, galleryRes, menuFilesRes] = await Promise.allSettled([
    supabaseAdmin.from('providers').select('avatar_url, instagram_handle, nextdoor_url').eq('id', provider.id).single(),
    supabaseAdmin.from('pages').select('gallery').eq('provider_id', provider.id).single(),
    supabaseAdmin.from('pages').select('menu_files').eq('provider_id', provider.id).single(),
  ])

  const providerExtra   = avatarRes.status === 'fulfilled' ? (avatarRes.value.data as Record<string, unknown> | null) : null
  const avatarUrl       = (providerExtra?.avatar_url       as string | null) ?? null
  const instagramHandle = (providerExtra?.instagram_handle as string | null) ?? null
  const nextdoorUrl     = (providerExtra?.nextdoor_url     as string | null) ?? null
  const galleryRaw      = galleryRes.status    === 'fulfilled' ? (galleryRes.value.data?.gallery    ?? [])   : []
  const gallery         = Array.isArray(galleryRaw) ? (galleryRaw as string[]) : []
  const liveMenuRaw     = menuFilesRes.status  === 'fulfilled' ? (menuFilesRes.value.data as Record<string, unknown> | null)?.menu_files : undefined
  const heroFitCropTolerance = await getHeroFitCropTolerance()
  const orderConfig = await getOrderConfig(provider.persona ?? 'other')

  const defaultShowSections: ShowSections = {
    hero: true, services: true, highlights: true,
    booking: true, faq: true, contact: true,
  }

  // Draft show_sections overlays the live value
  const rawSections: ShowSections = {
    ...(page.show_sections as ShowSections ?? defaultShowSections),
    ...(dp.show_sections as ShowSections ?? {}),
  }
  // Booking form is available on all plans (Grow is the entry tier)
  const showSections: ShowSections = rawSections

  const profileData: ProfileData = {
    providerId:   provider.id,
    firstName:    provider.first_name ?? '',
    lastName:     provider.last_name  ?? '',
    persona:      provider.persona    ?? '',
    location:        ((dpr.location        as string) ?? provider.location)       ?? '',
    whatsappNumber:  ((dpr.whatsapp_number as string) ?? provider.whatsapp_number) ?? null,
    whatsappPublic: (provider as Record<string, unknown>).whatsapp_public !== false,
    email:        provider.email ?? null,
    headline:     (dp.headline     as string) ?? page.headline     ?? '',
    subheadline:  (dp.subheadline  as string) ?? page.subheadline  ?? '',
    bio:          (dp.bio          as string) ?? page.bio          ?? '',
    ctaPrimary:   (dp.cta_primary  as string) ?? page.cta_primary  ?? 'Book now',
    ctaSecondary: (dp.cta_secondary as string) ?? page.cta_secondary ?? 'Get in touch',
    services:   Array.isArray(dp.services)   ? dp.services   as ProfileData['services']   : (Array.isArray(page.services)   ? page.services   : []),
    highlights: Array.isArray(dp.highlights) ? dp.highlights as ProfileData['highlights'] : (Array.isArray(page.highlights) ? page.highlights : []),
    faq:        Array.isArray(dp.faq)        ? dp.faq        as ProfileData['faq']        : (Array.isArray(page.faq)        ? page.faq        : []),
    palette:    ((dp.palette as PaletteKey)    ?? (page.palette    as PaletteKey))    ?? 'professional',
    font:       ((dp.font    as FontKey)       ?? (page.font       as FontKey))       ?? 'inter',
    designMode: ((dp.design_mode as DesignMode) ?? (page.design_mode as DesignMode)) ?? 'craft',
    pageBg:      ((dp.page_bg      as string) ?? (page.page_bg      as string)) ?? null,
    surface:     ((dp.surface      as string) ?? (page.surface      as string)) ?? null,
    borderColor: ((dp.border_color as string) ?? (page.border_color as string)) ?? null,
    accentColor: ((dp.accent_color as string) ?? (page.accent_color as string)) ?? null,
    paletteTokens:  ((dp.palette_tokens  as PaletteTokens) ?? (page.palette_tokens  as PaletteTokens)) ?? null,
    signatureColor: ((dp.signature_color as string)        ?? (page.signature_color as string))        ?? null,
    displayFont: ((dp.display_font as string) ?? (page.display_font as string)) ?? null,
    bodyFont:    ((dp.body_font    as string) ?? (page.body_font    as string)) ?? null,
    radiusCard:  ((dp.radius_card  as string) ?? (page.radius_card  as string)) ?? null,
    radiusBtn:   ((dp.radius_btn   as string) ?? (page.radius_btn   as string)) ?? null,
    facts:       Array.isArray(dp.facts) ? dp.facts as ProfileData['facts'] : (Array.isArray(page.facts) ? page.facts : []),
    footerNote:  ((dp.footer_note as ProfileData['footerNote']) ?? (page.footer_note as ProfileData['footerNote'])) ?? null,
    includes:    Array.isArray(dp.includes) ? dp.includes as string[] : (Array.isArray(page.includes) ? page.includes : []),
    storyTabs:   Array.isArray(dp.story_tabs) ? dp.story_tabs as ProfileData['storyTabs'] : (Array.isArray(page.story_tabs) ? page.story_tabs : []),
    orderConfig,
    showSections,
    avatarUrl,
    gallery,
    menuFiles: (() => {
      const draft_mf = dp.menu_files
      if (Array.isArray(draft_mf) && draft_mf.length > 0) return draft_mf as string[]
      return Array.isArray(liveMenuRaw) ? (liveMenuRaw as string[]) : undefined
    })(),
    instagramHandle,
    nextdoorUrl,
    heroFitCropTolerance,
  }

  const isTutor       = provider.persona === 'tutor'
  const template      = ((dp.template as string) ?? page.template) as string
  const draftSections = dp.sections as SectionEntry[] | undefined | null
  const liveSections  = Array.isArray(page.sections) ? (page.sections as SectionEntry[]) : null
  const pageSections  = draftSections ?? liveSections
  const defaultLang   = (provider.page_language as string) ?? 'en'
  const translations  = (page.translations ?? {}) as Record<string, Record<string, unknown>>

  return (
    <div>
      <LanguagePage
        profileData={profileData}
        translations={translations}
        defaultLang={defaultLang}
        pageSections={pageSections}
        template={template}
        isTutor={isTutor}
      />
      <AdsScroller slug={params.slug} />
    </div>
  )
}
