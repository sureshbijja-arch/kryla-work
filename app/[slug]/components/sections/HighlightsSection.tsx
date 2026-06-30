import type { ProfileData } from '../../types'

interface Props {
  data: ProfileData
  accent: string
  variant: string
}

export default function HighlightsSection({ data, accent, variant }: Props) {
  const { highlights, showSections } = data
  if (!showSections.highlights || !highlights.length) return null

  /* ── STATS ────────────────────────────────────────────────────────────── */
  if (variant === 'stats') return (
    <section className="py-14 border-t border-[#E5E5E5]">
      <div className="max-w-3xl mx-auto px-6">
        <div className="grid grid-cols-3 gap-3">
          {highlights.map((h, i) => (
            <div key={i}
              className="rounded-2xl p-6 sm:p-8 text-center hover:scale-[1.02] transition-transform duration-200"
              style={{
                background: i === 0 ? '#0D0D0D' : `${accent}08`,
                border: i === 0 ? 'none' : `1.5px solid ${accent}20`,
                boxShadow: i === 0 ? '0 20px 60px rgba(0,0,0,0.25)' : 'none',
              }}>
              <div className="text-4xl sm:text-5xl mb-3">{h.icon}</div>
              <p className={`text-sm sm:text-base font-black leading-tight mb-1 ${i === 0 ? 'text-white' : 'text-[#0D0D0D]'}`}>
                {h.title}
              </p>
              <p className={`text-xs leading-relaxed ${i === 0 ? 'text-white/40' : 'text-[#999]'}`}>{h.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )

  /* ── CARDS ────────────────────────────────────────────────────────────── */
  if (variant === 'cards') return (
    <section className="py-14 border-t border-[#E5E5E5]">
      <div className="max-w-3xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {highlights.map((h, i) => (
            <div key={i}
              className="rounded-2xl p-6 bg-white text-center hover:shadow-2xl hover:-translate-y-1 transition-all duration-200"
              style={{
                border: `1.5px solid ${accent}20`,
                boxShadow: `0 2px 16px ${accent}10`,
              }}>
              <div className="text-5xl mb-4">{h.icon}</div>
              <p className="font-black text-[#0D0D0D] mb-1">{h.title}</p>
              <p className="text-sm text-[#666] leading-relaxed">{h.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )

  /* ── STRIP ────────────────────────────────────────────────────────────── */
  if (variant === 'strip') return (
    <section className="py-14 border-t border-[#E5E5E5] overflow-hidden">
      <div className="max-w-3xl mx-auto mb-4 px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#999]">Why choose me</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory px-6 scrollbar-hide">
        {highlights.map((h, i) => (
          <div key={i}
            className="snap-start shrink-0 w-44 rounded-2xl p-5 text-center hover:shadow-xl transition-all"
            style={{
              background: i === 0 ? '#0D0D0D' : `${accent}08`,
              border: i === 0 ? 'none' : `1.5px solid ${accent}20`,
            }}>
            <div className="text-4xl mb-3">{h.icon}</div>
            <p className={`font-black text-sm leading-tight ${i === 0 ? 'text-white' : 'text-[#0D0D0D]'}`}>{h.title}</p>
            <p className={`text-xs mt-1 leading-relaxed ${i === 0 ? 'text-white/40' : 'text-[#999]'}`}>{h.body}</p>
          </div>
        ))}
      </div>
    </section>
  )

  /* ── NUMBERED ─────────────────────────────────────────────────────────── */
  if (variant === 'numbered') return (
    <section className="py-14 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#999] mb-8">How it works</p>
        <div className="space-y-6">
          {highlights.map((h, i) => (
            <div key={i} className="flex items-start gap-5">
              <div className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black text-white shadow-xl"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}>
                {i + 1}
              </div>
              <div className="pt-2 flex-1">
                <p className="font-black text-[#0D0D0D] text-base mb-1">{h.title}</p>
                <p className="text-sm text-[#666] leading-relaxed">{h.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )

  /* ── ICONS (default) ──────────────────────────────────────────────────── */
  return (
    <section className="py-14 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <div className="grid grid-cols-3 gap-6">
          {highlights.map((h, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl mb-3">{h.icon}</div>
              <p className="font-black text-[#0D0D0D] text-sm">{h.title}</p>
              <p className="text-xs text-[#666] mt-1 leading-relaxed">{h.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
