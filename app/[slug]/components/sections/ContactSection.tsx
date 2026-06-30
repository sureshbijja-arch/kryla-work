'use client'
import BookingForm from '../BookingForm'
import { WhatsAppIcon } from '../shared'
import { waUrl, mapsUrl } from '../../types'
import type { ProfileData } from '../../types'

interface Props {
  data: ProfileData
  accent: string
  variant: string
}

const STYLES = `
@keyframes revealUp {
  from { opacity:0; transform:translateY(24px); }
  to   { opacity:1; transform:translateY(0); }
}
.contact-in { animation: revealUp 0.6s cubic-bezier(.22,1,.36,1) both; }
`

export default function ContactSection({ data, accent, variant }: Props) {
  const {
    providerId, firstName, location, whatsappNumber, email,
    services, showSections, ctaSecondary,
  } = data
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null
  const showBooking = showSections.booking
  const showContact = showSections.contact

  /* ── DARK ───────────────────────────────────────────────────────────────── */
  if (variant === 'dark') return (
    <section id="book" className="py-16 relative overflow-hidden" style={{ background: '#0D0D0D' }}>
      <style>{STYLES}</style>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 70% at 80% 50%, ${accent}08 0%, transparent 60%)` }} />
      <div className="relative max-w-2xl mx-auto px-6">
        <p className="contact-in text-[10px] font-black uppercase tracking-[0.2em] mb-8" style={{ color: accent }}>
          Get in touch
        </p>
        {showBooking ? (
          <div className="contact-in" style={{ animationDelay: '0.1s' }}>
            <BookingForm providerId={providerId} services={services} accentColor={accent} firstName={firstName} />
            {wa && showContact && (
              <a href={wa} target="_blank" rel="noopener noreferrer"
                className="mt-6 flex items-center gap-2 justify-center text-sm text-white/25 hover:text-white/60 transition-colors">
                <WhatsAppIcon size={16} color="#25D366" />
                Or message on WhatsApp
              </a>
            )}
          </div>
        ) : wa && showContact ? (
          <a href={wa} target="_blank" rel="noopener noreferrer"
            className="contact-in flex items-center gap-3 px-6 py-5 rounded-3xl font-black text-white w-full justify-center hover:opacity-90 hover:scale-[1.01] transition-all"
            style={{ background: '#25D366', boxShadow: '0 12px 48px rgba(37,211,102,0.4)' }}>
            <WhatsAppIcon />
            WhatsApp {firstName}
          </a>
        ) : null}
      </div>
    </section>
  )

  /* ── WHATSAPP ────────────────────────────────────────────────────────────── */
  if (variant === 'whatsapp') return (
    <section id="book" className="py-16 border-t border-[#E5E5E5]">
      <style>{STYLES}</style>
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999] mb-6">Get in touch</p>
        {wa && showContact && (
          <a href={wa} target="_blank" rel="noopener noreferrer"
            className="contact-in flex items-center gap-3 px-6 py-5 rounded-3xl font-black text-white w-full justify-center hover:opacity-90 hover:scale-[1.01] transition-all"
            style={{ background: '#25D366', boxShadow: '0 16px 48px rgba(37,211,102,0.4)' }}>
            <WhatsAppIcon />
            WhatsApp {firstName}
          </a>
        )}
      </div>
    </section>
  )

  /* ── MINIMAL ─────────────────────────────────────────────────────────────── */
  if (variant === 'minimal') return (
    <section id="book" className="py-16 border-t border-[#E5E5E5]">
      <style>{STYLES}</style>
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999] mb-6">Get in touch</p>
        <div className="space-y-2">
          {wa && showContact && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="contact-in group flex items-center gap-4 px-5 py-4 rounded-3xl bg-white hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
              style={{ border: `1.5px solid ${accent}20` }}>
              <div className="w-10 h-10 rounded-2xl bg-[#25D366] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
                <WhatsAppIcon size={18} color="white" />
              </div>
              <span className="font-black text-sm text-[#0D0D0D]">{ctaSecondary || `WhatsApp ${firstName}`}</span>
              <svg className="ml-auto text-[#CCC] group-hover:text-[#0D0D0D] group-hover:translate-x-1 transition-all" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`}
              className="contact-in group flex items-center gap-4 px-5 py-4 rounded-3xl bg-white hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
              style={{ border: `1.5px solid ${accent}20`, animationDelay: '0.08s' }}>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200"
                style={{ background: `${accent}15` }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="3" stroke={accent} strokeWidth="2"/>
                  <path d="M2 8l10 6 10-6" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="font-black text-sm text-[#0D0D0D]">{email}</span>
              <svg className="ml-auto text-[#CCC] group-hover:text-[#0D0D0D] group-hover:translate-x-1 transition-all" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          )}
          {location && (
            <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer"
              className="contact-in group flex items-center gap-4 px-5 py-4 rounded-3xl bg-white hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
              style={{ border: `1.5px solid ${accent}20`, animationDelay: '0.16s' }}>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-lg group-hover:scale-110 transition-transform duration-200"
                style={{ background: `${accent}15` }}>📍</div>
              <span className="font-black text-sm text-[#0D0D0D]">{location}</span>
              <svg className="ml-auto text-[#CCC] group-hover:text-[#0D0D0D] group-hover:translate-x-1 transition-all" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          )}
        </div>
      </div>
    </section>
  )

  /* ── BOTH / FORM (default) ───────────────────────────────────────────────── */
  return (
    <section id="book" className="py-16 border-t border-[#E5E5E5]">
      <style>{STYLES}</style>
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999] mb-6">Get in touch</p>
        {showBooking ? (
          <>
            <BookingForm providerId={providerId} services={services} accentColor={accent} firstName={firstName} />
            {variant === 'both' && wa && showContact && (
              <a href={wa} target="_blank" rel="noopener noreferrer"
                className="mt-6 flex items-center gap-2 justify-center text-sm text-[#888] hover:text-[#0D0D0D] transition-colors">
                <WhatsAppIcon size={16} color="#25D366" />
                Or message directly on WhatsApp
              </a>
            )}
          </>
        ) : wa && showContact ? (
          <a href={wa} target="_blank" rel="noopener noreferrer"
            className="contact-in flex items-center gap-3 px-6 py-5 rounded-3xl font-black text-white w-full justify-center hover:opacity-90 hover:scale-[1.01] transition-all"
            style={{ background: '#25D366', boxShadow: '0 16px 48px rgba(37,211,102,0.35)' }}>
            <WhatsAppIcon />
            WhatsApp {firstName}
          </a>
        ) : null}
      </div>
    </section>
  )
}
