import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { ProfileData, PaletteKey, FontKey, DesignMode, ShowSections } from './types'
import AdsScroller from './components/AdsScroller'
import StudioTemplate from './components/templates/StudioTemplate'
import FocusTemplate from './components/templates/FocusTemplate'
import PortfolioTemplate from './components/templates/PortfolioTemplate'
import StorefrontTemplate from './components/templates/StorefrontTemplate'
import ClinicTemplate from './components/templates/ClinicTemplate'
import LayoutRenderer from './components/LayoutRenderer'
import type { SectionEntry } from './components/LayoutRenderer'
import MySpaceBadge from './components/MySpaceBadge'

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'kryla.work'

export const revalidate = 3600

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, first_name, last_name, persona, location')
    .eq('slug', params.slug)
    .eq('page_live', true)
    .single()

  if (!provider) return { title: 'Not Found' }

  const { data: page } = await supabaseAdmin
    .from('pages')
    .select('seo_title, seo_description')
    .eq('provider_id', provider.id)
    .single()

  const defaultTitle = `${provider.first_name} ${provider.last_name} — ${provider.persona} in ${provider.location}`

  return {
    title: page?.seo_title || defaultTitle,
    description: page?.seo_description || `Book ${provider.first_name} on Kryla`,
    openGraph: {
      title: page?.seo_title || defaultTitle,
      description: page?.seo_description || `Book ${provider.first_name} on Kryla`,
      type: 'profile',
    },
  }
}

export default async function MemberProfilePage({ params }: Props) {
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, first_name, last_name, persona, location, whatsapp_number, whatsapp_public, email, plan')
    .eq('slug', params.slug)
    .eq('page_live', true)
    .single()

  if (!provider) return notFound()

  const { data: page } = await supabaseAdmin
    .from('pages')
    .select('headline, subheadline, bio, cta_primary, cta_secondary, services, highlights, faq, schema_type, template, palette, font, design_mode, show_sections, sections')
    .eq('provider_id', provider.id)
    .single()

  if (!page) return notFound()

  // These queries depend on columns added in migration 20260629_profile_media —
  // they fail gracefully if the migration hasn't been run yet.
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

  const rawSections: ShowSections = (page.show_sections as ShowSections) ?? defaultShowSections

  // Booking form is a Sprout+ feature — gate it by plan
  const isSeed = !provider.plan || provider.plan === 'seed'
  const showSections: ShowSections = {
    ...rawSections,
    booking: isSeed ? false : rawSections.booking,
  }

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
  }

  const pageSections = Array.isArray(page.sections) ? (page.sections as SectionEntry[]) : null
  const isTutor = provider.persona === 'tutor'

  const jsonLd = page.schema_type
    ? {
        '@context': 'https://schema.org',
        '@type': page.schema_type,
        name: `${provider.first_name} ${provider.last_name}`,
        description: page.subheadline,
        url: `https://${params.slug}.${APP_DOMAIN}`,
        ...(provider.whatsapp_number
          ? { telephone: `+${provider.whatsapp_number.replace(/\D/g, '')}` }
          : {}),
        ...(provider.location ? { address: { '@type': 'PostalAddress', addressLocality: provider.location } } : {}),
      }
    : null

  const template = page.template as string

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {pageSections ? (
        <LayoutRenderer sections={pageSections} data={profileData} />
      ) : isTutor ? (
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
      <MySpaceBadge slug={params.slug} />
    </>
  )
}
