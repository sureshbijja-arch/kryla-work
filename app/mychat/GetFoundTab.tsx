'use client'

import { useState, useEffect } from 'react'

interface SeoData {
  live: { seoTitle: string | null; seoDescription: string | null; schemaType: string | null }
  draft: { seoTitle: string | null; seoDescription: string | null; schemaType: string | null }
  defaults: { seoTitle: string; seoDescription: string }
  pageUrl: string
  pageLive: boolean
  hasServices: boolean
  hasFaq: boolean
}

const TITLE_RECOMMENDED = 60
const TITLE_MAX = 70
const DESCRIPTION_RECOMMENDED = 155
const DESCRIPTION_MAX = 320

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span
        className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
        style={{
          background: ok ? '#DCFCE7' : '#F5F5F5',
          color: ok ? '#16A34A' : '#bbb',
        }}
      >
        {ok ? '✓' : '○'}
      </span>
      <p className="text-xs" style={{ color: ok ? '#0D0D0D' : '#999' }}>{label}</p>
    </div>
  )
}

function CharCount({ length, recommended, max }: { length: number; recommended: number; max: number }) {
  const color = length > max ? '#DC2626' : length > recommended ? '#EA8C00' : '#bbb'
  return <p className="text-[11px] text-right mt-1" style={{ color }}>{length} / {recommended} recommended</p>
}

export default function GetFoundTab({ providerId, slug }: { providerId: string; slug: string }) {
  const [data, setData] = useState<SeoData | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/mychat/seo?providerId=${providerId}`)
      .then(r => r.json())
      .then((d: SeoData & { error?: string }) => {
        if (d.error) { setError(d.error); return }
        setData(d)
        setTitle(d.draft.seoTitle ?? d.live.seoTitle ?? '')
        setDescription(d.draft.seoDescription ?? d.live.seoDescription ?? '')
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [providerId])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const res = await fetch('/api/mychat/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, seoTitle: title, seoDescription: description }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed to save'); return }
      setSaved(true)
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-[#bbb] text-sm">Loading…</div>
  }
  if (error && !data) {
    return <div className="py-20 text-center text-red-500 text-sm">{error}</div>
  }
  if (!data) return null

  const displayTitle = title.trim() || data.defaults.seoTitle
  const displayDescription = description.trim() || data.defaults.seoDescription
  const host = data.pageUrl.replace(/^https?:\/\//, '')

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full">
      <p className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Get Found</p>
      <p className="text-xs text-[#bbb] mb-4">Control how your page appears in Google search results.</p>

      {/* Google-style preview */}
      <div className="bg-white border border-[#E5E5E5] rounded-2xl p-4 mb-6">
        <p className="text-[10px] font-semibold text-[#999] uppercase tracking-wide mb-3">Search preview</p>
        <div className="font-sans">
          <p className="text-[13px] text-[#4D5156] truncate">{host}</p>
          <p className="text-[18px] text-[#1a0dab] leading-snug truncate mt-0.5">
            {displayTitle.length > TITLE_RECOMMENDED ? `${displayTitle.slice(0, TITLE_RECOMMENDED)}…` : displayTitle}
          </p>
          <p className="text-[13px] text-[#4D5156] leading-snug mt-0.5 line-clamp-2">
            {displayDescription.length > DESCRIPTION_RECOMMENDED
              ? `${displayDescription.slice(0, DESCRIPTION_RECOMMENDED)}…`
              : displayDescription}
          </p>
        </div>
      </div>

      {/* Title */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-[#0D0D0D]">Search title</label>
          <button
            type="button"
            onClick={() => setTitle('')}
            className="text-[11px] text-[#999] hover:text-[#0D0D0D]"
          >
            Use default
          </button>
        </div>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={data.defaults.seoTitle}
          maxLength={TITLE_MAX}
          className="w-full border border-[#E5E5E5] rounded-xl px-3 py-2 text-sm text-[#0D0D0D] outline-none focus:border-[#0D0D0D]"
        />
        <CharCount length={title.length} recommended={TITLE_RECOMMENDED} max={TITLE_MAX} />
      </div>

      {/* Description */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-[#0D0D0D]">Search description</label>
          <button
            type="button"
            onClick={() => setDescription('')}
            className="text-[11px] text-[#999] hover:text-[#0D0D0D]"
          >
            Use default
          </button>
        </div>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={data.defaults.seoDescription}
          maxLength={DESCRIPTION_MAX}
          rows={3}
          className="w-full border border-[#E5E5E5] rounded-xl px-3 py-2 text-sm text-[#0D0D0D] outline-none focus:border-[#0D0D0D] resize-none"
        />
        <CharCount length={description.length} recommended={DESCRIPTION_RECOMMENDED} max={DESCRIPTION_MAX} />
      </div>

      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-[#0D0D0D] text-white text-sm font-semibold rounded-xl py-2.5 disabled:opacity-50"
      >
        {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
      </button>
      {saved && (
        <p className="text-[11px] text-[#999] text-center mt-2">
          Saved as a draft — publish your page from My Page → Preview my page to make it live.
        </p>
      )}

      {/* Readiness checklist */}
      <div className="mt-8 bg-white border border-[#E5E5E5] rounded-2xl p-4">
        <p className="text-[10px] font-semibold text-[#999] uppercase tracking-wide mb-2">Readiness</p>
        <CheckRow ok={data.pageLive} label="Page is live and indexable" />
        <CheckRow ok={displayTitle.length > 0 && displayTitle.length <= TITLE_MAX} label="Search title is set and within length" />
        <CheckRow ok={displayDescription.length > 0} label="Search description is set" />
        <CheckRow ok={data.hasServices} label="Services listed (helps rich results)" />
        <CheckRow ok={data.hasFaq} label="FAQ added (eligible for FAQ rich results)" />
      </div>

      <p className="text-center text-[10px] text-[#bbb] mt-6">
        Your page: {host}
      </p>
    </div>
  )
}
