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

export default function MediaTab({ providerId, slug, firstName, plan: _plan, onUpgrade: _onUpgrade }: Props) {
  const [avatarUrl, setAvatarUrl]             = useState<string | null>(null)
  const [gallery, setGallery]                 = useState<string[]>([])
  const [loading, setLoading]                 = useState(true)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [avatarError, setAvatarError]         = useState('')
  const [galleryError, setGalleryError]       = useState('')

  const [igHandle, setIgHandle]   = useState('')
  const [ndUrl,    setNdUrl]      = useState('')
  const [socialSaving, setSocialSaving] = useState(false)
  const [socialSaved,  setSocialSaved]  = useState(false)
  const [socialError,  setSocialError]  = useState('')

  const supabase  = createClient()

  useEffect(() => {
    Promise.all([
      supabase.from('providers').select('avatar_url, instagram_handle, nextdoor_url').eq('id', providerId).single(),
      supabase.from('pages').select('gallery').eq('provider_id', providerId).single(),
    ]).then(([providerRes, galleryRes]) => {
      const p = providerRes.data as Record<string, unknown> | null
      setAvatarUrl((p?.avatar_url as string | null) ?? null)
      setIgHandle((p?.instagram_handle as string | null) ?? '')
      setNdUrl((p?.nextdoor_url as string | null) ?? '')
      setGallery(Array.isArray(galleryRes.data?.gallery) ? (galleryRes.data!.gallery as string[]) : [])
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId])

  async function handleSocialSave() {
    setSocialSaving(true)
    setSocialError('')
    setSocialSaved(false)
    try {
      const res  = await fetch('/api/mychat/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, instagramHandle: igHandle, nextdoorUrl: ndUrl }),
      })
      const data = await res.json()
      if (!res.ok) { setSocialError(data.error ?? 'Save failed'); return }
      if (data.handle     !== undefined) setIgHandle(data.handle     ?? '')
      if (data.nextdoorUrl !== undefined) setNdUrl(data.nextdoorUrl   ?? '')
      setSocialSaved(true)
    } catch {
      setSocialError('Something went wrong — try again.')
    } finally {
      setSocialSaving(false)
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
      const res  = await fetch('/api/mychat/upload', { method: 'POST', body: form })
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
      const res  = await fetch('/api/mychat/upload', { method: 'POST', body: form })
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

        {/* ── Social links — available to all plans ── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D] mb-4">Social links</p>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-[#666] font-medium mb-1">Instagram</p>
              <input
                type="text"
                value={igHandle}
                onChange={e => { setIgHandle(e.target.value); setSocialSaved(false) }}
                onKeyDown={e => { if (e.key === 'Enter') handleSocialSave() }}
                placeholder="@yourhandle"
                className="w-full border border-[#E5E5E5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
              />
            </div>
            <div>
              <p className="text-xs text-[#666] font-medium mb-1">Nextdoor</p>
              <input
                type="text"
                value={ndUrl}
                onChange={e => { setNdUrl(e.target.value); setSocialSaved(false) }}
                onKeyDown={e => { if (e.key === 'Enter') handleSocialSave() }}
                placeholder="nextdoor.com/pages/your-business"
                className="w-full border border-[#E5E5E5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={handleSocialSave}
              disabled={socialSaving}
              className="text-sm font-semibold text-white rounded-xl px-4 py-2.5 disabled:opacity-50 transition-opacity"
              style={{ background: '#0D0D0D' }}>
              {socialSaving ? 'Saving…' : 'Save'}
            </button>
            {socialSaved  && <p className="text-xs text-green-600">Saved ✓</p>}
            {socialError  && <p className="text-red-500 text-xs">{socialError}</p>}
          </div>
        </section>

        {/* ── Photos & Media — available on all plans ── */}
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

      </div>
    </div>
  )
}
