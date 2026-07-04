'use client'

import { useState, useEffect } from 'react'

interface Review { id: string; author_name: string; rating: number; body: string | null; created_at: string }

function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <span style={{ fontSize: size, color: '#F59E0B', letterSpacing: 1 }}>
      {'★'.repeat(n)}{'☆'.repeat(5 - n)}
    </span>
  )
}

export default function ReviewsSection({
  providerId,
  accentColor = '#0D0D0D',
}: {
  providerId:   string
  accentColor?: string
}) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({ name: '', rating: 5, body: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [showForm, setShowForm]     = useState(false)

  useEffect(() => {
    fetch(`/api/reviews?providerId=${providerId}`)
      .then(r => r.json())
      .then(data => setReviews(data.reviews ?? []))
      .finally(() => setLoading(false))
  }, [providerId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          authorName:  form.name,
          rating:      form.rating,
          reviewBody:  form.body || null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setReviews(prev => [data.review, ...prev])
        setSubmitted(true)
        setShowForm(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  if (loading) return null
  if (!reviews.length && !showForm) {
    return (
      <section className="py-12 px-4 text-center">
        <p className="text-sm text-[#999] mb-3">Be the first to leave a review</p>
        <button
          onClick={() => setShowForm(true)}
          className="text-sm font-semibold px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-80"
          style={{ background: accentColor }}>
          Write a review
        </button>
        {showForm && <ReviewForm form={form} setForm={setForm} onSubmit={submit} submitting={submitting} accentColor={accentColor} />}
      </section>
    )
  }

  return (
    <section className="py-14 px-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-[#0D0D0D]">Reviews</h2>
          {avg && (
            <div className="flex items-center gap-2 mt-1">
              <Stars n={Math.round(parseFloat(avg))} size={16} />
              <span className="text-sm font-bold text-[#0D0D0D]">{avg}</span>
              <span className="text-sm text-[#999]">({reviews.length})</span>
            </div>
          )}
        </div>
        {!submitted && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="text-sm font-semibold px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-80"
            style={{ background: accentColor }}>
            {showForm ? 'Cancel' : 'Write a review'}
          </button>
        )}
        {submitted && <p className="text-sm text-[#16A34A] font-semibold">Thank you for your review!</p>}
      </div>

      {showForm && !submitted && (
        <div className="mb-6 bg-[#F9F9F9] rounded-2xl p-5 border border-[#E5E5E5]">
          <ReviewForm form={form} setForm={setForm} onSubmit={submit} submitting={submitting} accentColor={accentColor} />
        </div>
      )}

      <div className="space-y-4">
        {reviews.map(r => (
          <div key={r.id} className="bg-white border border-[#E5E5E5] rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="font-semibold text-sm text-[#0D0D0D]">{r.author_name}</p>
                <Stars n={r.rating} size={12} />
              </div>
              <span className="text-[10px] text-[#bbb] shrink-0">
                {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            </div>
            {r.body && <p className="text-sm text-[#444] leading-relaxed">{r.body}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}

function ReviewForm({ form, setForm, onSubmit, submitting, accentColor }: {
  form: { name: string; rating: number; body: string }
  setForm: (f: (prev: typeof form) => typeof form) => void
  onSubmit: (e: React.FormEvent) => void
  submitting: boolean
  accentColor: string
}) {
  const inputCls = 'w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]'
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-[#666] uppercase tracking-wide mb-1">Your name</label>
        <input required type="text" placeholder="Your name" value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#666] uppercase tracking-wide mb-1">Rating</label>
        <div className="flex gap-1">
          {[1,2,3,4,5].map(n => (
            <button key={n} type="button" onClick={() => setForm(f => ({ ...f, rating: n }))}
              className={`text-xl transition-all ${n <= form.rating ? 'text-[#F59E0B]' : 'text-[#D0D0D0]'}`}>
              ★
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#666] uppercase tracking-wide mb-1">
          Review <span className="normal-case font-normal text-[#bbb]">(optional)</span>
        </label>
        <textarea rows={3} placeholder="Share your experience…" value={form.body}
          onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
          className={`${inputCls} resize-none`} />
      </div>
      <button type="submit" disabled={submitting || !form.name.trim()}
        className="w-full py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50 hover:opacity-80 transition-opacity"
        style={{ background: accentColor }}>
        {submitting ? 'Submitting…' : 'Submit review'}
      </button>
    </form>
  )
}
