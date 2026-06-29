import BookingForm from '../BookingForm'
import { KrylaLogo, Footer, WhatsAppIcon, SectionHeading, FaqList, GalleryGrid } from '../shared'
import { ACCENT, PAGE_BG, FONT_CLASS, waUrl, mapsUrl } from '../../types'
import type { ProfileData } from '../../types'

export default function FocusTemplate({ data }: { data: ProfileData }) {
  const {
    providerId, firstName, lastName, location, whatsappNumber,
    headline, subheadline, bio, ctaPrimary, ctaSecondary,
    services, highlights, faq, palette, font, showSections,
    avatarUrl = null, gallery = [],
  } = data

  const accent = ACCENT[palette]
  const bg = PAGE_BG[palette]
  const fontClass = FONT_CLASS[font]
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null

  return (
    <div style={{ background: bg }} className={`min-h-screen ${fontClass}`}>
      <nav className="max-w-2xl mx-auto px-6 pt-6 flex justify-between items-center">
        {location ? (
          <div>
            <span className="text-xs text-[#999]">{location}</span>
            <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer"
               className="block text-[10px] font-semibold text-[#F5A623] hover:underline">
              📍 Get Directions
            </a>
          </div>
        ) : <span />}
        <KrylaLogo />
      </nav>

      <main className="max-w-2xl mx-auto px-6 pb-20">

        {/* Hero */}
        {showSections.hero && (
          <section className="pt-14 pb-10">
            {avatarUrl && (
              <img src={avatarUrl} alt={fullName} className="w-16 h-16 rounded-full object-cover border-2 border-[#E5E5E5] mb-5" />
            )}
            <p className="text-sm font-semibold mb-3" style={{ color: accent }}>{fullName}</p>
            <h1 className="text-4xl sm:text-5xl font-bold text-[#0D0D0D] leading-tight mb-4">{headline}</h1>
            <p className="text-lg text-[#666666] leading-relaxed mb-8">{subheadline}</p>
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
          </section>
        )}

        {/* Highlights */}
        {showSections.highlights && highlights.length > 0 && (
          <section className="py-8 border-t border-[#E5E5E5]">
            <div className="grid grid-cols-3 gap-6">
              {highlights.map((h, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl mb-2">{h.icon}</div>
                  <p className="font-semibold text-[#0D0D0D] text-sm">{h.title}</p>
                  <p className="text-xs text-[#666666] mt-1 leading-relaxed">{h.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Services */}
        {showSections.services && services.length > 0 && (
          <section className="py-8 border-t border-[#E5E5E5]">
            <SectionHeading>What I offer</SectionHeading>
            <div className="space-y-5">
              {services.map((s, i) => (
                <div key={i} className="flex justify-between items-start gap-4">
                  <div>
                    <p className="font-semibold text-[#0D0D0D]">{s.name}</p>
                    <p className="text-sm text-[#666666] mt-0.5 leading-relaxed">{s.description}</p>
                  </div>
                  {s.duration_or_unit && (
                    <span className="shrink-0 text-xs text-[#999] mt-0.5 border border-[#E5E5E5] rounded-full px-2.5 py-1">
                      {s.duration_or_unit}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bio */}
        {bio && (
          <section className="py-8 border-t border-[#E5E5E5]">
            <SectionHeading>About me</SectionHeading>
            <p className="text-[#444444] leading-relaxed">{bio}</p>
          </section>
        )}

        {/* Booking + WhatsApp */}
        <section id="book" className="py-8 border-t border-[#E5E5E5]">
          <SectionHeading>Get in touch</SectionHeading>
          {showSections.booking ? (
            <>
              <BookingForm providerId={providerId} services={services} accentColor={accent} firstName={firstName} />
              {wa && showSections.contact && (
                <a href={wa} target="_blank" rel="noopener noreferrer"
                  className="mt-4 flex items-center gap-2 justify-center text-sm text-[#666666] hover:text-[#0D0D0D] transition-colors">
                  <WhatsAppIcon size={16} color="#25D366" />
                  Or message directly on WhatsApp
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
          <section className="py-8 border-t border-[#E5E5E5]">
            <SectionHeading>Questions</SectionHeading>
            <FaqList items={faq} />
          </section>
        )}
        <GalleryGrid images={gallery} />
      </main>

      <Footer />
    </div>
  )
}
