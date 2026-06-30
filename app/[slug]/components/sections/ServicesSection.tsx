'use client'
import { useState } from 'react'
import type { ProfileData } from '../../types'

interface Props {
  data: ProfileData
  accent: string
  variant: string
}

/* ── FEATURES ───────────────────────────────────────────────────────────────── */
function Features({ data, accent }: { data: ProfileData; accent: string }) {
  const { services, showSections } = data
  if (!showSections.services || !services.length) return null
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <section className="py-16 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999] mb-8">What I offer</p>
        <div className="space-y-3">
          {services.map((s, i) => {
            const active = hovered === i
            return (
              <div key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                className="rounded-3xl overflow-hidden cursor-default transition-all duration-300"
                style={{
                  background: active ? '#0D0D0D' : `${accent}06`,
                  border: `1.5px solid ${active ? accent : `${accent}20`}`,
                  boxShadow: active ? `0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px ${accent}` : 'none',
                  transform: active ? 'scale(1.01)' : 'scale(1)',
                }}>
                <div className="flex items-start gap-5 p-6">
                  <div className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm transition-all duration-300"
                    style={{
                      background: active ? `linear-gradient(135deg, ${accent}, ${accent}cc)` : `${accent}20`,
                      color: active ? 'white' : accent,
                      boxShadow: active ? `0 8px 24px ${accent}50` : 'none',
                    }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-1.5">
                      <p className={`font-black text-lg leading-tight transition-colors duration-200 ${active ? 'text-white' : 'text-[#0D0D0D]'}`}>
                        {s.name}
                      </p>
                      {s.duration_or_unit && (
                        <span className="shrink-0 text-sm font-black" style={{ color: accent }}>
                          {s.duration_or_unit}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm leading-relaxed transition-colors duration-200 ${active ? 'text-white/50' : 'text-[#666]'}`}>
                      {s.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ── GRID ────────────────────────────────────────────────────────────────────── */
function Grid({ data, accent }: { data: ProfileData; accent: string }) {
  const { services, showSections } = data
  if (!showSections.services || !services.length) return null
  return (
    <section className="py-16 border-t border-[#E5E5E5]">
      <div className="max-w-3xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999] mb-8">Services</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {services.map((s, i) => (
            <div key={i}
              className="group rounded-3xl p-6 bg-white hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 cursor-default"
              style={{ border: `1.5px solid ${accent}20`, boxShadow: `0 2px 16px ${accent}08` }}>
              <div className="flex justify-between items-start gap-2 mb-3">
                <p className="font-black text-[#0D0D0D] text-base">{s.name}</p>
                {s.duration_or_unit && (
                  <span className="text-xs font-black rounded-full px-3 py-1.5 shrink-0 text-white"
                    style={{ background: accent, boxShadow: `0 4px 12px ${accent}40` }}>
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
}

/* ── MENU ────────────────────────────────────────────────────────────────────── */
function Menu({ data, accent }: { data: ProfileData; accent: string }) {
  const { services, showSections } = data
  if (!showSections.services || !services.length) return null
  return (
    <section className="py-16 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999] mb-8">Menu</p>
        <div className="space-y-2">
          {services.map((s, i) => (
            <div key={i}
              className="group flex justify-between items-start gap-4 bg-white rounded-2xl px-5 py-4 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-default"
              style={{ border: `1.5px solid ${accent}15` }}>
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
}

/* ── PRICING ─────────────────────────────────────────────────────────────────── */
function Pricing({ data, accent }: { data: ProfileData; accent: string }) {
  const { services, showSections } = data
  if (!showSections.services || !services.length) return null
  const [hov, setHov] = useState<number | null>(null)

  return (
    <section className="py-16 border-t border-[#E5E5E5]">
      <div className="max-w-3xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999] mb-8">Pricing</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s, i) => {
            const active = hov === i
            const featured = i === 0
            return (
              <div key={i}
                onMouseEnter={() => setHov(i)}
                onMouseLeave={() => setHov(null)}
                className="rounded-3xl overflow-hidden flex flex-col transition-all duration-300 cursor-default"
                style={{
                  background: featured ? '#0D0D0D' : 'white',
                  border: featured ? 'none' : `1.5px solid ${accent}25`,
                  boxShadow: featured
                    ? `0 24px 80px ${accent}35`
                    : active ? `0 20px 60px ${accent}20` : `0 2px 16px ${accent}08`,
                  transform: active ? 'scale(1.02) translateY(-4px)' : 'scale(1)',
                }}>
                <div className="p-6 flex-1 flex flex-col">
                  {s.duration_or_unit && (
                    <p className="text-4xl font-black mb-2" style={{ color: accent }}>{s.duration_or_unit}</p>
                  )}
                  <p className={`font-black text-xl mb-3 ${featured ? 'text-white' : 'text-[#0D0D0D]'}`}>{s.name}</p>
                  <p className={`text-sm leading-relaxed flex-1 ${featured ? 'text-white/40' : 'text-[#666]'}`}>{s.description}</p>
                  <a href="#book"
                    className="mt-6 text-center text-sm font-black py-3.5 rounded-2xl transition-all hover:opacity-90 hover:scale-[1.02]"
                    style={{
                      background: featured ? accent : '#0D0D0D',
                      color: 'white',
                      boxShadow: featured ? `0 8px 24px ${accent}50` : '0 8px 24px rgba(0,0,0,0.2)',
                    }}>
                    Book →
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ── LIST (default) ──────────────────────────────────────────────────────────── */
function List({ data, accent }: { data: ProfileData; accent: string }) {
  const { services, showSections } = data
  if (!showSections.services || !services.length) return null
  return (
    <section className="py-16 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999] mb-8">What I offer</p>
        <div className="space-y-5">
          {services.map((s, i) => (
            <div key={i} className="flex justify-between items-start gap-4 group cursor-default">
              <div className="flex-1">
                <p className="font-black text-[#0D0D0D]">{s.name}</p>
                <p className="text-sm text-[#666] mt-0.5 leading-relaxed">{s.description}</p>
              </div>
              {s.duration_or_unit && (
                <span className="shrink-0 text-xs font-black mt-0.5 rounded-full px-3 py-1.5"
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

export default function ServicesSection({ data, accent, variant }: Props) {
  if (variant === 'features') return <Features data={data} accent={accent} />
  if (variant === 'grid')     return <Grid data={data} accent={accent} />
  if (variant === 'menu')     return <Menu data={data} accent={accent} />
  if (variant === 'pricing')  return <Pricing data={data} accent={accent} />
  return <List data={data} accent={accent} />
}
