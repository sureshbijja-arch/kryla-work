import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPlans, getPlanGate, getPersonaPlans } from '@/lib/plans'
import { captureServerEvent } from '@/lib/observability'
import MyChatLayout from '../components/MyChatLayout'
import type { SectionEntry } from '@/app/mychat/SectionsTab'
import type { ServiceItem } from '@/app/mychat/ServicesTab'
import type { ShowSections } from '../types'
import type { MykrylaToolCard } from '@/app/mychat/tileTheme'

export const dynamic = 'force-dynamic'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kryla.work'

interface Props {
  params:      { slug: string }
  searchParams: { billing?: string }
}

export default async function MyChatPage({ params, searchParams }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) redirect(`${SITE_URL}/login`)

  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, slug, first_name, last_name, persona, location, whatsapp_number, email, plan, plan_status, trial_ends_at, region, page_live, page_language, custom_domain, referral_code, avatar_url')
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

  if (provider.slug !== params.slug) redirect(`/${provider.slug}/mykryla`)

  captureServerEvent('dashboard_viewed', { slug: provider.slug, providerId: provider.id })

  const [{ data: page }, plans, personaPlans, gate, { data: personaRow }] = await Promise.all([
    supabaseAdmin
      .from('pages')
      .select('headline, subheadline, bio, cta_primary, cta_secondary, services, highlights, faq, palette, font, template, show_sections, sections, design_mode')
      .eq('provider_id', provider.id)
      .single(),
    getPlans(),
    getPersonaPlans(provider.persona),
    getPlanGate(),
    supabaseAdmin
      .from('personas')
      .select('studio_archetype, studio_config')
      .eq('id', provider.persona)
      .maybeSingle(),
  ])

  const VALID_TOOL_ACTIONS = new Set(['court', 'draft', 'studio', 'persona-tab'])
  function isMykrylaToolCard(item: unknown): item is MykrylaToolCard {
    return (
      typeof item === 'object' && item !== null &&
      VALID_TOOL_ACTIONS.has((item as Record<string, unknown>).action as string) &&
      typeof (item as Record<string, unknown>).icon === 'string' &&
      typeof (item as Record<string, unknown>).title === 'string' &&
      typeof (item as Record<string, unknown>).description === 'string'
    )
  }

  const studioConfig = (personaRow?.studio_config as Record<string, unknown> | null) ?? null
  const mykrylaToolsLabel = (studioConfig?.mykryla_tools_label as string | undefined) ?? null
  // Filter, don't just cast — studio_config is DB-editable jsonb, not a
  // compiler-checked shape, so a malformed entry (bad action, missing field)
  // is dropped here rather than reaching the client as a dead-on-tap card.
  const mykrylaTools = Array.isArray(studioConfig?.mykryla_tools)
    ? (studioConfig!.mykryla_tools as unknown[]).filter(isMykrylaToolCard)
    : []

  const memberPlan  = provider.plan ?? 'grow'
  const planOrder   = plans.map(p => p.id)
  const canAds          = gate.allows('ads',           memberPlan)
  const canCustomName = gate.allows('custom_domain', memberPlan)

  const defaultShowSections: ShowSections = {
    hero: true, services: true, highlights: true,
    booking: true, faq: true, contact: true,
  }

  const billingStatus = searchParams.billing === 'success' || searchParams.billing === 'cancelled'
    ? (searchParams.billing as 'success' | 'cancelled')
    : undefined

  return (
    <MyChatLayout
      spaceProps={{
        providerId:    provider.id,
        slug:          provider.slug,
        firstName:     provider.first_name,
        pageLive:      provider.page_live ?? false,
        plan:          memberPlan,
        planStatus:    provider.plan_status ?? 'active',
        trialEndsAt:   (provider.trial_ends_at as string | null) ?? null,
        billingStatus,
        region:        (provider.region as 'india' | 'usa') ?? 'india',
        pageLanguage: (provider.page_language as string) ?? 'en',
        customName: (provider.custom_domain as string | null) ?? null,
        referralCode: (provider.referral_code as string | null) ?? null,
        plans,
        personaPlans,
        planOrder,
        canAds,
        canCustomName,
        currentProfile: {
          firstName:    provider.first_name,
          lastName:     provider.last_name,
          persona:      provider.persona,
          location:     provider.location,
          avatarUrl:    (provider.avatar_url as string | null) ?? null,
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
          designMode:      (page?.design_mode as string) ?? 'craft',
          studioArchetype: (personaRow?.studio_archetype as string | null) ?? null,
          mykrylaToolsLabel,
          mykrylaTools,
        },
      }}
    />
  )
}
