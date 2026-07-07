'use client'

import { useState, useEffect } from 'react'
import type { ServiceItem } from '../types'

interface AvailDay { day_key: string; slots: string[] }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa']

function CalendarPicker({
  avail, onSelect, selected, closedDates = [],
}: { avail: AvailDay[]; onSelect: (day: string, slot: string) => void; selected: { day: string; slot: string } | null; closedDates?: string[] }) {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selDay, setSelDay] = useState<string | null>(selected?.day ?? null)

  const availMap  = Object.fromEntries(avail.map(d => [d.day_key, d.slots]))
  const closedSet = new Set(closedDates)
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = now.toISOString().split('T')[0]

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  function dayKey(d: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  const selSlots = selDay ? (availMap[selDay] ?? []) : []

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={() => { if (month === 0) { setYear(y=>y-1); setMonth(11) } else setMonth(m=>m-1) }}
          className="w-7 h-7 rounded-lg bg-[#F5F5F5] hover:bg-[#E5E5E5] text-xs flex items-center justify-center">‹</button>
        <span className="text-xs font-semibold text-[#0D0D0D]">{MONTHS[month]} {year}</span>
        <button type="button" onClick={() => { if (month === 11) { setYear(y=>y+1); setMonth(0) } else setMonth(m=>m+1) }}
          className="w-7 h-7 rounded-lg bg-[#F5F5F5] hover:bg-[#E5E5E5] text-xs flex items-center justify-center">›</button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => <div key={d} className="text-center text-[9px] font-semibold text-[#bbb]">{d}</div>)}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 mb-3">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const key = dayKey(d)
          const hasSlots  = !!availMap[key]?.length
          const isPast    = key < todayStr
          const isClosed  = closedSet.has(key)
          const isSel     = selDay === key
          const isDisabled = isPast || !hasSlots || isClosed
          return (
            <button
              type="button"
              key={key}
              disabled={isDisabled}
              onClick={() => { setSelDay(key); onSelect(key, '') }}
              className={`aspect-square rounded-lg text-[11px] font-semibold transition-all ${
                isDisabled
                  ? 'text-[#D0D0D0] cursor-not-allowed'
                  : isSel
                    ? 'bg-[#0D0D0D] text-white'
                    : 'bg-[#F0FDF4] text-[#16A34A] hover:bg-[#DCFCE7]'
              }`}>
              {d}
            </button>
          )
        })}
      </div>

      {/* Slot picker */}
      {selDay && selSlots.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-[#999] uppercase tracking-wide mb-1.5">Choose a time</p>
          <div className="flex flex-wrap gap-1.5">
            {selSlots.map(slot => (
              <button
                type="button"
                key={slot}
                onClick={() => onSelect(selDay, slot)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                  selected?.day === selDay && selected?.slot === slot
                    ? 'bg-[#0D0D0D] text-white'
                    : 'bg-[#F5F5F5] text-[#666] hover:bg-[#E5E5E5]'
                }`}>
                {slot}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function BookingForm({
  providerId,
  services,
  accentColor,
  firstName,
  ctaLabel = 'Send request',
  persona,
  closedDates = [],
}: {
  providerId:   string
  services:     ServiceItem[]
  accentColor:  string
  firstName:    string
  ctaLabel?:    string
  persona?:     string
  closedDates?: string[]   // "YYYY-MM-DD" dates from businessHours exceptions that block booking
}) {
  const [form, setForm] = useState({
    customerName:  '',
    customerEmail: '',
    customerPhone: '',
    service:       services[0]?.name ?? '',
    preferredDate: '',
    preferredSlot: '',
    grade:         '',
    subject:       '',
    message:       '',
  })
  const [status, setStatus]     = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [avail, setAvail]       = useState<AvailDay[] | null>(null)
  const [slotSel, setSlotSel]   = useState<{ day: string; slot: string } | null>(null)

  const isTutor = persona === 'tutor'
  const hasAvail = avail !== null && avail.length > 0

  useEffect(() => {
    fetch(`/api/availability?providerId=${providerId}`)
      .then(r => r.json())
      .then(data => setAvail(data.availability ?? []))
      .catch(() => setAvail([]))
  }, [providerId])

  function handleSlotSelect(day: string, slot: string) {
    setSlotSel({ day, slot })
    setForm(f => ({ ...f, preferredDate: day, preferredSlot: slot }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (hasAvail && !form.preferredSlot) {
      setErrorMsg('Please choose a date and time slot')
      setStatus('error')
      return
    }
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          customerName:  form.customerName,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          service:       form.service || services[0]?.name || 'General inquiry',
          preferredDate: form.preferredDate || undefined,
          preferredSlot: form.preferredSlot || undefined,
          grade:         isTutor && form.grade ? form.grade : undefined,
          subject:       isTutor && form.subject ? form.subject : undefined,
          message:       form.message || undefined,
        }),
      })

      if (res.status === 409) {
        const data = await res.json()
        setErrorMsg(typeof data.error === 'string' ? data.error : 'That slot is no longer available')
        setStatus('error')
        // Refresh availability
        fetch(`/api/availability?providerId=${providerId}`)
          .then(r => r.json())
          .then(data => { setAvail(data.availability ?? []); setSlotSel(null); setForm(f => ({ ...f, preferredDate: '', preferredSlot: '' })) })
        return
      }

      let data: { error?: unknown } = {}
      try { data = await res.json() } catch { /* empty */ }

      if (!res.ok) {
        setErrorMsg(typeof data.error === 'string' ? data.error : 'Something went wrong — please try again')
        setStatus('error')
        return
      }
      setStatus('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Check your connection and try again')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-10">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: accentColor }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 10l4.5 4.5L16 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="font-semibold text-[#0D0D0D] text-lg">Request sent!</p>
        <p className="text-[#666666] text-sm mt-1">{firstName} will be in touch soon.</p>
        <button
          type="button"
          onClick={() => {
            setStatus('idle')
            setSlotSel(null)
            setForm(f => ({ ...f, preferredDate: '', preferredSlot: '', message: '' }))
          }}
          className="mt-6 text-sm text-[#666666] underline underline-offset-2 hover:text-[#0D0D0D] transition-colors">
          Book another session
        </button>
      </div>
    )
  }

  const inputCls = 'w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm text-[#0D0D0D] bg-white focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#0D0D0D] uppercase tracking-wide mb-1.5">Your name</label>
          <input required type="text" placeholder="Priya Sharma"
            value={form.customerName}
            onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
            className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#0D0D0D] uppercase tracking-wide mb-1.5">Email</label>
          <input required type="email" placeholder="priya@example.com"
            value={form.customerEmail}
            onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))}
            className={inputCls} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#0D0D0D] uppercase tracking-wide mb-1.5">WhatsApp number</label>
        <input required type="tel" placeholder="+91 98765 43210"
          value={form.customerPhone}
          onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
          className={inputCls} />
      </div>

      {services.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-[#0D0D0D] uppercase tracking-wide mb-1.5">Service</label>
          <select value={form.service}
            onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
            className={inputCls}>
            {services.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
        </div>
      )}

      {/* Tutor-specific: grade + subject */}
      {isTutor && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#0D0D0D] uppercase tracking-wide mb-1.5">Grade</label>
            <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} className={inputCls}>
              <option value="">Select…</option>
              {['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'].map(g =>
                <option key={g} value={g}>{g}</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0D0D0D] uppercase tracking-wide mb-1.5">Subject</label>
            <input type="text" placeholder="e.g. Maths"
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              className={inputCls} />
          </div>
        </div>
      )}

      {/* Date / slot picker */}
      {avail === null ? (
        <div className="h-8 bg-[#F5F5F5] rounded-lg animate-pulse" />
      ) : hasAvail ? (
        <div>
          <label className="block text-xs font-semibold text-[#0D0D0D] uppercase tracking-wide mb-2">
            Choose a date & time <span className="normal-case font-normal text-[#bbb]">(required)</span>
          </label>
          <div className="border border-[#E5E5E5] rounded-xl p-3 bg-white">
            <CalendarPicker avail={avail} onSelect={handleSlotSelect} selected={slotSel} closedDates={closedDates} />
          </div>
          {slotSel?.day && slotSel?.slot && (
            <p className="text-xs text-[#16A34A] mt-1.5 font-medium">
              ✓ {slotSel.day} at {slotSel.slot}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No timeslots are currently available — you can still send a request and {firstName} will get back to you.
        </div>
      )}

      {/* Message — always visible once availability is loaded */}
      {avail !== null && (
        <div>
          <label className="block text-xs font-semibold text-[#0D0D0D] uppercase tracking-wide mb-1.5">
            Message <span className="normal-case font-normal text-[#bbb]">(optional)</span>
          </label>
          <input type="text" placeholder="Anything to share…"
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            className={inputCls} />
        </div>
      )}

      {status === 'error' && <p className="text-red-500 text-sm">{errorMsg}</p>}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full py-3 rounded-lg font-semibold text-white text-sm disabled:opacity-60 transition-opacity hover:opacity-90 active:scale-[0.98]"
        style={{ background: accentColor }}>
        {status === 'loading' ? 'Sending…' : ctaLabel}
      </button>
    </form>
  )
}
