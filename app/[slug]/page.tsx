import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { memberUrl, memberShareCardUrl } from '@/lib/links'
import type { ProfileData, PaletteKey, FontKey, DesignMode, ShowSections, BusinessHours } from './types'
import { ACCENT } from './types'
import AdsScroller from './components/AdsScroller'
import LanguagePage from './components/LanguagePage'
import PageTracker from './components/PageTracker'
import LikeButton from './components/LikeButton'
import AdvocateIntakeChat from './components/AdvocateIntakeChat'
import AdvocateComplianceFooter from './components/AdvocateComplianceFooter'
import PwaActionBar from './components/PwaActionBar'
import InstallBanner from '@/components/InstallBanner'
import { getComplianceCopy } from '@/lib/compliance'
import type { SectionEntry } from './components/LayoutRenderer'
import {
  buildEntityJsonLd, buildAggregateRating, buildOpeningHours, buildFaqJsonLd,
} from '@/lib/seo/structuredData'

export const revalidate = 3600

interface Props {
  params: { slug: string }
}

async function findProvider<T>(
  select: string,
  slug: string
): Promise<T | null> {
  const { data: bySlug } = await supabaseAdmin
    .from('providers')
    .select(select)
    .eq('slug', slug)
    .eq('page_live', true)
    .single()
  if (bySlug) return bySlug as T
  const { data: byVanity } = await supabaseAdmin
    .from('providers')
    .select(select)
    .eq('custom_domain', slug)
    .eq('page_live', true)
    .single()
  return (byVanity as T) ?? null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const provider = await findProvider<{ id: string; first_name: string; last_name: string; persona: string; location: string }>(
    'id, first_name, last_name, persona, location',
    params.slug
  )

  if (!provider) return { title: 'Not Found' }

  const { data: page } = await supabaseAdmin
    .from('pages')
    .select('seo_title, seo_description')
    .eq('provider_id', provider.id)
    .single()

  const defaultTitle = `${provider.first_name} ${provider.last_name} — ${provider.persona} in ${provider.location}`
  const title       = page?.seo_title       || defaultTitle
  const description = page?.seo_description || `Book ${provider.first_name} on Kryla`

  // Stable branded card image served at /api/share-card/{slug}
  // memberShareCardUrl uses the apex domain so metadataBase can resolve it
  const cardUrl = memberShareCardUrl(params.slug)
  const pageUrl = memberUrl(params.slug)

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      url:      pageUrl,
      siteName: 'Kryla',
      type:     'profile',
      images: [{ url: cardUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      images:      [cardUrl],
    },
  }
}

export default async function MemberProfilePage({ params }: Props) {
  const provider = await findProvider<{
    id: string; first_name: string; last_name: string; persona: string
    location: string; whatsapp_number: string | null; whatsapp_public: boolean | null
    email: string | null; plan: string; page_language: string | null
    verified: boolean | null; compliance: Record<string, unknown> | null
  }>(
    'id, first_name, last_name, persona, location, whatsapp_number, whatsapp_public, email, plan, page_language, verified, compliance',
    params.slug
  )

  if (!provider) return notFound()

  const { data: page } = await supabaseAdmin
    .from('pages')
    .select('headline, subheadline, bio, cta_primary, cta_secondary, services, highlights, faq, schema_type, template, palette, font, design_mode, show_sections, sections, translations')
    .eq('provider_id', provider.id)
    .single()

  if (!page) return notFound()

  // These queries depend on columns added in migrations — they fail gracefully
  // if the migrations haven't been run yet.
  const [avatarRes, galleryRes, menuFilesRes, hoursRes, reviewsRes] = await Promise.allSettled([
    supabaseAdmin.from('providers').select('avatar_url, instagram_handle, nextdoor_url').eq('id', provider.id).single(),
    supabaseAdmin.from('pages').select('gallery').eq('provider_id', provider.id).single(),
    supabaseAdmin.from('pages').select('menu_files').eq('provider_id', provider.id).single(),
    supabaseAdmin.from('providers').select('business_hours').eq('id', provider.id).single(),
    supabaseAdmin.from('reviews').select('rating, status').eq('provider_id', provider.id),
  ])

  const providerExtra   = avatarRes.status === 'fulfilled' ? (avatarRes.value.data as Record<string, unknown> | null) : null
  const avatarUrl       = (providerExtra?.avatar_url       as string | null) ?? null
  const instagramHandle = (providerExtra?.instagram_handle as string | null) ?? null
  const nextdoorUrl     = (providerExtra?.nextdoor_url     as string | null) ?? null
  const galleryRaw      = galleryRes.status    === 'fulfilled' ? (galleryRes.value.data?.gallery    ?? [])   : []
  const gallery         = Array.isArray(galleryRaw) ? (galleryRaw as string[]) : []
  const menuFilesRaw    = menuFilesRes.status  === 'fulfilled' ? (menuFilesRes.value.data as Record<string, unknown> | null)?.menu_files : undefined
  const menuFiles       = Array.isArray(menuFilesRaw) ? (menuFilesRaw as string[]) : undefined
  const businessHours   = hoursRes.status      === 'fulfilled'
    ? ((hoursRes.value.data as Record<string, unknown> | null)?.business_hours as BusinessHours | null) ?? null
    : null
  const reviews = reviewsRes.status === 'fulfilled' && Array.isArray(reviewsRes.value.data)
    ? (reviewsRes.value.data as { rating: number; status: string }[])
    : []

  const defaultShowSections: ShowSections = {
    hero: true, services: true, highlights: true,
    booking: true, faq: true, contact: true,
  }

  const rawSections: ShowSections = (page.show_sections as ShowSections) ?? defaultShowSections

  // Booking form is available on all plans (Grow is the entry tier)
  const showSections: ShowSections = rawSections

  const profileData: ProfileData = {
    providerId: provider.id,
    firstName: provider.first_name ?? '',
    lastName: provider.last_name ?? '',
    persona: provider.persona ?? '',
    location: provider.location ?? '',
    whatsappNumber: provider.whatsapp_number ?? null,
    whatsappPublic: provider.whatsapp_public !== false,
    email: provider.email ?? null,
    headline: page.headline ?? '',
    subheadline: page.subheadline ?? '',
    bio: page.bio ?? '',
    ctaPrimary: page.cta_primary ?? 'Book now',
    ctaSecondary: page.cta_secondary ?? 'Get in touch',
    services: Array.isArray(page.services) ? page.services : [],
    highlights: Array.isArray(page.highlights) ? page.highlights : [],
    faq: Array.isArray(page.faq) ? page.faq : [],
    palette: (page.palette as PaletteKey) ?? 'professional',
    font: (page.font as FontKey) ?? 'inter',
    designMode: (page.design_mode as DesignMode) ?? 'craft',
    showSections,
    avatarUrl,
    gallery,
    menuFiles,
    instagramHandle,
    nextdoorUrl,
    businessHours,
    verified: provider.verified === true,
  }

  const entityType = page.schema_type || 'Person'

  const entityJsonLd = buildEntityJsonLd({
    type: entityType,
    name: `${provider.first_name} ${provider.last_name}`,
    url: memberUrl(params.slug),
    image: avatarUrl ?? memberShareCardUrl(params.slug),
    description: page.subheadline,
    telephone: provider.whatsapp_number
      ? `+${provider.whatsapp_number.replace(/\D/g, '')}`
      : null,
    addressLocality: provider.location || null,
    sameAs: [
      instagramHandle ? `https://www.instagram.com/${instagramHandle.replace(/^@/, '')}/` : '',
      nextdoorUrl ?? '',
    ].filter(Boolean),
  })

  const aggregateRating = buildAggregateRating(reviews)
  const openingHours = buildOpeningHours(businessHours)

  if (aggregateRating) entityJsonLd.aggregateRating = aggregateRating
  if (openingHours) entityJsonLd.openingHoursSpecification = openingHours

  const faqJsonLd = buildFaqJsonLd(profileData.faq)

  const pageSections  = Array.isArray(page.sections) ? (page.sections as SectionEntry[]) : null
  const isTutor       = provider.persona === 'tutor'
  const defaultLang   = (provider.page_language as string) ?? 'en'
  const translations  = (page.translations ?? {}) as Record<string, Record<string, unknown>>
  const accentColor   = ACCENT[(page.palette as PaletteKey)] ?? '#F5A623'

  // Check global client_intake kill-switch — defaults to enabled when row is absent
  const { data: cfgRow } = await supabaseAdmin
    .from('system_config')
    .select('value')
    .eq('key', 'notification_types_enabled')
    .single()
  const notifCfg      = (cfgRow?.value ?? {}) as Record<string, boolean>
  const intakeEnabled = notifCfg['client_intake'] !== false

  // Load advocate compliance copy (BCI Rule 36 / DPDP)
  const complianceCopy = provider.persona === 'advocate'
    ? await getComplianceCopy(supabaseAdmin)
    : null

  const advocateCompliance = (provider.compliance ?? {}) as Record<string, unknown>
  const intakeWidgetEnabled = advocateCompliance['intake_widget_enabled'] !== false

  const template = page.template as string

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(entityJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <PageTracker providerId={provider.id} slug={params.slug} />
      <LanguagePage
        profileData={profileData}
        translations={translations}
        defaultLang={defaultLang}
        pageSections={pageSections}
        template={template}
        isTutor={isTutor}
      />
      <AdsScroller slug={params.slug} />
      {/* Advocate persona: BCI Rule 36 compliance disclaimer + verified badge */}
      {provider.persona === 'advocate' && complianceCopy && (
        <AdvocateComplianceFooter
          disclaimer={complianceCopy.bci_disclaimer}
          verified={provider.verified === true}
        />
      )}
      {/* Advocate persona: AI intake chat widget — hidden when admin disables client_intake or advocate disables widget */}
      {provider.persona === 'advocate' && intakeEnabled && intakeWidgetEnabled && (
        <AdvocateIntakeChat
          slug={params.slug}
          advocateName={`${provider.first_name} ${provider.last_name}`}
          accentColor={accentColor}
          ctaLabel={complianceCopy?.intake_cta_label ?? 'Contact the office'}
          privilegeNotice={complianceCopy?.privilege_notice ?? ''}
        />
      )}
      <div className="fixed bottom-6 right-6 z-50">
        <LikeButton providerId={provider.id} slug={params.slug} accentColor={accentColor} />
      </div>
      {/* PWA: sticky action bar in standalone mode */}
      <PwaActionBar
        ctaPrimary={page.cta_primary ?? 'Book now'}
        whatsappNumber={provider.whatsapp_number ?? null}
        location={provider.location ?? ''}
        slug={params.slug}
        accentColor={accentColor}
      />
      {/* PWA: install banner (shows on 2nd visit, dismissible) */}
      <InstallBanner app="customer" slug={params.slug} />
    </>
  )
}
