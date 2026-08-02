'use client'
import { useState } from 'react'
import type { ServiceItem, ServiceVariant } from '../[slug]/types'
import SmartImg from '../[slug]/components/SmartImg'

interface Props {
  providerId: string
  slug: string
  initialServices: ServiceItem[]
  plan: string
  /** Cheapest-first plan ids from getPlans() (DB sort_order) — same data
   * ServicesTab's hardcoded PLAN_RANK approximated, but read from the
   * actual plan catalogue instead of a duplicated rank map. */
  planOrder: string[]
  onPreview?: () => void
}

const emptyVariant = (): ServiceVariant => ({ size: '', price: '' })
const emptyIdol = (): ServiceItem => ({
  name: '', description: '', duration_or_unit: null, variants: [emptyVariant()],
})

export default function IdolsTab({ providerId, slug, initialServices, plan, planOrder, onPreview }: Props) {
  const [idols, setIdols] = useState<ServiceItem[]>(
    initialServices.length > 0 ? initialServices : [emptyIdol()]
  )
  const [expanded, setExpanded] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState('')
  const [uploading, setUploading] = useState<number | null>(null)

  // DB-driven equivalent of ServicesTab's hardcoded PLAN_RANK — Grow is the
  // entry tier that unlocks photo upload everywhere else in MyKryla, so the
  // same threshold applies here rather than inventing a new feature_key.
  const growIdx = planOrder.indexOf('grow')
  const planIdx = planOrder.indexOf(plan)
  const canUploadImages = growIdx === -1 || planIdx === -1 ? true : planIdx >= growIdx

  function updateIdol(index: number, field: 'name' | 'description' | 'badge', value: string) {
    setIdols(prev => prev.map((idol, i) => i === index ? { ...idol, [field]: value } : idol))
    setSaved(false)
  }

  function addIdol() {
    setIdols(prev => [...prev, emptyIdol()])
    setExpanded(idols.length)
    setSaved(false)
  }

  function removeIdol(index: number) {
    const url = idols[index]?.image_url
    setIdols(prev => prev.filter((_, i) => i !== index))
    if (expanded === index) setExpanded(null)
    else if (expanded !== null && expanded > index) setExpanded(expanded - 1)
    setSaved(false)
    if (url) {
      fetch('/api/mychat/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'service', slug, url }),
      }).catch(() => {}) // non-fatal — card is already removed from state
    }
  }

  function moveIdol(index: number, dir: -1 | 1) {
    const next = [...idols]
    const swap = index + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[index], next[swap]] = [next[swap], next[index]]
    setIdols(next)
    setSaved(false)
  }

  async function uploadImage(index: number, file: File) {
    setUploading(index)
    setError('')
    try {
      const oldUrl = idols[index]?.image_url
      const form = new FormData()
      form.append('file', file)
      form.append('type', 'service')
      form.append('slug', slug)
      if (oldUrl) form.append('oldUrl', oldUrl)
      const res  = await fetch('/api/mychat/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setIdols(prev => prev.map((idol, i) => i === index ? { ...idol, image_url: data.url } : idol))
      setSaved(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(null)
    }
  }

  async function removeIdolImage(index: number) {
    const url = idols[index]?.image_url
    setIdols(prev => prev.map((idol, i) => i === index ? { ...idol, image_url: null } : idol))
    setSaved(false)
    if (!url) return
    try {
      await fetch('/api/mychat/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'service', slug, url }),
      })
    } catch {
      // Non-fatal — the field is already cleared; a stray file can be swept later.
    }
  }

  // ── Variant (size) helpers ──────────────────────────────────────────────
  function updateVariant(idolIndex: number, variantIndex: number, field: keyof ServiceVariant, value: string) {
    setIdols(prev => prev.map((idol, i) => {
      if (i !== idolIndex) return idol
      const variants = (idol.variants ?? []).map((v, vi) =>
        vi === variantIndex ? { ...v, [field]: value } : v
      )
      return { ...idol, variants }
    }))
    setSaved(false)
  }

  function addVariant(idolIndex: number) {
    setIdols(prev => prev.map((idol, i) =>
      i === idolIndex ? { ...idol, variants: [...(idol.variants ?? []), emptyVariant()] } : idol
    ))
    setSaved(false)
  }

  function removeVariant(idolIndex: number, variantIndex: number) {
    setIdols(prev => prev.map((idol, i) => {
      if (i !== idolIndex) return idol
      const variants = (idol.variants ?? []).filter((_, vi) => vi !== variantIndex)
      // Never leave an idol with zero variants — nothing would be
      // purchasable and getVariants() would show nothing on the public page.
      return { ...idol, variants: variants.length > 0 ? variants : [emptyVariant()] }
    }))
    setSaved(false)
  }

  function updateVariantIncludes(idolIndex: number, variantIndex: number, raw: string) {
    // One line per include item — matches how the seller naturally types a
    // checklist, converted to the string[] the public page expects.
    const includes = raw.split('\n').map(s => s.trim()).filter(Boolean)
    setIdols(prev => prev.map((idol, i) => {
      if (i !== idolIndex) return idol
      const variants = (idol.variants ?? []).map((v, vi) =>
        vi === variantIndex ? { ...v, includes: includes.length > 0 ? includes : null } : v
      )
      return { ...idol, variants }
    }))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      // Drop fully-empty variants (no size, no price) before saving — the
      // seller may leave a freshly-added variant row blank.
      const cleaned = idols.map(idol => ({
        ...idol,
        variants: (idol.variants ?? []).filter(v => v.size.trim() || v.price.trim()),
      })).map(idol => ({
        ...idol,
        variants: idol.variants!.length > 0 ? idol.variants : [emptyVariant()],
      }))

      const res = await fetch('/api/mychat/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, services: cleaned }),
      })
      if (!res.ok) throw new Error('Save failed')
      setIdols(cleaned)
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
            <p className="text-sm font-black text-[#0D0D0D]">My idols</p>
            <p className="text-xs text-[#999] mt-0.5">Click an idol to edit · add a photo and sizes with pricing</p>
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

        {/* Idol cards */}
        {idols.map((idol, i) => {
          const isExpanded = expanded === i
          const variants = idol.variants ?? []
          return (
            <div key={i} className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden hover:shadow-sm transition-shadow">

              {/* Collapsed row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button onClick={() => moveIdol(i, -1)} disabled={i === 0}
                    className="w-5 h-5 flex items-center justify-center text-[#CCC] hover:text-[#0D0D0D] disabled:opacity-20 transition-colors">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2L1 7h8L5 2z" fill="currentColor"/></svg>
                  </button>
                  <button onClick={() => moveIdol(i, 1)} disabled={i === idols.length - 1}
                    className="w-5 h-5 flex items-center justify-center text-[#CCC] hover:text-[#0D0D0D] disabled:opacity-20 transition-colors">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 8L1 3h8L5 8z" fill="currentColor"/></svg>
                  </button>
                </div>

                {idol.image_url ? (
                  <SmartImg src={idol.image_url} className="w-10 h-10 rounded-lg shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[#F5F5F5] flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="1" y="1" width="12" height="12" rx="2" stroke="#CCC" strokeWidth="1.2"/>
                      <circle cx="4.5" cy="4.5" r="1" fill="#CCC"/>
                      <path d="M1 9l3-3 2 2 3-4 4 5" stroke="#CCC" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}

                <button onClick={() => setExpanded(isExpanded ? null : i)} className="flex-1 text-left min-w-0">
                  <p className="text-sm font-black text-[#0D0D0D] leading-tight truncate">
                    {idol.name || <span className="text-[#CCC] font-normal italic">Untitled idol</span>}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {variants.length > 0 && (
                      <span className="text-[10px] text-[#666] font-semibold">
                        {variants.length} size{variants.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {variants.filter(v => v.price.trim()).map(v => v.price).slice(0, 1).map((p, pi) => (
                      <span key={pi} className="text-[10px] text-[#999]">from {p}</span>
                    ))}
                  </div>
                </button>

                <svg
                  className="shrink-0 text-[#CCC] transition-transform duration-200"
                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 4.5l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>

                <button onClick={() => removeIdol(i)}
                  className="shrink-0 w-6 h-6 flex items-center justify-center text-[#CCC] hover:text-red-400 transition-colors">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              {/* Expanded editor */}
              {isExpanded && (
                <div className="border-t border-[#F5F5F5] px-4 py-4 bg-[#FAFAFA] space-y-4">

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#999] mb-2">Photo</p>
                    {canUploadImages ? (
                      <div className="flex items-center gap-3 flex-wrap">
                        {idol.image_url && <SmartImg src={idol.image_url} className="w-16 h-16 rounded-lg" />}
                        <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-[#CCC] rounded-lg text-xs font-semibold text-[#666] hover:border-[#0D0D0D] hover:text-[#0D0D0D] transition-colors cursor-pointer">
                          {uploading === i ? <span className="text-[#999]">Uploading…</span> : (
                            <>
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M6 1v7M3 4l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                              {idol.image_url ? 'Change photo' : 'Upload photo'}
                            </>
                          )}
                          <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="sr-only"
                            disabled={uploading === i}
                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(i, f); e.target.value = '' }} />
                        </label>
                        {idol.image_url && (
                          <button onClick={() => removeIdolImage(i)} className="text-[10px] text-red-400 hover:text-red-600 transition-colors">Remove</button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FFF7ED] border border-[#F5A623]/20">
                        <span className="text-[10px] text-[#999]">Photo upload requires <span className="font-semibold text-[#EA8C00]">Grow plan</span></span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#999] block mb-1.5">Name</label>
                    <input type="text" value={idol.name} onChange={e => updateIdol(i, 'name', e.target.value)}
                      placeholder="e.g. Natural Shadu Ganesh"
                      className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#CCC] bg-white" />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#999] block mb-1.5">Description</label>
                    <textarea rows={2} value={idol.description} onChange={e => updateIdol(i, 'description', e.target.value)}
                      placeholder="Finish, material, what makes it special…"
                      className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#CCC] bg-white resize-none" />
                  </div>

                  {/* Sizes / variants */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#999] mb-2">Sizes &amp; pricing</p>
                    <div className="space-y-2">
                      {variants.map((variant, vi) => (
                        <div key={vi} className="border border-[#E5E5E5] rounded-lg p-3 bg-white space-y-2">
                          <div className="flex gap-2 items-start">
                            <div className="flex-1">
                              <label className="text-[9px] font-black uppercase tracking-widest text-[#999] block mb-1">Size</label>
                              <input type="text" value={variant.size}
                                onChange={e => updateVariant(i, vi, 'size', e.target.value)}
                                placeholder="1 ft"
                                className="w-full border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#CCC]" />
                            </div>
                            <div className="flex-1">
                              <label className="text-[9px] font-black uppercase tracking-widest text-[#999] block mb-1">Price</label>
                              <input type="text" value={variant.price}
                                onChange={e => updateVariant(i, vi, 'price', e.target.value)}
                                placeholder="₹3,000"
                                className="w-full border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#CCC]" />
                            </div>
                            <button onClick={() => removeVariant(i, vi)}
                              disabled={variants.length === 1}
                              className="shrink-0 mt-5 w-7 h-7 flex items-center justify-center text-[#CCC] hover:text-red-400 disabled:opacity-20 transition-colors">
                              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                              </svg>
                            </button>
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-[#999] block mb-1">
                              Includes for this size <span className="font-normal normal-case">(optional, one per line)</span>
                            </label>
                            <textarea rows={2} value={(variant.includes ?? []).join('\n')}
                              onChange={e => updateVariantIncludes(i, vi, e.target.value)}
                              placeholder={'Clay base\nColours\nPadded shipping'}
                              className="w-full border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 text-xs text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#CCC] resize-none" />
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => addVariant(i)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 mt-2 border border-dashed border-[#CCC] rounded-lg text-xs font-semibold text-[#666] hover:border-[#0D0D0D] hover:text-[#0D0D0D] transition-colors bg-white">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                      Add size
                    </button>
                  </div>

                </div>
              )}
            </div>
          )
        })}

        <button onClick={addIdol}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[#CCC] rounded-xl text-sm font-semibold text-[#666] hover:border-[#0D0D0D] hover:text-[#0D0D0D] transition-colors bg-white mt-2">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Add idol
        </button>

        <p className="text-[10px] text-[#CCC] text-center pt-4 pb-2">
          Changes apply when you hit Save
        </p>
      </div>
    </div>
  )
}
