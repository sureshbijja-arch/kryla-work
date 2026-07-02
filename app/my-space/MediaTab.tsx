'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  providerId: string
  slug: string
  firstName: string
  plan: string
  onUpgrade: () => void
}

const PLAN_RANK: Record<string, number> = { seed: 0, sprout: 1, grow: 2, thrive: 3, elevate: 4 }

export default function MediaTab({ providerId, slug, firstName, plan, onUpgrade }: Props) {
  const [avatarUrl, setAvatarUrl]             = useState<string | null>(null)
  const [gallery, setGallery]                 = useState<string[]>([])
  const [loading, setLoading]                 = useState(true)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [avatarError, setAvatarError]         = useState('')
  const [galleryError, setGalleryError]       = useState('')

  const [igHandle, setIgHandle]   = useState('')
  const [igSaving, setIgSaving]   = useState(false)
  const [igSaved, setIgSaved]     = useState(false)
  const [igError, setIgError]     = useState('')

  const supabase  = createClient()
  const canUpload = (PLAN_RANK[plan] ?? 0) >= 2

  useEffect(() => {
    Promise.all([
      supabase.from('providers').select('avatar_url, instagram_handle').eq('id', providerId).single(),
      supabase.from('pages').select('gallery').eq('provider_id', providerId).single(),
    ]).then(([providerRes, galleryRes]) => {
      setAvatarUrl((providerRes.data as Record<string, unknown> | null)?.avatar_url as string | null ?? null)
      setIgHandle(((providerRes.data as Record<string, unknown> | null)?.instagram_handle as string | null) ?? '')
      setGallery(Array.isArray(galleryRes.data?.gallery) ? (galleryRes.data!.gallery as string[]) : [])
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId])

  async function handleIgSave() {
    setIgSaving(true)
    setIgError('')
    setIgSaved(false)
    try {
      const res  = await fetch('/api/my-space/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, instagramHandle: igHandle }),
      })
      const data = await res.json()
      if (!res.ok) { setIgError(data.error ?? 'Save failed'); return }
      // Update to the server-normalised value (strips @, extracts from URL)
      if (data.handle !== undefined) setIgHandle(data.handle ?? '')
      setIgSaved(true)
    } catch {
      setIgError('Something went wrong — try again.')
    } finally {
      setIgSaving(false)
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    setAvatarError('')
    const form = new FormData()
    form.append('file', file)
    form.append('type', 'avatar')
    form.append('slug', slug)
    try {
      const res  = await fetch('/api/my-space/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { setAvatarError(data.error ?? 'Upload failed'); return }
      setAvatarUrl(data.url)
    } catch {
      setAvatarError('Upload failed — please try again.')
    } finally {
      setAvatarUploading(false)
      e.target.value = ''
    }
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setGalleryUploading(true)
    setGalleryError('')
    const form = new FormData()
    form.append('file', file)
    form.append('type', 'gallery')
    form.append('slug', slug)
    try {
      const res  = await fetch('/api/my-space/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { setGalleryError(data.error ?? 'Upload failed'); return }
      setGallery(prev => [...prev, data.url])
    } catch {
      setGalleryError('Upload failed — please try again.')
    } finally {
      setGalleryUploading(false)
      e.target.value = ''
    }
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

        {/* ── Instagram — available to all plans ── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D] mb-1">Instagram</p>
          <p className="text-xs text-[#999] mb-3">Just your username — e.g. <span className="font-medium">@janedoe</span>. Shown as a link on your page.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={igHandle}
              onChange={e => { setIgHandle(e.target.value); setIgSaved(false) }}
              onKeyDown={e => { if (e.key === 'Enter') handleIgSave() }}
              placeholder="@yourhandle"
              className="flex-1 border border-[#E5E5E5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
            />
            <button
              onClick={handleIgSave}
              disabled={igSaving}
              className="shrink-0 text-sm font-semibold text-white rounded-xl px-4 py-2.5 disabled:opacity-50 transition-opacity"
              style={{ background: '#0D0D0D' }}>
              {igSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
          {igSaved && <p className="text-xs text-green-600 mt-1.5">Saved ✓</p>}
          {igError && <p className="text-red-500 text-xs mt-1.5">{igError}</p>}
        </section>

        {/* ── Photos & Media — Grow+ only ── */}
        {!canUpload ? (
          <section className="rounded-2xl border border-[#E5E5E5] px-5 py-6 text-center">
            <p className="text-2xl mb-2">🖼️</p>
            <p className="font-semibold text-[#0D0D0D] mb-1">Photos & Media</p>
            <p className="text-sm text-[#666] mb-4 max-w-xs mx-auto">Upload your profile photo and gallery. Available on Grow and above.</p>
            <button
              onClick={onUpgrade}
              className="bg-[#0D0D0D] text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:opacity-80 transition-opacity">
              See plans →
            </button>
          </section>
        ) : (
          <>
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D] mb-3">Profile photo</p>
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border border-[#E5E5E5]" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center text-2xl font-semibold text-[#bbb]">
                    {firstName[0]?.toUpperCase()}
                  </div>
                )}
                <label className="cursor-pointer text-sm font-semibold text-[#0D0D0D] border border-[#E5E5E5] rounded-xl px-4 py-2.5 hover:bg-[#F5F5F5] transition-colors">
                  {avatarUploading ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Upload photo'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
                </label>
              </div>
              {avatarError && <p className="text-red-500 text-xs mt-2">{avatarError}</p>}
            </section>

            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D] mb-3">Gallery</p>
              {gallery.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {gallery.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-lg border border-[#E5E5E5]" />
                  ))}
                </div>
              )}
              {gallery.length === 0 && (
                <p className="text-xs text-[#999] mb-3">No gallery images yet.</p>
              )}
              <label className="cursor-pointer inline-flex items-center gap-1.5 text-sm font-semibold text-[#0D0D0D] border border-[#E5E5E5] rounded-xl px-4 py-2.5 hover:bg-[#F5F5F5] transition-colors">
                {galleryUploading ? 'Uploading…' : '+ Add image'}
                <input type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} disabled={galleryUploading} />
              </label>
              {galleryError && <p className="text-red-500 text-xs mt-2">{galleryError}</p>}
            </section>
          </>
        )}

      </div>
    </div>
  )
}
