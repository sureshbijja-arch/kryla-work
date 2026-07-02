import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import SpaceClient from '@/app/my-space/SpaceClient'
import LayoutRenderer from '../components/LayoutRenderer'
import type { SectionEntry } from '../components/LayoutRenderer'
import StudioTemplate from '../components/templates/StudioTemplate'
import FocusTemplate from '../components/templates/FocusTemplate'
import PortfolioTemplate from '../components/templates/PortfolioTemplate'
import StorefrontTemplate from '../components/templates/StorefrontTemplate'
import ClinicTemplate from '../components/templates/ClinicTemplate'
import type { ProfileData, PaletteKey, FontKey, DesignMode, ShowSections } from '../types'
import type { ServiceItem } from '@/app/my-space/ServicesTab'

export const dynamic = 'force-dynamic'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kryla.work'

interface Props {
  params: { slug: string }
}

export default async function MyChatPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) redirect(`${SITE_URL}/login`)

  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, slug, first_name, last_name, persona, location, whatsapp_number, whatsapp_public, email, plan, plan_status, region, page_live, avatar_url')
    .eq('email', user.email)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!provider) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[#666] text-sm">No profile found for this account.</p>
      </div>
    )
  }

  if (provider.slug !== params.slug) redirect(`/${provider.slug}/mychat`)

  const { data: page } = await supabaseAdmin
    .from('pages')
    .select('headline, subheadline, bio, cta_primary, cta_secondary, services, highlights, faq, palette, font, template, show_sections, sections, design_mode, gallery')
    .eq('provider_id', provider.id)
    .single()

  const defaultShowSections: ShowSections = {
    hero: true, services: true, highlights: true,
    booking: true, faq: true, contact: true,
  }

  const rawSections = (page?.show_sections as ShowSections) ?? defaultShowSections
  const isSeed = !provider.plan || provider.plan === 'seed'
  const showSections: ShowSections = {
    ...rawSections,
    booking: isSeed ? false : rawSections.booking,
  }

  const galleryRaw = page?.gallery
  const gallery = Array.isArray(galleryRaw) ? (galleryRaw as string[]) : []

  const profileData: ProfileData = {
    providerId: provider.id,
    firstName:  provider.first_name ?? '',
    lastName:   provider.last_name  ?? '',
    persona:    provider.persona    ?? '',
    location:   provider.location   ?? '',
    whatsappNumber: provider.whatsapp_number ?? null,
    whatsappPublic: provider.whatsapp_public !== false,
    email:      provider.email ?? null,
    headline:    page?.headline    ?? '',
    subheadline: page?.subheadline ?? '',
    bio:         page?.bio         ?? '',
    ctaPrimary:  page?.cta_primary  ?? 'Book now',
    ctaSecondary: page?.cta_secondary ?? 'Get in touch',
    services:   Array.isArray(page?.services)   ? page.services   : [],
    highlights: Array.isArray(page?.highlights) ? page.highlights : [],
    faq:        Array.isArray(page?.faq)        ? page.faq        : [],
    palette:    (page?.palette as PaletteKey)   ?? 'professional',
    font:       (page?.font    as FontKey)      ?? 'inter',
    designMode: (page?.design_mode as DesignMode) ?? 'craft',
    showSections,
    avatarUrl: provider.avatar_url ?? null,
    gallery,
  }

  const pageSections = Array.isArray(page?.sections) ? (page.sections as SectionEntry[]) : null
  const isTutor = provider.persona === 'tutor'
  const template = (page?.template as string) ?? 'focus'

  return (
    <div className="flex h-dvh overflow-hidden">

      {/* Left: live page — desktop only */}
      <div className="hidden lg:flex flex-col flex-1 overflow-y-auto border-r border-[#E5E5E5] bg-white">
        {/* Read-only wrapper so booking form etc. can't be accidentally submitted */}
        <div className="pointer-events-none select-none">
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
        </div>
      </div>

      {/* Right: My Chat panel */}
      <div className="flex-1 lg:flex-none lg:w-[400px] flex flex-col overflow-hidden">
        <SpaceClient
          providerId={provider.id}
          slug={provider.slug}
          firstName={provider.first_name}
          pageLive={provider.page_live ?? false}
          plan={provider.plan ?? 'seed'}
          planStatus={provider.plan_status ?? 'active'}
          region={(provider.region as 'india' | 'usa') ?? 'india'}
          currentProfile={{
            firstName:    provider.first_name,
            lastName:     provider.last_name,
            persona:      provider.persona,
            location:     provider.location,
            whatsappNumber: provider.whatsapp_number,
            email:        provider.email,
            headline:     page?.headline     ?? '',
            subheadline:  page?.subheadline  ?? '',
            bio:          page?.bio          ?? '',
            ctaPrimary:   page?.cta_primary  ?? '',
            ctaSecondary: page?.cta_secondary ?? '',
            services:     (page?.services   as ServiceItem[] | null) ?? [],
            highlights:   page?.highlights  ?? [],
            faq:          page?.faq         ?? [],
            palette:      page?.palette     ?? 'professional',
            font:         page?.font        ?? 'inter',
            template,
            showSections: page?.show_sections ?? defaultShowSections,
            sections:     (page?.sections   as SectionEntry[] | null) ?? null,
            designMode:   (page?.design_mode as string) ?? 'craft',
          }}
        />
      </div>
    </div>
  )
}
