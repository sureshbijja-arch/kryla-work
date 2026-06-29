import BookingForm from '../BookingForm'
import { KrylaLogo, Footer, WhatsAppIcon, SectionHeading, FaqList, GalleryGrid } from '../shared'
import { ACCENT, PAGE_BG, FONT_CLASS, waUrl, mapsUrl } from '../../types'
import type { ProfileData } from '../../types'

export default function StorefrontTemplate({ data }: { data: ProfileData }) {
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
      {/* Header bar */}
      <header style={{ background: accent }} className="px-6 py-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {avatarUrl && (
              <img src={avatarUrl} alt={fullName} className="w-10 h-10 rounded-full object-cover border-2 border-white/20 shrink-0" />
            )}
            <div>
              <p className="font-bold text-white text-lg">{fullName}</p>
              {location ? (
                <>
                  <span className="text-white/70 text-xs">{location}</span>
                  <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer"
                     className="block text-[10px] font-semibold text-white/60 hover:text-white">
                    📍 Get Directions
                  </a>
                </>
              ) : null}
            </div>
          </div>
          <KrylaLogo />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pb-20">

        {/* Hero */}
        {showSections.hero && (
          <section className="pt-10 pb-8 border-b border-[#E5E5E5]">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#0D0D0D] leading-tight mb-3">{headline}</h1>
            <p className="text-[#666666] leading-relaxed mb-6">{subheadline}</p>
            <div className="flex flex-wrap gap-3">
              {showSections.booking && (
                <a href="#book"
                  className="px-5 py-2.5 rounded-lg font-semibold text-white text-sm hover:opacity-90 transition-opacity"
                  style={{ background: accent }}>
                  {ctaPrimary}
                </a>
              )}
              {wa && showSections.contact && (
                <a href={wa} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm bg-[#25D366] text-white hover:opacity-90 transition-opacity">
                  <WhatsAppIcon size={16} />
                  {ctaSecondary || `WhatsApp`}
                </a>
              )}
            </div>
          </section>
        )}

        {/* Services — menu style */}
        {showSections.services && services.length > 0 && (
          <section className="py-8 border-b border-[#E5E5E5]">
            <SectionHeading>Menu</SectionHeading>
            <div className="space-y-3">
              {services.map((s, i) => (
                <div key={i} className="flex justify-between items-start gap-4 bg-white rounded-xl border border-[#E5E5E5] px-5 py-4">
                  <div>
                    <p className="font-semibold text-[#0D0D0D]">{s.name}</p>
                    <p className="text-sm text-[#666666] mt-0.5 leading-relaxed">{s.description}</p>
                  </div>
                  {s.duration_or_unit && (
                    <span className="shrink-0 text-sm font-semibold mt-0.5" style={{ color: accent }}>
                      {s.duration_or_unit}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Highlights */}
        {showSections.highlights && highlights.length > 0 && (
          <section className="py-8 border-b border-[#E5E5E5]">
            <div className="grid grid-cols-3 gap-4">
              {highlights.map((h, i) => (
                <div key={i} className="text-center bg-white border border-[#E5E5E5] rounded-xl p-4">
                  <div className="text-3xl mb-2">{h.icon}</div>
                  <p className="font-semibold text-[#0D0D0D] text-sm">{h.title}</p>
                  <p className="text-xs text-[#666666] mt-1 leading-relaxed">{h.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bio */}
        {bio && (
          <section className="py-8 border-b border-[#E5E5E5]">
            <SectionHeading>About</SectionHeading>
            <p className="text-[#444444] leading-relaxed">{bio}</p>
          </section>
        )}

        {/* Booking + WhatsApp */}
        <section id="book" className="py-8 border-b border-[#E5E5E5]">
          <SectionHeading>Place an order</SectionHeading>
          {showSections.booking ? (
            <>
              <BookingForm providerId={providerId} services={services} accentColor={accent} firstName={firstName} />
              {wa && showSections.contact && (
                <a href={wa} target="_blank" rel="noopener noreferrer"
                  className="mt-4 flex items-center gap-2 justify-center text-sm text-[#666666] hover:text-[#0D0D0D] transition-colors">
                  <WhatsAppIcon size={16} color="#25D366" />
                  Or order directly on WhatsApp
                </a>
              )}
            </>
          ) : wa && showSections.contact ? (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-6 py-4 rounded-xl font-semibold text-white w-full justify-center hover:opacity-90 transition-opacity"
              style={{ background: '#25D366' }}>
              <WhatsAppIcon />
              Order on WhatsApp
            </a>
          ) : null}
        </section>

        {/* FAQ */}
        {showSections.faq && faq.length > 0 && (
          <section className="py-8">
            <SectionHeading>FAQs</SectionHeading>
            <FaqList items={faq} />
          </section>
        )}

        <GalleryGrid images={gallery} />
      </main>

      <Footer />
    </div>
  )
}
