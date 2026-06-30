'use client'
import { useState, useEffect } from 'react'
import { mapsUrl, waUrl } from '../../types'
import type { ProfileData } from '../../types'

interface Props {
  data: ProfileData
  accent: string
  variant: string
  showNav?: boolean
}

// Animations injected once — all variants share this stylesheet
const STYLES = `
@keyframes floatOrb {
  0%,100% { transform: translate(0,0) scale(1); }
  50%      { transform: translate(24px,-32px) scale(1.06); }
}
@keyframes fadeUp {
  from { opacity:0; transform:translateY(28px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes accentPulse {
  0%,100% { opacity:.06; }
  50%      { opacity:.12; }
}
@keyframes floatFrame {
  0%,100% { transform: translateY(0px) rotate(var(--f-rot,0deg)); }
  50%      { transform: translateY(-18px) rotate(var(--f-rot,0deg)); }
}
.h-up   { animation: fadeUp .65s cubic-bezier(.22,1,.36,1) both; }
.h-up-1 { animation-delay:.06s; }
.h-up-2 { animation-delay:.16s; }
.h-up-3 { animation-delay:.26s; }
.h-up-4 { animation-delay:.38s; }
`

interface FrameConfig { top: string; left?: string; right?: string; rot: string; dur: string; delay: string }
const FRAME_CONFIGS: FrameConfig[] = [
  { top: '8%',  left:  '2%', rot: '-6deg', dur: '9s',  delay: '0s'   },
  { top: '52%', left:  '1%', rot:  '4deg', dur: '11s', delay: '1.8s' },
  { top: '12%', right: '2%', rot: '-3deg', dur: '8s',  delay: '3.2s' },
]

function KLogo({ dark = false }: { dark?: boolean }) {
  const line = dark ? 'white' : '#0D0D0D'
  const acc  = 'var(--color-accent)'
  return (
    <a href="https://kryla.work"
      className="flex items-center gap-1.5 transition-opacity"
      style={{ opacity: .35 }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '.35')}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <line x1="7" y1="4"  x2="7"  y2="20" stroke={line} strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="7" y1="12" x2="17" y2="4"  stroke={line} strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="7" y1="12" x2="17" y2="20" stroke={acc}  strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
      <span className="text-xs font-bold" style={{ color: dark ? 'rgba(255,255,255,.45)' : '#0D0D0D' }}>
        kryla<span style={{ color: acc }}>.work</span>
      </span>
    </a>
  )
}

function LocationLink({ location, dark }: { location: string; dark?: boolean }) {
  return (
    <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer"
      className="text-xs font-semibold transition-colors"
      style={{ color: dark ? 'rgba(255,255,255,.3)' : '#999' }}>
      📍 {location}
    </a>
  )
}

function CTAs({ wa, showBooking, showContact, ctaPrimary, ctaSecondary, dark }: {
  wa: string | null; showBooking: boolean; showContact: boolean
  ctaPrimary: string; ctaSecondary: string; dark?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {showBooking && (
        <a href="#book"
          className="group flex items-center gap-2 px-7 py-3.5 font-black text-white text-sm transition-all hover:opacity-90 hover:scale-[1.02]"
          style={{
            background: 'var(--color-accent)',
            borderRadius: 'var(--radius-btn)',
            boxShadow: '0 8px 28px var(--color-accent-glow)',
          }}>
          {ctaPrimary}
          <svg className="group-hover:translate-x-0.5 transition-transform" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7h10M8 3l4 4-4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      )}
      {wa && showContact && (
        <a href={wa} target="_blank" rel="noopener noreferrer"
          className="px-7 py-3.5 font-bold text-sm transition-all"
          style={{
            borderRadius: 'var(--radius-btn)',
            border: dark ? '1.5px solid rgba(255,255,255,.15)' : '1.5px solid var(--color-accent-border)',
            color: dark ? 'rgba(255,255,255,.5)' : '#333',
            backdropFilter: dark ? 'blur(8px)' : undefined,
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLAnchorElement
            el.style.color = dark ? 'white' : '#0D0D0D'
            el.style.borderColor = dark ? 'rgba(255,255,255,.4)' : '#0D0D0D'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLAnchorElement
            el.style.color = dark ? 'rgba(255,255,255,.5)' : '#333'
            el.style.borderColor = dark ? 'rgba(255,255,255,.15)' : 'var(--color-accent-border)'
          }}>
          {ctaSecondary || 'Get in touch'}
        </a>
      )}
    </div>
  )
}

/* ── PHOTO ───────────────────────────────────────────────────────────────────
   Full-bleed background image (gallery[0] or avatar), dark scrim, text bottom.
   Sticky blur-nav appears on scroll.
──────────────────────────────────────────────────────────────────────────── */
function HeroPhoto({ data }: { data: ProfileData }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const { firstName, lastName, location, whatsappNumber, headline, subheadline,
    ctaPrimary, ctaSecondary, showSections, avatarUrl, gallery } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null
  const bg = gallery?.length ? gallery[0] : avatarUrl
  const showAvatar = !!(avatarUrl && gallery?.length)

  return (
    <section className="relative overflow-hidden flex flex-col" style={{ minHeight: '100svh' }}>
      <style>{STYLES}</style>

      {bg && <img src={bg} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />}
      {!bg && <div className="absolute inset-0" style={{ background: '#111' }} />}

      {/* Scrim */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,.92) 0%, rgba(0,0,0,.5) 38%, rgba(0,0,0,.08) 100%)' }} />

      {/* Blur nav — fades in on scroll */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled ? 'rgba(8,8,8,.88)' : 'transparent',
          backdropFilter: scrolled ? 'blur(24px) saturate(180%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(24px) saturate(180%)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,.06)' : 'none',
        }}>
        <div className="max-w-2xl mx-auto px-6 py-4 flex justify-between items-center">
          {location ? <LocationLink location={location} dark /> : <span />}
          <KLogo dark />
        </div>
      </nav>

      {/* Content — bottom anchored */}
      <div className="relative z-10 flex-1 flex flex-col justify-end max-w-2xl mx-auto w-full px-6"
        style={{ paddingBottom: 'var(--space-section)', paddingTop: '7rem' }}>
        {showAvatar && (
          <div className="h-up h-up-1 mb-6">
            <img src={avatarUrl!} alt={fullName}
              className="w-16 h-16 object-cover shadow-2xl"
              style={{
                borderRadius: 'var(--radius-card)',
                border: '2px solid var(--color-accent)',
                boxShadow: '0 0 0 4px rgba(255,255,255,.08)',
              }} />
          </div>
        )}
        <p className="h-up h-up-1 font-black uppercase tracking-[.22em] mb-4"
          style={{ fontSize: 'var(--type-label)', color: 'var(--color-accent)' }}>
          {fullName}
        </p>
        <h1 className="h-up h-up-2 font-black text-white leading-[1.04] tracking-tight mb-5"
          style={{ fontSize: 'var(--type-display)' }}>
          {headline}
        </h1>
        <p className="h-up h-up-3 text-white/40 leading-relaxed mb-10 max-w-md"
          style={{ fontSize: 'var(--type-subheading)' }}>
          {subheadline}
        </p>
        <div className="h-up h-up-4">
          <CTAs wa={wa} showBooking={showSections.booking} showContact={showSections.contact}
            ctaPrimary={ctaPrimary} ctaSecondary={ctaSecondary} dark />
        </div>
      </div>
    </section>
  )
}

/* ── DARK ────────────────────────────────────────────────────────────────────
   Deep black, single accent orb, large white headline, minimal decoration.
──────────────────────────────────────────────────────────────────────────── */
function HeroDark({ data }: { data: ProfileData }) {
  const { firstName, lastName, location, whatsappNumber, headline, subheadline,
    ctaPrimary, ctaSecondary, showSections, avatarUrl, gallery } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null
  const frames = gallery?.length ? gallery.slice(0, 2) : []

  return (
    <section className="relative overflow-hidden flex flex-col" style={{ background: '#0D0D0D', minHeight: '100svh' }}>
      <style>{STYLES}</style>

      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.055) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      {/* Single accent orb */}
      <div className="absolute pointer-events-none rounded-full"
        style={{
          width: 600, height: 600, top: '-15%', right: '-10%',
          background: 'var(--color-accent)',
          opacity: .07, filter: 'blur(110px)',
          animation: 'floatOrb 14s ease-in-out infinite',
        }} />

      {/* Floating image frames — only when gallery exists */}
      {frames.map((src, i) => {
        const cfg = FRAME_CONFIGS[i]
        return (
          <div key={i} className="absolute pointer-events-none hidden sm:block"
            style={{
              top: cfg.top,
              left: cfg.left,
              right: cfg.right,
              ['--f-rot' as string]: cfg.rot,
              animation: `floatFrame ${cfg.dur} ease-in-out ${cfg.delay} infinite`,
              opacity: 0.28,
              zIndex: 0,
            }}>
            <img src={src} alt="" aria-hidden
              className="w-28 h-36 sm:w-32 sm:h-44 object-cover"
              style={{
                borderRadius: 'var(--radius-card)',
                filter: 'brightness(0.7) saturate(0.8)',
                border: '1.5px solid rgba(255,255,255,0.1)',
              }} />
          </div>
        )
      })}

      <nav className="relative z-10 flex justify-between items-center px-6 pt-6 max-w-2xl mx-auto w-full">
        {location ? <LocationLink location={location} dark /> : <span />}
        <KLogo dark />
      </nav>

      <div className="relative z-10 flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full px-6"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
        {avatarUrl && (
          <div className="h-up h-up-1 mb-8 inline-block">
            <img src={avatarUrl} alt={fullName}
              className="w-20 h-20 object-cover"
              style={{
                borderRadius: 'var(--radius-card)',
                outline: '3px solid var(--color-accent)',
                outlineOffset: 5,
                boxShadow: '0 0 0 8px var(--color-accent-surface), 0 0 48px var(--color-accent-glow)',
              }} />
          </div>
        )}
        <p className="h-up h-up-1 font-black uppercase tracking-[.22em] mb-5"
          style={{ fontSize: 'var(--type-label)', color: 'var(--color-accent)' }}>
          {fullName}
        </p>
        <h1 className="h-up h-up-2 font-black text-white leading-[1.04] tracking-tight mb-5"
          style={{ fontSize: 'var(--type-display)' }}>
          {headline}
        </h1>
        <p className="h-up h-up-3 text-white/35 leading-relaxed mb-10 max-w-md"
          style={{ fontSize: 'var(--type-subheading)' }}>
          {subheadline}
        </p>
        <div className="h-up h-up-4">
          <CTAs wa={wa} showBooking={showSections.booking} showContact={showSections.contact}
            ctaPrimary={ctaPrimary} ctaSecondary={ctaSecondary} dark />
        </div>
      </div>
    </section>
  )
}

/* ── GRADIENT ────────────────────────────────────────────────────────────────
   Soft aurora tint, content-forward, editorial feel.
──────────────────────────────────────────────────────────────────────────── */
function HeroGradient({ data }: { data: ProfileData }) {
  const { firstName, lastName, location, whatsappNumber, headline, subheadline,
    ctaPrimary, ctaSecondary, showSections, avatarUrl } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null

  return (
    <section className="relative overflow-hidden">
      <style>{STYLES}</style>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 65% -5%, var(--color-accent-border) 0%, transparent 70%), radial-gradient(ellipse 50% 70% at -5% 85%, var(--color-accent-surface) 0%, transparent 60%)' }} />

      <nav className="relative flex justify-between items-center px-6 pt-6 max-w-2xl mx-auto">
        {location ? <LocationLink location={location} /> : <span />}
        <KLogo />
      </nav>

      <div className="relative max-w-2xl mx-auto px-6"
        style={{ paddingTop: 'calc(var(--space-section) * .75)', paddingBottom: 'var(--space-section)' }}>
        {avatarUrl && (
          <div className="h-up h-up-1 mb-7 inline-block">
            <img src={avatarUrl} alt={fullName}
              className="w-24 h-24 object-cover shadow-2xl"
              style={{
                borderRadius: 'var(--radius-card)',
                outline: '2px solid var(--color-accent-border)',
                outlineOffset: 3,
                boxShadow: '0 16px 48px var(--color-accent-glow)',
              }} />
          </div>
        )}
        <div className="h-up h-up-1 inline-flex items-center gap-2 mb-5 px-4 py-2 text-xs font-black uppercase tracking-widest"
          style={{
            borderRadius: 'var(--radius-btn)',
            background: 'var(--color-accent-surface)',
            color: 'var(--color-accent)',
            border: '1px solid var(--color-accent-border)',
          }}>
          {fullName}
        </div>
        <h1 className="h-up h-up-2 font-black text-[#0D0D0D] leading-[1.04] tracking-tight mb-5"
          style={{ fontSize: 'var(--type-display)' }}>
          {headline}
        </h1>
        <p className="h-up h-up-3 text-[#555] leading-relaxed mb-8 max-w-lg"
          style={{ fontSize: 'var(--type-subheading)' }}>
          {subheadline}
        </p>
        {location && (
          <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer"
            className="block text-xs text-[#999] hover:text-[#0D0D0D] transition-colors mb-8">
            📍 {location}
          </a>
        )}
        <div className="h-up h-up-4">
          <CTAs wa={wa} showBooking={showSections.booking} showContact={showSections.contact}
            ctaPrimary={ctaPrimary} ctaSecondary={ctaSecondary} />
        </div>
      </div>
    </section>
  )
}

/* ── SPLIT ────────────────────────────────────────────────────────────────────
   Text left, photo right with offset accent shadow block.
──────────────────────────────────────────────────────────────────────────── */
function HeroSplit({ data }: { data: ProfileData }) {
  const { firstName, lastName, location, whatsappNumber, headline, subheadline,
    ctaPrimary, ctaSecondary, showSections, avatarUrl } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null

  return (
    <section className="relative overflow-hidden bg-white">
      <style>{STYLES}</style>
      <nav className="max-w-5xl mx-auto px-6 pt-6 flex justify-between items-center">
        {location ? <LocationLink location={location} /> : <span />}
        <KLogo />
      </nav>
      <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row gap-12 items-center"
        style={{ paddingTop: 'calc(var(--space-section) * .7)', paddingBottom: 'var(--space-section)' }}>
        <div className="flex-1 order-2 sm:order-1">
          <div className="h-up h-up-1 inline-flex items-center gap-2 mb-6 px-3 py-1.5 text-xs font-black uppercase tracking-widest"
            style={{
              borderRadius: 'var(--radius-btn)',
              background: 'var(--color-accent-surface)',
              color: 'var(--color-accent)',
            }}>
            {fullName}
          </div>
          <h1 className="h-up h-up-2 font-black text-[#0D0D0D] leading-[1.04] tracking-tight mb-5"
            style={{ fontSize: 'var(--type-display)' }}>
            {headline}
          </h1>
          <p className="h-up h-up-3 text-[#555] leading-relaxed mb-8 max-w-md"
            style={{ fontSize: 'var(--type-subheading)' }}>
            {subheadline}
          </p>
          <div className="h-up h-up-4">
            <CTAs wa={wa} showBooking={showSections.booking} showContact={showSections.contact}
              ctaPrimary={ctaPrimary} ctaSecondary={ctaSecondary} />
          </div>
        </div>
        {avatarUrl && (
          <div className="order-1 sm:order-2 shrink-0 h-up h-up-2">
            <div className="relative">
              {/* Offset accent block */}
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  borderRadius: 'var(--radius-card)',
                  background: 'var(--color-accent-surface)',
                  transform: 'translate(10px,10px)',
                }} />
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 overflow-hidden"
                style={{
                  borderRadius: 'var(--radius-card)',
                  boxShadow: '0 24px 64px rgba(0,0,0,.14)',
                }}>
                <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

/* ── BANNER ───────────────────────────────────────────────────────────────────
   Accent-colored header with rounded bottom edge pulling into white content.
──────────────────────────────────────────────────────────────────────────── */
function HeroBanner({ data }: { data: ProfileData }) {
  const { firstName, lastName, location, whatsappNumber, headline, subheadline,
    ctaPrimary, ctaSecondary, showSections, avatarUrl } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null

  return (
    <section>
      <style>{STYLES}</style>
      <header className="relative overflow-hidden pb-20" style={{ background: 'var(--color-accent)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,.18) 0%, transparent 60%)' }} />
        <div className="relative max-w-2xl mx-auto px-6 pt-5 flex justify-between items-start">
          <div>
            <p className="text-white/60 font-black uppercase tracking-widest" style={{ fontSize: 'var(--type-label)' }}>
              {fullName}
            </p>
            {location && <LocationLink location={location} dark />}
          </div>
          <KLogo dark />
        </div>
        {avatarUrl && (
          <div className="relative max-w-2xl mx-auto px-6 mt-8">
            <img src={avatarUrl} alt={fullName}
              className="w-24 h-24 object-cover shadow-2xl"
              style={{ borderRadius: 'var(--radius-card)', border: '4px solid rgba(255,255,255,.2)' }} />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-white" style={{ borderRadius: '2rem 2rem 0 0' }} />
      </header>
      <div className="max-w-2xl mx-auto px-6"
        style={{ paddingTop: 'calc(var(--space-section) * .6)', paddingBottom: 'var(--space-section)' }}>
        <h1 className="h-up font-black text-[#0D0D0D] leading-[1.04] tracking-tight mb-4"
          style={{ fontSize: 'var(--type-heading)' }}>
          {headline}
        </h1>
        <p className="h-up h-up-1 text-[#555] leading-relaxed mb-8" style={{ fontSize: 'var(--type-subheading)' }}>
          {subheadline}
        </p>
        <div className="h-up h-up-2">
          <CTAs wa={wa} showBooking={showSections.booking} showContact={showSections.contact}
            ctaPrimary={ctaPrimary} ctaSecondary={ctaSecondary} />
        </div>
      </div>
    </section>
  )
}

/* ── CENTERED ─────────────────────────────────────────────────────────────────
   Everything centered. Avatar with glow ring. Generous space above and below.
──────────────────────────────────────────────────────────────────────────── */
function HeroCentered({ data }: { data: ProfileData }) {
  const { firstName, lastName, location, whatsappNumber, headline, subheadline,
    ctaPrimary, ctaSecondary, showSections, avatarUrl, gallery } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null
  const frames = gallery?.length ? gallery.slice(0, 3) : []

  return (
    <section className="relative overflow-hidden">
      <style>{STYLES}</style>
      <div className="absolute top-0 left-0 right-0 h-72 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, var(--color-accent-surface) 0%, transparent 100%)' }} />

      {/* Floating image frames */}
      {frames.map((src, i) => {
        const cfg = FRAME_CONFIGS[i]
        return (
          <div key={i} className="absolute pointer-events-none hidden sm:block"
            style={{
              top: cfg.top,
              left: cfg.left,
              right: cfg.right,
              ['--f-rot' as string]: cfg.rot,
              animation: `floatFrame ${cfg.dur} ease-in-out ${cfg.delay} infinite`,
              opacity: 0.72,
              zIndex: 0,
            }}>
            <img src={src} alt="" aria-hidden
              className="w-28 h-36 sm:w-32 sm:h-44 object-cover shadow-2xl"
              style={{
                borderRadius: 'var(--radius-card)',
                border: '2px solid rgba(255,255,255,0.6)',
              }} />
          </div>
        )
      })}
      <nav className="relative max-w-2xl mx-auto px-6 pt-6 flex justify-end">
        <KLogo />
      </nav>
      <div className="relative max-w-2xl mx-auto px-6 flex flex-col items-center text-center"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
        {avatarUrl && (
          <div className="h-up h-up-1 mb-7">
            <img src={avatarUrl} alt={fullName}
              className="w-32 h-32 object-cover"
              style={{
                borderRadius: '50%',
                outline: '3px solid var(--color-accent)',
                outlineOffset: 6,
                boxShadow: '0 0 0 12px var(--color-accent-surface), 0 16px 48px var(--color-accent-glow)',
              }} />
          </div>
        )}
        <div className="h-up h-up-1 inline-flex items-center gap-2 mb-5 px-4 py-2 text-xs font-black uppercase tracking-widest"
          style={{
            borderRadius: 'var(--radius-btn)',
            background: 'var(--color-accent-surface)',
            color: 'var(--color-accent)',
          }}>
          {fullName}
        </div>
        <h1 className="h-up h-up-2 font-black text-[#0D0D0D] leading-[1.04] tracking-tight mb-5 max-w-xl"
          style={{ fontSize: 'var(--type-display)' }}>
          {headline}
        </h1>
        <p className="h-up h-up-3 text-[#555] leading-relaxed mb-10 max-w-md"
          style={{ fontSize: 'var(--type-subheading)' }}>
          {subheadline}
        </p>
        {location && (
          <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer"
            className="text-xs text-[#999] hover:text-[#0D0D0D] transition-colors mb-8 block">
            📍 {location}
          </a>
        )}
        <div className="h-up h-up-4">
          <div className="flex flex-wrap gap-3 justify-center">
            <CTAs wa={wa} showBooking={showSections.booking} showContact={showSections.contact}
              ctaPrimary={ctaPrimary} ctaSecondary={ctaSecondary} />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── MINIMAL ──────────────────────────────────────────────────────────────────
   Left-aligned, clean, typography leads. Default for most members.
──────────────────────────────────────────────────────────────────────────── */
function HeroMinimal({ data }: { data: ProfileData }) {
  const { firstName, lastName, location, whatsappNumber, headline, subheadline,
    ctaPrimary, ctaSecondary, showSections, avatarUrl } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null

  return (
    <section className="relative overflow-hidden bg-white">
      <style>{STYLES}</style>
      <nav className="max-w-2xl mx-auto px-6 pt-6 flex justify-between items-center">
        {location ? <LocationLink location={location} /> : <span />}
        <KLogo />
      </nav>
      <div className="max-w-2xl mx-auto px-6"
        style={{ paddingTop: 'calc(var(--space-section) * .8)', paddingBottom: 'var(--space-section)' }}>
        {avatarUrl && (
          <img src={avatarUrl} alt={fullName}
            className="h-up w-20 h-20 object-cover shadow-xl mb-6"
            style={{
              borderRadius: 'var(--radius-card)',
              outline: '2px solid var(--color-accent-border)',
              outlineOffset: 2,
            }} />
        )}
        <div className="h-up h-up-1 inline-flex items-center gap-2 mb-5 px-3 py-1 text-xs font-black uppercase tracking-widest"
          style={{
            borderRadius: 'var(--radius-btn)',
            background: 'var(--color-accent-surface)',
            color: 'var(--color-accent)',
          }}>
          {fullName}
        </div>
        <h1 className="h-up h-up-2 font-black text-[#0D0D0D] leading-[1.04] tracking-tight mb-5"
          style={{ fontSize: 'var(--type-display)' }}>
          {headline}
        </h1>
        <p className="h-up h-up-3 text-[#555] leading-relaxed mb-8"
          style={{ fontSize: 'var(--type-subheading)' }}>
          {subheadline}
        </p>
        <div className="h-up h-up-4">
          <CTAs wa={wa} showBooking={showSections.booking} showContact={showSections.contact}
            ctaPrimary={ctaPrimary} ctaSecondary={ctaSecondary} />
        </div>
      </div>
    </section>
  )
}

/* ── Entry point ─────────────────────────────────────────────────────────── */
export default function HeroSection({ data, variant }: Props) {
  if (variant === 'photo')    return <HeroPhoto data={data} />
  if (variant === 'dark')     return <HeroDark data={data} />
  if (variant === 'gradient') return <HeroGradient data={data} />
  if (variant === 'split')    return <HeroSplit data={data} />
  if (variant === 'banner')   return <HeroBanner data={data} />
  if (variant === 'centered') return <HeroCentered data={data} />
  return <HeroMinimal data={data} />
}
