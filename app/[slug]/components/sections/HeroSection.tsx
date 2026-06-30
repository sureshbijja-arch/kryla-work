'use client'
import { mapsUrl, waUrl } from '../../types'
import type { ProfileData } from '../../types'

interface Props {
  data: ProfileData
  accent: string
  variant: string
  showNav?: boolean
}

const STYLES = `
@keyframes floatA {
  0%,100% { transform: translate(0,0) scale(1); }
  33% { transform: translate(30px,-40px) scale(1.05); }
  66% { transform: translate(-20px,20px) scale(0.97); }
}
@keyframes floatB {
  0%,100% { transform: translate(0,0) scale(1); }
  40% { transform: translate(-35px,25px) scale(1.08); }
  70% { transform: translate(20px,-30px) scale(0.95); }
}
@keyframes fadeUp {
  from { opacity:0; transform:translateY(32px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes glowPulse {
  0%,100% { box-shadow: 0 0 0 4px var(--a-40), 0 0 40px var(--a-30); }
  50%     { box-shadow: 0 0 0 6px var(--a-60), 0 0 80px var(--a-40); }
}
.hero-fadeup { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) both; }
.hero-fadeup-1 { animation-delay: 0.05s; }
.hero-fadeup-2 { animation-delay: 0.15s; }
.hero-fadeup-3 { animation-delay: 0.25s; }
.hero-fadeup-4 { animation-delay: 0.38s; }
`

function KLogo({ dark = false, accent }: { dark?: boolean; accent: string }) {
  const line = dark ? 'white' : '#0D0D0D'
  return (
    <a href="https://kryla.work" className="flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <line x1="7" y1="4" x2="7" y2="20" stroke={line} strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="7" y1="12" x2="17" y2="4" stroke={line} strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="7" y1="12" x2="17" y2="20" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
      <span className="text-xs font-bold" style={{ color: dark ? 'rgba(255,255,255,0.5)' : '#0D0D0D' }}>
        kryla<span style={{ color: accent }}>.work</span>
      </span>
    </a>
  )
}

/* ─────────────────────────── DARK ─────────────────────────────────────────── */
function HeroDark({ data, accent }: { data: ProfileData; accent: string }) {
  const { firstName, lastName, location, whatsappNumber, headline, subheadline, ctaPrimary, ctaSecondary, showSections, avatarUrl } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: '#0D0D0D', ['--a-40' as string]: `${accent}66`, ['--a-60' as string]: `${accent}99`, ['--a-30' as string]: `${accent}4d` }}>
      <style>{STYLES}</style>

      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      {/* Orb A */}
      <div className="absolute pointer-events-none rounded-full"
        style={{ width: 700, height: 700, top: '-20%', right: '-15%', background: accent, opacity: 0.07, filter: 'blur(120px)', animation: 'floatA 12s ease-in-out infinite' }} />
      {/* Orb B */}
      <div className="absolute pointer-events-none rounded-full"
        style={{ width: 500, height: 500, bottom: '-10%', left: '-10%', background: accent, opacity: 0.05, filter: 'blur(100px)', animation: 'floatB 16s ease-in-out infinite' }} />

      {/* Nav */}
      <nav className="relative z-10 flex justify-between items-center px-6 pt-6 max-w-2xl mx-auto w-full">
        {location ? (
          <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer"
            className="text-xs font-semibold text-white/30 hover:text-white/70 transition-colors">
            📍 {location}
          </a>
        ) : <span />}
        <KLogo dark accent={accent} />
      </nav>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full px-6 py-16">
        {avatarUrl && (
          <div className="hero-fadeup hero-fadeup-1 mb-8 inline-block">
            <img src={avatarUrl} alt={fullName}
              className="w-24 h-24 rounded-full object-cover"
              style={{
                outline: `3px solid ${accent}`,
                outlineOffset: 5,
                boxShadow: `0 0 0 8px ${accent}20, 0 0 60px ${accent}30`,
                animation: 'glowPulse 3s ease-in-out infinite',
              }} />
          </div>
        )}

        <p className="hero-fadeup hero-fadeup-1 text-[10px] font-black uppercase tracking-[0.25em] mb-5"
          style={{ color: accent }}>{fullName}</p>

        <h1 className="hero-fadeup hero-fadeup-2 font-black leading-[1.0] tracking-tight mb-6"
          style={{
            fontSize: 'clamp(3rem, 10vw, 6rem)',
            backgroundImage: `linear-gradient(135deg, #ffffff 50%, ${accent}cc)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
          {headline}
        </h1>

        <p className="hero-fadeup hero-fadeup-3 text-lg sm:text-xl text-white/35 leading-relaxed mb-10 max-w-md">
          {subheadline}
        </p>

        <div className="hero-fadeup hero-fadeup-4 flex flex-wrap gap-3">
          {showSections.booking && (
            <a href="#book"
              className="group relative px-8 py-4 rounded-full font-black text-white text-sm overflow-hidden transition-all hover:scale-[1.03]"
              style={{ background: accent, boxShadow: `0 8px 32px ${accent}50` }}>
              {ctaPrimary}
            </a>
          )}
          {wa && showSections.contact && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="px-8 py-4 rounded-full font-bold text-sm text-white/50 hover:text-white transition-all hover:bg-white/10"
              style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
              {ctaSecondary || 'WhatsApp'}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── GRADIENT ─────────────────────────────────────── */
function HeroGradient({ data, accent }: { data: ProfileData; accent: string }) {
  const { firstName, lastName, location, whatsappNumber, headline, subheadline, ctaPrimary, ctaSecondary, showSections, avatarUrl } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null

  return (
    <section className="relative overflow-hidden">
      <style>{STYLES}</style>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 80% 60% at 60% -10%, ${accent}20 0%, transparent 70%), radial-gradient(ellipse 60% 80% at -10% 80%, ${accent}12 0%, transparent 60%)` }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <nav className="relative flex justify-between items-center px-6 pt-6 max-w-2xl mx-auto">
        {location ? (
          <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer"
            className="text-xs font-semibold text-[#999] hover:text-[#0D0D0D] transition-colors">
            📍 {location}
          </a>
        ) : <span />}
        <KLogo accent={accent} />
      </nav>

      <div className="relative max-w-2xl mx-auto px-6 pt-12 pb-20">
        {avatarUrl && (
          <div className="hero-fadeup hero-fadeup-1 mb-7 relative inline-block">
            <div className="w-28 h-28 rounded-2xl overflow-hidden shadow-2xl"
              style={{ outline: `2px solid ${accent}50`, outlineOffset: 3, boxShadow: `0 20px 60px ${accent}25` }}>
              <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
            </div>
          </div>
        )}
        <div className="hero-fadeup hero-fadeup-1 inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest"
          style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}>
          {fullName}
        </div>
        <h1 className="hero-fadeup hero-fadeup-2 font-black text-[#0D0D0D] leading-tight tracking-tight mb-5"
          style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)' }}>
          {headline}
        </h1>
        <p className="hero-fadeup hero-fadeup-3 text-xl text-[#666] leading-relaxed mb-8 max-w-lg">{subheadline}</p>
        <div className="hero-fadeup hero-fadeup-4 flex flex-wrap gap-3">
          {showSections.booking && (
            <a href="#book"
              className="px-7 py-4 rounded-xl font-black text-white text-sm hover:opacity-90 hover:scale-[1.02] transition-all"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, boxShadow: `0 8px 24px ${accent}35` }}>
              {ctaPrimary}
            </a>
          )}
          {wa && showSections.contact && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="px-7 py-4 rounded-xl font-bold text-sm border-2 text-[#333] hover:bg-[#0D0D0D] hover:text-white hover:border-[#0D0D0D] transition-all"
              style={{ borderColor: `${accent}40` }}>
              {ctaSecondary || 'Get in touch'}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── SPLIT ────────────────────────────────────────── */
function HeroSplit({ data, accent }: { data: ProfileData; accent: string }) {
  const { firstName, lastName, location, whatsappNumber, headline, subheadline, ctaPrimary, ctaSecondary, showSections, avatarUrl } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null

  return (
    <section className="relative overflow-hidden bg-white">
      <style>{STYLES}</style>
      <nav className="max-w-5xl mx-auto px-6 pt-6 flex justify-between items-center">
        {location ? (
          <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer"
            className="text-xs font-semibold text-[#999] hover:text-[#0D0D0D] transition-colors">
            📍 {location}
          </a>
        ) : <span />}
        <KLogo accent={accent} />
      </nav>
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-20 flex flex-col sm:flex-row gap-12 items-center">
        <div className="flex-1 order-2 sm:order-1">
          <div className="hero-fadeup hero-fadeup-1 inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest"
            style={{ background: `${accent}15`, color: accent }}>
            {fullName}
          </div>
          <h1 className="hero-fadeup hero-fadeup-2 font-black text-[#0D0D0D] leading-tight tracking-tight mb-5"
            style={{ fontSize: 'clamp(2.5rem, 7vw, 4.5rem)' }}>{headline}</h1>
          <p className="hero-fadeup hero-fadeup-3 text-xl text-[#666] leading-relaxed mb-8 max-w-md">{subheadline}</p>
          <div className="hero-fadeup hero-fadeup-4 flex flex-wrap gap-3">
            {showSections.booking && (
              <a href="#book"
                className="px-7 py-4 rounded-full font-black text-white text-sm hover:opacity-90 hover:scale-[1.02] transition-all shadow-xl"
                style={{ background: accent, boxShadow: `0 8px 32px ${accent}40` }}>
                {ctaPrimary}
              </a>
            )}
            {wa && showSections.contact && (
              <a href={wa} target="_blank" rel="noopener noreferrer"
                className="px-7 py-4 rounded-full font-bold text-sm border-2 border-[#E5E5E5] text-[#0D0D0D] hover:border-[#0D0D0D] transition-all">
                {ctaSecondary || `Message ${firstName}`}
              </a>
            )}
          </div>
        </div>
        {avatarUrl && (
          <div className="order-1 sm:order-2 shrink-0 hero-fadeup hero-fadeup-2">
            <div className="relative">
              <div className="absolute rounded-[2.5rem] pointer-events-none"
                style={{ inset: 0, background: `${accent}15`, transform: 'translate(12px,12px)' }} />
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

/* ─────────────────────────── BANNER ───────────────────────────────────────── */
function HeroBanner({ data, accent }: { data: ProfileData; accent: string }) {
  const { firstName, lastName, location, whatsappNumber, headline, subheadline, ctaPrimary, ctaSecondary, showSections, avatarUrl } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null

  return (
    <section>
      <style>{STYLES}</style>
      <header className="relative pb-20 overflow-hidden" style={{ background: accent }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.15) 0%, transparent 60%)' }} />
        <div className="relative max-w-2xl mx-auto px-6 pt-5 flex justify-between items-start">
          <div>
            <p className="text-white/60 text-xs font-black uppercase tracking-widest mb-1">{fullName}</p>
            {location && <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer"
              className="text-white/50 text-xs hover:text-white transition-colors">📍 {location}</a>}
          </div>
          <KLogo dark accent="#F5A623" />
        </div>
        {avatarUrl && (
          <div className="relative max-w-2xl mx-auto px-6 mt-8">
            <img src={avatarUrl} alt={fullName}
              className="w-24 h-24 rounded-2xl object-cover shadow-2xl"
              style={{ border: '4px solid rgba(255,255,255,0.25)' }} />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-white" style={{ borderRadius: '2rem 2rem 0 0' }} />
      </header>
      <div className="max-w-2xl mx-auto px-6 pt-8 pb-14">
        <h1 className="hero-fadeup font-black text-[#0D0D0D] leading-tight tracking-tight mb-4"
          style={{ fontSize: 'clamp(2rem, 8vw, 4rem)' }}>{headline}</h1>
        <p className="hero-fadeup hero-fadeup-1 text-lg text-[#666] leading-relaxed mb-8">{subheadline}</p>
        <div className="hero-fadeup hero-fadeup-2 flex flex-wrap gap-3">
          {showSections.booking && (
            <a href="#book" className="px-6 py-3.5 rounded-xl font-black text-white text-sm hover:opacity-90 transition-all"
              style={{ background: accent, boxShadow: `0 8px 24px ${accent}40` }}>
              {ctaPrimary}
            </a>
          )}
          {wa && showSections.contact && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-[#25D366] text-white hover:opacity-90 transition-opacity">
              {ctaSecondary || 'WhatsApp'}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── CENTERED ─────────────────────────────────────── */
function HeroCentered({ data, accent }: { data: ProfileData; accent: string }) {
  const { firstName, lastName, location, whatsappNumber, headline, subheadline, ctaPrimary, ctaSecondary, showSections, avatarUrl } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null

  return (
    <section className="relative overflow-hidden">
      <style>{STYLES}</style>
      <div className="absolute top-0 right-0 left-0 h-64 pointer-events-none"
        style={{ background: `linear-gradient(180deg, ${accent}0a 0%, transparent 100%)` }} />
      <nav className="relative max-w-2xl mx-auto px-6 pt-6 flex justify-end">
        <KLogo accent={accent} />
      </nav>
      <div className="relative max-w-2xl mx-auto px-6 pt-14 pb-20 flex flex-col items-center text-center">
        {avatarUrl && (
          <div className="hero-fadeup hero-fadeup-1 mb-6"
            style={{ filter: `drop-shadow(0 0 24px ${accent}40)` }}>
            <img src={avatarUrl} alt={fullName}
              className="w-32 h-32 rounded-full object-cover"
              style={{ outline: `4px solid ${accent}`, outlineOffset: 6, boxShadow: `0 0 0 12px ${accent}15` }} />
          </div>
        )}
        <div className="hero-fadeup hero-fadeup-1 inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest"
          style={{ background: `${accent}15`, color: accent }}>
          {fullName}
        </div>
        <h1 className="hero-fadeup hero-fadeup-2 font-black text-[#0D0D0D] leading-tight tracking-tight mb-5 max-w-xl"
          style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)' }}>{headline}</h1>
        <p className="hero-fadeup hero-fadeup-3 text-xl text-[#666] leading-relaxed mb-10 max-w-md">{subheadline}</p>
        {location && (
          <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer"
            className="text-xs text-[#999] hover:text-[#0D0D0D] transition-colors mb-8 block">
            📍 {location}
          </a>
        )}
        <div className="hero-fadeup hero-fadeup-4 flex flex-wrap gap-3 justify-center">
          {showSections.booking && (
            <a href="#book"
              className="px-8 py-4 rounded-full font-black text-white text-sm hover:opacity-90 hover:scale-[1.02] transition-all"
              style={{ background: accent, boxShadow: `0 8px 32px ${accent}40` }}>
              {ctaPrimary}
            </a>
          )}
          {wa && showSections.contact && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="px-8 py-4 rounded-full font-bold text-sm border-2 text-[#0D0D0D] hover:bg-[#0D0D0D] hover:text-white hover:border-[#0D0D0D] transition-all"
              style={{ borderColor: '#E5E5E5' }}>
              {ctaSecondary || 'Get in touch'}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── MINIMAL (default) ─────────────────────────────── */
function HeroMinimal({ data, accent }: { data: ProfileData; accent: string }) {
  const { firstName, lastName, location, whatsappNumber, headline, subheadline, ctaPrimary, ctaSecondary, showSections, avatarUrl } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null

  return (
    <section className="relative overflow-hidden bg-white">
      <style>{STYLES}</style>
      <nav className="max-w-2xl mx-auto px-6 pt-6 flex justify-between items-center">
        {location ? (
          <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer"
            className="text-xs font-semibold text-[#999] hover:text-[#0D0D0D] transition-colors">
            📍 {location}
          </a>
        ) : <span />}
        <KLogo accent={accent} />
      </nav>
      <div className="max-w-2xl mx-auto px-6 pt-14 pb-14">
        {avatarUrl && (
          <img src={avatarUrl} alt={fullName}
            className="hero-fadeup w-20 h-20 rounded-2xl object-cover shadow-xl mb-6"
            style={{ outline: `2px solid ${accent}30`, outlineOffset: 2 }} />
        )}
        <div className="hero-fadeup hero-fadeup-1 inline-flex items-center gap-2 mb-5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest"
          style={{ background: `${accent}12`, color: accent }}>
          {fullName}
        </div>
        <h1 className="hero-fadeup hero-fadeup-2 font-black text-[#0D0D0D] leading-tight tracking-tight mb-5"
          style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)' }}>{headline}</h1>
        <p className="hero-fadeup hero-fadeup-3 text-xl text-[#666] leading-relaxed mb-8">{subheadline}</p>
        <div className="hero-fadeup hero-fadeup-4 flex flex-wrap gap-3">
          {showSections.booking && (
            <a href="#book"
              className="px-7 py-3.5 rounded-full font-black text-white text-sm hover:opacity-90 hover:scale-[1.02] transition-all shadow-lg"
              style={{ background: accent }}>
              {ctaPrimary}
            </a>
          )}
          {wa && showSections.contact && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="px-7 py-3.5 rounded-full font-bold text-sm border-2 border-[#E5E5E5] text-[#0D0D0D] hover:border-[#0D0D0D] transition-all">
              {ctaSecondary || `WhatsApp ${firstName}`}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}

export default function HeroSection({ data, accent, variant, showNav = true }: Props) {
  if (variant === 'dark')     return <HeroDark data={data} accent={accent} />
  if (variant === 'gradient') return <HeroGradient data={data} accent={accent} />
  if (variant === 'split')    return <HeroSplit data={data} accent={accent} />
  if (variant === 'banner')   return <HeroBanner data={data} accent={accent} />
  if (variant === 'centered') return <HeroCentered data={data} accent={accent} />
  return <HeroMinimal data={data} accent={accent} />
}
