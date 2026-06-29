'use client'

import { useState, useEffect, useCallback } from 'react'

interface Booking {
  id: string
  created_at: string
  customer_name: string
  customer_phone: string
  service: string
  preferred_date: string | null
  message: string | null
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
}

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-[#FFF7ED] text-[#EA8C00]',
  accepted:  'bg-[#F0FDF4] text-[#16A34A]',
  rejected:  'bg-[#FEF2F2] text-[#DC2626]',
  cancelled: 'bg-[#F5F5F5] text-[#999]',
}

export default function BookingsTab({ providerId }: { providerId: string }) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading]   = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/my-space/bookings?providerId=${providerId}`)
      const data = await res.json()
      setBookings(data.bookings ?? [])
    } finally {
      setLoading(false)
    }
  }, [providerId])

  useEffect(() => { load() }, [load])

  async function updateStatus(bookingId: string, status: string) {
    setUpdating(bookingId)
    try {
      await fetch('/api/my-space/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, bookingId, status }),
      })
      setBookings(prev =>
        prev.map(b => b.id === bookingId ? { ...b, status: status as Booking['status'] } : b)
      )
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#bbb] text-sm">
        Loading bookings…
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="w-12 h-12 rounded-full bg-[#F5F5F5] flex items-center justify-center mb-4">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="4" width="14" height="13" rx="2" stroke="#bbb" strokeWidth="1.5" />
            <path d="M7 2v4M13 2v4M3 8h14" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <p className="font-semibold text-[#0D0D0D] text-sm">No bookings yet</p>
        <p className="text-[#999] text-xs mt-1">Booking requests from your profile page will appear here.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
      <p className="text-xs text-[#999] font-semibold uppercase tracking-wide mb-4">
        {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
      </p>

      {bookings.map(b => (
        <div key={b.id} className="bg-white border border-[#E5E5E5] rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="font-semibold text-[#0D0D0D] text-sm">{b.customer_name}</p>
              <p className="text-xs text-[#666] mt-0.5">{b.customer_phone}</p>
            </div>
            <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide rounded-full px-2.5 py-1 ${STATUS_STYLES[b.status] ?? STATUS_STYLES.pending}`}>
              {b.status}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#444] mb-3">
            <span><span className="text-[#999]">Service:</span> {b.service}</span>
            {b.preferred_date && (
              <span><span className="text-[#999]">Date:</span> {b.preferred_date}</span>
            )}
            <span className="text-[#bbb]">{new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>

          {b.message && (
            <p className="text-xs text-[#666] bg-[#FAFAFA] rounded-lg px-3 py-2 mb-3">{b.message}</p>
          )}

          {b.status === 'pending' && (
            <div className="flex gap-2">
              <button
                disabled={updating === b.id}
                onClick={() => updateStatus(b.id, 'accepted')}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[#0D0D0D] text-white hover:opacity-80 disabled:opacity-40 transition-opacity">
                {updating === b.id ? '…' : 'Accept'}
              </button>
              <button
                disabled={updating === b.id}
                onClick={() => updateStatus(b.id, 'rejected')}
                className="flex-1 py-2 rounded-lg text-xs font-semibold border border-[#E5E5E5] text-[#666] hover:border-[#0D0D0D] hover:text-[#0D0D0D] disabled:opacity-40 transition-colors">
                Decline
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
