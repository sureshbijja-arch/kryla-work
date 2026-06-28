import BookingForm from '../BookingForm'
import { KrylaLogo, Footer, WhatsAppIcon, SectionHeading, FaqList } from '../shared'
import { ACCENT, PAGE_BG, FONT_CLASS, waUrl } from '../../types'
import type { ProfileData } from '../../types'

export default function ClinicTemplate({ data }: { data: ProfileData }) {
  const {
    providerId, firstName, lastName, location, whatsappNumber,
    headline, subheadline, bio, ctaPrimary,
    services, highlights, faq, palette, font, showSections,
  } = data

  const accent = ACCENT[palette]
  const bg = PAGE_BG[palette]
  const fontClass = FONT_CLASS[font]
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null

  return (
    <div style={{ background: bg }} className={`min-h-screen ${fontClass}`}>
      {/* Professional header */}
      <header className="border-b border-[#E5E5E5] bg-white">
        <div className="max-w-2xl mx-auto px-6 py-5 flex justify-between items-center">
          <div>
            <p className="font-bold text-[#0D0D0D] text-lg">Dr. {fullName}</p>
            <p className="text-xs text-[#999] mt-0.5">{location}</p>
          </div>
          <div className="flex items-center gap-4">
            {wa && showSections.contact && (
              <a href={wa} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-[#25D366] hover:opacity-80 transition-opacity">
                <WhatsAppIcon size={14} color="#25D366" />
                WhatsApp
              </a>
            )}
            <KrylaLogo />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pb-20">

        {/* Hero */}
        {showSections.hero && (
          <section className="pt-12 pb-8 border-b border-[#E5E5E5]">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-0.5 rounded-full" style={{ background: accent }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent }}>Specialist</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#0D0D0D] leading-tight mb-3">{headline}</h1>
            <p className="text-[#666666] leading-relaxed">{subheadline}</p>
          </section>
        )}

        {/* Bio — professional focus */}
        {bio && (
          <section className="py-8 border-b border-[#E5E5E5]">
            <SectionHeading>About Dr. {firstName}</SectionHeading>
            <p className="text-[#444444] leading-relaxed">{bio}</p>
          </section>
        )}

        {/* Services — formal list */}
        {showSections.services && services.length > 0 && (
          <section className="py-8 border-b border-[#E5E5E5]">
            <SectionHeading>Services &amp; Treatments</SectionHeading>
            <div className="space-y-4">
              {services.map((s, i) => (
                <div key={i} className="border-l-2 pl-4" style={{ borderColor: accent }}>
                  <div className="flex justify-between items-start gap-4">
                    <p className="font-semibold text-[#0D0D0D]">{s.name}</p>
                    {s.duration_or_unit && (
                      <span className="shrink-0 text-xs text-[#999] border border-[#E5E5E5] rounded px-2 py-0.5">
                        {s.duration_or_unit}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#666666] mt-1 leading-relaxed">{s.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Highlights */}
        {showSections.highlights && highlights.length > 0 && (
          <section className="py-8 border-b border-[#E5E5E5]">
            <SectionHeading>Credentials</SectionHeading>
            <div className="grid grid-cols-3 gap-4">
              {highlights.map((h, i) => (
                <div key={i} className="bg-white border border-[#E5E5E5] rounded-xl p-4 text-center">
                  <div className="text-2xl mb-2">{h.icon}</div>
                  <p className="font-semibold text-[#0D0D0D] text-sm">{h.title}</p>
                  <p className="text-xs text-[#666666] mt-1 leading-relaxed">{h.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Booking — prominent for clinic */}
        <section id="book" className="py-8 border-b border-[#E5E5E5]">
          <SectionHeading>Book an appointment</SectionHeading>
          {showSections.booking ? (
            <>
              <BookingForm providerId={providerId} services={services} accentColor={accent} firstName={firstName} />
              {wa && showSections.contact && (
                <a href={wa} target="_blank" rel="noopener noreferrer"
                  className="mt-4 flex items-center gap-2 justify-center text-sm text-[#666666] hover:text-[#0D0D0D] transition-colors">
                  <WhatsAppIcon size={16} color="#25D366" />
                  Or contact the clinic on WhatsApp
                </a>
              )}
            </>
          ) : wa && showSections.contact ? (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-6 py-4 rounded-xl font-semibold text-white w-full justify-center hover:opacity-90 transition-opacity"
              style={{ background: '#25D366' }}>
              <WhatsAppIcon />
              {ctaPrimary || `Contact Dr. ${firstName}`}
            </a>
          ) : null}
        </section>

        {/* FAQ */}
        {showSections.faq && faq.length > 0 && (
          <section className="py-8">
            <SectionHeading>Patient questions</SectionHeading>
            <FaqList items={faq} />
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}
