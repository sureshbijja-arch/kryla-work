'use client'
import { useState, useEffect } from 'react'
import { mapsUrl, waUrl } from '../../types'
import type { ProfileData } from '../../types'
import { getPersonaConfig } from '../../personaConfig'

interface Props {
  data: ProfileData
  accent: string
  variant: string
  showNav?: boolean
  framesConfig?: { enabled: boolean; count: 1 | 2 | 3 }
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

function LeadTimeStrip({ notice }: { notice: string }) {
  return (
    <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full text-xs font-semibold"
      style={{ background: 'var(--color-accent-surface)', color: 'var(--color-accent)', border: '1px solid var(--color-accent-border)' }}>
      <span>⏱</span>
      {notice}
    </div>
  )
}

function CTAs({ wa, showBooking, showContact, ctaPrimary, ctaSecondary, ctaTarget, dark }: {
  wa: string | null; showBooking: boolean; showContact: boolean
  ctaPrimary: string; ctaSecondary: string; ctaTarget?: string; dark?: boolean
}) {
  const href = ctaTarget ?? '#book'
  return (
    <div className="flex flex-wrap gap-3">
      {showBooking && (
        <a href={href}
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
    ctaPrimary, ctaSecondary, showSections, avatarUrl, gallery, persona } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null
  const pcfg = getPersonaConfig(persona)
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
          {pcfg.leadTimeNotice && <LeadTimeStrip notice={pcfg.leadTimeNotice} />}
          <CTAs wa={wa} showBooking={showSections.booking} showContact={showSections.contact}
            ctaPrimary={ctaPrimary} ctaSecondary={ctaSecondary} ctaTarget={pcfg.heroCtaTarget} dark />
        </div>
      </div>
    </section>
  )
}

/* ── TUTOR ILLUSTRATION ──────────────────────────────────────────────────── */
function TutorIllustration({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 200 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      {/* Glow behind board */}
      <ellipse cx="100" cy="110" rx="82" ry="72" fill={accent} fillOpacity="0.07"/>

      {/* Chalkboard */}
      <rect x="20" y="30" width="160" height="120" rx="8" fill="white" fillOpacity="0.05" stroke="white" strokeOpacity="0.12" strokeWidth="1.5"/>

      {/* Equation lines — row 1 */}
      <line x1="40" y1="62" x2="78" y2="62" stroke="white" strokeOpacity="0.42" strokeWidth="2" strokeLinecap="round"/>
      <line x1="85" y1="62" x2="95" y2="62" stroke="white" strokeOpacity="0.28" strokeWidth="2" strokeLinecap="round"/>
      <line x1="102" y1="56" x2="122" y2="68" stroke="white" strokeOpacity="0.36" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="128" cy="55" r="2" fill="white" fillOpacity="0.36"/>

      {/* Row 2 — accent integral curve */}
      <path d="M40 82 C48 72 56 92 64 82" stroke={accent} strokeOpacity="0.8" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <line x1="72" y1="82" x2="90" y2="82" stroke="white" strokeOpacity="0.22" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="96" y1="82" x2="130" y2="82" stroke={accent} strokeOpacity="0.42" strokeWidth="1.5" strokeLinecap="round"/>

      {/* Row 3 — faint rule */}
      <line x1="40" y1="102" x2="152" y2="102" stroke="white" strokeOpacity="0.1" strokeWidth="1.5" strokeLinecap="round"/>

      {/* Row 4 — y = mx + b */}
      <line x1="40" y1="120" x2="58" y2="120" stroke="white" strokeOpacity="0.24" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="64" y1="120" x2="80" y2="120" stroke="white" strokeOpacity="0.18" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="86" y1="114" x2="102" y2="126" stroke="white" strokeOpacity="0.22" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="108" y1="120" x2="136" y2="120" stroke="white" strokeOpacity="0.18" strokeWidth="1.5" strokeLinecap="round"/>

      {/* Chalk tray */}
      <rect x="20" y="150" width="160" height="6" rx="3" fill="white" fillOpacity="0.07"/>
      <rect x="36" y="151" width="18" height="4" rx="2" fill="white" fillOpacity="0.24"/>
      <rect x="60" y="152" width="10" height="3" rx="1.5" fill={accent} fillOpacity="0.58"/>

      {/* Books stack (right) */}
      <rect x="128" y="196" width="58" height="11" rx="3" fill={accent} fillOpacity="0.38"/>
      <rect x="128" y="196" width="4" height="11" rx="0" fill={accent} fillOpacity="0.62"/>
      <rect x="132" y="185" width="50" height="11" rx="3" fill="white" fillOpacity="0.1"/>
      <rect x="132" y="185" width="4" height="11" rx="0" fill="white" fillOpacity="0.26"/>
      <rect x="136" y="175" width="42" height="10" rx="3" fill={accent} fillOpacity="0.22"/>
      <rect x="136" y="175" width="4" height="10" rx="0" fill={accent} fillOpacity="0.46"/>

      {/* Graduation cap (top left) */}
      <polygon points="20,24 38,16 56,24 38,32" fill="white" fillOpacity="0.13" stroke="white" strokeOpacity="0.22" strokeWidth="1"/>
      <rect x="14" y="20" width="48" height="5" rx="1" fill="white" fillOpacity="0.16"/>
      <line x1="56" y1="24" x2="62" y2="38" stroke="white" strokeOpacity="0.18" strokeWidth="1.5"/>
      <circle cx="63" cy="41" r="2.5" fill={accent} fillOpacity="0.62"/>

      {/* Light bulb (top right) */}
      <circle cx="174" cy="22" r="14" fill="white" fillOpacity="0.04" stroke={accent} strokeOpacity="0.38" strokeWidth="1.5"/>
      <path d="M168 22 Q174 11 180 22 Q180 28 177 30 H171 Q168 28 168 22Z" fill={accent} fillOpacity="0.2"/>
      <rect x="170" y="31" width="7" height="2.5" rx="1.25" fill="white" fillOpacity="0.2"/>
      <rect x="171" y="34" width="6" height="2" rx="1" fill="white" fillOpacity="0.13"/>
      <line x1="174" y1="5" x2="174" y2="2" stroke={accent} strokeOpacity="0.42" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="185" y1="9" x2="187" y2="7" stroke={accent} strokeOpacity="0.38" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="163" y1="9" x2="161" y2="7" stroke={accent} strokeOpacity="0.38" strokeWidth="1.5" strokeLinecap="round"/>

      {/* Pencil (bottom left) */}
      <g transform="rotate(-22 34 210)">
        <rect x="30" y="185" width="7" height="38" rx="2" fill="white" fillOpacity="0.1"/>
        <polygon points="30,223 37,223 33.5,232" fill={accent} fillOpacity="0.44"/>
        <rect x="30" y="185" width="7" height="7" rx="2" fill="white" fillOpacity="0.2"/>
      </g>

      {/* Sparkles */}
      <circle cx="118" cy="188" r="2.5" fill={accent} fillOpacity="0.48"/>
      <circle cx="98" cy="213" r="1.5" fill="white" fillOpacity="0.14"/>
      <circle cx="70" cy="207" r="1" fill={accent} fillOpacity="0.32"/>
      <circle cx="16" cy="130" r="1.5" fill="white" fillOpacity="0.1"/>
      <circle cx="192" cy="140" r="2" fill={accent} fillOpacity="0.2"/>
    </svg>
  )
}

/* ── DARK ────────────────────────────────────────────────────────────────────
   Deep black, single accent orb, large white headline, minimal decoration.
──────────────────────────────────────────────────────────────────────────── */
function HeroDark({ data, framesConfig, accent = '#F5A623' }: { data: ProfileData; framesConfig?: Props['framesConfig']; accent?: string }) {
  const { firstName, lastName, location, whatsappNumber, headline, subheadline,
    ctaPrimary, ctaSecondary, showSections, avatarUrl, gallery, persona } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null
  const pcfg = getPersonaConfig(persona)
  const maxFrames = framesConfig === undefined ? 2 : (framesConfig.enabled ? framesConfig.count : 0)
  const frames = gallery?.length ? gallery.slice(0, maxFrames) : []

  return (
    <section className="relative overflow-hidden flex flex-col" style={{ background: 'var(--sec-custom-bg, #0D0D0D)', minHeight: '100svh' }}>
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

      {/* Tutor illustration — default visual when no gallery/avatar uploaded */}
      {persona === 'tutor' && (
        <div className="absolute right-4 sm:right-10 top-1/2 -translate-y-1/2 w-40 sm:w-52 pointer-events-none hidden sm:block" style={{ zIndex: 0, opacity: 0.75 }}>
          <TutorIllustration accent={accent} />
        </div>
      )}

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
          {pcfg.leadTimeNotice && <LeadTimeStrip notice={pcfg.leadTimeNotice} />}
          <CTAs wa={wa} showBooking={showSections.booking} showContact={showSections.contact}
            ctaPrimary={ctaPrimary} ctaSecondary={ctaSecondary} ctaTarget={pcfg.heroCtaTarget} dark />
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
    ctaPrimary, ctaSecondary, showSections, avatarUrl, persona } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null
  const pcfg = getPersonaConfig(persona)

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
          {pcfg.leadTimeNotice && <LeadTimeStrip notice={pcfg.leadTimeNotice} />}
          <CTAs wa={wa} showBooking={showSections.booking} showContact={showSections.contact}
            ctaPrimary={ctaPrimary} ctaSecondary={ctaSecondary} ctaTarget={pcfg.heroCtaTarget} />
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
    ctaPrimary, ctaSecondary, showSections, avatarUrl, persona } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null
  const pcfg = getPersonaConfig(persona)

  return (
    <section className="relative overflow-hidden" style={{ background: 'var(--sec-custom-bg, white)' }}>
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
            {pcfg.leadTimeNotice && <LeadTimeStrip notice={pcfg.leadTimeNotice} />}
            <CTAs wa={wa} showBooking={showSections.booking} showContact={showSections.contact}
              ctaPrimary={ctaPrimary} ctaSecondary={ctaSecondary} ctaTarget={pcfg.heroCtaTarget} />
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
    ctaPrimary, ctaSecondary, showSections, avatarUrl, persona } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null
  const pcfg = getPersonaConfig(persona)

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
          {pcfg.leadTimeNotice && <LeadTimeStrip notice={pcfg.leadTimeNotice} />}
          <CTAs wa={wa} showBooking={showSections.booking} showContact={showSections.contact}
            ctaPrimary={ctaPrimary} ctaSecondary={ctaSecondary} ctaTarget={pcfg.heroCtaTarget} />
        </div>
      </div>
    </section>
  )
}

/* ── CENTERED ─────────────────────────────────────────────────────────────────
   Everything centered. Avatar with glow ring. Generous space above and below.
──────────────────────────────────────────────────────────────────────────── */
function HeroCentered({ data, framesConfig }: { data: ProfileData; framesConfig?: Props['framesConfig'] }) {
  const { firstName, lastName, location, whatsappNumber, headline, subheadline,
    ctaPrimary, ctaSecondary, showSections, avatarUrl, gallery, persona } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null
  const pcfg = getPersonaConfig(persona)
  const maxFrames = framesConfig === undefined ? 3 : (framesConfig.enabled ? framesConfig.count : 0)
  const frames = gallery?.length ? gallery.slice(0, maxFrames) : []

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
          {pcfg.leadTimeNotice && <LeadTimeStrip notice={pcfg.leadTimeNotice} />}
          <div className="flex flex-wrap gap-3 justify-center">
            <CTAs wa={wa} showBooking={showSections.booking} showContact={showSections.contact}
              ctaPrimary={ctaPrimary} ctaSecondary={ctaSecondary} ctaTarget={pcfg.heroCtaTarget} />
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
    ctaPrimary, ctaSecondary, showSections, avatarUrl, persona } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null
  const pcfg = getPersonaConfig(persona)

  return (
    <section className="relative overflow-hidden" style={{ background: 'var(--sec-custom-bg, white)' }}>
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
          {pcfg.leadTimeNotice && <LeadTimeStrip notice={pcfg.leadTimeNotice} />}
          <CTAs wa={wa} showBooking={showSections.booking} showContact={showSections.contact}
            ctaPrimary={ctaPrimary} ctaSecondary={ctaSecondary} ctaTarget={pcfg.heroCtaTarget} />
        </div>
      </div>
    </section>
  )
}

/* ── Entry point ─────────────────────────────────────────────────────────── */
export default function HeroSection({ data, variant, framesConfig }: Props) {
  if (variant === 'photo')    return <HeroPhoto data={data} />
  if (variant === 'dark')     return <HeroDark data={data} framesConfig={framesConfig} accent={accent} />
  if (variant === 'gradient') return <HeroGradient data={data} />
  if (variant === 'split')    return <HeroSplit data={data} />
  if (variant === 'banner')   return <HeroBanner data={data} />
  if (variant === 'centered') return <HeroCentered data={data} framesConfig={framesConfig} />
  return <HeroMinimal data={data} />
}
