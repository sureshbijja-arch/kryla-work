'use client'

import { useState, useEffect, useCallback } from 'react'

interface Booking {
  id: string
  created_at: string
  customer_name: string
  customer_phone: string
  client_email: string | null
  service: string
  preferred_date: string | null
  preferred_slot: string | null
  message: string | null
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'onhold'
}

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-[#FFF7ED] text-[#EA8C00]',
  accepted:  'bg-[#F0FDF4] text-[#16A34A]',
  rejected:  'bg-[#FEF2F2] text-[#DC2626]',
  cancelled: 'bg-[#F5F5F5] text-[#999]',
  onhold:    'bg-[#FFF7ED] text-[#9A5F00]',
}

const STATUS_LABELS: Record<string, string> = {
  pending:   'Pending',
  accepted:  'Accepted',
  rejected:  'Declined',
  cancelled: 'Cancelled',
  onhold:    'On hold',
}

type Filter = 'all' | 'pending' | 'accepted' | 'declined'

function waLink(phone: string, name: string) {
  const num = phone.replace(/\D/g, '')
  return `https://wa.me/${num}?text=Hi%20${encodeURIComponent(name)}!`
}

export default function BookingsTab({
  providerId,
  onPendingCount,
}: {
  providerId: string
  onPendingCount?: (count: number) => void
}) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading]   = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [filter, setFilter]     = useState<Filter>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/mychat/bookings?providerId=${providerId}`)
      const data = await res.json()
      const list: Booking[] = data.bookings ?? []
      setBookings(list)
      onPendingCount?.(list.filter(b => b.status === 'pending').length)
    } finally {
      setLoading(false)
    }
  }, [providerId, onPendingCount])

  useEffect(() => { load() }, [load])

  async function updateStatus(bookingId: string, status: string) {
    setUpdating(bookingId)
    try {
      await fetch('/api/mychat/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, bookingId, status }),
      })
      setBookings(prev => {
        const updated = prev.map(b => b.id === bookingId ? { ...b, status: status as Booking['status'] } : b)
        onPendingCount?.(updated.filter(b => b.status === 'pending').length)
        return updated
      })
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-[#bbb] text-sm">Loading bookings…</div>
  }

  const pendingCount  = bookings.filter(b => b.status === 'pending').length
  const filtered = filter === 'all'      ? bookings
                 : filter === 'pending'  ? bookings.filter(b => b.status === 'pending')
                 : filter === 'accepted' ? bookings.filter(b => b.status === 'accepted')
                 : bookings.filter(b => b.status === 'rejected' || b.status === 'cancelled')

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
    <div className="max-w-2xl mx-auto px-4 py-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-[#999] font-semibold uppercase tracking-wide">
          {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
          {pendingCount > 0 && (
            <span className="ml-2 bg-[#FFF7ED] text-[#EA8C00] px-2 py-0.5 rounded-full">
              {pendingCount} pending
            </span>
          )}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 bg-[#F5F5F5] p-1 rounded-xl">
        {([
          ['all',      'All',      bookings.length],
          ['pending',  'Pending',  bookings.filter(b => b.status === 'pending').length],
          ['accepted', 'Accepted', bookings.filter(b => b.status === 'accepted').length],
          ['declined', 'Declined', bookings.filter(b => b.status === 'rejected' || b.status === 'cancelled').length],
        ] as const).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
              filter === key
                ? 'bg-white text-[#0D0D0D] shadow-sm'
                : 'text-[#999] hover:text-[#666]'
            }`}>
            {label}
            {count > 0 && (
              <span className={`ml-1 ${filter === key ? 'text-[#999]' : 'text-[#bbb]'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-10 text-[#bbb] text-sm">
          No {filter === 'all' ? '' : filter} bookings
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(b => (
          <div key={b.id} className="bg-white border border-[#E5E5E5] rounded-2xl p-4">

            {/* Top row: name + status */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-semibold text-[#0D0D0D] text-sm">{b.customer_name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <a
                    href={waLink(b.customer_phone, b.customer_name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#666] hover:text-[#25D366] transition-colors flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="#25D366">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.104.546 4.08 1.503 5.793L.057 23.197a.75.75 0 00.917.91l5.484-1.437A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.896 0-3.67-.52-5.19-1.425l-.372-.22-3.855 1.01 1.032-3.76-.243-.386A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" fillRule="evenodd"/>
                    </svg>
                    {b.customer_phone}
                  </a>
                  {b.client_email && (
                    <a
                      href={`mailto:${b.client_email}`}
                      className="text-xs text-[#999] hover:text-[#0D0D0D] transition-colors truncate max-w-[160px]">
                      {b.client_email}
                    </a>
                  )}
                </div>
              </div>
              <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide rounded-full px-2.5 py-1 ${STATUS_STYLES[b.status] ?? STATUS_STYLES.pending}`}>
                {STATUS_LABELS[b.status] ?? b.status}
              </span>
            </div>

            {/* Details row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#444] mb-3">
              <span><span className="text-[#999]">Service:</span> {b.service}</span>
              {b.preferred_date && (
                <span>
                  <span className="text-[#999]">Date:</span> {b.preferred_date}
                  {b.preferred_slot && <span className="ml-1 text-[#666]">@ {b.preferred_slot}</span>}
                </span>
              )}
              <span className="text-[#bbb]">
                {new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>

            {b.message && (
              <p className="text-xs text-[#666] bg-[#FAFAFA] rounded-lg px-3 py-2 mb-3">{b.message}</p>
            )}

            {/* Actions */}
            {(b.status === 'pending' || b.status === 'onhold') ? (
              <div className="flex gap-2">
                <button
                  disabled={updating === b.id}
                  onClick={() => updateStatus(b.id, 'accepted')}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[#0D0D0D] text-white hover:opacity-80 disabled:opacity-40 transition-opacity">
                  {updating === b.id ? '…' : 'Accept'}
                </button>
                <button
                  disabled={updating === b.id}
                  onClick={() => updateStatus(b.id, 'onhold')}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border disabled:opacity-40 transition-colors ${
                    b.status === 'onhold'
                      ? 'border-[#F59E0B] text-[#9A5F00] bg-[#FFF7ED]'
                      : 'border-[#E5E5E5] text-[#666] hover:border-[#F59E0B] hover:text-[#9A5F00]'
                  }`}>
                  Hold
                </button>
                <button
                  disabled={updating === b.id}
                  onClick={() => updateStatus(b.id, 'rejected')}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold border border-[#E5E5E5] text-[#666] hover:border-[#DC2626] hover:text-[#DC2626] disabled:opacity-40 transition-colors">
                  Decline
                </button>
              </div>
            ) : b.status === 'accepted' ? (
              <a
                href={waLink(b.customer_phone, b.customer_name)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-semibold border border-[#E5E5E5] text-[#666] hover:border-[#25D366] hover:text-[#25D366] transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.104.546 4.08 1.503 5.793L.057 23.197a.75.75 0 00.917.91l5.484-1.437A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.896 0-3.67-.52-5.19-1.425l-.372-.22-3.855 1.01 1.032-3.76-.243-.386A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" fillRule="evenodd"/>
                </svg>
                Follow up on WhatsApp
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
