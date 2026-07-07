'use client'
import { useState } from 'react'
import BookingForm from '../BookingForm'
import { WhatsAppIcon, InstagramIcon, NextdoorIcon } from '../shared'
import { waUrl, mapsUrl, instagramUrl } from '../../types'
import type { ProfileData, BusinessHours } from '../../types'
import { getPersonaConfig } from '../../personaConfig'
import { DAY_ORDER, DAY_LABELS, fmt12, getTodayKey, getStatus, getUpcomingExceptions, fmtExceptionDate, getDateStr } from '../../hours'

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

// ── Hours card — shown in Contact section when businessHours.enabled ─────────

function HoursCard({ hours, dark }: { hours: BusinessHours; dark?: boolean }) {
  const tz          = hours.timezone || 'UTC'
  const todayKey    = getTodayKey(tz)
  const todayStr    = getDateStr(tz, 0)
  const status      = getStatus(hours)
  const upcomingExc = getUpcomingExceptions(hours, tz, 5)

  const cardBg     = dark ? 'rgba(255,255,255,0.06)' : '#fff'
  const cardBorder = dark ? '1.5px solid rgba(255,255,255,0.14)' : '1.5px solid var(--color-accent-border)'
  const iconBg     = dark ? 'rgba(255,255,255,0.1)'  : 'var(--color-accent-surface)'
  const headColor  = dark ? 'rgba(255,255,255,0.92)' : '#0D0D0D'
  const dotColor   = status.isOpen ? '#22C55E' : (dark ? 'rgba(255,255,255,0.45)' : 'var(--color-accent)')
  const subColor   = dark ? 'rgba(255,255,255,0.55)' : '#888'
  const rowToday   = dark ? 'rgba(255,255,255,0.92)' : '#0D0D0D'
  const rowOther   = dark ? 'rgba(255,255,255,0.45)' : '#888'
  const divColor   = dark ? 'rgba(255,255,255,0.08)' : '#F0F0F0'
  const excBg      = dark ? 'rgba(255,255,255,0.04)' : '#FAFAFA'

  return (
    <div className="contact-in mb-2 px-5 py-4"
      style={{ borderRadius: 'var(--radius-card)', border: cardBorder, background: cardBg }}>
      {/* Header row: clock icon + today's open/close status */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 flex items-center justify-center shrink-0 text-lg"
          style={{ borderRadius: 'var(--radius-card)', background: iconBg }}>
          🕐
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm leading-tight" style={{ color: headColor }}>Business Hours</p>
          <p className="flex items-center gap-1.5 text-xs mt-0.5" style={{ color: subColor }}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
            {status.label}
          </p>
        </div>
      </div>

      {/* Full weekly schedule */}
      <div style={{ borderTop: `1px solid ${divColor}` }}>
        {DAY_ORDER.map((day, i) => {
          const dh      = hours[day]
          const isToday = day === todayKey
          return (
            <div key={day}
              className="flex items-center justify-between py-1.5"
              style={{ borderTop: i > 0 ? `1px solid ${divColor}` : undefined }}>
              <span className="text-xs w-8" style={{ color: isToday ? rowToday : rowOther, fontWeight: isToday ? 800 : 500 }}>
                {DAY_LABELS[day]}
              </span>
              <span className="text-xs" style={{ color: isToday ? rowToday : rowOther, fontWeight: isToday ? 700 : 400 }}>
                {dh ? `${fmt12(dh.open)} – ${fmt12(dh.close)}` : 'Closed'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Upcoming exceptions (holidays, leave, special hours) */}
      {upcomingExc.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${divColor}` }}>
          <p className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: subColor }}>
            Upcoming closures &amp; special days
          </p>
          <div className="space-y-1" style={{ background: excBg, borderRadius: 8, padding: '6px 8px' }}>
            {upcomingExc.map(exc => (
              <div key={exc.date} className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold" style={{ color: headColor }}>
                  {fmtExceptionDate(exc.date)}{exc.date === todayStr ? ' (today)' : ''}
                </span>
                <span className="text-xs" style={{ color: subColor }}>
                  {exc.closed
                    ? (exc.note ? `Closed · ${exc.note}` : 'Closed')
                    : (exc.open && exc.close ? `${fmt12(exc.open)} – ${fmt12(exc.close)}${exc.note ? ` · ${exc.note}` : ''}` : exc.note ?? 'Special hours')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EnquiryForm({ providerId, accentColor }: { providerId: string; accentColor: string }) {
  const [name,       setName]       = useState('')
  const [phone,      setPhone]      = useState('')
  const [message,    setMessage]    = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done,       setDone]       = useState(false)
  const [error,      setError]      = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          customerName:  name.trim(),
          customerPhone: phone.trim(),
          service:       'General Enquiry',
          message:       message.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error()
      setDone(true)
    } catch {
      setError('Something went wrong. Please try WhatsApp instead.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) return (
    <div className="text-center py-6">
      <p className="font-black text-[#0D0D0D]">Message sent!</p>
      <p className="text-sm text-[#999] mt-1">We'll get back to you on WhatsApp shortly.</p>
    </div>
  )

  return (
    <form onSubmit={submit} className="space-y-3">
      <input required value={name} onChange={e => setName(e.target.value)}
        placeholder="Your name *"
        className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]" />
      <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)}
        placeholder="WhatsApp number *"
        className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]" />
      <textarea value={message} onChange={e => setMessage(e.target.value)}
        placeholder="Your message (optional)"
        rows={3}
        className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]" />
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <button type="submit"
        disabled={submitting || !name.trim() || !phone.trim()}
        className="w-full py-3.5 rounded-2xl text-sm font-black text-white transition-opacity disabled:opacity-50"
        style={{ background: accentColor }}>
        {submitting ? 'Sending…' : 'Send Message →'}
      </button>
    </form>
  )
}

export default function ContactSection({ data, accent: _accent, variant }: Props) {
  const {
    providerId, firstName, location, whatsappNumber, whatsappPublic,
    email, services, showSections, ctaSecondary, persona, headline,
    instagramHandle,
    nextdoorUrl,
  } = data
  const wa = whatsappNumber && whatsappPublic ? waUrl(whatsappNumber, firstName, headline) : null
  const ig = instagramHandle ? instagramUrl(instagramHandle) : null
  const nd = nextdoorUrl || null
  const showBooking = showSections.booking
  const showContact = showSections.contact
  const pcfg = getPersonaConfig(persona)
  const contactLabel = pcfg.contactLabel

  // Closed-date exceptions — passed to BookingForm so closed dates are greyed out
  const tz          = data.businessHours?.timezone || 'UTC'
  const todayStr    = getDateStr(tz, 0)
  const closedDates = (data.businessHours?.exceptions ?? [])
    .filter(e => e.closed && e.date >= todayStr)
    .map(e => e.date)

  /* ── ENQUIRY (baker / chef — WhatsApp first, simple form) ───────────── */
  if (variant === 'enquiry') return (
    <section id="book" className="border-t border-[#E5E5E5]"
      style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
      <style>{STYLES}</style>
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999] mb-6">{contactLabel}</p>
        {data.businessHours?.enabled && <HoursCard hours={data.businessHours} />}
        <div className="space-y-4">
          {wa && showContact && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="contact-in flex items-center gap-3 px-6 py-5 font-black text-white w-full justify-center hover:opacity-90 hover:scale-[1.01] transition-all"
              style={{ borderRadius: 'var(--radius-btn)', background: '#25D366', boxShadow: '0 16px 48px rgba(37,211,102,0.4)' }}>
              <WhatsAppIcon />
              WhatsApp {firstName}
            </a>
          )}
          <div className="relative flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-[#E5E5E5]" />
            <span className="text-xs text-[#bbb] font-semibold">or send a message</span>
            <div className="flex-1 h-px bg-[#E5E5E5]" />
          </div>
          <EnquiryForm providerId={providerId} accentColor="var(--color-accent)" />
          {ig && (
            <a href={ig} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 justify-center text-sm text-[#888] hover:text-[#0D0D0D] transition-colors mt-4">
              <InstagramIcon size={15} color="currentColor" />
              @{instagramHandle}
            </a>
          )}
          {nd && (
            <a href={nd} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 justify-center text-sm text-[#888] hover:text-[#0D0D0D] transition-colors mt-3">
              <NextdoorIcon size={15} color="currentColor" />
              Nextdoor
            </a>
          )}
        </div>
      </div>
    </section>
  )

  /* ── DARK ─────────────────────────────────────────────────────────────── */
  if (variant === 'dark') return (
    <section id="book" className="relative overflow-hidden" style={{ background: '#0D0D0D', paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
      <style>{STYLES}</style>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 70% at 80% 50%, var(--color-accent-surface) 0%, transparent 60%)' }} />
      <div className="relative max-w-2xl mx-auto px-6">
        <p className="contact-in text-[10px] font-black uppercase tracking-[0.2em] mb-8" style={{ color: 'var(--color-accent)' }}>
          {contactLabel}
        </p>
        {data.businessHours?.enabled && <HoursCard hours={data.businessHours} dark />}
        {showBooking ? (
          <div className="contact-in" style={{ animationDelay: '0.1s' }}>
            <BookingForm providerId={providerId} services={services} accentColor="var(--color-accent)" firstName={firstName} persona={persona} closedDates={closedDates} />
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
            className="contact-in flex items-center gap-3 px-6 py-5 font-black text-white w-full justify-center hover:opacity-90 hover:scale-[1.01] transition-all"
            style={{ borderRadius: 'var(--radius-btn)', background: '#25D366', boxShadow: '0 12px 48px rgba(37,211,102,0.4)' }}>
            <WhatsAppIcon />
            WhatsApp {firstName}
          </a>
        ) : null}
        {ig && (
          <a href={ig} target="_blank" rel="noopener noreferrer"
            className="mt-6 flex items-center gap-2 justify-center text-sm text-white/30 hover:text-white/70 transition-colors">
            <InstagramIcon size={15} color="currentColor" />
            @{instagramHandle}
          </a>
        )}
        {nd && (
          <a href={nd} target="_blank" rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2 justify-center text-sm text-white/30 hover:text-white/70 transition-colors">
            <NextdoorIcon size={15} color="currentColor" />
            Nextdoor
          </a>
        )}
      </div>
    </section>
  )

  /* ── WHATSAPP ─────────────────────────────────────────────────────────── */
  if (variant === 'whatsapp') return (
    <section id="book" className="border-t border-[#E5E5E5]"
      style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
      <style>{STYLES}</style>
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999] mb-6">{contactLabel}</p>
        {data.businessHours?.enabled && <HoursCard hours={data.businessHours} />}
        {wa && showContact && (
          <a href={wa} target="_blank" rel="noopener noreferrer"
            className="contact-in flex items-center gap-3 px-6 py-5 font-black text-white w-full justify-center hover:opacity-90 hover:scale-[1.01] transition-all"
            style={{ borderRadius: 'var(--radius-btn)', background: '#25D366', boxShadow: '0 16px 48px rgba(37,211,102,0.4)' }}>
            <WhatsAppIcon />
            WhatsApp {firstName}
          </a>
        )}
        {ig && (
          <a href={ig} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 justify-center text-sm text-[#888] hover:text-[#0D0D0D] transition-colors mt-4">
            <InstagramIcon size={15} color="currentColor" />
            @{instagramHandle}
          </a>
        )}
        {nd && (
          <a href={nd} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 justify-center text-sm text-[#888] hover:text-[#0D0D0D] transition-colors mt-3">
            <NextdoorIcon size={15} color="currentColor" />
            Nextdoor
          </a>
        )}
      </div>
    </section>
  )

  /* ── MINIMAL ──────────────────────────────────────────────────────────── */
  if (variant === 'minimal') return (
    <section id="book" className="border-t border-[#E5E5E5]"
      style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
      <style>{STYLES}</style>
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999] mb-6">{contactLabel}</p>
        {data.businessHours?.enabled && <HoursCard hours={data.businessHours} />}
        <div className="space-y-2">
          {wa && showContact && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="contact-in group flex items-center gap-4 px-5 py-4 bg-white hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
              style={{ borderRadius: 'var(--radius-card)', border: '1.5px solid var(--color-accent-border)' }}>
              <div className="w-10 h-10 bg-[#25D366] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200"
                style={{ borderRadius: 'var(--radius-card)' }}>
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
              className="contact-in group flex items-center gap-4 px-5 py-4 bg-white hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
              style={{ borderRadius: 'var(--radius-card)', border: '1.5px solid var(--color-accent-border)', animationDelay: '0.08s' }}>
              <div className="w-10 h-10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200"
                style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-accent-surface)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="3" stroke="var(--color-accent)" strokeWidth="2"/>
                  <path d="M2 8l10 6 10-6" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round"/>
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
              className="contact-in group flex items-center gap-4 px-5 py-4 bg-white hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
              style={{ borderRadius: 'var(--radius-card)', border: '1.5px solid var(--color-accent-border)', animationDelay: '0.16s' }}>
              <div className="w-10 h-10 flex items-center justify-center shrink-0 text-lg group-hover:scale-110 transition-transform duration-200"
                style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-accent-surface)' }}>📍</div>
              <span className="font-black text-sm text-[#0D0D0D]">{location}</span>
              <svg className="ml-auto text-[#CCC] group-hover:text-[#0D0D0D] group-hover:translate-x-1 transition-all" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          )}
          {ig && (
            <a href={ig} target="_blank" rel="noopener noreferrer"
              className="contact-in group flex items-center gap-4 px-5 py-4 bg-white hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
              style={{ borderRadius: 'var(--radius-card)', border: '1.5px solid var(--color-accent-border)', animationDelay: '0.24s' }}>
              <div className="w-10 h-10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200"
                style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-accent-surface)' }}>
                <InstagramIcon size={18} color="var(--color-accent)" />
              </div>
              <span className="font-black text-sm text-[#0D0D0D]">@{instagramHandle}</span>
              <svg className="ml-auto text-[#CCC] group-hover:text-[#0D0D0D] group-hover:translate-x-1 transition-all" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          )}
          {nd && (
            <a href={nd} target="_blank" rel="noopener noreferrer"
              className="contact-in group flex items-center gap-4 px-5 py-4 bg-white hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
              style={{ borderRadius: 'var(--radius-card)', border: '1.5px solid var(--color-accent-border)', animationDelay: '0.32s' }}>
              <div className="w-10 h-10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200"
                style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-accent-surface)' }}>
                <NextdoorIcon size={18} color="var(--color-accent)" />
              </div>
              <span className="font-black text-sm text-[#0D0D0D]">Nextdoor</span>
              <svg className="ml-auto text-[#CCC] group-hover:text-[#0D0D0D] group-hover:translate-x-1 transition-all" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          )}
        </div>
      </div>
    </section>
  )

  /* ── BOTH / FORM (default) ────────────────────────────────────────────── */
  return (
    <section id="book" className="border-t border-[#E5E5E5]"
      style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
      <style>{STYLES}</style>
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999] mb-6">{contactLabel}</p>
        {data.businessHours?.enabled && <HoursCard hours={data.businessHours} />}
        {showBooking ? (
          <>
            <BookingForm providerId={providerId} services={services} accentColor="var(--color-accent)" firstName={firstName} persona={persona} closedDates={closedDates} />
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
            className="contact-in flex items-center gap-3 px-6 py-5 font-black text-white w-full justify-center hover:opacity-90 hover:scale-[1.01] transition-all"
            style={{ borderRadius: 'var(--radius-btn)', background: '#25D366', boxShadow: '0 16px 48px rgba(37,211,102,0.35)' }}>
            <WhatsAppIcon />
            WhatsApp {firstName}
          </a>
        ) : null}
        {ig && (
          <a href={ig} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 justify-center text-sm text-[#888] hover:text-[#0D0D0D] transition-colors mt-4">
            <InstagramIcon size={15} color="currentColor" />
            @{instagramHandle}
          </a>
        )}
        {nd && (
          <a href={nd} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 justify-center text-sm text-[#888] hover:text-[#0D0D0D] transition-colors mt-3">
            <NextdoorIcon size={15} color="currentColor" />
            Nextdoor
          </a>
        )}
      </div>
    </section>
  )
}
