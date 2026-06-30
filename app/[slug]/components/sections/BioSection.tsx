'use client'
import { useEffect, useRef, useState } from 'react'
import type { ProfileData } from '../../types'

interface Props {
  data: ProfileData
  accent: string
  variant: string
}

const STYLES = `
@keyframes revealUp {
  from { opacity:0; transform:translateY(24px); }
  to   { opacity:1; transform:translateY(0); }
}
.bio-reveal { opacity:0; }
.bio-reveal.in { animation: revealUp 0.7s cubic-bezier(.22,1,.36,1) both; }
`

function useReveal() {
  const ref = useRef<HTMLElement>(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect() } }, { threshold: 0.2 })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  return { ref, vis }
}

export default function BioSection({ data, accent, variant }: Props) {
  const { bio } = data
  if (!bio) return null
  const { ref, vis } = useReveal()

  /* ── DARK ───────────────────────────────────────────────────────────────── */
  if (variant === 'dark') return (
    <section ref={ref as React.RefObject<HTMLElement>}
      className={`bio-reveal py-16 relative overflow-hidden ${vis ? 'in' : ''}`}
      style={{ background: '#0D0D0D' }}>
      <style>{STYLES}</style>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 60% at 100% 50%, ${accent}08 0%, transparent 70%)` }} />
      <div className="relative max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-6" style={{ color: accent }}>About me</p>
        <p className="text-2xl sm:text-3xl text-white/60 leading-relaxed font-light">{bio}</p>
      </div>
    </section>
  )

  /* ── ACCENT ─────────────────────────────────────────────────────────────── */
  if (variant === 'accent') return (
    <section ref={ref as React.RefObject<HTMLElement>}
      className={`bio-reveal py-16 border-t border-[#E5E5E5] ${vis ? 'in' : ''}`}>
      <style>{STYLES}</style>
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999] mb-6">About me</p>
        <div className="flex items-start gap-6">
          <div className="w-1.5 rounded-full shrink-0 self-stretch transition-all duration-500"
            style={{ background: `linear-gradient(180deg, ${accent}, ${accent}40)`, minHeight: 64 }} />
          <p className="text-xl sm:text-2xl text-[#333] leading-relaxed font-light">{bio}</p>
        </div>
      </div>
    </section>
  )

  /* ── CALLOUT ─────────────────────────────────────────────────────────────── */
  if (variant === 'callout') return (
    <section ref={ref as React.RefObject<HTMLElement>}
      className={`bio-reveal py-16 border-t border-[#E5E5E5] ${vis ? 'in' : ''}`}>
      <style>{STYLES}</style>
      <div className="max-w-2xl mx-auto px-6">
        <div className="rounded-3xl p-8 sm:p-12 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${accent}10 0%, ${accent}04 100%)`,
            border: `1.5px solid ${accent}25`,
            boxShadow: `0 8px 40px ${accent}12`,
          }}>
          <div className="absolute top-6 left-8 select-none pointer-events-none"
            style={{ color: accent, opacity: 0.15, fontSize: '6rem', lineHeight: 1, fontFamily: 'Georgia, serif' }}>
            "
          </div>
          <p className="relative z-10 text-xl sm:text-2xl text-[#222] leading-relaxed font-light pl-2">{bio}</p>
        </div>
      </div>
    </section>
  )

  /* ── PARAGRAPH (default) ─────────────────────────────────────────────────── */
  return (
    <section ref={ref as React.RefObject<HTMLElement>}
      className={`bio-reveal py-16 border-t border-[#E5E5E5] ${vis ? 'in' : ''}`}>
      <style>{STYLES}</style>
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999] mb-6">About me</p>
        <p className="text-lg text-[#444] leading-relaxed">{bio}</p>
      </div>
    </section>
  )
}
