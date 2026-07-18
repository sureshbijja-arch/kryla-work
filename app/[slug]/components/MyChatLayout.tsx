'use client'

import SpaceClient from '@/app/mychat/SpaceClient'
import type { SectionEntry } from '@/app/mychat/SectionsTab'
import type { ServiceItem } from '@/app/mychat/ServicesTab'
import type { PlanDef } from '@/lib/plans'
import type { MykrylaToolCard } from '@/app/mychat/tileTheme'

interface SpaceProps {
  providerId: string
  slug: string
  firstName: string
  pageLive: boolean
  plan: string
  planStatus: string
  trialEndsAt: string | null
  billingStatus?: 'success' | 'cancelled'
  region: 'india' | 'usa'
  pageLanguage: string
  customName: string | null
  referralCode: string | null
  plans: PlanDef[]
  personaPlans: PlanDef[]
  planOrder: string[]
  canAds: boolean
  canCustomName: boolean
  currentProfile: {
    firstName: string
    lastName: string
    persona: string
    location: string
    avatarUrl: string | null
    whatsappNumber: string | null
    email: string | null
    headline: string
    subheadline: string
    bio: string
    ctaPrimary: string
    ctaSecondary: string
    services: ServiceItem[]
    highlights: unknown[]
    faq: unknown[]
    palette: string
    font: string
    template: string
    showSections: Record<string, boolean>
    sections: SectionEntry[] | null
    designMode: string
    studioArchetype: string | null
    mykrylaToolsLabel: string | null
    mykrylaTools: MykrylaToolCard[]
  }
}

export default function MyChatLayout({ spaceProps }: { spaceProps: SpaceProps }) {
  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <SpaceClient {...spaceProps} />
    </div>
  )
}
