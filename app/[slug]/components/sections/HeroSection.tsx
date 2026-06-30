import { KrylaLogo } from '../shared'
import { mapsUrl, waUrl } from '../../types'
import type { ProfileData } from '../../types'

interface Props {
  data: ProfileData
  accent: string
  variant: string
  showNav?: boolean
}

export default function HeroSection({ data, accent, variant, showNav = true }: Props) {
  const {
    firstName, lastName, location, whatsappNumber,
    headline, subheadline, ctaPrimary, ctaSecondary,
    showSections, avatarUrl,
  } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null

  if (variant === 'split') return (
    <section>
      {showNav && (
        <nav className="max-w-5xl mx-auto px-6 pt-6 flex justify-between items-center">
          {location ? (
            <div>
              <span className="text-xs text-[#999]">{location}</span>
              <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer"
                className="block text-[10px] font-semibold text-[#F5A623] hover:underline">📍 Get Directions</a>
            </div>
          ) : <span />}
          <KrylaLogo />
        </nav>
      )}
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-14 flex flex-col sm:flex-row gap-10 items-center">
        <div className="flex-1 order-2 sm:order-1">
          <p className="text-sm font-bold mb-4 uppercase tracking-widest" style={{ color: accent }}>{fullName}</p>
          <h1 className="text-4xl sm:text-5xl font-black text-[#0D0D0D] leading-tight mb-5">{headline}</h1>
          <p className="text-lg text-[#555] leading-relaxed mb-8 max-w-md">{subheadline}</p>
          <div className="flex flex-wrap gap-3">
            {showSections.booking && (
              <a href="#book"
                className="px-7 py-3.5 rounded-full font-bold text-white text-sm hover:opacity-90 transition-opacity shadow-lg"
                style={{ background: accent }}>
                {ctaPrimary}
              </a>
            )}
            {wa && showSections.contact && (
              <a href={wa} target="_blank" rel="noopener noreferrer"
                className="px-7 py-3.5 rounded-full font-semibold text-sm border-2 border-[#0D0D0D] text-[#0D0D0D] hover:bg-[#0D0D0D] hover:text-white transition-colors">
                {ctaSecondary || `Message ${firstName}`}
              </a>
            )}
          </div>
        </div>
        {avatarUrl && (
          <div className="order-1 sm:order-2 shrink-0">
            <div className="w-56 h-56 sm:w-72 sm:h-72 rounded-3xl overflow-hidden shadow-2xl"
              style={{ outline: `4px solid ${accent}`, outlineOffset: 4 }}>
              <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
            </div>
          </div>
        )}
      </div>
    </section>
  )

  if (variant === 'banner') return (
    <section>
      <header style={{ background: accent }} className="relative pb-8">
        <div className="max-w-2xl mx-auto px-6 pt-5 flex justify-between items-start">
          <div>
            {avatarUrl && (
              <img src={avatarUrl} alt={fullName}
                className="w-14 h-14 rounded-full object-cover border-4 border-white/30 mb-3" />
            )}
            <p className="font-black text-white text-xl">{fullName}</p>
            {location && (
              <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer"
                className="text-xs text-white/70 hover:text-white transition-colors">📍 {location}</a>
            )}
          </div>
          <KrylaLogo />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-8 rounded-t-3xl"
          style={{ background: 'var(--section-bg, #fff)' }} />
      </header>
      <div className="max-w-2xl mx-auto px-6 pt-8 pb-10">
        <h1 className="text-4xl sm:text-5xl font-black text-[#0D0D0D] leading-tight mb-4">{headline}</h1>
        <p className="text-lg text-[#666] leading-relaxed mb-8">{subheadline}</p>
        <div className="flex flex-wrap gap-3">
          {showSections.booking && (
            <a href="#book"
              className="px-6 py-3 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-opacity"
              style={{ background: accent }}>
              {ctaPrimary}
            </a>
          )}
          {wa && showSections.contact && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-[#25D366] text-white hover:opacity-90 transition-opacity">
              {ctaSecondary || 'WhatsApp'}
            </a>
          )}
        </div>
      </div>
    </section>
  )

  if (variant === 'centered') return (
    <section>
      {showNav && (
        <nav className="max-w-2xl mx-auto px-6 pt-6 flex justify-end">
          <KrylaLogo />
        </nav>
      )}
      <div className="max-w-2xl mx-auto px-6 pt-14 pb-14 flex flex-col items-center text-center">
        {avatarUrl ? (
          <div className="mb-6">
            <div className="w-28 h-28 rounded-full overflow-hidden mx-auto"
              style={{ outline: `4px solid ${accent}`, outlineOffset: 3 }}>
              <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
            </div>
          </div>
        ) : (
          <div className="w-16 h-1 rounded-full mb-8" style={{ background: accent }} />
        )}
        <p className="text-sm font-bold mb-4 uppercase tracking-widest" style={{ color: accent }}>{fullName}</p>
        <h1 className="text-4xl sm:text-6xl font-black text-[#0D0D0D] leading-tight mb-5 max-w-xl">{headline}</h1>
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
              className="px-8 py-4 rounded-full font-bold text-white hover:opacity-90 transition-opacity shadow-xl text-sm"
              style={{ background: accent }}>
              {ctaPrimary}
            </a>
          )}
          {wa && showSections.contact && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="px-8 py-4 rounded-full font-semibold text-sm border-2 text-[#0D0D0D] hover:bg-[#0D0D0D] hover:text-white transition-colors"
              style={{ borderColor: '#E5E5E5' }}>
              {ctaSecondary || 'Get in touch'}
            </a>
          )}
        </div>
      </div>
    </section>
  )

  // Default: minimal
  return (
    <section>
      {showNav && (
        <nav className="max-w-2xl mx-auto px-6 pt-6 flex justify-between items-center">
          {location ? (
            <div>
              <span className="text-xs text-[#999]">{location}</span>
              <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer"
                className="block text-[10px] font-semibold text-[#F5A623] hover:underline">📍 Get Directions</a>
            </div>
          ) : <span />}
          <KrylaLogo />
        </nav>
      )}
      <div className="max-w-2xl mx-auto px-6 pt-14 pb-10">
        {avatarUrl && (
          <img src={avatarUrl} alt={fullName}
            className="w-16 h-16 rounded-full object-cover border-2 border-[#E5E5E5] mb-5" />
        )}
        <p className="text-sm font-semibold mb-3" style={{ color: accent }}>{fullName}</p>
        <h1 className="text-4xl sm:text-5xl font-bold text-[#0D0D0D] leading-tight mb-4">{headline}</h1>
        <p className="text-lg text-[#666] leading-relaxed mb-8">{subheadline}</p>
        <div className="flex flex-wrap gap-3">
          {showSections.booking && (
            <a href="#book"
              className="px-6 py-3 rounded-full font-semibold text-white text-sm hover:opacity-90 transition-opacity"
              style={{ background: accent }}>
              {ctaPrimary}
            </a>
          )}
          {wa && showSections.contact && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="px-6 py-3 rounded-full font-semibold text-sm border border-[#E5E5E5] text-[#0D0D0D] hover:border-[#0D0D0D] transition-colors">
              {ctaSecondary || `WhatsApp ${firstName}`}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
