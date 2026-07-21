'use client'

import { useState, useEffect, useCallback } from 'react'

type ReviewStatus = 'published' | 'hidden' | 'pending'

interface Review {
  id:          string
  author_name: string
  rating:      number
  body:        string | null
  status:      ReviewStatus
  created_at:  string
}

function Stars({ n }: { n: number }) {
  return (
    <span className="text-[#F59E0B] text-xs">
      {'★'.repeat(n)}{'☆'.repeat(5 - n)}
    </span>
  )
}

export default function ReviewsTab({ providerId }: { providerId: string }) {
  const [reviews, setReviews]   = useState<Review[]>([])
  const [loading, setLoading]   = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/mychat/reviews?providerId=${providerId}`)
      const data = await res.json()
      setReviews(data.reviews ?? [])
    } finally {
      setLoading(false)
    }
  }, [providerId])

  useEffect(() => { load() }, [load])

  async function setStatus(reviewId: string, next: ReviewStatus) {
    setUpdating(reviewId)
    try {
      await fetch('/api/mychat/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, reviewId, status: next }),
      })
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status: next } : r))
    } finally {
      setUpdating(null)
    }
  }

  async function deleteReview(reviewId: string) {
    if (!confirm('Delete this review?')) return
    setUpdating(reviewId)
    try {
      await fetch('/api/mychat/reviews', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, reviewId }),
      })
      setReviews(prev => prev.filter(r => r.id !== reviewId))
    } finally {
      setUpdating(null)
    }
  }

  const published = reviews.filter(r => r.status === 'published')
  const pending   = reviews.filter(r => r.status === 'pending')
  const avg = published.length
    ? (published.reduce((s, r) => s + r.rating, 0) / published.length).toFixed(1)
    : null

  // Pending reviews need attention first, then newest-first within each group.
  const sorted = [...reviews].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (b.status === 'pending' && a.status !== 'pending') return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-[#bbb] text-sm">Loading reviews…</div>
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full">

      {/* Summary bar */}
      {avg && (
        <div className="bg-white border border-[#E5E5E5] rounded-2xl p-4 mb-5 flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-black text-[#0D0D0D]">{avg}</p>
            <Stars n={Math.round(parseFloat(avg))} />
          </div>
          <div className="border-l border-[#E5E5E5] pl-4">
            <p className="text-sm font-semibold text-[#0D0D0D]">{published.length} published review{published.length !== 1 ? 's' : ''}</p>
            <p className="text-xs text-[#999] mt-0.5">
              {pending.length > 0 && <span className="text-[#EA8C00] font-semibold">{pending.length} awaiting approval · </span>}
              {reviews.filter(r => r.status === 'hidden').length} hidden
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-[#999] font-semibold uppercase tracking-wide">
          {reviews.length} review{reviews.length !== 1 ? 's' : ''}
        </p>
      </div>

      {reviews.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-3xl mb-4">⭐</div>
          <p className="font-semibold text-[#0D0D0D] text-sm">No reviews yet</p>
          <p className="text-[#999] text-xs mt-1">Reviews submitted from your public page appear here.</p>
        </div>
      )}

      <div className="space-y-3">
        {sorted.map(r => (
          <div
            key={r.id}
            className={`bg-white border rounded-2xl p-4 ${
              r.status === 'hidden' ? 'border-[#F0F0F0] opacity-60'
                : r.status === 'pending' ? 'border-[#F5A623]/40'
                : 'border-[#E5E5E5]'
            }`}>

            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="font-semibold text-sm text-[#0D0D0D]">{r.author_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Stars n={r.rating} />
                  <span className="text-[10px] text-[#bbb]">
                    {new Date(r.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                r.status === 'published' ? 'bg-[#F0FDF4] text-[#16A34A]'
                  : r.status === 'pending' ? 'bg-[#FFF7ED] text-[#EA8C00]'
                  : 'bg-[#F5F5F5] text-[#999]'
              }`}>
                {r.status === 'pending' ? 'New' : r.status}
              </span>
            </div>

            {r.body && <p className="text-xs text-[#444] leading-relaxed mb-3">{r.body}</p>}

            <div className="flex items-center gap-3">
              {r.status === 'pending' ? (
                <>
                  <button
                    onClick={() => setStatus(r.id, 'published')}
                    disabled={updating === r.id}
                    className="text-xs font-semibold text-[#16A34A] hover:text-[#0F7A2E] transition-colors disabled:opacity-40">
                    {updating === r.id ? '…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => setStatus(r.id, 'hidden')}
                    disabled={updating === r.id}
                    className="text-xs font-semibold text-[#666] hover:text-[#0D0D0D] transition-colors disabled:opacity-40">
                    Reject
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setStatus(r.id, r.status === 'published' ? 'hidden' : 'published')}
                  disabled={updating === r.id}
                  className="text-xs font-semibold text-[#666] hover:text-[#0D0D0D] transition-colors disabled:opacity-40">
                  {updating === r.id ? '…' : r.status === 'published' ? 'Hide' : 'Publish'}
                </button>
              )}
              <button
                onClick={() => deleteReview(r.id)}
                disabled={updating === r.id}
                className="text-xs text-[#bbb] hover:text-red-500 transition-colors ml-auto">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
