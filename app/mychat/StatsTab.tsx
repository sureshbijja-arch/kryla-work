'use client'

import { useState, useEffect } from 'react'

interface Stats {
  totalBookings: number
  accepted:      number
  rejected:      number
  pending:       number
  totalStudents: number
  totalSessions: number
  uniqueViews:   number
  likes:         number
  topSubjects:   { label: string; count: number }[]
}

function StatCard({ label, value, sub, color = '#0D0D0D' }: {
  label: string; value: number; sub?: string; color?: string
}) {
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-2xl p-4 flex flex-col gap-1">
      <p className="text-[10px] font-semibold text-[#999] uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-black" style={{ color }}>{value.toLocaleString()}</p>
      {sub && <p className="text-[11px] text-[#bbb]">{sub}</p>}
    </div>
  )
}

export default function StatsTab({ providerId }: { providerId: string }) {
  const [stats, setStats]   = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/mychat/stats?providerId=${providerId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setStats(data)
      })
      .catch(() => setError('Failed to load stats'))
      .finally(() => setLoading(false))
  }, [providerId])

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-[#bbb] text-sm">Loading stats…</div>
  }
  if (error) {
    return <div className="py-20 text-center text-red-500 text-sm">{error}</div>
  }
  if (!stats) return null

  const maxSubjectCount = Math.max(...(stats.topSubjects.map(s => s.count)), 1)
  const acceptRate = stats.totalBookings > 0
    ? Math.round((stats.accepted / stats.totalBookings) * 100) : 0

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full">

      <p className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-4">Overview</p>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Visitors"      value={stats.uniqueViews}    sub="unique page views" />
        <StatCard label="Likes"         value={stats.likes}          color="#EC4899" />
        <StatCard label="Bookings"      value={stats.totalBookings}  sub={`${stats.pending} pending`} />
        <StatCard label="Accepted"      value={stats.accepted}       sub={`${acceptRate}% rate`} color="#16A34A" />
        <StatCard label="Students"      value={stats.totalStudents}  />
        <StatCard label="Sessions done" value={stats.totalSessions}  />
      </div>

      {/* Service / subject split */}
      {stats.topSubjects.length > 0 && (
        <>
          <p className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">Bookings by service</p>
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-4 space-y-3">
            {stats.topSubjects.map(({ label, count }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-[#0D0D0D] truncate max-w-[70%]">{label}</p>
                  <p className="text-xs text-[#999]">{count}</p>
                </div>
                <div className="h-2 rounded-full bg-[#F5F5F5] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#0D0D0D] transition-all"
                    style={{ width: `${(count / maxSubjectCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Booking breakdown */}
      {stats.totalBookings > 0 && (
        <div className="mt-4 bg-white border border-[#E5E5E5] rounded-2xl p-4">
          <p className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">Booking breakdown</p>
          {[
            { label: 'Accepted', count: stats.accepted, color: '#16A34A' },
            { label: 'Pending',  count: stats.pending,  color: '#EA8C00' },
            { label: 'Rejected', count: stats.rejected, color: '#DC2626' },
          ].map(({ label, count, color }) => (
            <div key={label} className="mb-2 last:mb-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold" style={{ color }}>{label}</p>
                <p className="text-xs text-[#999]">{count}</p>
              </div>
              <div className="h-1.5 rounded-full bg-[#F5F5F5] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(count / stats.totalBookings) * 100}%`,
                    background: color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-[10px] text-[#bbb] mt-6">
        Visitor counts are unique sessions. Stats update in real time.
      </p>
    </div>
  )
}
