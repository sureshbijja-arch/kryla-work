import type { ProfileData } from '../../types'

interface Props {
  data: ProfileData
  accent: string
  variant: string
}

export default function BioSection({ data, accent, variant }: Props) {
  const { bio } = data
  if (!bio) return null

  /* ── DARK ─────────────────────────────────────────────────────────────── */
  if (variant === 'dark') return (
    <section className="py-14" style={{ background: '#0D0D0D' }}>
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-6" style={{ color: accent }}>About me</p>
        <p className="text-xl sm:text-2xl text-white/70 leading-relaxed">{bio}</p>
      </div>
    </section>
  )

  /* ── ACCENT ───────────────────────────────────────────────────────────── */
  if (variant === 'accent') return (
    <section className="py-14 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#999] mb-6">About me</p>
        <div className="flex items-start gap-5">
          <div className="w-1.5 rounded-full shrink-0 self-stretch" style={{ background: accent, minHeight: 56 }} />
          <p className="text-xl text-[#444] leading-relaxed">{bio}</p>
        </div>
      </div>
    </section>
  )

  /* ── CALLOUT ──────────────────────────────────────────────────────────── */
  if (variant === 'callout') return (
    <section className="py-14 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <div className="rounded-2xl p-8 sm:p-10 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${accent}12, ${accent}06)`, border: `1.5px solid ${accent}20` }}>
          <div className="absolute top-6 left-6 opacity-20">
            <svg width="40" height="32" viewBox="0 0 40 32" fill={accent}>
              <path d="M12 0C5.4 0 0 5.4 0 12v20h12V12H6c0-3.3 2.7-6 6-6V0zm28 0c-6.6 0-12 5.4-12 12v20h12V12h-6c0-3.3 2.7-6 6-6V0z"/>
            </svg>
          </div>
          <p className="text-xl sm:text-2xl text-[#222] leading-relaxed relative z-10 pl-4">{bio}</p>
        </div>
      </div>
    </section>
  )

  /* ── PARAGRAPH (default) ──────────────────────────────────────────────── */
  return (
    <section className="py-14 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#999] mb-6">About me</p>
        <p className="text-lg text-[#444] leading-relaxed">{bio}</p>
      </div>
    </section>
  )
}
