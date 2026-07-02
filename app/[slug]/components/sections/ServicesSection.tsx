'use client'
import { useState } from 'react'
import type { ProfileData } from '../../types'
import { getPersonaConfig } from '../../personaConfig'
import OrderModal, { type OrderItem } from '../OrderModal'
import CustomOrderModal from '../CustomOrderModal'

interface Props {
  data: ProfileData
  accent: string
  variant: string
}

const SectionLabel = ({ text }: { text: string }) => (
  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999] mb-8">{text}</p>
)

const DIETARY_BADGES = new Set(['eggless', 'vegan', 'nut-free', 'jain-friendly', 'gluten-free', 'dairy-free'])
function isDietary(badge: string) { return DIETARY_BADGES.has(badge.toLowerCase()) }

function DieteticBadge({ label }: { label: string }) {
  return (
    <span className="text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]">
      {label}
    </span>
  )
}

function GenericBadge({ label }: { label: string }) {
  return (
    <span className="text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full"
      style={{ background: 'var(--color-accent-surface)', color: 'var(--color-accent)' }}>
      {label}
    </span>
  )
}

function ServiceCTA({ action, label, target }: { action: string; label: string; target: string }) {
  if (action !== 'book' && action !== 'enquire') return null
  return (
    <a href={target}
      className="inline-block text-xs font-black text-white px-3 py-1.5 transition-opacity hover:opacity-80"
      style={{ borderRadius: 'var(--radius-btn)', background: 'var(--color-accent)' }}>
      {label} →
    </a>
  )
}

/* ── FEATURES ─────────────────────────────────────────────────────────────── */
function Features({ data }: { data: ProfileData }) {
  const { services, showSections, persona } = data
  if (!showSections.services || !services.length) return null
  const cfg = getPersonaConfig(persona)
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <section className="border-t border-[#E5E5E5]"
      style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
      <div className="max-w-2xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999]">{cfg.servicesLabel}</p>
          {data.menuFiles && data.menuFiles.length > 0 && (
            <a
              href={data.menuFiles[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full border transition-all hover:opacity-80"
              style={{ color: 'var(--color-accent)', borderColor: 'var(--color-accent-border)', background: 'var(--color-accent-surface)' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 3.5h8M2 6h8M2 8.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              View menu
            </a>
          )}
        </div>
        <div className="space-y-3">
          {services.map((s, i) => {
            const active = hovered === i
            return (
              <div key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                className="overflow-hidden cursor-default transition-all duration-300"
                style={{
                  borderRadius: 'var(--radius-card)',
                  background: active ? '#0D0D0D' : 'var(--color-accent-surface)',
                  border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-accent-border)'}`,
                  boxShadow: active ? '0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px var(--color-accent)' : 'none',
                  transform: active ? 'scale(1.01)' : 'scale(1)',
                }}>
                {s.image_url && (
                  <div className="w-full h-40 overflow-hidden">
                    <img src={s.image_url} alt={s.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                )}
                <div className="flex items-start gap-5 p-6">
                  <div className="shrink-0 w-12 h-12 flex items-center justify-center font-black text-sm transition-all duration-300"
                    style={{
                      borderRadius: 'var(--radius-card)',
                      background: active ? `linear-gradient(135deg, var(--color-accent), var(--color-accent-glow))` : 'var(--color-accent-surface)',
                      color: active ? 'white' : 'var(--color-accent)',
                      boxShadow: active ? '0 8px 24px var(--color-accent-glow)' : 'none',
                    }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-lg leading-tight transition-colors duration-200"
                          style={{ color: active ? 'white' : '#0D0D0D' }}>
                          {s.name}
                        </p>
                        {s.badge && (
                          <GenericBadge label={s.badge} />
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        {s.price && (
                          <p className="text-sm font-black" style={{ color: 'var(--color-accent)' }}>{s.price}</p>
                        )}
                        {s.duration_or_unit && (
                          <p className="text-sm font-black" style={{ color: 'var(--color-accent)' }}>
                            {s.duration_or_unit}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed transition-colors duration-200 mb-3"
                      style={{ color: active ? 'rgba(255,255,255,0.5)' : '#666' }}>
                      {s.description}
                    </p>
                    <ServiceCTA action={cfg.serviceCardAction} label={cfg.orderLabel} target={cfg.heroCtaTarget} />
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

/* ── GRID ─────────────────────────────────────────────────────────────────── */
function Grid({ data }: { data: ProfileData }) {
  const { services, showSections, persona } = data
  if (!showSections.services || !services.length) return null
  const cfg = getPersonaConfig(persona)

  return (
    <section className="border-t border-[#E5E5E5]"
      style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
      <div className="max-w-3xl mx-auto px-6">
        <SectionLabel text={cfg.servicesLabel} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {services.map((s, i) => (
            <div key={i}
              className="group bg-white hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 cursor-default overflow-hidden flex flex-col"
              style={{
                borderRadius: 'var(--radius-card)',
                border: '1.5px solid var(--color-accent-border)',
                boxShadow: '0 2px 16px var(--color-accent-surface)',
              }}>
              {s.image_url && (
                <div className="w-full h-44 overflow-hidden relative">
                  <img src={s.image_url} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {s.badge && (
                    <span className="absolute top-3 left-3 text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full text-white"
                      style={{ background: 'var(--color-accent)' }}>
                      {s.badge}
                    </span>
                  )}
                </div>
              )}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-[#0D0D0D] text-base">{s.name}</p>
                    {!s.image_url && s.badge && <GenericBadge label={s.badge} />}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {s.price && (
                      <span className="text-sm font-black" style={{ color: 'var(--color-accent)' }}>{s.price}</span>
                    )}
                    {s.duration_or_unit && (
                      <span className="text-xs font-black px-3 py-1 text-white"
                        style={{ borderRadius: 'var(--radius-btn)', background: 'var(--color-accent)', boxShadow: '0 4px 12px var(--color-accent-glow)' }}>
                        {s.duration_or_unit}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-[#666] leading-relaxed flex-1 mb-4">{s.description}</p>
                <ServiceCTA action={cfg.serviceCardAction} label={cfg.orderLabel} target={cfg.heroCtaTarget} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── MENU ─────────────────────────────────────────────────────────────────── */
function Menu({ data }: { data: ProfileData }) {
  const { services, showSections, persona, providerId } = data
  if (!showSections.services || !services.length) return null

  const cfg = getPersonaConfig(persona)
  const [orderItem, setOrderItem]   = useState<OrderItem | null>(null)
  const [customOpen, setCustomOpen] = useState(false)
  const accentColor = `var(--color-accent)`

  return (
    <>
      <section id="menu" className="border-t border-[#E5E5E5]"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
        <div className="max-w-2xl mx-auto px-6">
          <SectionLabel text={cfg.servicesLabel} />
          <div className="space-y-2">
            {services.map((s, i) => (
              <div key={i}
                className="group flex items-start gap-4 bg-white hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                style={{ borderRadius: 'var(--radius-card)', border: '1.5px solid var(--color-accent-border)' }}>
                {s.image_url && (
                  <div className="shrink-0 w-20 h-20 overflow-hidden rounded-l-[inherit]">
                    <img src={s.image_url} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0 py-4" style={{ paddingLeft: s.image_url ? undefined : '1.25rem' }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-[#0D0D0D]">{s.name}</p>
                    {s.badge && (isDietary(s.badge)
                      ? <DieteticBadge label={s.badge} />
                      : <GenericBadge label={s.badge} />
                    )}
                  </div>
                  <p className="text-sm text-[#666] mt-0.5 leading-relaxed">{s.description}</p>
                  {s.duration_or_unit && (
                    <p className="text-xs text-[#999] mt-1">{s.duration_or_unit}</p>
                  )}
                  {cfg.serviceCardAction === 'order' && s.price && (
                    <div className="flex items-center gap-3 mt-2.5">
                      <span className="text-sm font-black" style={{ color: accentColor }}>{s.price}</span>
                      <button
                        onClick={() => setOrderItem({
                          name: s.name,
                          description: s.description ?? undefined,
                          price: s.price ?? undefined,
                          image_url: s.image_url ?? undefined,
                        })}
                        className="px-3 py-1 text-xs font-black text-white transition-opacity hover:opacity-80"
                        style={{ borderRadius: 'var(--radius-btn)', background: accentColor }}>
                        {cfg.orderLabel} →
                      </button>
                    </div>
                  )}
                </div>
                {cfg.serviceCardAction !== 'order' && s.price && (
                  <span className="shrink-0 text-base font-black pr-5 pt-4" style={{ color: accentColor }}>
                    {s.price}
                  </span>
                )}
              </div>
            ))}

            {cfg.hasCustomOrder && (
              <div
                className="flex items-center justify-between gap-4 px-5 py-4 border border-dashed cursor-pointer hover:shadow-lg transition-all duration-200"
                style={{ borderRadius: 'var(--radius-card)', borderColor: 'var(--color-accent-border)' }}
                onClick={() => setCustomOpen(true)}>
                <div>
                  <p className="font-black text-[#0D0D0D]">Something special in mind?</p>
                  <p className="text-sm text-[#999] mt-0.5">Share your vision — we'll make it happen</p>
                </div>
                <button
                  className="shrink-0 text-xs font-black text-white px-3 py-2 transition-opacity hover:opacity-80"
                  style={{ borderRadius: 'var(--radius-btn)', background: accentColor }}>
                  Custom Order
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {orderItem && (
        <OrderModal
          item={orderItem}
          providerId={providerId}
          accentColor={accentColor}
          onClose={() => setOrderItem(null)}
        />
      )}
      {customOpen && (
        <CustomOrderModal
          providerId={providerId}
          accentColor={accentColor}
          onClose={() => setCustomOpen(false)}
        />
      )}
    </>
  )
}

/* ── PRICING ──────────────────────────────────────────────────────────────── */
function Pricing({ data }: { data: ProfileData }) {
  const { services, showSections, persona } = data
  if (!showSections.services || !services.length) return null
  const cfg = getPersonaConfig(persona)
  const [hov, setHov] = useState<number | null>(null)

  return (
    <section id="book" className="border-t border-[#E5E5E5]"
      style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
      <div className="max-w-3xl mx-auto px-6">
        <SectionLabel text={cfg.servicesLabel} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s, i) => {
            const active = hov === i
            const featured = i === 0
            return (
              <div key={i}
                onMouseEnter={() => setHov(i)}
                onMouseLeave={() => setHov(null)}
                className="overflow-hidden flex flex-col transition-all duration-300 cursor-default"
                style={{
                  borderRadius: 'var(--radius-card)',
                  background: featured ? '#0D0D0D' : 'white',
                  border: featured ? 'none' : '1.5px solid var(--color-accent-border)',
                  boxShadow: featured
                    ? '0 24px 80px var(--color-accent-glow)'
                    : active ? '0 20px 60px var(--color-accent-surface)' : '0 2px 16px var(--color-accent-surface)',
                  transform: active ? 'scale(1.02) translateY(-4px)' : 'scale(1)',
                }}>
                {s.image_url && (
                  <div className="w-full h-36 overflow-hidden">
                    <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-6 flex-1 flex flex-col">
                  {(s.price || s.duration_or_unit) && (
                    <p className="text-4xl font-black mb-2" style={{ color: 'var(--color-accent)' }}>
                      {s.price || s.duration_or_unit}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <p className={`font-black text-xl ${featured ? 'text-white' : 'text-[#0D0D0D]'}`}>{s.name}</p>
                    {s.badge && (
                      <GenericBadge label={s.badge} />
                    )}
                  </div>
                  <p className={`text-sm leading-relaxed flex-1 ${featured ? 'text-white/40' : 'text-[#666]'}`}>{s.description}</p>
                  <a href={cfg.heroCtaTarget}
                    className="mt-6 text-center text-sm font-black py-3.5 transition-all hover:opacity-90 hover:scale-[1.02] text-white"
                    style={{
                      borderRadius: 'var(--radius-btn)',
                      background: featured ? 'var(--color-accent)' : '#0D0D0D',
                      boxShadow: featured ? '0 8px 24px var(--color-accent-glow)' : '0 8px 24px rgba(0,0,0,0.2)',
                    }}>
                    {cfg.orderLabel} →
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

/* ── LIST ─────────────────────────────────────────────────────────────────── */
function List({ data }: { data: ProfileData }) {
  const { services, showSections, persona } = data
  if (!showSections.services || !services.length) return null
  const cfg = getPersonaConfig(persona)

  return (
    <section className="border-t border-[#E5E5E5]"
      style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
      <div className="max-w-2xl mx-auto px-6">
        <SectionLabel text={cfg.servicesLabel} />
        <div className="space-y-5">
          {services.map((s, i) => (
            <div key={i} className="flex items-start gap-4 cursor-default pb-5 border-b border-[#F0F0F0] last:border-0 last:pb-0">
              {s.image_url && (
                <div className="shrink-0 w-14 h-14 overflow-hidden rounded-xl">
                  <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="font-black text-[#0D0D0D]">{s.name}</p>
                  {s.badge && <GenericBadge label={s.badge} />}
                </div>
                <p className="text-sm text-[#666] leading-relaxed mb-2">{s.description}</p>
                <ServiceCTA action={cfg.serviceCardAction} label={cfg.orderLabel} target={cfg.heroCtaTarget} />
              </div>
              <div className="shrink-0 text-right">
                {s.price && (
                  <p className="text-sm font-black" style={{ color: 'var(--color-accent)' }}>{s.price}</p>
                )}
                {s.duration_or_unit && (
                  <span className="text-xs font-black px-3 py-1.5 block mt-1"
                    style={{
                      borderRadius: 'var(--radius-btn)',
                      background: 'var(--color-accent-surface)',
                      color: 'var(--color-accent)',
                    }}>
                    {s.duration_or_unit}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function ServicesSection({ data, accent: _accent, variant }: Props) {
  if (variant === 'features') return <Features data={data} />
  if (variant === 'grid')     return <Grid data={data} />
  if (variant === 'menu')     return <Menu data={data} />
  if (variant === 'pricing')  return <Pricing data={data} />
  return <List data={data} />
}
