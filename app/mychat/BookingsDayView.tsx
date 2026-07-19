// app/mychat/BookingsDayView.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'

interface Booking {
  id: string
  customer_name: string
  customer_phone: string
  service: string
  start_at: string | null
  duration_min: number | null
  status: string
}

function waLink(phone: string, name: string) {
  const num = phone.replace(/\D/g, '')
  return `https://wa.me/${num}?text=Hi%20${encodeURIComponent(name)}!`
}

function formatTimeRange(startAt: string, durationMin: number | null): string {
  const start = new Date(startAt)
  const startLabel = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (!durationMin) return startLabel
  const end = new Date(start.getTime() + durationMin * 60000)
  const endLabel = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${startLabel} – ${endLabel}`
}

export default function BookingsDayView({ providerId }: { providerId: string }) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/mychat/bookings?providerId=${providerId}`)
      const data = await res.json()
      const list: Booking[] = data.bookings ?? []
      const todayStr = new Date().toDateString()
      const today = list
        .filter(b => b.status === 'accepted' && b.start_at && new Date(b.start_at).toDateString() === todayStr)
        .sort((a, b) => new Date(a.start_at!).getTime() - new Date(b.start_at!).getTime())
      setBookings(today)
    } finally {
      setLoading(false)
    }
  }, [providerId])

  useEffect(() => { load() }, [load])

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-[#bbb] text-sm">Loading today…</div>
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <p className="font-semibold text-[#0D0D0D] text-sm">Nothing booked today</p>
        <p className="text-[#999] text-xs mt-1">Accepted appointments with a confirmed time show up here.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <p className="text-xs text-[#999] font-semibold uppercase tracking-wide mb-4">
        {bookings.length} appointment{bookings.length !== 1 ? 's' : ''} today
      </p>
      <div className="space-y-3">
        {bookings.map(b => (
          <a
            key={b.id}
            href={waLink(b.customer_phone, b.customer_name)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 bg-white border border-[#E5E5E5] rounded-2xl p-4 hover:border-[#25D366] transition-colors">
            <div>
              <p className="font-semibold text-[#0D0D0D] text-sm">{b.customer_name}</p>
              <p className="text-xs text-[#666] mt-0.5">{b.service}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-semibold text-[#0D0D0D]">{formatTimeRange(b.start_at!, b.duration_min)}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
