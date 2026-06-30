import { SectionHeading } from '../shared'
import type { ProfileData } from '../../types'

interface Props {
  data: ProfileData
  accent: string
  variant: string
}

export default function HighlightsSection({ data, accent, variant }: Props) {
  const { highlights, showSections } = data
  if (!showSections.highlights || !highlights.length) return null

  if (variant === 'cards') return (
    <section className="py-10 border-t border-[#E5E5E5]">
      <div className="max-w-3xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {highlights.map((h, i) => (
            <div key={i} className="border border-[#E5E5E5] rounded-2xl p-6 bg-white text-center hover:shadow-md transition-shadow">
              <div className="text-4xl mb-3">{h.icon}</div>
              <p className="font-bold text-[#0D0D0D] mb-1">{h.title}</p>
              <p className="text-sm text-[#666] leading-relaxed">{h.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )

  if (variant === 'strip') return (
    <section className="py-10 border-t border-[#E5E5E5]">
      <div className="px-6">
        <div className="max-w-3xl mx-auto">
          <SectionHeading>Why choose me</SectionHeading>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
          <div className="w-4 shrink-0" />
          {highlights.map((h, i) => (
            <div key={i}
              className="snap-start shrink-0 w-44 flex flex-col items-center text-center rounded-2xl border border-[#E5E5E5] bg-white p-5">
              <div className="text-4xl mb-3">{h.icon}</div>
              <p className="font-bold text-[#0D0D0D] text-sm">{h.title}</p>
              <p className="text-xs text-[#666] mt-1 leading-relaxed">{h.body}</p>
            </div>
          ))}
          <div className="w-4 shrink-0" />
        </div>
      </div>
    </section>
  )

  if (variant === 'numbered') return (
    <section className="py-10 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <SectionHeading>How it works</SectionHeading>
        <div className="space-y-6">
          {highlights.map((h, i) => (
            <div key={i} className="flex items-start gap-5">
              <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white"
                style={{ background: accent }}>
                {i + 1}
              </div>
              <div className="pt-1">
                <p className="font-bold text-[#0D0D0D] mb-1">{h.title}</p>
                <p className="text-sm text-[#666] leading-relaxed">{h.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )

  // Default: icons (3-column)
  return (
    <section className="py-10 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <div className="grid grid-cols-3 gap-6">
          {highlights.map((h, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl mb-2">{h.icon}</div>
              <p className="font-semibold text-[#0D0D0D] text-sm">{h.title}</p>
              <p className="text-xs text-[#666] mt-1 leading-relaxed">{h.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
