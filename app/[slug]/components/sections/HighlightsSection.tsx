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
  from { opacity:0; transform:translateY(40px) scale(0.97); }
  to   { opacity:1; transform:translateY(0) scale(1); }
}
.h-reveal { opacity:0; }
.h-reveal.visible { animation: revealUp 0.6s cubic-bezier(.22,1,.36,1) both; }
`

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

/* ── STATS ──────────────────────────────────────────────────────────────────── */
function StatsCard({ h, i, accent, visible }: { h: { icon: string; title: string; body: string }; i: number; accent: string; visible: boolean }) {
  const isDark = i === 0
  return (
    <div
      className="h-reveal rounded-3xl p-6 sm:p-8 text-center hover:scale-[1.04] transition-transform duration-300 cursor-default"
      style={{
        background: isDark ? '#0D0D0D' : i === 1 ? `${accent}10` : `${accent}08`,
        border: isDark ? 'none' : `1.5px solid ${accent}25`,
        boxShadow: isDark ? `0 24px 80px rgba(0,0,0,0.4), 0 0 0 1px ${accent}20` : `0 4px 24px ${accent}15`,
        animationDelay: `${i * 0.1}s`,
        ...(visible ? { animation: `revealUp 0.6s ${i * 0.1}s cubic-bezier(.22,1,.36,1) both` } : {}),
        opacity: visible ? undefined : 0,
      }}>
      <div className="text-5xl sm:text-6xl mb-4 select-none">{h.icon}</div>
      <p className={`text-base sm:text-lg font-black leading-tight mb-2 ${isDark ? 'text-white' : 'text-[#0D0D0D]'}`}>{h.title}</p>
      <p className={`text-xs leading-relaxed ${isDark ? 'text-white/35' : 'text-[#888]'}`}>{h.body}</p>
    </div>
  )
}

function Stats({ data, accent }: { data: ProfileData; accent: string }) {
  const { highlights, showSections } = data
  const { ref, visible } = useReveal()
  if (!showSections.highlights || !highlights.length) return null

  return (
    <section className="py-16 border-t border-[#E5E5E5]">
      <style>{STYLES}</style>
      <div ref={ref} className="max-w-3xl mx-auto px-6">
        <div className={`grid gap-4 ${highlights.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {highlights.map((h, i) => (
            <StatsCard key={i} h={h} i={i} accent={accent} visible={visible} />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── CARDS ──────────────────────────────────────────────────────────────────── */
function Cards({ data, accent }: { data: ProfileData; accent: string }) {
  const { highlights, showSections } = data
  const { ref, visible } = useReveal()
  if (!showSections.highlights || !highlights.length) return null

  return (
    <section className="py-16 border-t border-[#E5E5E5]">
      <style>{STYLES}</style>
      <div ref={ref} className="max-w-3xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {highlights.map((h, i) => (
            <div key={i}
              className="h-reveal rounded-3xl p-7 bg-white text-center group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
              style={{
                border: `1.5px solid ${accent}20`,
                boxShadow: `0 2px 20px ${accent}10`,
                animationDelay: `${i * 0.12}s`,
                ...(visible ? { animation: `revealUp 0.6s ${i * 0.12}s cubic-bezier(.22,1,.36,1) both` } : {}),
                opacity: visible ? undefined : 0,
              }}>
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300 select-none">{h.icon}</div>
              <p className="font-black text-[#0D0D0D] mb-2 text-base">{h.title}</p>
              <p className="text-sm text-[#777] leading-relaxed">{h.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── STRIP ──────────────────────────────────────────────────────────────────── */
function Strip({ data, accent }: { data: ProfileData; accent: string }) {
  const { highlights, showSections } = data
  if (!showSections.highlights || !highlights.length) return null
  return (
    <section className="py-16 border-t border-[#E5E5E5] overflow-hidden">
      <div className="max-w-3xl mx-auto mb-5 px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999]">Why choose me</p>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory px-6 scrollbar-hide">
        {highlights.map((h, i) => (
          <div key={i}
            className="snap-start shrink-0 w-48 rounded-3xl p-6 text-center hover:scale-[1.03] transition-transform duration-200"
            style={{
              background: i === 0 ? '#0D0D0D' : `${accent}09`,
              border: i === 0 ? 'none' : `1.5px solid ${accent}20`,
              boxShadow: i === 0 ? '0 16px 48px rgba(0,0,0,0.3)' : 'none',
            }}>
            <div className="text-4xl mb-3 select-none">{h.icon}</div>
            <p className={`font-black text-sm ${i === 0 ? 'text-white' : 'text-[#0D0D0D]'}`}>{h.title}</p>
            <p className={`text-xs mt-1.5 leading-relaxed ${i === 0 ? 'text-white/35' : 'text-[#999]'}`}>{h.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── NUMBERED ───────────────────────────────────────────────────────────────── */
function Numbered({ data, accent }: { data: ProfileData; accent: string }) {
  const { highlights, showSections } = data
  const { ref, visible } = useReveal()
  if (!showSections.highlights || !highlights.length) return null
  return (
    <section className="py-16 border-t border-[#E5E5E5]">
      <style>{STYLES}</style>
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999] mb-8">How it works</p>
        <div ref={ref} className="space-y-5">
          {highlights.map((h, i) => (
            <div key={i}
              className="h-reveal flex items-start gap-5 group"
              style={{
                animationDelay: `${i * 0.12}s`,
                ...(visible ? { animation: `revealUp 0.6s ${i * 0.12}s cubic-bezier(.22,1,.36,1) both` } : {}),
                opacity: visible ? undefined : 0,
              }}>
              <div className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-xl group-hover:scale-110 transition-transform duration-200"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, boxShadow: `0 8px 24px ${accent}40` }}>
                {i + 1}
              </div>
              <div className="pt-2">
                <p className="font-black text-[#0D0D0D] text-base mb-1">{h.title}</p>
                <p className="text-sm text-[#666] leading-relaxed">{h.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── ICONS (default) ────────────────────────────────────────────────────────── */
function Icons({ data, accent }: { data: ProfileData; accent: string }) {
  const { highlights, showSections } = data
  const { ref, visible } = useReveal()
  if (!showSections.highlights || !highlights.length) return null
  return (
    <section className="py-16 border-t border-[#E5E5E5]">
      <style>{STYLES}</style>
      <div className="max-w-2xl mx-auto px-6">
        <div ref={ref} className="grid grid-cols-3 gap-6">
          {highlights.map((h, i) => (
            <div key={i}
              className="h-reveal text-center group"
              style={{
                animationDelay: `${i * 0.1}s`,
                ...(visible ? { animation: `revealUp 0.6s ${i * 0.1}s cubic-bezier(.22,1,.36,1) both` } : {}),
                opacity: visible ? undefined : 0,
              }}>
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200 select-none">{h.icon}</div>
              <p className="font-black text-[#0D0D0D] text-sm">{h.title}</p>
              <p className="text-xs text-[#777] mt-1 leading-relaxed">{h.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function HighlightsSection({ data, accent, variant }: Props) {
  if (variant === 'stats')    return <Stats data={data} accent={accent} />
  if (variant === 'cards')    return <Cards data={data} accent={accent} />
  if (variant === 'strip')    return <Strip data={data} accent={accent} />
  if (variant === 'numbered') return <Numbered data={data} accent={accent} />
  return <Icons data={data} accent={accent} />
}
