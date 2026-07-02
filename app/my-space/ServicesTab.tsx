'use client'
import { useState } from 'react'
import type { ServiceItem } from '../[slug]/types'

export type { ServiceItem }

const PLAN_RANK: Record<string, number> = { seed: 0, sprout: 1, grow: 2, thrive: 3, elevate: 4 }
const BADGE_OPTIONS = ['Popular', 'New', 'Best Value']

interface Props {
  providerId: string
  slug: string
  initialServices: ServiceItem[]
  plan: string
  onPreview?: () => void
}

export default function ServicesTab({ providerId, slug, initialServices, plan, onPreview }: Props) {
  const [services, setServices] = useState<ServiceItem[]>(initialServices)
  const [expanded, setExpanded]   = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState('')
  const [uploading, setUploading]   = useState<number | null>(null)

  const canUploadImages = (PLAN_RANK[plan] ?? 0) >= 2

  function update(index: number, field: keyof ServiceItem, value: string) {
    setServices(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
    setSaved(false)
  }

  function toggleBadge(index: number, badge: string) {
    setServices(prev => prev.map((s, i) =>
      i === index ? { ...s, badge: s.badge === badge ? undefined : badge } : s
    ))
    setSaved(false)
  }

  function add() {
    setServices(prev => [...prev, { name: '', description: '', price: '', duration_or_unit: '' }])
    setExpanded(services.length)
    setSaved(false)
  }

  function remove(index: number) {
    setServices(prev => prev.filter((_, i) => i !== index))
    if (expanded === index) setExpanded(null)
    else if (expanded !== null && expanded > index) setExpanded(expanded - 1)
    setSaved(false)
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...services]
    const swap = index + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[index], next[swap]] = [next[swap], next[index]]
    setServices(next)
    setSaved(false)
  }

  async function uploadImage(index: number, file: File) {
    setUploading(index)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('type', 'service')
      form.append('slug', slug)
      const res  = await fetch('/api/my-space/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setServices(prev => prev.map((s, i) => i === index ? { ...s, image_url: data.url } : s))
      setSaved(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(null)
    }
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/my-space/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, services }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
      onPreview?.()
    } catch {
      setError('Could not save — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto px-4 py-6 space-y-3">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-black text-[#0D0D0D]">My services</p>
            <p className="text-xs text-[#999] mt-0.5">Click a service to edit · add photos, price and details</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {saved && (
              <span className="flex items-center gap-1 text-xs text-[#22C55E] font-semibold">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="#22C55E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Draft saved
              </span>
            )}
            <button
              onClick={save}
              disabled={saving}
              className="px-3 py-2 rounded-lg text-xs font-black text-white bg-[#0D0D0D] disabled:opacity-40 hover:opacity-80 transition-opacity">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {error && <p className="text-red-500 text-xs px-1">{error}</p>}

        {/* Service cards */}
        {services.map((service, i) => {
          const isExpanded = expanded === i
          return (
            <div key={i} className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden hover:shadow-sm transition-shadow">

              {/* Collapsed row */}
              <div className="flex items-center gap-3 px-4 py-3">

                {/* Up / Down */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button onClick={() => move(i, -1)} disabled={i === 0}
                    className="w-5 h-5 flex items-center justify-center text-[#CCC] hover:text-[#0D0D0D] disabled:opacity-20 transition-colors">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2L1 7h8L5 2z" fill="currentColor"/></svg>
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === services.length - 1}
                    className="w-5 h-5 flex items-center justify-center text-[#CCC] hover:text-[#0D0D0D] disabled:opacity-20 transition-colors">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 8L1 3h8L5 8z" fill="currentColor"/></svg>
                  </button>
                </div>

                {/* Thumbnail */}
                {service.image_url ? (
                  <img src={service.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[#F5F5F5] flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="1" y="1" width="12" height="12" rx="2" stroke="#CCC" strokeWidth="1.2"/>
                      <circle cx="4.5" cy="4.5" r="1" fill="#CCC"/>
                      <path d="M1 9l3-3 2 2 3-4 4 5" stroke="#CCC" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}

                {/* Name + meta */}
                <button onClick={() => setExpanded(isExpanded ? null : i)} className="flex-1 text-left min-w-0">
                  <p className="text-sm font-black text-[#0D0D0D] leading-tight truncate">
                    {service.name || <span className="text-[#CCC] font-normal italic">Untitled service</span>}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {service.price && (
                      <span className="text-[10px] text-[#666] font-semibold">{service.price}</span>
                    )}
                    {service.duration_or_unit && (
                      <span className="text-[10px] text-[#999]">{service.duration_or_unit}</span>
                    )}
                    {service.badge && (
                      <span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[#F5A623]/10 text-[#EA8C00]">
                        {service.badge}
                      </span>
                    )}
                  </div>
                </button>

                {/* Chevron */}
                <svg
                  className="shrink-0 text-[#CCC] transition-transform duration-200"
                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 4.5l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>

                {/* Delete */}
                <button onClick={() => remove(i)}
                  className="shrink-0 w-6 h-6 flex items-center justify-center text-[#CCC] hover:text-red-400 transition-colors">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              {/* Expanded editor */}
              {isExpanded && (
                <div className="border-t border-[#F5F5F5] px-4 py-4 bg-[#FAFAFA] space-y-3">

                  {/* Image upload */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#999] mb-2">Photo</p>
                    {canUploadImages ? (
                      <div className="flex items-center gap-3 flex-wrap">
                        {service.image_url && (
                          <img src={service.image_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                        )}
                        <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-[#CCC] rounded-lg text-xs font-semibold text-[#666] hover:border-[#0D0D0D] hover:text-[#0D0D0D] transition-colors cursor-pointer">
                          {uploading === i ? (
                            <span className="text-[#999]">Uploading…</span>
                          ) : (
                            <>
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M6 1v7M3 4l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                              {service.image_url ? 'Change photo' : 'Upload photo'}
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            className="sr-only"
                            disabled={uploading === i}
                            onChange={e => {
                              const file = e.target.files?.[0]
                              if (file) uploadImage(i, file)
                              e.target.value = ''
                            }}
                          />
                        </label>
                        {service.image_url && (
                          <button
                            onClick={() => update(i, 'image_url', '')}
                            className="text-[10px] text-red-400 hover:text-red-600 transition-colors">
                            Remove
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FFF7ED] border border-[#F5A623]/20">
                        <span className="text-[10px] text-[#999]">
                          Photo upload requires <span className="font-semibold text-[#EA8C00]">Grow plan</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#999] block mb-1.5">Name</label>
                    <input
                      type="text"
                      value={service.name}
                      onChange={e => update(i, 'name', e.target.value)}
                      placeholder="e.g. Classic Facial"
                      className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#CCC] bg-white"
                    />
                  </div>

                  {/* Price + Duration */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#999] block mb-1.5">Price</label>
                      <input
                        type="text"
                        value={service.price ?? ''}
                        onChange={e => update(i, 'price', e.target.value)}
                        placeholder="₹800 or $45"
                        className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#CCC] bg-white"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#999] block mb-1.5">Duration / Unit</label>
                      <input
                        type="text"
                        value={service.duration_or_unit ?? ''}
                        onChange={e => update(i, 'duration_or_unit', e.target.value)}
                        placeholder="60 min · per kg"
                        className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#CCC] bg-white"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#999] block mb-1.5">Description</label>
                    <textarea
                      rows={3}
                      value={service.description}
                      onChange={e => update(i, 'description', e.target.value)}
                      placeholder="What's included, what to expect…"
                      className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#CCC] bg-white resize-none"
                    />
                  </div>

                  {/* Badge */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#999] mb-2">Badge</p>
                    <div className="flex gap-2 flex-wrap items-center">
                      {BADGE_OPTIONS.map(badge => (
                        <button key={badge}
                          onClick={() => toggleBadge(i, badge)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
                          style={{
                            background:  service.badge === badge ? '#F5A623' : 'white',
                            color:       service.badge === badge ? 'white'   : '#666',
                            borderColor: service.badge === badge ? '#F5A623' : '#E5E5E5',
                          }}>
                          {badge}
                        </button>
                      ))}
                      {service.badge && (
                        <button onClick={() => toggleBadge(i, service.badge as string)}
                          className="text-[10px] text-[#999] hover:text-red-400 transition-colors">
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>
          )
        })}

        {/* Add service */}
        <button onClick={add}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[#CCC] rounded-xl text-sm font-semibold text-[#666] hover:border-[#0D0D0D] hover:text-[#0D0D0D] transition-colors bg-white mt-2">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Add service
        </button>

        <p className="text-[10px] text-[#CCC] text-center pt-4 pb-2">
          Changes apply when you hit Save
        </p>
      </div>
    </div>
  )
}
