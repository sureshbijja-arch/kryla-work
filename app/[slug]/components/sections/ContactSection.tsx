import BookingForm from '../BookingForm'
import { SectionHeading, WhatsAppIcon } from '../shared'
import { waUrl, mapsUrl } from '../../types'
import type { ProfileData } from '../../types'

interface Props {
  data: ProfileData
  accent: string
  variant: string
}

export default function ContactSection({ data, accent, variant }: Props) {
  const {
    providerId, firstName, location, whatsappNumber, email,
    services, showSections, ctaSecondary,
  } = data

  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null
  const showBooking = showSections.booking
  const showContact = showSections.contact

  if (variant === 'whatsapp') return (
    <section id="book" className="py-10 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <SectionHeading>Get in touch</SectionHeading>
        {wa && showContact ? (
          <a href={wa} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-white w-full justify-center hover:opacity-90 transition-opacity text-base shadow-lg"
            style={{ background: '#25D366' }}>
            <WhatsAppIcon />
            WhatsApp {firstName}
          </a>
        ) : null}
      </div>
    </section>
  )

  if (variant === 'minimal') return (
    <section id="book" className="py-10 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <SectionHeading>Get in touch</SectionHeading>
        <div className="space-y-3">
          {wa && showContact && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-5 py-3.5 rounded-xl border border-[#E5E5E5] bg-white hover:border-[#0D0D0D] transition-colors">
              <WhatsAppIcon size={18} color="#25D366" />
              <span className="font-semibold text-sm text-[#0D0D0D]">{ctaSecondary || `WhatsApp ${firstName}`}</span>
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`}
              className="flex items-center gap-3 px-5 py-3.5 rounded-xl border border-[#E5E5E5] bg-white hover:border-[#0D0D0D] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="4" width="20" height="16" rx="3" stroke="#999" strokeWidth="1.5"/>
                <path d="M2 8l10 6 10-6" stroke="#999" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="font-semibold text-sm text-[#0D0D0D]">{email}</span>
            </a>
          )}
          {location && (
            <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-5 py-3.5 rounded-xl border border-[#E5E5E5] bg-white hover:border-[#0D0D0D] transition-colors">
              <span className="text-lg">📍</span>
              <span className="font-semibold text-sm text-[#0D0D0D]">{location}</span>
            </a>
          )}
        </div>
      </div>
    </section>
  )

  // Both (default) and form: show booking form when eligible, else WhatsApp
  return (
    <section id="book" className="py-10 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <SectionHeading>Get in touch</SectionHeading>
        {showBooking ? (
          <>
            <BookingForm providerId={providerId} services={services} accentColor={accent} firstName={firstName} />
            {variant === 'both' && wa && showContact && (
              <a href={wa} target="_blank" rel="noopener noreferrer"
                className="mt-5 flex items-center gap-2 justify-center text-sm text-[#666] hover:text-[#0D0D0D] transition-colors">
                <WhatsAppIcon size={16} color="#25D366" />
                Or message directly on WhatsApp
              </a>
            )}
          </>
        ) : wa && showContact ? (
          <a href={wa} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-white w-full justify-center hover:opacity-90 transition-opacity shadow-lg"
            style={{ background: '#25D366' }}>
            <WhatsAppIcon />
            WhatsApp {firstName}
          </a>
        ) : null}
      </div>
    </section>
  )
}
