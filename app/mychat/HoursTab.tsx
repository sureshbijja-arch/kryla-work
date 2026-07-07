'use client'

import { useState, useEffect } from 'react'
import type { BusinessHours, DayHours, DayKey } from '@/app/[slug]/types'

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
  const [loading, setLoading] = useState(true)

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
    try {
      const res = await fetch('/api/mychat/hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, businessHours: hours }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } finally {
      setSaving(false)
    }
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
      <p className="text-[10px] text-[#bbb] text-center mt-2">
        Visitors will see an open / closed badge on your page
      </p>
    </div>
  )
}
