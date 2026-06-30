import BookingForm from '../BookingForm'
import { WhatsAppIcon } from '../shared'
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

  /* ── DARK ─────────────────────────────────────────────────────────────── */
  if (variant === 'dark') return (
    <section id="book" className="py-16" style={{ background: '#0D0D0D' }}>
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-6" style={{ color: accent }}>Get in touch</p>
        {showBooking ? (
          <>
            <BookingForm providerId={providerId} services={services} accentColor={accent} firstName={firstName} />
            {wa && showContact && (
              <a href={wa} target="_blank" rel="noopener noreferrer"
                className="mt-5 flex items-center gap-2 justify-center text-sm text-white/30 hover:text-white/70 transition-colors">
                <WhatsAppIcon size={16} color="#25D366" />
                Or message on WhatsApp
              </a>
            )}
          </>
        ) : wa && showContact ? (
          <a href={wa} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-6 py-5 rounded-2xl font-black text-white w-full justify-center hover:opacity-90 transition-all shadow-2xl"
            style={{ background: '#25D366' }}>
            <WhatsAppIcon />
            WhatsApp {firstName}
          </a>
        ) : null}
      </div>
    </section>
  )

  /* ── WHATSAPP ─────────────────────────────────────────────────────────── */
  if (variant === 'whatsapp') return (
    <section id="book" className="py-14 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#999] mb-6">Get in touch</p>
        {wa && showContact ? (
          <a href={wa} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-6 py-5 rounded-2xl font-black text-white w-full justify-center hover:opacity-90 transition-all hover:scale-[1.01]"
            style={{ background: '#25D366', boxShadow: '0 12px 40px rgba(37,211,102,0.35)' }}>
            <WhatsAppIcon />
            WhatsApp {firstName}
          </a>
        ) : null}
      </div>
    </section>
  )

  /* ── MINIMAL ──────────────────────────────────────────────────────────── */
  if (variant === 'minimal') return (
    <section id="book" className="py-14 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#999] mb-6">Get in touch</p>
        <div className="space-y-2">
          {wa && showContact && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all"
              style={{ border: `1.5px solid ${accent}20` }}>
              <div className="w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center shrink-0">
                <WhatsAppIcon size={18} color="white" />
              </div>
              <span className="font-black text-sm text-[#0D0D0D]">{ctaSecondary || `WhatsApp ${firstName}`}</span>
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`}
              className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all"
              style={{ border: `1.5px solid ${accent}20` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${accent}15` }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="3" stroke={accent} strokeWidth="2"/>
                  <path d="M2 8l10 6 10-6" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="font-black text-sm text-[#0D0D0D]">{email}</span>
            </a>
          )}
          {location && (
            <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all"
              style={{ border: `1.5px solid ${accent}20` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg"
                style={{ background: `${accent}15` }}>📍</div>
              <span className="font-black text-sm text-[#0D0D0D]">{location}</span>
            </a>
          )}
        </div>
      </div>
    </section>
  )

  /* ── BOTH + FORM (default) ────────────────────────────────────────────── */
  return (
    <section id="book" className="py-14 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#999] mb-6">Get in touch</p>
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
            className="flex items-center gap-3 px-6 py-5 rounded-2xl font-black text-white w-full justify-center hover:opacity-90 transition-all hover:scale-[1.01]"
            style={{ background: '#25D366', boxShadow: '0 12px 40px rgba(37,211,102,0.3)' }}>
            <WhatsAppIcon />
            WhatsApp {firstName}
          </a>
        ) : null}
      </div>
    </section>
  )
}
