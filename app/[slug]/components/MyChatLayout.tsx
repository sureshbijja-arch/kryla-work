'use client'

import { useState } from 'react'
import SpaceClient from '@/app/my-space/SpaceClient'
import type { SectionEntry } from '@/app/my-space/SectionsTab'
import type { ServiceItem } from '@/app/my-space/ServicesTab'

interface SpaceProps {
  providerId: string
  slug: string
  firstName: string
  pageLive: boolean
  plan: string
  planStatus: string
  region: 'india' | 'usa'
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

export default function MyChatLayout({ spaceProps }: { spaceProps: SpaceProps }) {
  const [previewKey, setPreviewKey] = useState(0)
  const slug = spaceProps.slug

  function refreshPreview() {
    setPreviewKey(k => k + 1)
  }

  return (
    <div className="flex h-dvh overflow-hidden">

      {/* Left: draft preview iframe — desktop only */}
      <div className="hidden lg:flex flex-col flex-1 border-r border-[#E5E5E5] overflow-hidden">
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
      <div className="flex-1 lg:flex-none lg:w-[400px] flex flex-col overflow-hidden">
        <SpaceClient {...spaceProps} onRefresh={refreshPreview} />
      </div>

    </div>
  )
}
