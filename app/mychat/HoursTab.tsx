'use client'

import { useState, useEffect } from 'react'
import type { BusinessHours, DayHours, DayKey, HoursException } from '@/app/[slug]/types'
import { fmt12, fmtExceptionDate } from '@/app/[slug]/hours'

const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_FULL: Record<DayKey, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
  thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}

const TIMEZONES = [
  { label: 'Eastern Time (ET)',     value: 'America/New_York'    },
  { label: 'Central Time (CT)',     value: 'America/Chicago'     },
  { label: 'Mountain Time (MT)',    value: 'America/Denver'      },
  { label: 'Pacific Time (PT)',     value: 'America/Los_Angeles' },
  { label: 'Alaska (AKT)',          value: 'America/Anchorage'   },
  { label: 'Hawaii (HT)',           value: 'Pacific/Honolulu'    },
  { label: 'India (IST)',           value: 'Asia/Kolkata'        },
  { label: 'Dubai (GST)',           value: 'Asia/Dubai'          },
  { label: 'Singapore (SGT)',       value: 'Asia/Singapore'      },
  { label: 'UK (GMT/BST)',          value: 'Europe/London'       },
  { label: 'Central Europe (CET)', value: 'Europe/Berlin'       },
  { label: 'Eastern Europe (EET)', value: 'Europe/Athens'       },
  { label: 'Australia E. (AEST)', value: 'Australia/Sydney'    },
  { label: 'UTC',                   value: 'UTC'                 },
]

function makeTimeOptions() {
  const opts: { value: string; label: string }[] = []
  for (let h = 5; h <= 23; h++) {
    for (const m of [0, 30]) {
      if (h === 23 && m === 30) continue
      const hh = h.toString().padStart(2, '0')
      const mm = m.toString().padStart(2, '0')
      const value = `${hh}:${mm}`
      const period = h >= 12 ? 'PM' : 'AM'
      const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h
      const label = m === 0 ? `${hour12} ${period}` : `${hour12}:${mm} ${period}`
      opts.push({ value, label })
    }
  }
  return opts
}

const TIME_OPTIONS = makeTimeOptions()

const DEFAULT_HOURS: BusinessHours = {
  timezone: 'America/New_York',
  enabled: true,
  mon: { open: '09:00', close: '17:00' },
  tue: { open: '09:00', close: '17:00' },
  wed: { open: '09:00', close: '17:00' },
  thu: { open: '09:00', close: '17:00' },
  fri: { open: '09:00', close: '17:00' },
  sat: null,
  sun: null,
}

interface Props {
  providerId: string
}

export default function HoursTab({ providerId }: Props) {
  const [hours, setHours]     = useState<BusinessHours>(DEFAULT_HOURS)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const [loading, setLoading] = useState(true)

  // ── Exceptions (holidays / leave / special hours) ──
  const [excDate,   setExcDate]   = useState('')
  const [excMode,   setExcMode]   = useState<'closed' | 'special'>('closed')
  const [excOpen,   setExcOpen]   = useState('09:00')
  const [excClose,  setExcClose]  = useState('17:00')
  const [excNote,   setExcNote]   = useState('')
  const todayStr = new Date().toISOString().split('T')[0]

  useEffect(() => {
    fetch(`/api/mychat/hours?providerId=${providerId}`)
      .then(r => r.json())
      .then(d => { if (d.businessHours) setHours(d.businessHours) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [providerId])

  function setTimezone(tz: string) {
    setHours(h => ({ ...h, timezone: tz }))
  }

  function toggleDay(day: DayKey, isOpen: boolean) {
    setHours(h => ({
      ...h,
      [day]: isOpen ? { open: '09:00', close: '17:00' } : null,
    }))
  }

  function setDayTime(day: DayKey, field: 'open' | 'close', value: string) {
    setHours(h => ({
      ...h,
      [day]: { ...(h[day] as DayHours), [field]: value },
    }))
  }

  async function save() {
    setSaving(true)
    setSaveErr('')
    try {
      const res = await fetch('/api/mychat/hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, businessHours: hours }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } else {
        const body = await res.json().catch(() => ({}))
        setSaveErr(body.error ?? `Save failed (${res.status}) — please try again`)
      }
    } catch {
      setSaveErr('Network error — please check your connection and try again')
    } finally {
      setSaving(false)
    }
  }

  function addException() {
    if (!excDate) return
    const exc: HoursException = excMode === 'closed'
      ? { date: excDate, closed: true, ...(excNote.trim() ? { note: excNote.trim() } : {}) }
      : { date: excDate, open: excOpen, close: excClose, ...(excNote.trim() ? { note: excNote.trim() } : {}) }
    setHours(h => {
      const existing = (h.exceptions ?? []).filter(e => e.date !== excDate)
      const sorted   = [...existing, exc].sort((a, b) => a.date.localeCompare(b.date))
      return { ...h, exceptions: sorted }
    })
    // Reset form
    setExcDate(''); setExcNote(''); setExcMode('closed')
  }

  function removeException(date: string) {
    setHours(h => ({ ...h, exceptions: (h.exceptions ?? []).filter(e => e.date !== date) }))
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-[#999]">Loading…</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <p className="text-xs font-semibold text-[#999] uppercase tracking-widest mb-4">Business Hours</p>

      {/* Enable/disable toggle */}
      <div className="flex items-center justify-between rounded-xl border border-[#E5E5E5] bg-white px-4 py-3 mb-4">
        <div>
          <p className="text-sm font-semibold text-[#0D0D0D]">Show on my page</p>
          <p className="text-xs text-[#999] mt-0.5">Display open / closed status to visitors</p>
        </div>
        <button
          onClick={() => setHours(h => ({ ...h, enabled: !h.enabled }))}
          className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${hours.enabled ? 'bg-[#22C55E]' : 'bg-[#E5E5E5]'}`}>
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${hours.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className="mb-5">
        <label className="block text-xs font-semibold text-[#555] mb-1.5">Timezone</label>
        <select
          value={hours.timezone}
          onChange={e => setTimezone(e.target.value)}
          className="w-full border border-[#E5E5E5] rounded-xl px-3 py-2.5 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] bg-white">
          {TIMEZONES.map(tz => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2 mb-6">
        {DAY_KEYS.map(day => {
          const dayHours = hours[day]
          const isOpen = !!dayHours
          return (
            <div key={day} className="rounded-xl border border-[#E5E5E5] bg-white p-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleDay(day, !isOpen)}
                  className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${isOpen ? 'bg-[#22C55E]' : 'bg-[#E5E5E5]'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isOpen ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm font-semibold text-[#0D0D0D] w-24">{DAY_FULL[day]}</span>
                {!isOpen && <span className="text-xs text-[#999]">Closed</span>}
              </div>
              {isOpen && dayHours && (
                <div className="flex items-center gap-2 mt-3 ml-12">
                  <select
                    value={dayHours.open}
                    onChange={e => setDayTime(day, 'open', e.target.value)}
                    className="flex-1 border border-[#E5E5E5] rounded-lg px-2 py-1.5 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] bg-white">
                    {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <span className="text-xs text-[#999] font-medium">to</span>
                  <select
                    value={dayHours.close}
                    onChange={e => setDayTime(day, 'close', e.target.value)}
                    className="flex-1 border border-[#E5E5E5] rounded-lg px-2 py-1.5 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] bg-white">
                    {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className={`w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
          saved ? 'bg-[#22C55E] text-white' : 'bg-[#0D0D0D] text-white hover:opacity-80'
        }`}>
        {saving ? 'Saving…' : saved ? '✓ Hours saved' : 'Save hours'}
      </button>
      {saveErr && <p className="text-xs text-red-500 text-center mt-2">{saveErr}</p>}
      <p className="text-[10px] text-[#bbb] text-center mt-2">
        Visitors will see an open / closed badge on your page
      </p>

      {/* ── Holidays & special dates ──────────────────────────────── */}
      <div className="mt-6 pt-6 border-t border-[#F0F0F0]">
        <p className="text-xs font-semibold text-[#999] uppercase tracking-widest mb-3">Holidays &amp; special dates</p>
        <p className="text-xs text-[#bbb] mb-4">
          Override the weekly schedule for specific dates — holidays, leave, or special hours.
        </p>

        {/* Warn when the feature is toggled off */}
        {!hours.enabled && (
          <div className="flex items-start gap-2 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2.5 mb-4">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-shrink-0">
              <circle cx="7" cy="7" r="6" stroke="#D97706" strokeWidth="1.4"/>
              <path d="M7 4.5v3" stroke="#D97706" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="7" cy="9.5" r=".7" fill="#D97706"/>
            </svg>
            <p className="text-xs text-[#92400E] leading-snug">
              <strong>Business hours are hidden.</strong> Turn on &quot;Show on my page&quot; above and save so exceptions appear on your public page.
            </p>
          </div>
        )}

        {/* Add exception form */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-3 mb-4 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-[#555] mb-1">Date</label>
              <input
                type="date"
                min={todayStr}
                value={excDate}
                onChange={e => setExcDate(e.target.value)}
                className="w-full border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#555] mb-1">Type</label>
              <div className="flex rounded-lg border border-[#E5E5E5] overflow-hidden text-xs font-semibold">
                {(['closed', 'special'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setExcMode(m)}
                    className={`px-3 py-1.5 transition-colors ${excMode === m ? 'bg-[#0D0D0D] text-white' : 'bg-white text-[#555] hover:bg-[#F5F5F5]'}`}>
                    {m === 'closed' ? 'Closed' : 'Special hrs'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {excMode === 'special' && (
            <div className="flex items-center gap-2">
              <select
                value={excOpen}
                onChange={e => setExcOpen(e.target.value)}
                className="flex-1 border border-[#E5E5E5] rounded-lg px-2 py-1.5 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] bg-white">
                {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <span className="text-xs text-[#999] font-medium">to</span>
              <select
                value={excClose}
                onChange={e => setExcClose(e.target.value)}
                className="flex-1 border border-[#E5E5E5] rounded-lg px-2 py-1.5 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] bg-white">
                {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          )}

          <input
            type="text"
            placeholder="Label (optional) — e.g. Christmas, Staff leave"
            maxLength={60}
            value={excNote}
            onChange={e => setExcNote(e.target.value)}
            className="w-full border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] placeholder:text-[#bbb] bg-white" />

          <button
            type="button"
            disabled={!excDate}
            onClick={addException}
            className="w-full py-2 rounded-lg text-sm font-bold text-white bg-[#0D0D0D] hover:opacity-80 disabled:opacity-40 transition-opacity">
            Add exception
          </button>
        </div>

        {/* Current exceptions list */}
        {(hours.exceptions ?? []).length > 0 ? (
          <div className="space-y-1.5">
            {(hours.exceptions ?? [])
              .sort((a, b) => a.date.localeCompare(b.date))
              .map(exc => (
                <div key={exc.date}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0D0D0D] leading-tight">
                      {fmtExceptionDate(exc.date)}
                      {exc.date < todayStr && <span className="ml-1.5 text-[10px] text-[#bbb] font-normal">(past)</span>}
                    </p>
                    <p className="text-xs text-[#888] mt-0.5">
                      {exc.closed
                        ? (exc.note ? `Closed · ${exc.note}` : 'Closed all day')
                        : (exc.open && exc.close ? `${fmt12(exc.open)} – ${fmt12(exc.close)}${exc.note ? ` · ${exc.note}` : ''}` : exc.note ?? 'Special hours')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeException(exc.date)}
                    className="shrink-0 w-7 h-7 rounded-lg text-[#bbb] hover:text-[#0D0D0D] hover:bg-[#F5F5F5] flex items-center justify-center text-lg transition-colors">
                    ×
                  </button>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-xs text-[#bbb] text-center py-3">No exceptions yet.</p>
        )}

        <button
          onClick={save}
          disabled={saving}
          className={`w-full py-3 mt-4 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
            saved ? 'bg-[#22C55E] text-white' : 'bg-[#0D0D0D] text-white hover:opacity-80'
          }`}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
        </button>
        {saveErr && <p className="text-xs text-red-500 text-center mt-2">{saveErr}</p>}
      </div>
    </div>
  )
}
