'use client'

import { useState, useEffect, useCallback } from 'react'

interface DayEntry {
  day_key: string   // 'YYYY-MM-DD'
  active:  boolean
  slots:   string[]
}

const DEFAULT_SLOTS = [
  '8:00 AM','9:00 AM','10:00 AM','11:00 AM',
  '12:00 PM','1:00 PM','2:00 PM','3:00 PM',
  '4:00 PM','5:00 PM','6:00 PM','7:00 PM',
]

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function AvailabilityTab({ providerId }: { providerId: string }) {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [avail, setAvail] = useState<Record<string, DayEntry>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [customSlot, setCustomSlot] = useState('')
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/mychat/availability?providerId=${providerId}`)
      const data = await res.json()
      const map: Record<string, DayEntry> = {}
      for (const row of data.availability ?? []) map[row.day_key] = row
      setAvail(map)
    } finally {
      setLoading(false)
    }
  }, [providerId])

  useEffect(() => { load() }, [load])

  // Build the calendar grid for current month/year
  const firstDay  = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr  = now.toISOString().split('T')[0]
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  function dayKey(d: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
    setSelected(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
    setSelected(null)
  }

  function toggleDay(d: number) {
    const key = dayKey(d)
    if (key < todayStr) return
    setSelected(prev => prev === key ? null : key)
  }

  async function saveDay(key: string, active: boolean, slots: string[]) {
    setSaving(true)
    try {
      await fetch('/api/mychat/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, dayKey: key, active, slots }),
      })
      setAvail(prev => ({ ...prev, [key]: { day_key: key, active, slots } }))
    } finally {
      setSaving(false)
    }
  }

  async function removeDay(key: string) {
    setSaving(true)
    try {
      await fetch('/api/mychat/availability', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, dayKey: key }),
      })
      setAvail(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      setSelected(null)
    } finally {
      setSaving(false)
    }
  }

  function toggleSlot(key: string, slot: string) {
    const entry = avail[key]
    const slots = entry?.slots ?? []
    const next  = slots.includes(slot) ? slots.filter(s => s !== slot) : [...slots, slot]
    const active = next.length > 0
    setAvail(prev => ({ ...prev, [key]: { day_key: key, active, slots: next } }))
  }

  function addCustomSlot(key: string) {
    const t = customSlot.trim()
    if (!t) return
    const entry = avail[key] ?? { day_key: key, active: true, slots: [] }
    if (entry.slots.includes(t)) return
    const next = [...entry.slots, t]
    setAvail(prev => ({ ...prev, [key]: { ...entry, slots: next, active: true } }))
    setCustomSlot('')
  }

  const selEntry = selected ? (avail[selected] ?? { day_key: selected, active: false, slots: [] }) : null

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-[#bbb] text-sm">Loading schedule…</div>
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 max-w-lg mx-auto w-full">

      {/* Calendar header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="w-8 h-8 rounded-lg bg-[#F5F5F5] hover:bg-[#E5E5E5] flex items-center justify-center transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <p className="font-bold text-sm text-[#0D0D0D]">{MONTHS[month]} {year}</p>
        <button onClick={nextMonth} className="w-8 h-8 rounded-lg bg-[#F5F5F5] hover:bg-[#E5E5E5] flex items-center justify-center transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-[#999] uppercase py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 mb-6">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const key     = dayKey(d)
          const isPast  = key < todayStr
          const entry   = avail[key]
          const hasSlots = entry?.active && (entry?.slots?.length ?? 0) > 0
          const isSel   = selected === key
          return (
            <button
              key={key}
              onClick={() => toggleDay(d)}
              disabled={isPast}
              className={`aspect-square rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center gap-0.5 ${
                isPast
                  ? 'text-[#D0D0D0] cursor-not-allowed'
                  : isSel
                    ? 'bg-[#0D0D0D] text-white'
                    : hasSlots
                      ? 'bg-[#ECFDF5] text-[#16A34A] hover:bg-[#D1FAE5]'
                      : 'bg-[#F5F5F5] text-[#666] hover:bg-[#E5E5E5]'
              }`}>
              <span>{d}</span>
              {hasSlots && !isSel && (
                <span className="text-[8px] font-bold">{entry.slots.length}s</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-6 text-[10px] text-[#999]">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#ECFDF5] border border-[#BBF7D0]"></span>Has slots</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#F5F5F5]"></span>No slots</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#0D0D0D]"></span>Selected</span>
      </div>

      {/* Slot editor for selected day */}
      {selected && selEntry && (
        <div className="bg-white border border-[#E5E5E5] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-sm text-[#0D0D0D]">
                {new Date(selected + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-xs text-[#999]">{selEntry.slots.length} slot{selEntry.slots.length !== 1 ? 's' : ''} open</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => saveDay(selected, selEntry.active, selEntry.slots)}
                disabled={saving}
                className="text-xs font-semibold bg-[#0D0D0D] text-white px-3 py-1.5 rounded-lg disabled:opacity-40 hover:opacity-80 transition-opacity">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => removeDay(selected)}
                disabled={saving}
                className="text-xs font-semibold text-[#bbb] hover:text-red-500 transition-colors px-2">
                Remove
              </button>
            </div>
          </div>

          {/* Quick-pick timeslots */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {DEFAULT_SLOTS.map(slot => {
              const active = selEntry.slots.includes(slot)
              return (
                <button
                  key={slot}
                  onClick={() => toggleSlot(selected, slot)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                    active
                      ? 'bg-[#0D0D0D] text-white'
                      : 'bg-[#F5F5F5] text-[#666] hover:bg-[#E5E5E5]'
                  }`}>
                  {slot}
                </button>
              )
            })}
          </div>

          {/* Custom slot input */}
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              placeholder="Custom time, e.g. 7:30 AM"
              value={customSlot}
              onChange={e => setCustomSlot(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCustomSlot(selected) }}
              className="flex-1 text-xs border border-[#E5E5E5] rounded-lg px-3 py-2 focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
            />
            <button
              onClick={() => addCustomSlot(selected)}
              className="text-xs font-semibold bg-[#F5F5F5] text-[#0D0D0D] px-3 py-2 rounded-lg hover:bg-[#E5E5E5] transition-colors">
              Add
            </button>
          </div>

          {/* Custom slots (non-default) */}
          {selEntry.slots.filter(s => !DEFAULT_SLOTS.includes(s)).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selEntry.slots.filter(s => !DEFAULT_SLOTS.includes(s)).map(slot => (
                <span key={slot} className="flex items-center gap-1 text-xs bg-[#F5F5F5] rounded-lg px-2.5 py-1">
                  {slot}
                  <button onClick={() => toggleSlot(selected, slot)} className="text-[#bbb] hover:text-red-500 ml-1">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {!selected && (
        <div className="text-center py-6 text-[#bbb] text-sm">
          Tap a date to set available timeslots
        </div>
      )}
    </div>
  )
}
