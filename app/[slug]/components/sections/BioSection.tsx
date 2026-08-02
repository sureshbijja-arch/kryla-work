'use client'
import { useEffect, useRef, useState } from 'react'
import type { ProfileData } from '../../types'
import { getPersonaConfig } from '../../personaConfig'

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
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect() } },
      { threshold: 0.2 }
    )
    obs.observe(el); return () => obs.disconnect()
  }, [])
  return { ref, vis }
}

/* ── STORY ────────────────────────────────────────────────────────────────
   sellganeshidols v3: a tabbed story section (Story & Craft / Materials &
   Care / Shipping & Returns), matching the approved PDF reference's tabbed
   product-detail layout. Real <button role="tab"> elements with arrow-key
   navigation — not the <div onClick> pattern FaqSection's accordion had
   (fixed alongside this in the same commit). Falls back to rendering `bio`
   as a single untabbed column when storyTabs is empty, so the variant is
   never empty even for a member who hasn't filled in tab content yet.
──────────────────────────────────────────────────────────────────────────── */
function Story({ data }: { data: ProfileData }) {
  const { bio, storyTabs } = data
  const tabs = storyTabs ?? []
  const [active, setActive] = useState(0)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  if (!tabs.length) {
    if (!bio) return null
    return (
      <section id="materials" className="border-t border-[var(--kryla-border)]"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
        <div className="max-w-2xl mx-auto px-6">
          <p className="text-lg text-[#444] leading-relaxed">{bio}</p>
        </div>
      </section>
    )
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const dir = e.key === 'ArrowRight' ? 1 : -1
    const next = (active + dir + tabs.length) % tabs.length
    setActive(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <section id="materials" className="border-t border-[var(--kryla-border)]"
      style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
      <div className="max-w-4xl mx-auto px-6">
        <div role="tablist" aria-label="Story and details" className="flex gap-6 border-b mb-8"
          style={{ borderColor: 'var(--kryla-border)' }} onKeyDown={onKeyDown}>
          {tabs.map((t, i) => {
            const isActive = i === active
            return (
              <button key={i} type="button" role="tab" id={`story-tab-${i}`}
                aria-selected={isActive} aria-controls={`story-panel-${i}`}
                tabIndex={isActive ? 0 : -1}
                ref={el => { tabRefs.current[i] = el }}
                onClick={() => setActive(i)}
                className="pb-3 text-sm font-black uppercase tracking-wide transition-colors"
                style={{
                  color: isActive ? 'var(--color-accent)' : 'var(--color-ink-muted)',
                  borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                  marginBottom: -1,
                }}>
                {t.label}
              </button>
            )
          })}
        </div>
        {tabs.map((t, i) => i === active && (
          <div key={i} id={`story-panel-${i}`} role="tabpanel" aria-labelledby={`story-tab-${i}`}
            className="grid sm:grid-cols-2 gap-8">
            <p className="text-lg text-[#444] leading-relaxed">{t.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function BioSection({ data, accent: _accent, variant }: Props) {
  const { bio, persona } = data
  const bioLabel = getPersonaConfig(persona).bioLabel
  // Called unconditionally, before any early return — variant/bio-dependent
  // early returns below must not skip a hook call on some renders and not
  // others (Rules of Hooks). Harmless to call for the `story` branch, which
  // doesn't use the returned ref/vis.
  const { ref, vis } = useReveal()

  if (variant === 'story') return <Story data={data} />
  if (!bio) return null

  /* ── DARK ─────────────────────────────────────────────────────────────── */
  if (variant === 'dark') return (
    <section ref={ref as React.RefObject<HTMLElement>}
      className={`bio-reveal relative overflow-hidden ${vis ? 'in' : ''}`}
      style={{ background: '#0D0D0D', paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
      <style>{STYLES}</style>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 60% at 100% 50%, var(--color-accent-surface) 0%, transparent 70%)' }} />
      <div className="relative max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-6" style={{ color: 'var(--color-accent)' }}>
          {bioLabel}
        </p>
        <p className="text-2xl sm:text-3xl text-white/60 leading-relaxed font-light">{bio}</p>
      </div>
    </section>
  )

  /* ── ACCENT ───────────────────────────────────────────────────────────── */
  if (variant === 'accent') return (
    <section ref={ref as React.RefObject<HTMLElement>}
      className={`bio-reveal border-t border-[var(--kryla-border)] ${vis ? 'in' : ''}`}
      style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
      <style>{STYLES}</style>
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999] mb-6">{bioLabel}</p>
        <div className="flex items-start gap-6">
          <div className="w-1.5 rounded-full shrink-0 self-stretch transition-all duration-500"
            style={{ background: 'linear-gradient(180deg, var(--color-accent), var(--color-accent-border))', minHeight: 64 }} />
          <p className="text-xl sm:text-2xl text-[#333] leading-relaxed font-light">{bio}</p>
        </div>
      </div>
    </section>
  )

  /* ── CALLOUT ──────────────────────────────────────────────────────────── */
  if (variant === 'callout') return (
    <section ref={ref as React.RefObject<HTMLElement>}
      className={`bio-reveal border-t border-[var(--kryla-border)] ${vis ? 'in' : ''}`}
      style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
      <style>{STYLES}</style>
      <div className="max-w-2xl mx-auto px-6">
        <div className="relative overflow-hidden p-8 sm:p-12"
          style={{
            borderRadius: 'var(--radius-card)',
            background: 'var(--color-accent-surface)',
            border: '1.5px solid var(--color-accent-border)',
            boxShadow: '0 8px 40px var(--color-accent-surface)',
          }}>
          <div className="absolute top-6 left-8 select-none pointer-events-none"
            style={{ color: 'var(--color-accent)', opacity: 0.2, fontSize: '6rem', lineHeight: 1, fontFamily: 'Georgia, serif' }}>
            "
          </div>
          <p className="relative z-10 text-xl sm:text-2xl text-[#222] leading-relaxed font-light pl-2">{bio}</p>
        </div>
      </div>
    </section>
  )

  /* ── PARAGRAPH (default) ──────────────────────────────────────────────── */
  return (
    <section ref={ref as React.RefObject<HTMLElement>}
      className={`bio-reveal border-t border-[var(--kryla-border)] ${vis ? 'in' : ''}`}
      style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
      <style>{STYLES}</style>
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999] mb-6">{bioLabel}</p>
        <p className="text-lg text-[#444] leading-relaxed">{bio}</p>
      </div>
    </section>
  )
}
