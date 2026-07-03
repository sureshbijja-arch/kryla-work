'use client'

import { useState } from 'react'
import SpaceClient from '@/app/my-space/SpaceClient'
import type { SectionEntry } from '@/app/my-space/SectionsTab'
import type { ServiceItem } from '@/app/my-space/ServicesTab'
import type { PlanDef } from '@/lib/plans'

interface SpaceProps {
  providerId: string
  slug: string
  firstName: string
  pageLive: boolean
  plan: string
  planStatus: string
  region: 'india' | 'usa'
  pageLanguage: string
  customDomain: string | null
  referralCode: string | null
  plans: PlanDef[]
  planOrder: string[]
  canAds: boolean
  canCustomDomain: boolean
  currentProfile: {
    firstName: string
    lastName: string
    persona: string
    location: string
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
  }
}

type MobileView = 'panel' | 'preview'

export default function MyChatLayout({ spaceProps }: { spaceProps: SpaceProps }) {
  const [previewKey, setPreviewKey]     = useState(0)
  const [mobileView, setMobileView]     = useState<MobileView>('panel')
  const slug = spaceProps.slug

  function refreshPreview() {
    setPreviewKey(k => k + 1)
  }

  return (
    <div className="flex flex-col h-dvh overflow-hidden">

      {/* Mobile-only toggle bar */}
      <div className="lg:hidden flex shrink-0 bg-white border-b border-[#E5E5E5]">
        {(['panel', 'preview'] as MobileView[]).map(v => (
          <button
            key={v}
            onClick={() => setMobileView(v)}
            className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors border-b-2 ${
              mobileView === v
                ? 'text-[#0D0D0D] border-[#0D0D0D]'
                : 'text-[#999] border-transparent'
            }`}>
            {v === 'panel' ? 'Edit' : 'Draft preview'}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: draft preview iframe */}
        <div className={`${mobileView === 'preview' ? 'flex' : 'hidden'} lg:flex flex-col flex-1 border-r border-[#E5E5E5] overflow-hidden`}>
          <div className="bg-[#F8F8F8] border-b border-[#E5E5E5] px-4 py-2 shrink-0 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#F5A623]" />
            <span className="text-[10px] font-semibold text-[#888] uppercase tracking-wider">
              Draft preview — not visible to customers until you publish
            </span>
          </div>
          <iframe
            key={previewKey}
            src={`/${slug}/preview`}
            className="flex-1 border-0 w-full"
            title="Draft preview of your page"
          />
        </div>

        {/* Right: My Chat panel */}
        <div className={`${mobileView === 'panel' ? 'flex' : 'hidden'} lg:flex flex-1 lg:flex-none lg:w-[400px] flex-col overflow-hidden`}>
          <SpaceClient {...spaceProps} onRefresh={refreshPreview} />
        </div>

      </div>
    </div>
  )
}
