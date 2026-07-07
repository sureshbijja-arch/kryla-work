'use client'

import { useState, useEffect, useCallback } from 'react'

interface Review {
  id:          string
  author_name: string
  rating:      number
  body:        string | null
  status:      'published' | 'hidden'
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

  async function toggleStatus(reviewId: string, current: 'published' | 'hidden') {
    const next = current === 'published' ? 'hidden' : 'published'
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
  const avg = published.length
    ? (published.reduce((s, r) => s + r.rating, 0) / published.length).toFixed(1)
    : null

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
            <p className="text-xs text-[#999] mt-0.5">{reviews.filter(r => r.status === 'hidden').length} hidden</p>
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
        {reviews.map(r => (
          <div
            key={r.id}
            className={`bg-white border rounded-2xl p-4 ${
              r.status === 'hidden' ? 'border-[#F0F0F0] opacity-60' : 'border-[#E5E5E5]'
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
                r.status === 'published' ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#F5F5F5] text-[#999]'
              }`}>
                {r.status}
              </span>
            </div>

            {r.body && <p className="text-xs text-[#444] leading-relaxed mb-3">{r.body}</p>}

            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleStatus(r.id, r.status)}
                disabled={updating === r.id}
                className="text-xs font-semibold text-[#666] hover:text-[#0D0D0D] transition-colors disabled:opacity-40">
                {updating === r.id ? '…' : r.status === 'published' ? 'Hide' : 'Publish'}
              </button>
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
