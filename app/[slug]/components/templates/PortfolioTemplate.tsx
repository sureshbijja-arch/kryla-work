import BookingForm from '../BookingForm'
import { KrylaLogo, Footer, WhatsAppIcon, SectionHeading, FaqList, GalleryGrid } from '../shared'
import { ACCENT, PAGE_BG, FONT_CLASS, waUrl, mapsUrl } from '../../types'
import type { ProfileData } from '../../types'
import SmartImg from '../SmartImg'

export default function PortfolioTemplate({ data }: { data: ProfileData }) {
  const {
    providerId, firstName, lastName, location, whatsappNumber,
    headline, subheadline, bio, ctaPrimary, ctaSecondary,
    services, highlights, faq, palette, font, showSections,
    persona, avatarUrl = null, gallery = [],
  } = data

  const accent = ACCENT[palette]
  const bg = PAGE_BG[palette]
  const fontClass = FONT_CLASS[font]
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null

  return (
    <div style={{ background: bg }} className={`min-h-screen ${fontClass}`}>
      <nav className="max-w-3xl mx-auto px-6 pt-6 flex justify-between items-center">
        <p className="font-bold text-[#0D0D0D]">{fullName}</p>
        <KrylaLogo />
      </nav>

      <main className="max-w-3xl mx-auto px-6 pb-20">

        {/* Hero */}
        {showSections.hero && (
          <section className="pt-14 pb-12 border-b border-[#E5E5E5]">
            {avatarUrl && (
              <SmartImg src={avatarUrl} alt={fullName} focus="50% 35%" rounded="full"
                className="w-16 h-16 border-2 border-[#E5E5E5] mb-5" />
            )}
            {location ? (
              <div className="mb-3">
                <span className="text-sm text-[#999]">{location}</span>
                <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer"
                   className="block text-[10px] font-semibold text-[#F5A623] hover:underline mt-0.5">
                  📍 Get Directions
                </a>
              </div>
            ) : null}
            <h1 className="text-4xl sm:text-5xl font-bold text-[#0D0D0D] leading-tight mb-4 max-w-xl">{headline}</h1>
            <p className="text-lg text-[#666666] leading-relaxed mb-8 max-w-lg">{subheadline}</p>
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
                  {ctaSecondary || `Message ${firstName}`}
                </a>
              )}
            </div>
          </section>
        )}

        {/* Bio — featured in portfolio */}
        {bio && (
          <section className="py-10 border-b border-[#E5E5E5]">
            <div className="flex items-start gap-4">
              <div className="w-1 h-full rounded-full shrink-0 mt-1" style={{ background: accent, minHeight: 48 }} />
              <p className="text-[#444444] leading-relaxed text-lg">{bio}</p>
            </div>
          </section>
        )}

        {/* Services — 2-col card grid */}
        {showSections.services && services.length > 0 && (
          <section className="py-10 border-b border-[#E5E5E5]">
            <SectionHeading>Work & Services</SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {services.map((s, i) => (
                <div key={i} className="border border-[#E5E5E5] rounded-xl p-5 bg-white">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <p className="font-semibold text-[#0D0D0D]">{s.name}</p>
                    {s.duration_or_unit && (
                      <span className="text-xs text-[#999] border border-[#E5E5E5] rounded-full px-2 py-0.5 shrink-0">
                        {s.duration_or_unit}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#666666] leading-relaxed">{s.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Highlights */}
        {showSections.highlights && highlights.length > 0 && (
          <section className="py-10 border-b border-[#E5E5E5]">
            <SectionHeading>Why work with me</SectionHeading>
            <div className="grid grid-cols-3 gap-6">
              {highlights.map((h, i) => (
                <div key={i}>
                  <div className="text-3xl mb-3">{h.icon}</div>
                  <p className="font-semibold text-[#0D0D0D] text-sm mb-1">{h.title}</p>
                  <p className="text-xs text-[#666666] leading-relaxed">{h.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Booking + WhatsApp */}
        <section id="book" className="py-10 border-b border-[#E5E5E5]">
          <SectionHeading>Let&apos;s work together</SectionHeading>
          {showSections.booking ? (
            <>
              <BookingForm providerId={providerId} services={services} accentColor={accent} firstName={firstName} persona={persona} />
              {wa && showSections.contact && (
                <a href={wa} target="_blank" rel="noopener noreferrer"
                  className="mt-4 flex items-center gap-2 justify-center text-sm text-[#666666] hover:text-[#0D0D0D] transition-colors">
                  <WhatsAppIcon size={16} color="#25D366" />
                  Or reach me directly on WhatsApp
                </a>
              )}
            </>
          ) : wa && showSections.contact ? (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-6 py-4 rounded-xl font-semibold text-white w-full justify-center hover:opacity-90 transition-opacity"
              style={{ background: '#25D366' }}>
              <WhatsAppIcon />
              WhatsApp {firstName}
            </a>
          ) : null}
        </section>

        {/* FAQ */}
        {showSections.faq && faq.length > 0 && (
          <section className="py-10">
            <SectionHeading>Frequently asked</SectionHeading>
            <FaqList items={faq} />
          </section>
        )}

        <GalleryGrid images={gallery} />
      </main>

      <Footer />
    </div>
  )
}
