import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPlans, getPlanGate } from '@/lib/plans'
import MyChatLayout from '../components/MyChatLayout'
import type { SectionEntry } from '@/app/my-space/SectionsTab'
import type { ServiceItem } from '@/app/my-space/ServicesTab'
import type { ShowSections } from '../types'

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
    .select('id, slug, first_name, last_name, persona, location, whatsapp_number, email, plan, plan_status, region, page_live, page_language, custom_domain, referral_code')
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

  const [{ data: page }, plans, gate] = await Promise.all([
    supabaseAdmin
      .from('pages')
      .select('headline, subheadline, bio, cta_primary, cta_secondary, services, highlights, faq, palette, font, template, show_sections, sections, design_mode')
      .eq('provider_id', provider.id)
      .single(),
    getPlans(),
    getPlanGate(),
  ])

  const memberPlan  = provider.plan ?? 'grow'
  const planOrder   = plans.map(p => p.id)
  const canAds          = gate.allows('ads',           memberPlan)
  const canCustomName = gate.allows('custom_domain', memberPlan)

  const defaultShowSections: ShowSections = {
    hero: true, services: true, highlights: true,
    booking: true, faq: true, contact: true,
  }

  return (
    <MyChatLayout
      spaceProps={{
        providerId:  provider.id,
        slug:        provider.slug,
        firstName:   provider.first_name,
        pageLive:    provider.page_live ?? false,
        plan:        memberPlan,
        planStatus:   provider.plan_status ?? 'active',
        region:       (provider.region as 'india' | 'usa') ?? 'india',
        pageLanguage: (provider.page_language as string) ?? 'en',
        customName: (provider.custom_domain as string | null) ?? null,
        referralCode: (provider.referral_code as string | null) ?? null,
        plans,
        planOrder,
        canAds,
        canCustomName,
        currentProfile: {
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
          template:     (page?.template   as string) ?? 'focus',
          showSections: ((page?.show_sections as ShowSections) ?? defaultShowSections) as unknown as Record<string, boolean>,
          sections:     (page?.sections   as SectionEntry[] | null) ?? null,
          designMode:   (page?.design_mode as string) ?? 'craft',
        },
      }}
    />
  )
}
