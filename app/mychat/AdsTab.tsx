'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AdItem {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  linkUrl: string | null
  status: 'pending' | 'approved' | 'rejected'
}

interface Props {
  providerId: string
  slug: string
  plan: string
  canAds: boolean
  onUpgrade: () => void
}

export default function AdsTab({ providerId, slug, canAds, onUpgrade }: Props) {
  const [ads, setAds]               = useState<AdItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [adTitle, setAdTitle]       = useState('')
  const [adDesc, setAdDesc]         = useState('')
  const [adLink, setAdLink]         = useState('')
  const [adImageUrl, setAdImageUrl] = useState('')
  const [adImageUploading, setAdImageUploading] = useState(false)
  const [adSubmitting, setAdSubmitting] = useState(false)
  const [adError, setAdError]       = useState('')
  const [adSuccess, setAdSuccess]   = useState(false)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  const supabase = createClient()
  // canAds is computed server-side and passed as a prop

  useEffect(() => {
    supabase
      .from('ads')
      .select('id, title, description, image_url, link_url, status')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setAds(
          (data ?? []).map(a => ({
            id:          a.id,
            title:       a.title,
            description: a.description ?? null,
            imageUrl:    a.image_url   ?? null,
            linkUrl:     a.link_url    ?? null,
            status:      a.status as AdItem['status'],
          }))
        )
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId])

  async function handleAdImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAdImageUploading(true)
    const form = new FormData()
    form.append('file', file)
    form.append('type', 'ad')
    form.append('slug', slug)
    try {
      const res  = await fetch('/api/mychat/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { setAdError(data.error ?? 'Image upload failed'); return }
      setAdImageUrl(data.url)
    } catch {
      setAdError('Image upload failed.')
    } finally {
      setAdImageUploading(false)
      e.target.value = ''
    }
  }

  async function handleAdDelete(id: string) {
    if (deletingIds.has(id)) return
    setDeletingIds(prev => new Set(prev).add(id))
    try {
      const res = await fetch('/api/ads/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId: id }),
      })
      if (res.ok) {
        setAds(prev => prev.filter(a => a.id !== id))
      }
    } finally {
      setDeletingIds(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  async function handleAdSubmit() {
    if (!adTitle.trim() || adSubmitting) return
    setAdSubmitting(true)
    setAdError('')
    setAdSuccess(false)
    try {
      const res  = await fetch('/api/ads/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          title:       adTitle,
          description: adDesc || undefined,
          imageUrl:    adImageUrl || undefined,
          linkUrl:     adLink || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setAdError(data.error ?? 'Failed to submit ad'); return }
      setAds(prev => [{
        id:          data.adId,
        title:       adTitle,
        description: adDesc || null,
        imageUrl:    adImageUrl || null,
        linkUrl:     adLink || null,
        status:      'pending',
      }, ...prev])
      setAdTitle('')
      setAdDesc('')
      setAdLink('')
      setAdImageUrl('')
      setAdSuccess(true)
    } catch {
      setAdError('Something went wrong — please try again.')
    } finally {
      setAdSubmitting(false)
    }
  }

  if (!canAds) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <p className="text-3xl mb-3">📣</p>
        <p className="font-semibold text-[#0D0D0D] mb-1">Scrolling Ads</p>
        <p className="text-sm text-[#666] mb-5 max-w-xs">Post scrolling promotions on your public page. Available on Thrive and above.</p>
        <button
          onClick={onUpgrade}
          className="bg-[#0D0D0D] text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:opacity-80 transition-opacity">
          See plans →
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-1">
          {[0, 150, 300].map(d => (
            <div key={d} className="w-2 h-2 rounded-full bg-[#E5E5E5] animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-5 max-w-2xl mx-auto w-full space-y-8">

        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D] mb-3">Your ads</p>
          {ads.length === 0 ? (
            <p className="text-xs text-[#999]">No ads yet. Submit one below.</p>
          ) : (
            <div className="space-y-2">
              {ads.map(ad => (
                <div key={ad.id} className="border border-[#E5E5E5] rounded-xl p-3.5">
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm font-semibold text-[#0D0D0D] flex-1 min-w-0 truncate">{ad.title}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
                        ad.status === 'approved' ? 'bg-green-100 text-green-700' :
                        ad.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{ad.status}</span>
                      <button
                        onClick={() => handleAdDelete(ad.id)}
                        disabled={deletingIds.has(ad.id)}
                        className="text-[#999] hover:text-red-500 transition-colors disabled:opacity-40"
                        title="Delete ad">
                        {deletingIds.has(ad.id) ? (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="animate-spin">
                            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="10"/>
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2 3.5h10M5 3.5V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1M5.5 6v4M8.5 6v4M3 3.5l.667 7.333A.5.5 0 0 0 4.163 11h5.674a.5.5 0 0 0 .496-.167L11 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  {ad.description && <p className="text-xs text-[#666] mt-1 leading-relaxed">{ad.description}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D] mb-3">New ad</p>
          <div className="space-y-2">
            <input
              value={adTitle}
              onChange={e => { setAdTitle(e.target.value); setAdSuccess(false) }}
              placeholder="Title *"
              maxLength={100}
              className="w-full border border-[#E5E5E5] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors" />
            <textarea
              value={adDesc}
              onChange={e => setAdDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              maxLength={500}
              className="w-full border border-[#E5E5E5] rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-[#0D0D0D] transition-colors" />
            <input
              value={adLink}
              onChange={e => setAdLink(e.target.value)}
              placeholder="Link URL (optional)"
              type="url"
              className="w-full border border-[#E5E5E5] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors" />
            <div className="flex items-center gap-3">
              {adImageUrl && (
                <img src={adImageUrl} alt="Ad" className="w-12 h-12 rounded-lg object-cover border border-[#E5E5E5]" />
              )}
              <label className="cursor-pointer text-xs font-semibold text-[#666] border border-[#E5E5E5] rounded-xl px-3 py-2 hover:bg-[#F5F5F5] transition-colors">
                {adImageUploading ? 'Uploading…' : adImageUrl ? 'Change image' : '+ Ad image (optional)'}
                <input type="file" accept="image/*" className="hidden" onChange={handleAdImageUpload} disabled={adImageUploading} />
              </label>
            </div>
            {adError   && <p className="text-red-500 text-xs">{adError}</p>}
            {adSuccess && <p className="text-green-600 text-xs">Ad submitted for review!</p>}
            <button
              onClick={handleAdSubmit}
              disabled={adSubmitting || !adTitle.trim()}
              className="w-full bg-[#0D0D0D] text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40 hover:opacity-80 transition-opacity">
              {adSubmitting ? 'Submitting…' : 'Submit for approval →'}
            </button>
          </div>
        </section>

      </div>
    </div>
  )
}
