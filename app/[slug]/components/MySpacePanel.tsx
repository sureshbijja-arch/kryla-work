'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import BookingsTab from '@/app/my-space/BookingsTab'
import PlanSection from '@/app/my-space/PlanSection'
import ServicesTab from '@/app/my-space/ServicesTab'
import type { ServiceItem } from '@/app/my-space/ServicesTab'
import { TEMPLATE_LABEL, FONT_LABEL, type LayoutOption } from '@/lib/layouts'

type AuthState = 'loading' | 'login_email' | 'login_code' | 'checking' | 'not_owner' | 'ready'
type Tab = 'chat' | 'services' | 'media' | 'ads' | 'layouts' | 'bookings' | 'plan'

interface Message {
  role: 'user' | 'assistant'
  content: string
  changed?: boolean
}

interface AdItem {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  linkUrl: string | null
  status: 'pending' | 'approved' | 'rejected'
}

interface OwnerData {
  provider: {
    id: string
    slug: string
    firstName: string
    persona?: string | null
    plan: string
    planStatus: string
    region: 'india' | 'usa'
    pageLive: boolean
    customPersonaName?: string | null
    avatarUrl?: string | null
  }
  personaTemplateStatus: 'generating' | 'ready' | 'failed' | null
  currentProfile: Record<string, unknown>
  ads: AdItem[]
}

const PLAN_RANK: Record<string, number> = { seed: 0, sprout: 1, grow: 2, thrive: 3, elevate: 4 }
const planRank = (p: string) => PLAN_RANK[p] ?? 0

export default function MySpacePanel({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [email, setEmail]         = useState('')
  const [code, setCode]           = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [ownerData, setOwnerData] = useState<OwnerData | null>(null)
  const [tab, setTab]             = useState<Tab>('chat')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewTs,   setPreviewTs]   = useState(0)
  const [publishing,  setPublishing]  = useState(false)
  const [publishDone, setPublishDone] = useState(false)
  const [applyingLayout, setApplyingLayout] = useState<string | null>(null)
  const [appliedLayout,  setAppliedLayout]  = useState<string | null>(null)
  const [layouts, setLayouts]               = useState<LayoutOption[]>([])
  const [layoutsLoaded, setLayoutsLoaded]   = useState(false)

  const [messages, setMessages]   = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  // Media tab state
  const [avatarUrl, setAvatarUrl]         = useState<string | null>(null)
  const [gallery, setGallery]             = useState<string[]>([])
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [avatarError, setAvatarError]     = useState('')
  const [galleryError, setGalleryError]   = useState('')

  // Ads tab state
  const [ads, setAds]                   = useState<AdItem[]>([])
  const [adTitle, setAdTitle]           = useState('')
  const [adDescription, setAdDescription] = useState('')
  const [adLink, setAdLink]             = useState('')
  const [adImageUrl, setAdImageUrl]     = useState('')
  const [adImageUploading, setAdImageUploading] = useState(false)
  const [adSubmitting, setAdSubmitting] = useState(false)
  const [adError, setAdError]           = useState('')
  const [adSuccess, setAdSuccess]       = useState(false)

  const supabase = createClient()

  const checkOwner = useCallback(async () => {
    setAuthState('checking')
    const res  = await fetch(`/api/my-space/check-owner?slug=${slug}`)
    const data = await res.json()
    if (data.isOwner) {
      setOwnerData(data)
      setAvatarUrl(data.provider.avatarUrl ?? null)
      setGallery(Array.isArray(data.currentProfile?.gallery) ? data.currentProfile.gallery as string[] : [])
      setAds(data.ads ?? [])
      setMessages([{
        role: 'assistant',
        content: `Hi ${data.provider.firstName}! Tell me what you'd like to change — your headline, bio, services, colours, or anything else.`,
      }])
      setAuthState('ready')
    } else {
      setAuthState('not_owner')
    }
  }, [slug])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) checkOwner()
      else setAuthState('login_email')
    })
  }, [checkOwner, supabase.auth])

  useEffect(() => {
    if (tab === 'chat') bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, tab])

  // Fetch layouts from DB when Layouts tab is first opened
  useEffect(() => {
    if (tab !== 'layouts' || layoutsLoaded || !ownerData) return
    const persona = (ownerData.currentProfile?.persona as string | undefined) ?? ownerData.provider.persona ?? 'other'
    fetch(`/api/my-space/layouts?persona=${encodeURIComponent(persona)}`)
      .then(r => r.json())
      .then(data => { setLayouts(data.layouts ?? []); setLayoutsLoaded(true) })
      .catch(() => setLayoutsLoaded(true))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, layoutsLoaded, ownerData])

  async function sendOtp() {
    setAuthLoading(true)
    setAuthError('')
    const { error } = await supabase.auth.signInWithOtp({ email })
    setAuthLoading(false)
    if (error) { setAuthError(error.message); return }
    setAuthState('login_code')
  }

  async function verifyOtp() {
    setAuthLoading(true)
    setAuthError('')
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    setAuthLoading(false)
    if (error) { setAuthError(error.message); return }
    await checkOwner()
  }

  async function sendChat() {
    const text = chatInput.trim()
    if (!text || chatLoading || !ownerData) return
    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setChatInput('')
    setChatLoading(true)
    try {
      const res  = await fetch('/api/my-space/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: ownerData.provider.id,
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          currentProfile: ownerData.currentProfile,
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message, changed: data.changed }])
      if (data.changed) {
        setPublishDone(false) // new draft — allow confirming again
        // Re-fetch currentProfile so next AI message has up-to-date context
        fetch(`/api/my-space/check-owner?slug=${slug}`)
          .then(r => r.json())
          .then(fresh => {
            if (fresh.isOwner && fresh.currentProfile) {
              setOwnerData(prev => prev ? { ...prev, currentProfile: fresh.currentProfile } : prev)
            }
          })
          .catch(() => {})
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong — please try again.' }])
    } finally {
      setChatLoading(false)
      inputRef.current?.focus()
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !ownerData) return
    setAvatarUploading(true)
    setAvatarError('')
    const form = new FormData()
    form.append('file', file)
    form.append('type', 'avatar')
    form.append('slug', ownerData.provider.slug)
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
    if (!file || !ownerData) return
    setGalleryUploading(true)
    setGalleryError('')
    const form = new FormData()
    form.append('file', file)
    form.append('type', 'gallery')
    form.append('slug', ownerData.provider.slug)
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

  async function handleAdImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !ownerData) return
    setAdImageUploading(true)
    const form = new FormData()
    form.append('file', file)
    form.append('type', 'ad')
    form.append('slug', ownerData.provider.slug)
    try {
      const res  = await fetch('/api/my-space/upload', { method: 'POST', body: form })
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

  async function handleAdSubmit() {
    if (!adTitle.trim() || !ownerData) return
    setAdSubmitting(true)
    setAdError('')
    setAdSuccess(false)
    try {
      const res  = await fetch('/api/ads/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: ownerData.provider.slug,
          title: adTitle,
          description: adDescription || undefined,
          imageUrl: adImageUrl || undefined,
          linkUrl: adLink || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setAdError(data.error ?? 'Failed to submit ad'); return }
      setAds(prev => [{
        id: data.adId,
        title: adTitle,
        description: adDescription || null,
        imageUrl: adImageUrl || null,
        linkUrl: adLink || null,
        status: 'approved',
      }, ...prev])
      setAdTitle('')
      setAdDescription('')
      setAdLink('')
      setAdImageUrl('')
      setAdSuccess(true)
    } catch {
      setAdError('Something went wrong — please try again.')
    } finally {
      setAdSubmitting(false)
    }
  }

  async function handlePublish() {
    if (!ownerData || publishing || publishDone) return
    setPublishing(true)
    try {
      const res = await fetch('/api/my-space/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: ownerData.provider.slug }),
      })
      if (res.ok) {
        setPublishDone(true)
        setTimeout(() => { setPreviewOpen(false); setPublishDone(false) }, 2000)
      }
    } catch {
      // silent — member can retry
    } finally {
      setPublishing(false)
    }
  }

  async function handleApplyLayout(lo: LayoutOption) {
    if (!ownerData || applyingLayout) return
    setApplyingLayout(lo.id)
    try {
      const res = await fetch('/api/my-space/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug:     ownerData.provider.slug,
          template: lo.template,
          palette:  lo.palette,
          font:     lo.font,
          sections: lo.sections ?? null,
        }),
      })
      if (res.ok) {
        setAppliedLayout(lo.id)
        setPublishDone(false)
        fetch(`/api/my-space/check-owner?slug=${slug}`)
          .then(r => r.json())
          .then(fresh => {
            if (fresh.isOwner && fresh.currentProfile) {
              setOwnerData(prev => prev ? { ...prev, currentProfile: fresh.currentProfile } : prev)
            }
          })
          .catch(() => {})
      }
    } catch {
      // silent
    } finally {
      setApplyingLayout(null)
    }
  }

  const isSeed      = !ownerData?.provider.plan || ownerData.provider.plan === 'seed'
  const canUpload   = planRank(ownerData?.provider.plan ?? 'seed') >= 2  // grow+
  const canAds      = planRank(ownerData?.provider.plan ?? 'seed') >= 3  // thrive+
  const canLayouts  = planRank(ownerData?.provider.plan ?? 'seed') >= 1  // sprout+

  // ── Auth states ──────────────────────────────────────────────────────────

  if (authState === 'loading' || authState === 'checking') {
    return (
      <PanelShell onClose={onClose}>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex gap-1">
            {[0, 150, 300].map(d => (
              <div key={d} className="w-2 h-2 rounded-full bg-[#E5E5E5] animate-bounce" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        </div>
      </PanelShell>
    )
  }

  if (authState === 'login_email') {
    return (
      <PanelShell onClose={onClose}>
        <div className="flex-1 flex flex-col justify-center px-6 py-10 max-w-sm w-full mx-auto">
          <p className="font-bold text-[#0D0D0D] text-lg mb-1">Sign in to My Space</p>
          <p className="text-[#666] text-sm mb-6">We'll send a code to your email.</p>
          <label className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D] mb-1.5 block">Email</label>
          <input
            type="email" value={email} placeholder="you@example.com"
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendOtp()}
            className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors mb-3" />
          {authError && <p className="text-red-500 text-xs mb-3">{authError}</p>}
          <button onClick={sendOtp} disabled={authLoading || !email}
            className="w-full bg-[#0D0D0D] text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40 hover:opacity-80 transition-opacity">
            {authLoading ? 'Sending…' : 'Send code →'}
          </button>
        </div>
      </PanelShell>
    )
  }

  if (authState === 'login_code') {
    return (
      <PanelShell onClose={onClose}>
        <div className="flex-1 flex flex-col justify-center px-6 py-10 max-w-sm w-full mx-auto">
          <p className="font-bold text-[#0D0D0D] text-lg mb-1">Check your email</p>
          <p className="text-[#666] text-sm mb-6">Enter the 6-digit code sent to <span className="font-medium">{email}</span>.</p>
          <label className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D] mb-1.5 block">Code</label>
          <input
            type="text" inputMode="numeric" maxLength={6} value={code} placeholder="000000"
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && verifyOtp()}
            className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm tracking-widest text-center focus:outline-none focus:border-[#0D0D0D] transition-colors mb-3" />
          {authError && <p className="text-red-500 text-xs mb-3">{authError}</p>}
          <button onClick={verifyOtp} disabled={authLoading || code.length < 6}
            className="w-full bg-[#0D0D0D] text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40 hover:opacity-80 transition-opacity">
            {authLoading ? 'Verifying…' : 'Verify →'}
          </button>
          <button onClick={() => { setAuthState('login_email'); setCode(''); setAuthError('') }}
            className="mt-3 text-xs text-[#999] hover:text-[#0D0D0D] transition-colors text-center w-full">
            ← Back
          </button>
        </div>
      </PanelShell>
    )
  }

  if (authState === 'not_owner') {
    return (
      <PanelShell onClose={onClose}>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className="font-semibold text-[#0D0D0D] mb-2">This isn't your page</p>
          <p className="text-[#666] text-sm mb-6">The email you signed in with isn't linked to this profile.</p>
          <a href="/my-space" className="text-sm font-semibold text-[#F5A623] hover:underline">Go to My Space →</a>
        </div>
      </PanelShell>
    )
  }

  // ── Ready state ──────────────────────────────────────────────────────────

  const showPersonaBanner = ownerData?.personaTemplateStatus === 'generating' || ownerData?.personaTemplateStatus === 'failed'

  return (
    <PanelShell onClose={onClose}>
      {showPersonaBanner && (
        <div className="mx-4 mt-3 flex items-center gap-2.5 bg-[#FFFBF0] border border-[#F5A623]/40 rounded-xl px-3.5 py-2.5">
          <div className="w-2 h-2 rounded-full bg-[#F5A623] animate-pulse shrink-0" />
          <p className="text-xs text-[#666]">Your page is being personalized — it&apos;ll look even better soon.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[#E5E5E5] px-4 flex items-center gap-4 overflow-x-auto scrollbar-none">
        {([
          ['chat',     'Edit'],
          ['services', 'Services'],
          ['media',    'Media'],
          ['ads',      'Ads'],
          ['layouts',  'Layouts'],
          ['bookings', 'Bookings'],
          ['plan',     'Plan'],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
              tab === key ? 'border-[#0D0D0D] text-[#0D0D0D]' : 'border-transparent text-[#999] hover:text-[#0D0D0D]'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Edit (chat) tab */}
      {tab === 'chat' && (
        <>
          {isSeed && (
            <div className="px-4 pt-3">
              <div className="flex items-center justify-between gap-2 bg-[#FFF7ED] border border-[#F5A623]/30 rounded-xl px-3 py-2.5">
                <p className="text-xs text-[#444]"><span className="font-semibold">Upgrade to Sprout</span> to add a booking form</p>
                <button onClick={() => setTab('plan')} className="shrink-0 text-xs font-semibold text-[#EA8C00] hover:underline">Plans →</button>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%]">
                  <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#0D0D0D] text-white rounded-br-sm'
                      : 'bg-[#F5F5F5] text-[#0D0D0D] rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                  {msg.changed && (
                    <div className="flex items-center gap-1 mt-1 ml-1">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="text-[10px] text-[#22C55E] font-semibold">Saved</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-[#F5F5F5] rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 150, 300].map(d => (
                      <div key={d} className="w-1.5 h-1.5 rounded-full bg-[#bbb] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="border-t border-[#E5E5E5] px-3 py-3 flex gap-2 items-end">
            <button
              onClick={() => { setPreviewTs(Date.now()); setPreviewOpen(true) }}
              className="shrink-0 text-xs font-semibold text-[#666] border border-[#E5E5E5] rounded-xl px-3 py-2.5 hover:border-[#0D0D0D] hover:text-[#0D0D0D] transition-colors"
            >
              Preview
            </button>
            <textarea ref={inputRef} rows={1} value={chatInput}
              placeholder="What would you like to change?"
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
              disabled={chatLoading}
              className="flex-1 resize-none border border-[#E5E5E5] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb] disabled:opacity-50 max-h-28 overflow-y-auto" />
            <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
              className="shrink-0 w-9 h-9 rounded-xl bg-[#0D0D0D] text-white flex items-center justify-center disabled:opacity-40 hover:opacity-80 transition-opacity">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 14L14 8 2 2v4.5l8 1.5-8 1.5V14z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </>
      )}

      {/* Services tab */}
      {tab === 'services' && ownerData && (
        <ServicesTab
          providerId={ownerData.provider.id}
          slug={ownerData.provider.slug}
          initialServices={(ownerData.currentProfile?.services as ServiceItem[] | null) ?? []}
          plan={ownerData.provider.plan}
          onPreview={() => { setPreviewTs(Date.now()); setPreviewOpen(true) }}
        />
      )}

      {/* Media tab */}
      {tab === 'media' && ownerData && (
        <div className="flex-1 overflow-y-auto">
          {!canUpload ? (
            <UpgradeBanner plan="Grow" onUpgrade={() => setTab('plan')} />
          ) : (
            <>
              {/* Profile photo */}
              <div className="px-4 pt-5 pb-4 border-b border-[#E5E5E5]">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D] mb-3">Profile photo</p>
                <div className="flex items-center gap-4">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border border-[#E5E5E5]" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center text-2xl font-semibold text-[#bbb]">
                      {ownerData.provider.firstName[0]?.toUpperCase()}
                    </div>
                  )}
                  <label className="cursor-pointer text-sm font-semibold text-[#0D0D0D] border border-[#E5E5E5] rounded-xl px-4 py-2 hover:bg-[#F5F5F5] transition-colors">
                    {avatarUploading ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Upload photo'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
                  </label>
                </div>
                {avatarError && <p className="text-red-500 text-xs mt-2">{avatarError}</p>}
              </div>

              {/* Gallery */}
              <div className="px-4 pt-5 pb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D] mb-3">Gallery</p>
                {gallery.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {gallery.map((url, i) => (
                      <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-lg border border-[#E5E5E5]" />
                    ))}
                  </div>
                )}
                {gallery.length === 0 && (
                  <p className="text-xs text-[#999] mb-3">No images yet.</p>
                )}
                <label className="cursor-pointer inline-flex items-center gap-1.5 text-sm font-semibold text-[#0D0D0D] border border-[#E5E5E5] rounded-xl px-4 py-2 hover:bg-[#F5F5F5] transition-colors">
                  {galleryUploading ? 'Uploading…' : '+ Add image'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} disabled={galleryUploading} />
                </label>
                {galleryError && <p className="text-red-500 text-xs mt-2">{galleryError}</p>}
              </div>
            </>
          )}
        </div>
      )}

      {/* Ads tab */}
      {tab === 'ads' && ownerData && (
        <div className="flex-1 overflow-y-auto">
          {!canAds ? (
            <UpgradeBanner plan="Thrive" onUpgrade={() => setTab('plan')} />
          ) : (
            <>
              {/* Existing ads */}
              <div className="px-4 pt-5 border-b border-[#E5E5E5] pb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D] mb-3">Your ads</p>
                {ads.length === 0 ? (
                  <p className="text-xs text-[#999]">No ads yet. Submit one below.</p>
                ) : (
                  <div className="space-y-2">
                    {ads.map(ad => (
                      <div key={ad.id} className="border border-[#E5E5E5] rounded-xl p-3">
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-sm font-semibold text-[#0D0D0D] flex-1 min-w-0 truncate">{ad.title}</p>
                          <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
                            ad.status === 'approved' ? 'bg-green-100 text-green-700' :
                            ad.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>{ad.status}</span>
                        </div>
                        {ad.description && <p className="text-xs text-[#666] mt-0.5 leading-relaxed">{ad.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* New ad form */}
              <div className="px-4 pt-5 pb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D] mb-3">New ad</p>
                <input
                  value={adTitle}
                  onChange={e => { setAdTitle(e.target.value); setAdSuccess(false) }}
                  placeholder="Title *"
                  maxLength={100}
                  className="w-full border border-[#E5E5E5] rounded-xl px-3 py-2.5 text-sm mb-2 focus:outline-none focus:border-[#0D0D0D] transition-colors" />
                <textarea
                  value={adDescription}
                  onChange={e => setAdDescription(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                  maxLength={500}
                  className="w-full border border-[#E5E5E5] rounded-xl px-3 py-2.5 text-sm mb-2 resize-none focus:outline-none focus:border-[#0D0D0D] transition-colors" />
                <input
                  value={adLink}
                  onChange={e => setAdLink(e.target.value)}
                  placeholder="Link URL (optional)"
                  type="url"
                  className="w-full border border-[#E5E5E5] rounded-xl px-3 py-2.5 text-sm mb-2 focus:outline-none focus:border-[#0D0D0D] transition-colors" />

                {/* Ad image */}
                <div className="flex items-center gap-3 mb-3">
                  {adImageUrl && (
                    <img src={adImageUrl} alt="Ad" className="w-12 h-12 rounded-lg object-cover border border-[#E5E5E5]" />
                  )}
                  <label className="cursor-pointer text-xs font-semibold text-[#666] border border-[#E5E5E5] rounded-xl px-3 py-2 hover:bg-[#F5F5F5] transition-colors">
                    {adImageUploading ? 'Uploading…' : adImageUrl ? 'Change image' : '+ Ad image (optional)'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleAdImageUpload} disabled={adImageUploading} />
                  </label>
                </div>

                {adError   && <p className="text-red-500 text-xs mb-2">{adError}</p>}
                {adSuccess  && <p className="text-green-600 text-xs mb-2">Ad is now live on your page!</p>}
                <button
                  onClick={handleAdSubmit}
                  disabled={adSubmitting || !adTitle.trim()}
                  className="w-full bg-[#0D0D0D] text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40 hover:opacity-80 transition-opacity">
                  {adSubmitting ? 'Submitting…' : 'Submit for approval →'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Layouts tab */}
      {tab === 'layouts' && ownerData && (
        <div className="flex-1 overflow-y-auto">
          {/* Intro */}
          <div className="px-4 pt-4 pb-1">
            <p className="text-xs text-[#666]">Choose a visual style for your page. Changes save to your draft first — preview and publish when ready.</p>
          </div>

          {/* Seed upgrade banner */}
          {!canLayouts && (
            <div className="mx-4 mt-3 mb-1 bg-[#FFF7ED] border border-[#F5A623]/30 rounded-xl px-4 py-3.5">
              <p className="text-xs font-semibold text-[#0D0D0D] mb-1">Upgrade to Sprout to apply layouts</p>
              <p className="text-xs text-[#666] mb-3">Browse the styles below, then upgrade to make changes live.</p>
              <button onClick={() => setTab('plan')}
                className="text-xs font-semibold text-[#EA8C00] hover:underline">
                See plans →
              </button>
            </div>
          )}

          {/* Layout grid */}
          <div className={`px-4 pt-3 pb-4 grid grid-cols-2 gap-3 ${!canLayouts ? 'opacity-50 pointer-events-none select-none' : ''}`}>
            {layouts.map(lo => {
              const isCurrent =
                lo.template === (ownerData.currentProfile?.template as string | undefined) &&
                lo.palette  === (ownerData.currentProfile?.palette  as string | undefined) &&
                lo.font     === (ownerData.currentProfile?.font     as string | undefined)
              const isApplying = applyingLayout === lo.id

              return (
                <button
                  key={lo.id}
                  onClick={() => handleApplyLayout(lo)}
                  disabled={!!applyingLayout || !canLayouts}
                  className={`text-left rounded-xl border overflow-hidden transition-all disabled:cursor-not-allowed ${
                    isCurrent
                      ? 'border-[#0D0D0D] ring-1 ring-[#0D0D0D]'
                      : 'border-[#E5E5E5] hover:border-[#0D0D0D]'
                  }`}
                >
                  {/* Mini visual preview */}
                  <div className="w-full h-[72px] relative overflow-hidden">
                    {lo.imageUrl ? (
                      <img src={lo.imageUrl} alt={lo.name} className="w-full h-full object-cover" />
                    ) : (
                      <div style={{ background: lo.bg }} className="w-full h-full">
                        <div style={{ background: lo.accent }} className="h-2.5 w-full" />
                        <div className="px-2.5 pt-2 space-y-1.5">
                          <div style={{ background: lo.accent }} className="h-1.5 w-2/3 rounded-full opacity-60" />
                          <div className="h-1 w-1/2 rounded-full opacity-25" style={{ background: '#374151' }} />
                          <div className="h-1 w-3/4 rounded-full opacity-15" style={{ background: '#374151' }} />
                        </div>
                      </div>
                    )}
                    {isCurrent && !isApplying && (
                      <div className="absolute top-1.5 right-1.5 w-[18px] h-[18px] bg-[#22C55E] rounded-full flex items-center justify-center">
                        <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                    {isApplying && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                        <div className="w-4 h-4 border-2 border-[#0D0D0D] border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>


                  {/* Card info */}
                  <div className="p-2.5">
                    <p className="text-xs font-bold text-[#0D0D0D] leading-tight mb-0.5">{lo.name}</p>
                    <p className="text-[10px] text-[#888] leading-tight mb-2">{lo.description}</p>
                    <div className="flex gap-1 flex-wrap">
                      <span className="text-[9px] font-semibold uppercase tracking-wide text-[#666] bg-[#F0F0F0] rounded px-1.5 py-0.5">
                        {TEMPLATE_LABEL[lo.template]}
                      </span>
                      <span className="text-[9px] font-semibold uppercase tracking-wide text-[#666] bg-[#F0F0F0] rounded px-1.5 py-0.5">
                        {FONT_LABEL[lo.font]}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Post-apply nudge */}
          {appliedLayout && canLayouts && (
            <div className="mx-4 mb-4 flex items-center justify-between gap-2 bg-[#F0FDF4] border border-[#22C55E]/30 rounded-xl px-3 py-2.5">
              <p className="text-xs font-medium text-[#166534]">Layout saved to draft!</p>
              <button
                onClick={() => { setPreviewTs(Date.now()); setPreviewOpen(true) }}
                className="shrink-0 text-xs font-semibold text-[#166534] hover:underline"
              >
                Preview →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bookings tab */}
      {tab === 'bookings' && ownerData && (
        <div className="flex-1 overflow-y-auto">
          <BookingsTab providerId={ownerData.provider.id} />
        </div>
      )}

      {/* Plan tab */}
      {tab === 'plan' && ownerData && (
        <div className="flex-1 overflow-y-auto">
          <PlanSection currentPlan={ownerData.provider.plan} region={ownerData.provider.region} />
        </div>
      )}

      {/* Full-screen preview overlay */}
      {previewOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5] shrink-0 bg-white gap-3">
            <button
              onClick={() => { setPreviewOpen(false); setPublishDone(false) }}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#666] hover:text-[#0D0D0D] transition-colors shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
            <span className="text-xs font-semibold text-[#999] uppercase tracking-widest">Preview</span>
            <button
              onClick={handlePublish}
              disabled={publishing || publishDone}
              className={`shrink-0 text-xs font-semibold px-4 py-2 rounded-xl transition-all ${
                publishDone
                  ? 'bg-[#22C55E] text-white'
                  : 'bg-[#0D0D0D] text-white hover:opacity-80 disabled:opacity-50'
              }`}
            >
              {publishing ? 'Publishing…' : publishDone ? '✓ Live!' : 'Confirm & Publish →'}
            </button>
          </div>
          {/* Draft preview — force-dynamic, always fresh from DB */}
          <iframe
            key={previewTs}
            src={`/${ownerData?.provider.slug}/preview?t=${previewTs}`}
            className="flex-1 border-0 w-full"
            title="Preview of your page"
          />
        </div>
      )}
    </PanelShell>
  )
}

function UpgradeBanner({ plan, onUpgrade }: { plan: string; onUpgrade: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
      <p className="text-2xl mb-3">⬆️</p>
      <p className="font-semibold text-[#0D0D0D] mb-1">Upgrade to {plan}</p>
      <p className="text-sm text-[#666] mb-5">This feature is available on the {plan} plan and above.</p>
      <button onClick={onUpgrade}
        className="bg-[#0D0D0D] text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:opacity-80 transition-opacity">
        See plans →
      </button>
    </div>
  )
}

function PanelShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5] shrink-0">
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
            <line x1="11" y1="2"  x2="11" y2="20" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" />
            <line x1="11" y1="11" x2="3"  y2="3"  stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" />
            <line x1="11" y1="11" x2="19" y2="3"  stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" />
            <line x1="11" y1="11" x2="19" y2="19" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span className="font-bold text-[#0D0D0D] text-sm">My Space</span>
        </div>
        <button onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center text-[#999] hover:bg-[#F5F5F5] hover:text-[#0D0D0D] transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {children}
    </div>
  )
}
