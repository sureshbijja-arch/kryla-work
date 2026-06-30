import type { ProfileData } from '../../types'

interface Props {
  data: ProfileData
  accent: string
  variant: string
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#999] mb-6">{children}</p>
}

export default function ServicesSection({ data, accent, variant }: Props) {
  const { services, showSections } = data
  if (!showSections.services || !services.length) return null

  /* ── FEATURES ─────────────────────────────────────────────────────────── */
  if (variant === 'features') return (
    <section className="py-14 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <Label>What I offer</Label>
        <div className="space-y-3">
          {services.map((s, i) => (
            <div key={i} className="group rounded-2xl overflow-hidden transition-all hover:shadow-xl"
              style={{
                background: `linear-gradient(135deg, ${accent}08 0%, ${accent}03 100%)`,
                border: `1px solid ${accent}20`,
              }}>
              <div className="flex items-start gap-5 p-6">
                <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 mb-1.5">
                    <p className="font-black text-[#0D0D0D] text-lg leading-tight">{s.name}</p>
                    {s.duration_or_unit && (
                      <span className="shrink-0 text-sm font-black" style={{ color: accent }}>{s.duration_or_unit}</span>
                    )}
                  </div>
                  <p className="text-sm text-[#666] leading-relaxed">{s.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )

  /* ── GRID ─────────────────────────────────────────────────────────────── */
  if (variant === 'grid') return (
    <section className="py-14 border-t border-[#E5E5E5]">
      <div className="max-w-3xl mx-auto px-6">
        <Label>Work &amp; Services</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {services.map((s, i) => (
            <div key={i}
              className="rounded-2xl p-6 bg-white hover:shadow-2xl transition-all hover:-translate-y-1 duration-200"
              style={{ border: `1.5px solid ${accent}20`, boxShadow: `0 2px 12px ${accent}10` }}>
              <div className="flex justify-between items-start gap-2 mb-3">
                <p className="font-black text-[#0D0D0D] text-base">{s.name}</p>
                {s.duration_or_unit && (
                  <span className="text-xs font-black rounded-full px-3 py-1 shrink-0 text-white"
                    style={{ background: accent }}>
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

  /* ── MENU ─────────────────────────────────────────────────────────────── */
  if (variant === 'menu') return (
    <section className="py-14 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <Label>Menu</Label>
        <div className="space-y-2">
          {services.map((s, i) => (
            <div key={i}
              className="flex justify-between items-start gap-4 bg-white rounded-2xl px-5 py-4 hover:shadow-lg transition-all"
              style={{ border: `1px solid ${accent}15` }}>
              <div>
                <p className="font-black text-[#0D0D0D]">{s.name}</p>
                <p className="text-sm text-[#666] mt-0.5 leading-relaxed">{s.description}</p>
              </div>
              {s.duration_or_unit && (
                <span className="shrink-0 text-base font-black mt-0.5" style={{ color: accent }}>
                  {s.duration_or_unit}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )

  /* ── PRICING ─────────────────────────────────────────────────────────── */
  if (variant === 'pricing') return (
    <section className="py-14 border-t border-[#E5E5E5]">
      <div className="max-w-3xl mx-auto px-6">
        <Label>Pricing</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s, i) => (
            <div key={i}
              className="rounded-2xl overflow-hidden flex flex-col hover:shadow-2xl transition-all hover:-translate-y-1 duration-200"
              style={{
                background: i === 0 ? '#0D0D0D' : 'white',
                border: i === 0 ? 'none' : `1.5px solid ${accent}25`,
                boxShadow: i === 0 ? `0 20px 60px ${accent}30` : `0 2px 12px ${accent}08`,
              }}>
              <div className="p-6 flex-1 flex flex-col">
                {s.duration_or_unit && (
                  <p className="text-4xl font-black mb-2" style={{ color: i === 0 ? accent : accent }}>
                    {s.duration_or_unit}
                  </p>
                )}
                <p className={`font-black text-xl mb-3 ${i === 0 ? 'text-white' : 'text-[#0D0D0D]'}`}>{s.name}</p>
                <p className={`text-sm leading-relaxed flex-1 ${i === 0 ? 'text-white/50' : 'text-[#666]'}`}>{s.description}</p>
                <a href="#book"
                  className="mt-6 text-center text-sm font-black py-3 rounded-xl transition-all hover:opacity-90"
                  style={{
                    background: i === 0 ? accent : '#0D0D0D',
                    color: 'white',
                  }}>
                  Book this →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )

  /* ── LIST (default) ───────────────────────────────────────────────────── */
  return (
    <section className="py-14 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <Label>What I offer</Label>
        <div className="space-y-5">
          {services.map((s, i) => (
            <div key={i} className="flex justify-between items-start gap-4 group">
              <div className="flex-1">
                <p className="font-black text-[#0D0D0D] group-hover:underline transition-all">{s.name}</p>
                <p className="text-sm text-[#666] mt-0.5 leading-relaxed">{s.description}</p>
              </div>
              {s.duration_or_unit && (
                <span className="shrink-0 text-xs font-black mt-0.5 rounded-full px-3 py-1"
                  style={{ background: `${accent}12`, color: accent }}>
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
