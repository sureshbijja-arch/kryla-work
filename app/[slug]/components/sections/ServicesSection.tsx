import { SectionHeading } from '../shared'
import type { ProfileData } from '../../types'

interface Props {
  data: ProfileData
  accent: string
  variant: string
}

export default function ServicesSection({ data, accent, variant }: Props) {
  const { services, showSections } = data
  if (!showSections.services || !services.length) return null

  if (variant === 'grid') return (
    <section className="py-10 border-t border-[#E5E5E5]">
      <div className="max-w-3xl mx-auto px-6">
        <SectionHeading>Work &amp; Services</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {services.map((s, i) => (
            <div key={i} className="border border-[#E5E5E5] rounded-2xl p-6 bg-white hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start gap-2 mb-3">
                <p className="font-bold text-[#0D0D0D] text-base">{s.name}</p>
                {s.duration_or_unit && (
                  <span className="text-xs font-semibold border border-[#E5E5E5] rounded-full px-2.5 py-1 shrink-0" style={{ color: accent }}>
                    {s.duration_or_unit}
                  </span>
                )}
              </div>
              <p className="text-sm text-[#666] leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )

  if (variant === 'menu') return (
    <section className="py-10 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <SectionHeading>Menu</SectionHeading>
        <div className="space-y-3">
          {services.map((s, i) => (
            <div key={i}
              className="flex justify-between items-start gap-4 bg-white rounded-2xl border border-[#E5E5E5] px-5 py-4 hover:border-[#D0D0D0] transition-colors">
              <div>
                <p className="font-semibold text-[#0D0D0D]">{s.name}</p>
                <p className="text-sm text-[#666] mt-0.5 leading-relaxed">{s.description}</p>
              </div>
              {s.duration_or_unit && (
                <span className="shrink-0 text-sm font-bold mt-0.5" style={{ color: accent }}>
                  {s.duration_or_unit}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )

  if (variant === 'pricing') return (
    <section className="py-10 border-t border-[#E5E5E5]">
      <div className="max-w-3xl mx-auto px-6">
        <SectionHeading>Pricing</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s, i) => (
            <div key={i}
              className="rounded-2xl border-2 p-6 flex flex-col"
              style={{ borderColor: i === 0 ? accent : '#E5E5E5' }}>
              {s.duration_or_unit && (
                <p className="text-3xl font-black mb-1" style={{ color: accent }}>{s.duration_or_unit}</p>
              )}
              <p className="font-bold text-[#0D0D0D] text-lg mb-2">{s.name}</p>
              <p className="text-sm text-[#666] leading-relaxed flex-1">{s.description}</p>
              <a href="#book"
                className="mt-5 text-center text-xs font-bold py-2.5 rounded-xl text-white hover:opacity-90 transition-opacity"
                style={{ background: accent }}>
                Book this
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )

  // Default: list
  return (
    <section className="py-10 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <SectionHeading>What I offer</SectionHeading>
        <div className="space-y-5">
          {services.map((s, i) => (
            <div key={i} className="flex justify-between items-start gap-4">
              <div>
                <p className="font-semibold text-[#0D0D0D]">{s.name}</p>
                <p className="text-sm text-[#666] mt-0.5 leading-relaxed">{s.description}</p>
              </div>
              {s.duration_or_unit && (
                <span className="shrink-0 text-xs text-[#999] mt-0.5 border border-[#E5E5E5] rounded-full px-2.5 py-1">
                  {s.duration_or_unit}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
