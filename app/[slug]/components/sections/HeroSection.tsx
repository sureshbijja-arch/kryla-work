import { mapsUrl, waUrl } from '../../types'
import type { ProfileData } from '../../types'

interface Props {
  data: ProfileData
  accent: string
  variant: string
  showNav?: boolean
}

function NavLight({ location, accent }: { location: string; accent: string }) {
  return (
    <nav className="max-w-2xl mx-auto px-6 pt-6 flex justify-between items-center">
      {location ? (
        <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer"
          className="text-xs font-semibold text-[#999] hover:text-[#0D0D0D] transition-colors">
          📍 {location}
        </a>
      ) : <span />}
      <LogoLight accent={accent} />
    </nav>
  )
}

function NavDark({ location, accent }: { location: string; accent: string }) {
  return (
    <nav className="max-w-2xl mx-auto px-6 pt-6 flex justify-between items-center">
      {location ? (
        <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer"
          className="text-xs font-semibold text-white/40 hover:text-white/80 transition-colors">
          📍 {location}
        </a>
      ) : <span />}
      <LogoDark accent={accent} />
    </nav>
  )
}

function LogoLight({ accent }: { accent: string }) {
  return (
    <a href="https://kryla.work" className="flex items-center gap-1.5 opacity-50 hover:opacity-100 transition-opacity">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <line x1="7" y1="4" x2="7" y2="20" stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="7" y1="12" x2="17" y2="4" stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="7" y1="12" x2="17" y2="20" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
      <span className="text-xs font-semibold text-[#0D0D0D]">kryla<span style={{ color: accent }}>.work</span></span>
    </a>
  )
}

function LogoDark({ accent }: { accent: string }) {
  return (
    <a href="https://kryla.work" className="flex items-center gap-1.5 opacity-40 hover:opacity-90 transition-opacity">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <line x1="7" y1="4" x2="7" y2="20" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="7" y1="12" x2="17" y2="4" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="7" y1="12" x2="17" y2="20" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
      <span className="text-xs font-semibold text-white">kryla<span style={{ color: accent }}>.work</span></span>
    </a>
  )
}

export default function HeroSection({ data, accent, variant, showNav = true }: Props) {
  const {
    firstName, lastName, location, whatsappNumber,
    headline, subheadline, ctaPrimary, ctaSecondary,
    showSections, avatarUrl,
  } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null

  /* ── DARK ─────────────────────────────────────────────────────────────── */
  if (variant === 'dark') return (
    <section style={{ background: '#0D0D0D' }} className="relative overflow-hidden">
      {/* Decorative glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-[0.07] blur-3xl pointer-events-none"
        style={{ background: accent, transform: 'translate(30%, -30%)' }} />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full opacity-[0.05] blur-3xl pointer-events-none"
        style={{ background: accent, transform: 'translate(-30%, 30%)' }} />

      {showNav && <NavDark location={location} accent={accent} />}

      <div className="relative max-w-2xl mx-auto px-6 pt-14 pb-20">
        {avatarUrl && (
          <div className="mb-8">
            <img src={avatarUrl} alt={fullName}
              className="w-20 h-20 rounded-full object-cover"
              style={{ outline: `3px solid ${accent}`, outlineOffset: 4 }} />
          </div>
        )}
        <p className="text-xs font-black mb-5 uppercase tracking-[0.2em]" style={{ color: accent }}>{fullName}</p>
        <h1 className="text-5xl sm:text-7xl font-black text-white leading-[1.05] mb-6 tracking-tight">{headline}</h1>
        <p className="text-lg sm:text-xl text-white/40 leading-relaxed mb-10 max-w-md">{subheadline}</p>
        <div className="flex flex-wrap gap-3">
          {showSections.booking && (
            <a href="#book"
              className="px-8 py-4 rounded-full font-black text-white text-sm hover:opacity-90 transition-all hover:scale-[1.02] shadow-2xl"
              style={{ background: accent }}>
              {ctaPrimary}
            </a>
          )}
          {wa && showSections.contact && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="px-8 py-4 rounded-full font-bold text-sm text-white/60 border border-white/15 hover:border-white/40 hover:text-white transition-all">
              {ctaSecondary || 'WhatsApp'}
            </a>
          )}
        </div>
      </div>
    </section>
  )

  /* ── GRADIENT ─────────────────────────────────────────────────────────── */
  if (variant === 'gradient') return (
    <section className="relative overflow-hidden"
      style={{ background: `linear-gradient(145deg, ${accent}18 0%, ${accent}05 40%, transparent 70%)` }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(circle at 80% 20%, ${accent}12 0%, transparent 60%)` }} />

      {showNav && <NavLight location={location} accent={accent} />}

      <div className="relative max-w-2xl mx-auto px-6 pt-14 pb-16">
        {avatarUrl && (
          <div className="mb-8 relative inline-block">
            <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-2xl"
              style={{ outline: `2px solid ${accent}40`, outlineOffset: 2 }}>
              <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
            </div>
          </div>
        )}
        <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full border text-xs font-bold"
          style={{ borderColor: `${accent}40`, color: accent, background: `${accent}10` }}>
          {fullName}
        </div>
        <h1 className="text-5xl sm:text-6xl font-black text-[#0D0D0D] leading-tight mb-5 tracking-tight">{headline}</h1>
        <p className="text-xl text-[#555] leading-relaxed mb-8 max-w-lg">{subheadline}</p>
        {location && (
          <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer"
            className="inline-block text-xs text-[#999] hover:text-[#0D0D0D] transition-colors mb-8">
            📍 {location}
          </a>
        )}
        <div className="flex flex-wrap gap-3">
          {showSections.booking && (
            <a href="#book"
              className="px-7 py-3.5 rounded-xl font-black text-white text-sm hover:opacity-90 transition-all hover:scale-[1.02] shadow-xl"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
              {ctaPrimary}
            </a>
          )}
          {wa && showSections.contact && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="px-7 py-3.5 rounded-xl font-bold text-sm border-2 text-[#0D0D0D] hover:text-white transition-all"
              style={{ borderColor: accent, ['--tw-hover-bg' as string]: accent }}>
              {ctaSecondary || 'Get in touch'}
            </a>
          )}
        </div>
      </div>
    </section>
  )

  /* ── SPLIT ─────────────────────────────────────────────────────────────── */
  if (variant === 'split') return (
    <section>
      {showNav && (
        <nav className="max-w-5xl mx-auto px-6 pt-6 flex justify-between items-center">
          {location ? (
            <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer"
              className="text-xs font-semibold text-[#999] hover:text-[#0D0D0D] transition-colors">
              📍 {location}
            </a>
          ) : <span />}
          <LogoLight accent={accent} />
        </nav>
      )}
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-16 flex flex-col sm:flex-row gap-12 items-center">
        <div className="flex-1 order-2 sm:order-1">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest"
            style={{ background: `${accent}15`, color: accent }}>
            {fullName}
          </div>
          <h1 className="text-5xl sm:text-6xl font-black text-[#0D0D0D] leading-tight mb-5 tracking-tight">{headline}</h1>
          <p className="text-xl text-[#666] leading-relaxed mb-8 max-w-md">{subheadline}</p>
          <div className="flex flex-wrap gap-3">
            {showSections.booking && (
              <a href="#book"
                className="px-7 py-4 rounded-full font-black text-white text-sm hover:opacity-90 transition-all shadow-xl hover:scale-[1.02]"
                style={{ background: accent }}>
                {ctaPrimary}
              </a>
            )}
            {wa && showSections.contact && (
              <a href={wa} target="_blank" rel="noopener noreferrer"
                className="px-7 py-4 rounded-full font-bold text-sm border-2 border-[#0D0D0D] text-[#0D0D0D] hover:bg-[#0D0D0D] hover:text-white transition-all">
                {ctaSecondary || `Message ${firstName}`}
              </a>
            )}
          </div>
        </div>
        {avatarUrl && (
          <div className="order-1 sm:order-2 shrink-0">
            <div className="w-60 h-60 sm:w-80 sm:h-80 rounded-[2.5rem] overflow-hidden shadow-2xl"
              style={{ outline: `4px solid ${accent}`, outlineOffset: 6 }}>
              <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
            </div>
          </div>
        )}
      </div>
    </section>
  )

  /* ── BANNER ─────────────────────────────────────────────────────────────── */
  if (variant === 'banner') return (
    <section>
      <header className="relative pb-16 overflow-hidden" style={{ background: accent }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, white 0%, transparent 60%)' }} />
        <div className="relative max-w-2xl mx-auto px-6 pt-5 flex justify-between items-start">
          <div>
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">{fullName}</p>
            {location && (
              <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer"
                className="text-white/60 text-xs hover:text-white transition-colors">📍 {location}</a>
            )}
          </div>
          <LogoDark accent="#F5A623" />
        </div>
        {avatarUrl && (
          <div className="relative max-w-2xl mx-auto px-6 mt-6">
            <img src={avatarUrl} alt={fullName}
              className="w-20 h-20 rounded-2xl object-cover border-4 border-white/20 shadow-2xl" />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-10 rounded-t-[2rem] bg-white" />
      </header>
      <div className="max-w-2xl mx-auto px-6 pt-8 pb-12">
        <h1 className="text-4xl sm:text-5xl font-black text-[#0D0D0D] leading-tight mb-4 tracking-tight">{headline}</h1>
        <p className="text-lg text-[#666] leading-relaxed mb-8">{subheadline}</p>
        <div className="flex flex-wrap gap-3">
          {showSections.booking && (
            <a href="#book"
              className="px-6 py-3 rounded-xl font-black text-white text-sm hover:opacity-90 transition-all shadow-lg hover:scale-[1.02]"
              style={{ background: accent }}>
              {ctaPrimary}
            </a>
          )}
          {wa && showSections.contact && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-[#25D366] text-white hover:opacity-90 transition-opacity">
              {ctaSecondary || 'WhatsApp'}
            </a>
          )}
        </div>
      </div>
    </section>
  )

  /* ── CENTERED ──────────────────────────────────────────────────────────── */
  if (variant === 'centered') return (
    <section>
      {showNav && (
        <nav className="max-w-2xl mx-auto px-6 pt-6 flex justify-end">
          <LogoLight accent={accent} />
        </nav>
      )}
      <div className="max-w-2xl mx-auto px-6 pt-14 pb-16 flex flex-col items-center text-center">
        {avatarUrl ? (
          <div className="mb-6 relative">
            <div className="w-32 h-32 rounded-full overflow-hidden shadow-2xl"
              style={{ outline: `4px solid ${accent}`, outlineOffset: 5 }}>
              <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
            </div>
          </div>
        ) : (
          <div className="w-16 h-1 rounded-full mb-10" style={{ background: accent }} />
        )}
        <div className="inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest"
          style={{ background: `${accent}15`, color: accent }}>
          {fullName}
        </div>
        <h1 className="text-5xl sm:text-6xl font-black text-[#0D0D0D] leading-tight mb-5 tracking-tight max-w-xl">{headline}</h1>
        <p className="text-xl text-[#666] leading-relaxed mb-10 max-w-md">{subheadline}</p>
        {location && (
          <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer"
            className="text-xs text-[#999] hover:text-[#0D0D0D] transition-colors mb-8 block">
            📍 {location}
          </a>
        )}
        <div className="flex flex-wrap gap-3 justify-center">
          {showSections.booking && (
            <a href="#book"
              className="px-8 py-4 rounded-full font-black text-white text-sm hover:opacity-90 transition-all shadow-2xl hover:scale-[1.02]"
              style={{ background: accent }}>
              {ctaPrimary}
            </a>
          )}
          {wa && showSections.contact && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="px-8 py-4 rounded-full font-bold text-sm border-2 text-[#0D0D0D] hover:bg-[#0D0D0D] hover:text-white transition-all"
              style={{ borderColor: '#E5E5E5' }}>
              {ctaSecondary || 'Get in touch'}
            </a>
          )}
        </div>
      </div>
    </section>
  )

  /* ── MINIMAL (default) ─────────────────────────────────────────────────── */
  return (
    <section>
      {showNav && <NavLight location={location} accent={accent} />}
      <div className="max-w-2xl mx-auto px-6 pt-14 pb-12">
        {avatarUrl && (
          <img src={avatarUrl} alt={fullName}
            className="w-20 h-20 rounded-2xl object-cover shadow-xl mb-6"
            style={{ outline: `2px solid ${accent}30`, outlineOffset: 2 }} />
        )}
        <div className="inline-flex items-center gap-2 mb-5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest"
          style={{ background: `${accent}12`, color: accent }}>
          {fullName}
        </div>
        <h1 className="text-5xl sm:text-6xl font-black text-[#0D0D0D] leading-tight mb-5 tracking-tight">{headline}</h1>
        <p className="text-xl text-[#666] leading-relaxed mb-8">{subheadline}</p>
        <div className="flex flex-wrap gap-3">
          {showSections.booking && (
            <a href="#book"
              className="px-7 py-3.5 rounded-full font-black text-white text-sm hover:opacity-90 transition-all shadow-lg"
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
