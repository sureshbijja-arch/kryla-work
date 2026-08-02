'use client'
import { useState, useEffect, useRef } from 'react'
import { mapsUrl, waUrl } from '../../types'
import type { ProfileData, BusinessHours } from '../../types'
import { getPersonaConfig } from '../../personaConfig'
import { DAY_ORDER, DAY_LABELS, DAY_FULL, toMins, fmt12, getTodayKey, getStatus, getUpcomingExceptions, fmtExceptionDate, getDateStr } from '../../hours'
import { getVariants, priceRange } from '../../variants'
import SmartImg from '../SmartImg'
import { EyebrowLabel } from '../shared'
import { useOrderActions, OrderActionModals } from './orderActions'
import { useIdolSelection } from '../IdolSelectionContext'

interface Props {
  data: ProfileData
  accent: string
  variant: string
  framesConfig?: { enabled: boolean; count: 1 | 2 | 3 }
  heroHeight?: number // min-height in svh, 40–100; unset = per-variant default
}

// Clamp + convert a member-set hero height (svh units) to a CSS value.
// Returns undefined when unset so callers can fall back to their own default.
function heroMinHeight(heroHeight: number | undefined): string | undefined {
  if (heroHeight === undefined) return undefined
  const clamped = Math.min(100, Math.max(40, heroHeight))
  return `${clamped}svh`
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

// ── Business Hours badge ──────────────────────────────────────────────────────

function BusinessStatusBadge({ hours, dark }: { hours: BusinessHours; dark?: boolean }) {
  const [status, setStatus] = useState(() => getStatus(hours))
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setStatus(getStatus(hours)), 60_000)
    return () => clearInterval(id)
  }, [hours])

  const tz       = hours.timezone || 'UTC'
  const todayKey = getTodayKey(tz)
  const todayStr = getDateStr(tz, 0)

  // Upcoming exceptions strictly after today (today's status is already in the pill)
  const upcoming  = getUpcomingExceptions(hours, tz, 5).filter(e => e.date > todayStr)
  const closures  = upcoming.filter(e => e.closed)

  const pillBg     = dark ? 'rgba(255,255,255,0.14)' : 'var(--color-accent-surface)'
  const pillBorder = dark ? '1px solid rgba(255,255,255,0.28)' : '1px solid var(--color-accent-border)'
  const pillColor  = dark ? 'rgba(255,255,255,0.92)' : 'var(--color-accent)'
  const dotColor   = status.isOpen ? '#22C55E' : (dark ? 'rgba(255,255,255,0.45)' : 'var(--color-accent)')
  const panelBg    = dark ? 'rgba(0,0,0,0.5)' : 'var(--color-accent-surface)'
  const panelBdr   = dark ? 'rgba(255,255,255,0.14)' : 'var(--color-accent-border)'
  const rowColor   = dark ? 'rgba(255,255,255,0.85)' : 'var(--color-accent)'
  const noticeColor = dark ? 'rgba(255,255,255,0.72)' : '#92400E'
  const noticeBg   = dark ? 'rgba(255,255,255,0.08)' : '#FEF3C7'
  const noticeBdr  = dark ? 'rgba(255,255,255,0.16)' : '#FDE68A'

  // Short date label: "Jul 10" (strip the year)
  const shortDate = (dateStr: string) => fmtExceptionDate(dateStr).replace(/,\s*\d{4}$/, '')

  return (
    <div className="mb-5">
      <button
        onClick={() => setExpanded(v => !v)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all"
        style={{ background: pillBg, border: pillBorder, color: pillColor, backdropFilter: dark ? 'blur(10px)' : undefined }}>
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dotColor }} />
        {status.label}
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ transition: 'transform .2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>
          <path d="M1.5 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Always-visible upcoming-closure chips — one per closure, no expand required */}
      {closures.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {closures.map(c => (
            <div key={c.date} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: noticeBg, border: `1px solid ${noticeBdr}`, color: noticeColor }}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M5.5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Closed {shortDate(c.date)}{c.note ? ` · ${c.note}` : ''}
            </div>
          ))}
        </div>
      )}

      {expanded && (
        <div
          className="mt-1.5 rounded-xl overflow-hidden"
          style={{ background: panelBg, border: `1px solid ${panelBdr}`, backdropFilter: dark ? 'blur(10px)' : undefined }}>
          {DAY_ORDER.map((day, i) => {
            const dh = hours[day]
            return (
              <div
                key={day}
                className="flex items-center justify-between px-4 py-2"
                style={{
                  borderTop: i > 0 ? `1px solid ${panelBdr}` : undefined,
                  opacity: day === todayKey ? 1 : 0.55,
                }}>
                <span className="text-xs w-8" style={{ color: rowColor, fontWeight: day === todayKey ? 800 : 600 }}>
                  {DAY_LABELS[day]}
                </span>
                <span className="text-xs" style={{ color: rowColor }}>
                  {dh ? `${fmt12(dh.open)} – ${fmt12(dh.close)}` : 'Closed'}
                </span>
              </div>
            )
          })}

          {/* Upcoming exceptions: closures + special hours */}
          {upcoming.length > 0 && (
            <div className="px-4 py-3" style={{ borderTop: `1px solid ${panelBdr}` }}>
              <p className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: rowColor, opacity: 0.55 }}>
                Upcoming closures &amp; special days
              </p>
              <div className="space-y-1">
                {upcoming.map(exc => (
                  <div key={exc.date} className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold" style={{ color: rowColor }}>
                      {shortDate(exc.date)}
                    </span>
                    <span className="text-xs" style={{ color: rowColor, opacity: 0.7 }}>
                      {exc.closed
                        ? (exc.note ? `Closed · ${exc.note}` : 'Closed')
                        : (exc.open && exc.close
                          ? `${fmt12(exc.open)} – ${fmt12(exc.close)}${exc.note ? ` · ${exc.note}` : ''}`
                          : exc.note ?? 'Special hours')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

interface FrameConfig { top: string; left?: string; right?: string; rot: string; dur: string; delay: string }
const FRAME_CONFIGS: FrameConfig[] = [
  { top: '8%',  left:  '2%', rot: '-6deg', dur: '9s',  delay: '0s'   },
  { top: '52%', left:  '1%', rot:  '4deg', dur: '11s', delay: '1.8s' },
  { top: '12%', right: '2%', rot: '-3deg', dur: '8s',  delay: '3.2s' },
]

function KLogo({ dark = false }: { dark?: boolean }) {
  const line = dark ? 'white' : '#0D0D0D'
  const acc  = 'var(--color-accent)'
  // Resting opacity is the WCAG-passing floor for the SVG mark + "kryla" text
  // against any hero background this renders on (verified 4.5:1+ on both
  // terracotta and near-black for dark, and on white/kryla-bg for light) —
  // hover still brightens to 1 for the visual "wake up" affordance.
  // CSS opacity on an ancestor composites with a descendant's color at render
  // time (a child's own opacity can't cancel it out), so ".work" — which
  // needs to render in var(--color-accent), a per-persona value we can't
  // pre-verify against every dimming level — sits OUTSIDE the dimmed
  // span entirely, as a sibling at the link's own full opacity. This also
  // sidesteps HeroShadu's specific collision (its flat background IS
  // var(--color-accent), so accent-on-accent inside a dimmed wrapper would be
  // both invisible AND under-contrast at the same time); dark mode uses solid
  // white instead of the raw accent so it always reads against any dark hero
  // fill, including one that equals the accent color.
  const restOpacity = dark ? '.75' : '.6'
  return (
    <a href="https://kryla.work" className="flex items-center gap-1.5">
      <span
        className="flex items-center gap-1.5 transition-opacity"
        style={{ opacity: restOpacity }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = restOpacity)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <line x1="7" y1="4"  x2="7"  y2="20" stroke={line} strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="7" y1="12" x2="17" y2="4"  stroke={line} strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="7" y1="12" x2="17" y2="20" stroke={acc}  strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        <span className="text-xs font-bold" style={{ color: dark ? 'white' : '#0D0D0D' }}>kryla</span>
      </span>
      <span className="text-xs font-bold -ml-1" style={{ color: dark ? 'white' : acc }}>.work</span>
    </a>
  )
}

function LocationLink({ location, dark }: { location: string; dark?: boolean }) {
  return (
    <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer"
      className="text-sm font-semibold transition-colors"
      style={{
        color: dark ? 'rgba(255,255,255,.92)' : '#333',
        textShadow: dark ? '0 1px 4px rgba(0,0,0,.6)' : undefined,
      }}>
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
            // .5 measured ~3:1 on lighter dark-hero backgrounds like terracotta
            // (only ever verified against near-black); .75 clears 4.5:1 on both.
            color: dark ? 'rgba(255,255,255,.75)' : '#333',
            backdropFilter: dark ? 'blur(8px)' : undefined,
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLAnchorElement
            el.style.color = dark ? 'white' : '#0D0D0D'
            el.style.borderColor = dark ? 'rgba(255,255,255,.4)' : '#0D0D0D'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLAnchorElement
            el.style.color = dark ? 'rgba(255,255,255,.75)' : '#333'
            el.style.borderColor = dark ? 'rgba(255,255,255,.15)' : 'var(--color-accent-border)'
          }}>
          {ctaSecondary || 'Get in touch'}
        </a>
      )}
    </div>
  )
}

/* ── VERIFIED CHIP ───────────────────────────────────────────────────────── */
function VerifiedChip({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{
        verticalAlign: 'middle',
        background: dark ? 'rgba(34,197,94,0.18)' : '#F0FDF4',
        color:      dark ? '#86EFAC' : '#16A34A',
        border:     `1px solid ${dark ? 'rgba(34,197,94,0.3)' : '#BBF7D0'}`,
        lineHeight: '1',
      }}>
      ✓ Verified
    </span>
  )
}

/* ── PHOTO ───────────────────────────────────────────────────────────────────
   Full-bleed background image (gallery[0] or avatar), dark scrim, text bottom.
   Sticky blur-nav appears on scroll.
──────────────────────────────────────────────────────────────────────────── */
function HeroPhoto({ data, heroHeight }: { data: ProfileData; heroHeight?: number }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const { firstName, lastName, location, whatsappNumber, headline, subheadline,
    ctaPrimary, ctaSecondary, showSections, avatarUrl, gallery, persona, heroFitCropTolerance } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null
  const pcfg = getPersonaConfig(persona)
  const bg = gallery?.length ? gallery[0] : avatarUrl
  const showAvatar = !!(avatarUrl && gallery?.length)

  return (
    <section className="relative overflow-hidden flex flex-col" style={{ minHeight: heroMinHeight(heroHeight) ?? 'clamp(32rem, 100svh, 100svh)', maxHeight: '100svh' }}>
      <style>{STYLES}</style>

      {/* Background — 'auto' fit fills the hero edge-to-edge like cover for a
          normal photo, but automatically switches to a blurred-fill backdrop
          (whole image, blurred zoomed copy behind it) when the image's ratio
          is far enough from the hero's that cover would crop it heavily —
          e.g. an ultra-wide banner photo on a tall phone hero. */}
      <SmartImg src={bg} fit="auto" focus="50% 50%" cropTolerance={heroFitCropTolerance} className="absolute inset-0" />

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
            <SmartImg src={avatarUrl} alt={fullName} focus="50% 35%"
              className="w-16 h-16 shadow-2xl"
              style={{
                borderRadius: 'var(--radius-card)',
                border: '2px solid var(--color-accent)',
                boxShadow: '0 0 0 4px rgba(255,255,255,.08)',
              }} />
          </div>
        )}
        <div className="h-up h-up-1 flex items-center gap-2 flex-wrap mb-4">
          <p className="font-black uppercase tracking-[.22em]"
            style={{ fontSize: 'var(--type-label)', color: 'var(--color-accent)' }}>
            {fullName}
          </p>
          {persona === 'advocate' && data.verified && <VerifiedChip dark />}
        </div>
        <h1 className="h-up h-up-2 font-display-token text-white leading-[1.04] tracking-tight mb-5"
          style={{ fontSize: 'var(--type-display)', fontWeight: 'var(--fw-display)' }}>
          {headline}
        </h1>
        <p className="h-up h-up-3 text-white/70 leading-relaxed mb-10 max-w-md"
          style={{ fontSize: 'var(--type-subheading)' }}>
          {subheadline}
        </p>
        <div className="h-up h-up-4">
          {data.businessHours?.enabled && <BusinessStatusBadge hours={data.businessHours} dark />}
          {pcfg.leadTimeNotice && <LeadTimeStrip notice={pcfg.leadTimeNotice} />}
          <CTAs wa={wa} showBooking={showSections.booking} showContact={showSections.contact}
            ctaPrimary={ctaPrimary} ctaSecondary={ctaSecondary} ctaTarget={pcfg.heroCtaTarget} dark />
        </div>
      </div>
    </section>
  )
}

/* ── SWEEP ────────────────────────────────────────────────────────────────
   Salon signature: HeroPhoto's portrait ground + a one-shot brass light-sweep,
   gated behind prefers-reduced-motion.
──────────────────────────────────────────────────────────────────────────── */
const SWEEP_STYLES = `
@keyframes heroSweep {
  0%   { transform: translateX(0) skewX(-14deg); opacity:0; }
  12%  { opacity:1; }
  38%  { transform: translateX(387.5%) skewX(-14deg); opacity:0; }
  100% { transform: translateX(387.5%) skewX(-14deg); opacity:0; }
}
@media (prefers-reduced-motion: reduce) {
  .hero-sweep { animation: none !important; display: none; }
}
`

function HeroSweep({ data, heroHeight }: { data: ProfileData; heroHeight?: number }) {
  return (
    <div className="relative">
      <style>{SWEEP_STYLES}</style>
      <div className="hero-sweep absolute top-0 bottom-0 pointer-events-none"
        style={{
          left: '-40%', width: '40%', zIndex: 5,
          background: 'linear-gradient(105deg, transparent, rgba(247,243,238,.28) 45%, var(--color-signature) 52%, transparent)',
          opacity: 0.35,
          animation: 'heroSweep 5.5s cubic-bezier(.4,0,.1,1) .6s infinite',
        }} />
      <HeroPhoto data={data} heroHeight={heroHeight} />
    </div>
  )
}

/* ── DABBA ────────────────────────────────────────────────────────────────
   Tiffin signature: today's top services rendered as real dabba compartments.
   Renders only what exists — never placeholder content.
──────────────────────────────────────────────────────────────────────────── */
function HeroDabba({ data, heroHeight }: { data: ProfileData; heroHeight?: number }) {
  const { firstName, lastName, location, whatsappNumber, headline, subheadline,
    ctaPrimary, ctaSecondary, showSections, persona } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null
  const pcfg = getPersonaConfig(persona)
  const items = (data.services ?? []).slice(0, 3)

  return (
    <section className="relative overflow-hidden" style={{ background: 'var(--sec-custom-bg, white)', minHeight: heroMinHeight(heroHeight) }}>
      <style>{STYLES}</style>
      <nav className="max-w-2xl mx-auto px-6 pt-6 flex justify-between items-center">
        {location ? <LocationLink location={location} /> : <span />}
        <KLogo />
      </nav>
      <div className="max-w-2xl mx-auto px-6" style={{ paddingTop: 'calc(var(--space-section) * .7)', paddingBottom: 'var(--space-section)' }}>
        <div className="h-up h-up-1 flex items-center gap-2 flex-wrap mb-4">
          <p className="font-black uppercase tracking-[.22em]" style={{ fontSize: 'var(--type-label)', color: 'var(--color-accent)' }}>{fullName}</p>
        </div>
        <h1 className="h-up h-up-2 font-display-token italic text-[#241f1a] leading-[1.08] tracking-tight mb-4"
          style={{ fontSize: 'var(--type-display)', fontWeight: 'var(--fw-display)' }}>
          {headline}
        </h1>
        <p className="h-up h-up-3 text-[#5f574d] leading-relaxed mb-6 max-w-md" style={{ fontSize: 'var(--type-subheading)' }}>
          {subheadline}
        </p>

        {items.length > 0 && (
          <div className="h-up h-up-4 mb-8">
            <div className="flex justify-between items-baseline mb-2.5">
              <span className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>Today&rsquo;s Dabba</span>
            </div>
            <div className="rounded-2xl p-3.5" style={{ background: 'linear-gradient(155deg,#DADFDD,#B9C2BF 55%,#9BA6A2)' }}>
              <div className="grid grid-cols-2 gap-2" style={{ gridTemplateRows: '1fr 1fr', height: 168 }}>
                <div className="rounded-xl p-2.5 flex flex-col justify-end" style={{ gridRow: items.length > 1 ? '1 / 3' : '1 / 3', background: 'var(--color-signature)' }}>
                  <span className="text-[11px] font-extrabold uppercase" style={{ color: 'rgba(0,0,0,.55)' }}>{items[0].name}</span>
                </div>
                {items.slice(1).map((it) => (
                  <div key={it.name} className="rounded-xl p-2.5 flex flex-col justify-end" style={{ background: 'var(--color-accent)' }}>
                    <span className="text-[10.5px] font-extrabold uppercase" style={{ color: 'rgba(0,0,0,.55)' }}>{it.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="h-up h-up-4">
          <CTAs wa={wa} showBooking={showSections.booking} showContact={showSections.contact}
            ctaPrimary={ctaPrimary} ctaSecondary={ctaSecondary} ctaTarget={pcfg.heroCtaTarget} />
        </div>
      </div>
    </section>
  )
}

/* ── PDP ───────────────────────────────────────────────────────────────────
   Ganesh idol-seller v3 rebuild (designscreenshots/sellganeshidolsv3.pdf):
   a two-column product-detail layout on the member's own warm cream ground
   (--sec-custom-bg / page_bg, not hardcoded) — replaces HeroShadu's flat
   full-bleed field. Image left (or an honest dashed placeholder — no usable
   real photography exists yet for this persona; see
   supabase/migrations/20260731090000_ganesh_theme_font_columns.sql), buying
   column right: eyebrow, headline, subheadline, price block with a size
   selector driven by the member's own services array, an INCLUDES
   checklist, dual CTA, and a shipping-reassurance line (footerNote.body,
   reused rather than a new field — this is the trust-copy the design
   critique flagged as missing near the highest-stakes CTA).

   v3.1 idol-showcase rebuild: this is now the "idol detail" view for
   whichever idol is selected — either locally (its own size chips) or
   pushed in from FactsSection's idol cards via IdolSelectionContext. Price
   shows a real min–max range until a size is chosen, includes swap per
   size, and clicking an idol card scrolls back up to this section already
   showing that idol (see registerPdpTarget/scrollToPdp).

   Nav resolves every link to a real section id (`#idols`/`#custom`/
   `#materials`) — the prior "Menu" nav item was a decorative dead span with
   no target (critique P2); every link here is real.
──────────────────────────────────────────────────────────────────────────── */
function HeroPdp({ data, heroHeight }: { data: ProfileData; heroHeight?: number }) {
  const { whatsappNumber, firstName, lastName, headline, subheadline,
    services, showSections, persona, businessHours, providerId,
    includes, footerNote, heroFitCropTolerance } = data
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null
  const pcfg = getPersonaConfig(persona)
  const accentColor = 'var(--color-accent)'
  // --color-ink/--color-ink-muted: DB-driven (PaletteTokens.ink/inkMuted,
  // set in LayoutRenderer), not hardcoded hex — falls back to the platform's
  // generic --kryla-dark/--kryla-muted for any persona without a curated
  // pair. No literal color values live in this component.
  const ink      = 'var(--color-ink)'
  const inkMuted = 'var(--color-ink-muted)'
  const { orderItem, setOrderItem, customOpen, setCustomOpen, openOrder, openCustomOrder } = useOrderActions()

  const idolSection = useIdolSelection()
  const pdpRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    idolSection?.registerPdpTarget(pdpRef.current)
    return () => idolSection?.registerPdpTarget(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Idols with nothing purchasable (no price, no variants) don't appear in
  // the selector at all — same filter the old flat sizableServices used.
  const idols = services.filter(s => getVariants(s).length > 0)
  const selectedIdolIdx = Math.min(idolSection?.selectedIdolIdx ?? 0, Math.max(idols.length - 1, 0))
  const selectedIdol = idols[selectedIdolIdx] ?? idols[0]
  const variants = selectedIdol ? getVariants(selectedIdol) : []

  // Variant (size) selection is local to the PDP — switching idols always
  // resets it to the first size, so a stale index from a differently-sized
  // idol never carries over.
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number | null>(null)
  useEffect(() => { setSelectedVariantIdx(null) }, [selectedIdolIdx])
  const selectedVariant = selectedVariantIdx !== null ? variants[selectedVariantIdx] : null

  const range = variants.length > 0 ? priceRange(variants) : null
  const heroImage = selectedIdol?.image_url ?? null
  const displayIncludes = selectedVariant?.includes?.length ? selectedVariant.includes : includes
  const displayCompareAt = selectedVariant?.compareAtPrice ?? selectedIdol?.compareAtPrice ?? null

  // Ganesh-only config fields — 'in' narrows TypeScript's inferred union
  // safely without widening every other persona's config shape, same
  // pattern already used for heroEyebrow/orderButtonStyle.
  const navLabel   = 'navLabel'   in pcfg ? pcfg.navLabel   : [firstName, lastName].filter(Boolean).join(' ')
  const navLinks   = 'navLinks'   in pcfg ? pcfg.navLinks   : []
  const sizeLabel  = 'sizeSelectorLabel' in pcfg ? pcfg.sizeSelectorLabel : 'Select option'
  const includesLb = 'includesLabel'     in pcfg ? pcfg.includesLabel     : 'Includes'
  const primaryLb  = 'primaryCtaLabel'   in pcfg ? pcfg.primaryCtaLabel   : data.ctaPrimary
  const festiveLb  = 'festivePriceLabel' in pcfg ? pcfg.festivePriceLabel : undefined

  return (
    <section ref={pdpRef} className="relative" style={{ background: 'var(--sec-custom-bg, var(--section-bg))', minHeight: heroMinHeight(heroHeight) }}>
      <style>{STYLES}</style>
      <nav className="max-w-6xl mx-auto w-full px-6 py-5 flex justify-between items-center gap-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <a href="#" className="flex items-center gap-3 shrink-0">
          <span className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
            style={{ background: accentColor }}>
            {(navLabel || 'G').charAt(0).toUpperCase()}
          </span>
          <span className="font-display-token text-lg leading-tight" style={{ color: ink }}>{navLabel}</span>
        </a>
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(link => (
            <a key={link.target} href={link.target}
              className="text-xs font-black uppercase tracking-[0.12em] transition-colors hover:opacity-70" style={{ color: inkMuted }}>
              {link.label}
            </a>
          ))}
        </div>
        {wa && showSections.contact && (
          <a href={wa} target="_blank" rel="noopener noreferrer"
            className="shrink-0 px-5 py-2.5 text-xs font-black uppercase tracking-[0.08em] border transition-colors hover:opacity-70"
            style={{ borderRadius: 'var(--radius-btn)', borderColor: ink, color: ink }}>
            Enquire
          </a>
        )}
      </nav>

      <div className="max-w-6xl mx-auto w-full px-6 grid lg:grid-cols-2 gap-12"
        style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
        {/* Image column — real photo when available; an honest, on-palette
            placeholder otherwise (see migration note above: no usable
            photography exists yet, so this IS the shipping state, not a
            transient stub — it gets real design attention, not a bare icon).
            Placeholder fill/border read the same accent-derived surface/
            border tokens every other section's photo/empty-state treatment
            uses — not a separate hardcoded color. */}
        <div className="h-up h-up-1" style={{ aspectRatio: '4 / 5' }}>
          {heroImage ? (
            <SmartImg src={heroImage} alt={selectedIdol?.name ?? headline} fit="auto" cropTolerance={heroFitCropTolerance}
              className="w-full h-full" style={{ borderRadius: 'var(--radius-card)' }} />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center px-8 border-2 border-dashed"
              style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-accent-surface)', borderColor: 'var(--color-accent-border)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5, color: ink }}>
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="8.5" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M21 15l-5-5-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="text-sm font-bold" style={{ color: ink, opacity: 0.7 }}>Add a photo of this idol</p>
            </div>
          )}
        </div>

        {/* Buying column */}
        <div className="h-up h-up-2 flex flex-col justify-center">
          {'heroEyebrow' in pcfg && pcfg.heroEyebrow && (
            <div className="mb-3"><EyebrowLabel text={pcfg.heroEyebrow} color={accentColor} /></div>
          )}
          <h1 className="font-display-token leading-[1.05] tracking-tight mb-4"
            style={{ fontSize: 'var(--type-display)', fontWeight: 'var(--fw-display)', color: ink }}>
            {headline}
          </h1>
          <p className="leading-relaxed mb-6 max-w-md" style={{ fontSize: 'var(--type-subheading)', color: inkMuted }}>
            {subheadline}
          </p>

          {/* Selected-idol identity — only shown once there's more than one
              idol to disambiguate; a single-idol page reads fine with just
              the page headline above, as before this rebuild. */}
          {selectedIdol && idols.length > 1 && (
            <p className="font-display-token mb-2" style={{ fontSize: 'var(--type-subheading)', color: ink }}>{selectedIdol.name}</p>
          )}

          {range && (
            <div className="flex items-center gap-3 flex-wrap mb-6 pb-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
              {displayCompareAt && selectedVariant && (
                <span className="text-lg line-through" style={{ color: inkMuted }}>{displayCompareAt}</span>
              )}
              <span className="font-display-token text-3xl" style={{ color: ink }}>
                {selectedVariant ? selectedVariant.price : range.display}
              </span>
              {festiveLb && displayCompareAt && selectedVariant && (
                <span className="text-xs font-black uppercase tracking-wide px-3 py-1"
                  style={{ borderRadius: 'var(--radius-btn)', background: 'var(--color-accent-surface)', color: accentColor }}>
                  {festiveLb}
                </span>
              )}
            </div>
          )}

          {variants.length > 1 && (
            <div className="mb-6">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-3" style={{ color: inkMuted }}>{sizeLabel}</p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v, i) => (
                  <button key={i} type="button" onClick={() => setSelectedVariantIdx(i)}
                    aria-pressed={i === selectedVariantIdx}
                    className="px-4 py-2.5 text-sm font-bold transition-colors"
                    style={{
                      borderRadius: 'var(--radius-btn)',
                      border: `1.5px solid ${i === selectedVariantIdx ? accentColor : 'var(--color-accent-border)'}`,
                      background: i === selectedVariantIdx ? accentColor : 'transparent',
                      color: i === selectedVariantIdx ? 'white' : ink,
                      minHeight: 44,
                    }}>
                    {v.size || selectedIdol?.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!!displayIncludes?.length && (
            <div className="mb-6">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-3" style={{ color: inkMuted }}>{includesLb}</p>
              <ul className="space-y-2">
                {displayIncludes.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: ink }}>
                    <span className="shrink-0 mt-0.5" style={{ color: accentColor }} aria-hidden>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {businessHours?.enabled && <BusinessStatusBadge hours={businessHours} />}
            {selectedIdol && (
              <button type="button"
                onClick={() => openOrder({
                  name: selectedVariant ? `${selectedIdol.name} (${selectedVariant.size})` : selectedIdol.name,
                  description: selectedIdol.description ?? undefined,
                  price: (selectedVariant?.price ?? range?.display) ?? undefined,
                  image_url: selectedIdol.image_url ?? undefined,
                })}
                className="w-full py-4 font-black text-sm text-white transition-opacity hover:opacity-90"
                style={{ borderRadius: 'var(--radius-btn)', background: ink, minHeight: 44 }}>
                {primaryLb}
              </button>
            )}
            {pcfg.hasCustomOrder && (
              <button type="button" onClick={openCustomOrder}
                className="w-full py-4 font-black text-sm transition-colors hover:opacity-70"
                style={{ borderRadius: 'var(--radius-btn)', border: `1.5px solid ${ink}`, color: ink, minHeight: 44 }}>
                {'secondaryCtaLabel' in pcfg ? pcfg.secondaryCtaLabel : 'Request Custom Size or Finish'}
              </button>
            )}
          </div>

          {/* View Collection — the "Collections" nav link above is
              hidden on mobile (md:flex), so this is the reachable-on-
              every-viewport way to browse the rest of the catalogue below,
              distinct from Reserve/Custom Order (browsing vs. committing). */}
          {idols.length > 1 && (
            <a href="#idols"
              className="mt-4 text-center text-xs font-black uppercase tracking-[0.1em] hover:opacity-70 transition-opacity"
              style={{ color: accentColor, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              View Full Collection ↓
            </a>
          )}

          {footerNote?.body && (
            <p className="mt-4 text-xs text-center" style={{ color: inkMuted }}>{footerNote.body}</p>
          )}
        </div>
      </div>

      <OrderActionModals
        orderItem={orderItem} customOpen={customOpen}
        onCloseOrder={() => setOrderItem(null)} onCloseCustomOrder={() => setCustomOpen(false)}
        providerId={providerId} accentColor={accentColor}
        orderConfig={data.orderConfig} persona={persona}
      />
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
function HeroDark({ data, framesConfig, accent = '#F5A623', heroHeight }: { data: ProfileData; framesConfig?: Props['framesConfig']; accent?: string; heroHeight?: number }) {
  const { firstName, lastName, location, whatsappNumber, headline, subheadline,
    ctaPrimary, ctaSecondary, showSections, avatarUrl, gallery, persona } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null
  const pcfg = getPersonaConfig(persona)
  const maxFrames = framesConfig === undefined ? 2 : (framesConfig.enabled ? framesConfig.count : 0)
  const frames = gallery?.length ? gallery.slice(0, maxFrames) : []

  return (
    <section className="relative overflow-hidden flex flex-col" style={{ background: 'var(--sec-custom-bg, #0D0D0D)', minHeight: heroMinHeight(heroHeight) ?? '100svh' }}>
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
            <SmartImg src={src}
              className="w-28 h-36 sm:w-32 sm:h-44"
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
            <SmartImg src={avatarUrl} alt={fullName} focus="50% 35%"
              className="w-20 h-20"
              style={{
                borderRadius: 'var(--radius-card)',
                outline: '3px solid var(--color-accent)',
                outlineOffset: 5,
                boxShadow: '0 0 0 8px var(--color-accent-surface), 0 0 48px var(--color-accent-glow)',
              }} />
          </div>
        )}
        <div className="h-up h-up-1 flex items-center gap-2 flex-wrap mb-5">
          <p className="font-black uppercase tracking-[.22em]"
            style={{ fontSize: 'var(--type-label)', color: 'var(--color-accent)' }}>
            {fullName}
          </p>
          {persona === 'advocate' && data.verified && <VerifiedChip dark />}
        </div>
        <h1 className="h-up h-up-2 font-display-token text-white leading-[1.04] tracking-tight mb-5"
          style={{ fontSize: 'var(--type-display)', fontWeight: 'var(--fw-display)' }}>
          {headline}
        </h1>
        <p className="h-up h-up-3 text-white/35 leading-relaxed mb-10 max-w-md"
          style={{ fontSize: 'var(--type-subheading)' }}>
          {subheadline}
        </p>
        <div className="h-up h-up-4">
          {data.businessHours?.enabled && <BusinessStatusBadge hours={data.businessHours} dark />}
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
function HeroGradient({ data, heroHeight }: { data: ProfileData; heroHeight?: number }) {
  const { firstName, lastName, location, whatsappNumber, headline, subheadline,
    ctaPrimary, ctaSecondary, showSections, avatarUrl, persona } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null
  const pcfg = getPersonaConfig(persona)

  return (
    <section className="relative overflow-hidden" style={{ minHeight: heroMinHeight(heroHeight) }}>
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
            <SmartImg src={avatarUrl} alt={fullName} focus="50% 35%"
              className="w-24 h-24 shadow-2xl"
              style={{
                borderRadius: 'var(--radius-card)',
                outline: '2px solid var(--color-accent-border)',
                outlineOffset: 3,
                boxShadow: '0 16px 48px var(--color-accent-glow)',
              }} />
          </div>
        )}
        <div className="h-up h-up-1 flex items-center gap-2 flex-wrap mb-5">
          <div className="inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest"
            style={{
              borderRadius: 'var(--radius-btn)',
              background: 'var(--color-accent-surface)',
              color: 'var(--color-accent)',
              border: '1px solid var(--color-accent-border)',
            }}>
            {fullName}
          </div>
          {persona === 'advocate' && data.verified && <VerifiedChip />}
        </div>
        <h1 className="h-up h-up-2 font-display-token text-[#0D0D0D] leading-[1.04] tracking-tight mb-5"
          style={{ fontSize: 'var(--type-display)', fontWeight: 'var(--fw-display)' }}>
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
          {data.businessHours?.enabled && <BusinessStatusBadge hours={data.businessHours} />}
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
function HeroSplit({ data, heroHeight }: { data: ProfileData; heroHeight?: number }) {
  const { firstName, lastName, location, whatsappNumber, headline, subheadline,
    ctaPrimary, ctaSecondary, showSections, avatarUrl, persona } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null
  const pcfg = getPersonaConfig(persona)

  return (
    <section className="relative overflow-hidden" style={{ background: 'var(--sec-custom-bg, white)', minHeight: heroMinHeight(heroHeight) }}>
      <style>{STYLES}</style>
      <nav className="max-w-5xl mx-auto px-6 pt-6 flex justify-between items-center">
        {location ? <LocationLink location={location} /> : <span />}
        <KLogo />
      </nav>
      <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row gap-12 items-center"
        style={{ paddingTop: 'calc(var(--space-section) * .7)', paddingBottom: 'var(--space-section)' }}>
        <div className="flex-1 order-2 sm:order-1">
          <div className="h-up h-up-1 flex items-center gap-2 flex-wrap mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-black uppercase tracking-widest"
              style={{
                borderRadius: 'var(--radius-btn)',
                background: 'var(--color-accent-surface)',
                color: 'var(--color-accent)',
              }}>
              {fullName}
            </div>
            {persona === 'advocate' && data.verified && <VerifiedChip />}
          </div>
          <h1 className="h-up h-up-2 font-display-token text-[#0D0D0D] leading-[1.04] tracking-tight mb-5"
            style={{ fontSize: 'var(--type-display)', fontWeight: 'var(--fw-display)' }}>
            {headline}
          </h1>
          <p className="h-up h-up-3 text-[#555] leading-relaxed mb-8 max-w-md"
            style={{ fontSize: 'var(--type-subheading)' }}>
            {subheadline}
          </p>
          <div className="h-up h-up-4">
            {data.businessHours?.enabled && <BusinessStatusBadge hours={data.businessHours} />}
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
                <SmartImg src={avatarUrl} alt={fullName} focus="50% 35%" className="w-full h-full" />
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
function HeroBanner({ data, heroHeight }: { data: ProfileData; heroHeight?: number }) {
  const { firstName, lastName, location, whatsappNumber, headline, subheadline,
    ctaPrimary, ctaSecondary, showSections, avatarUrl, persona } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null
  const pcfg = getPersonaConfig(persona)

  return (
    <section style={{ minHeight: heroMinHeight(heroHeight) }}>
      <style>{STYLES}</style>
      <header className="relative overflow-hidden pb-20" style={{ background: 'var(--color-accent)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,.18) 0%, transparent 60%)' }} />
        <div className="relative max-w-2xl mx-auto px-6 pt-5 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white/60 font-black uppercase tracking-widest" style={{ fontSize: 'var(--type-label)' }}>
                {fullName}
              </p>
              {persona === 'advocate' && data.verified && <VerifiedChip dark />}
            </div>
            {location && <LocationLink location={location} dark />}
          </div>
          <KLogo dark />
        </div>
        {avatarUrl && (
          <div className="relative max-w-2xl mx-auto px-6 mt-8">
            <SmartImg src={avatarUrl} alt={fullName} focus="50% 35%"
              className="w-24 h-24 shadow-2xl"
              style={{ borderRadius: 'var(--radius-card)', border: '4px solid rgba(255,255,255,.2)' }} />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-white" style={{ borderRadius: '2rem 2rem 0 0' }} />
      </header>
      <div className="max-w-2xl mx-auto px-6"
        style={{ paddingTop: 'calc(var(--space-section) * .6)', paddingBottom: 'var(--space-section)' }}>
        <h1 className="h-up font-heading-token text-[#0D0D0D] leading-[1.04] tracking-tight mb-4"
          style={{ fontSize: 'var(--type-heading)', fontWeight: 'var(--fw-display)' }}>
          {headline}
        </h1>
        <p className="h-up h-up-1 text-[#555] leading-relaxed mb-8" style={{ fontSize: 'var(--type-subheading)' }}>
          {subheadline}
        </p>
        <div className="h-up h-up-2">
          {data.businessHours?.enabled && <BusinessStatusBadge hours={data.businessHours} />}
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
function HeroCentered({ data, framesConfig, heroHeight }: { data: ProfileData; framesConfig?: Props['framesConfig']; heroHeight?: number }) {
  const { firstName, lastName, location, whatsappNumber, headline, subheadline,
    ctaPrimary, ctaSecondary, showSections, avatarUrl, gallery, persona } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null
  const pcfg = getPersonaConfig(persona)
  const maxFrames = framesConfig === undefined ? 3 : (framesConfig.enabled ? framesConfig.count : 0)
  const frames = gallery?.length ? gallery.slice(0, maxFrames) : []

  return (
    <section className="relative overflow-hidden" style={{ minHeight: heroMinHeight(heroHeight) }}>
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
            <SmartImg src={src}
              className="w-28 h-36 sm:w-32 sm:h-44 shadow-2xl"
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
            <SmartImg src={avatarUrl} alt={fullName} focus="50% 35%"
              className="w-32 h-32"
              style={{
                borderRadius: '50%',
                outline: '3px solid var(--color-accent)',
                outlineOffset: 6,
                boxShadow: '0 0 0 12px var(--color-accent-surface), 0 16px 48px var(--color-accent-glow)',
              }} />
          </div>
        )}
        <div className="h-up h-up-1 flex items-center justify-center gap-2 flex-wrap mb-5">
          <div className="inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest"
            style={{
              borderRadius: 'var(--radius-btn)',
              background: 'var(--color-accent-surface)',
              color: 'var(--color-accent)',
            }}>
            {fullName}
          </div>
          {persona === 'advocate' && data.verified && <VerifiedChip />}
        </div>
        <h1 className="h-up h-up-2 font-display-token text-[#0D0D0D] leading-[1.04] tracking-tight mb-5 max-w-xl"
          style={{ fontSize: 'var(--type-display)', fontWeight: 'var(--fw-display)' }}>
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
          {data.businessHours?.enabled && <BusinessStatusBadge hours={data.businessHours} />}
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
function HeroMinimal({ data, heroHeight }: { data: ProfileData; heroHeight?: number }) {
  const { firstName, lastName, location, whatsappNumber, headline, subheadline,
    ctaPrimary, ctaSecondary, showSections, avatarUrl, persona } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null
  const pcfg = getPersonaConfig(persona)

  return (
    <section className="relative overflow-hidden" style={{ background: 'var(--sec-custom-bg, white)', minHeight: heroMinHeight(heroHeight) }}>
      <style>{STYLES}</style>
      <nav className="max-w-2xl mx-auto px-6 pt-6 flex justify-between items-center">
        {location ? <LocationLink location={location} /> : <span />}
        <KLogo />
      </nav>
      <div className="max-w-2xl mx-auto px-6"
        style={{ paddingTop: 'calc(var(--space-section) * .8)', paddingBottom: 'var(--space-section)' }}>
        {avatarUrl && (
          <SmartImg src={avatarUrl} alt={fullName} focus="50% 35%"
            className="h-up w-20 h-20 shadow-xl mb-6"
            style={{
              borderRadius: 'var(--radius-card)',
              outline: '2px solid var(--color-accent-border)',
              outlineOffset: 2,
            }} />
        )}
        <div className="h-up h-up-1 flex items-center gap-2 flex-wrap mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-black uppercase tracking-widest"
            style={{
              borderRadius: 'var(--radius-btn)',
              background: 'var(--color-accent-surface)',
              color: 'var(--color-accent)',
            }}>
            {fullName}
          </div>
          {persona === 'advocate' && data.verified && <VerifiedChip />}
        </div>
        <h1 className="h-up h-up-2 font-display-token text-[#0D0D0D] leading-[1.04] tracking-tight mb-5"
          style={{ fontSize: 'var(--type-display)', fontWeight: 'var(--fw-display)' }}>
          {headline}
        </h1>
        <p className="h-up h-up-3 text-[#555] leading-relaxed mb-8"
          style={{ fontSize: 'var(--type-subheading)' }}>
          {subheadline}
        </p>
        <div className="h-up h-up-4">
          {data.businessHours?.enabled && <BusinessStatusBadge hours={data.businessHours} />}
          {pcfg.leadTimeNotice && <LeadTimeStrip notice={pcfg.leadTimeNotice} />}
          <CTAs wa={wa} showBooking={showSections.booking} showContact={showSections.contact}
            ctaPrimary={ctaPrimary} ctaSecondary={ctaSecondary} ctaTarget={pcfg.heroCtaTarget} />
        </div>
      </div>
    </section>
  )
}

/* ── Entry point ─────────────────────────────────────────────────────────── */
export default function HeroSection({ data, accent, variant, framesConfig, heroHeight }: Props) {
  if (variant === 'photo')    return <HeroPhoto data={data} heroHeight={heroHeight} />
  if (variant === 'dark')     return <HeroDark data={data} framesConfig={framesConfig} accent={accent} heroHeight={heroHeight} />
  if (variant === 'gradient') return <HeroGradient data={data} heroHeight={heroHeight} />
  if (variant === 'split')    return <HeroSplit data={data} heroHeight={heroHeight} />
  if (variant === 'banner')   return <HeroBanner data={data} heroHeight={heroHeight} />
  if (variant === 'centered') return <HeroCentered data={data} framesConfig={framesConfig} heroHeight={heroHeight} />
  if (variant === 'sweep')    return <HeroSweep data={data} heroHeight={heroHeight} />
  if (variant === 'dabba')    return <HeroDabba data={data} heroHeight={heroHeight} />
  if (variant === 'pdp')      return <HeroPdp data={data} heroHeight={heroHeight} />
  return <HeroMinimal data={data} heroHeight={heroHeight} />
}
