'use client'
import { useState, useRef } from 'react'
import type { SectionStyle } from '../[slug]/types'

export interface SectionEntry {
  sectionKey: string
  variant: string
  order: number
  style?: SectionStyle
}

interface SectionMeta {
  label: string
  icon: string
  variants: { key: string; label: string }[]
}

const SECTION_META: Record<string, SectionMeta> = {
  hero: {
    label: 'Hero',
    icon: '◆',
    variants: [
      { key: 'auto',     label: 'Auto — smart pick' },
      { key: 'photo',    label: 'Photo — full bleed' },
      { key: 'split',    label: 'Split — text + photo' },
      { key: 'centered', label: 'Centered — everything centered' },
      { key: 'dark',     label: 'Dark — black background' },
      { key: 'gradient', label: 'Gradient — soft aurora' },
      { key: 'banner',   label: 'Banner — accent header' },
      { key: 'minimal',  label: 'Minimal — clean left-aligned' },
    ],
  },
  services: {
    label: 'Services',
    icon: '◈',
    variants: [
      { key: 'list',     label: 'List — stacked rows' },
      { key: 'grid',     label: 'Grid — 2-column cards' },
      { key: 'menu',     label: 'Menu — price-forward' },
      { key: 'pricing',  label: 'Pricing — bold cards' },
      { key: 'features', label: 'Features — detailed cards' },
    ],
  },
  highlights: {
    label: 'Highlights',
    icon: '◉',
    variants: [
      { key: 'icons',    label: 'Icons — 3-column emoji' },
      { key: 'cards',    label: 'Cards — bordered cards' },
      { key: 'stats',    label: 'Stats — big number cards' },
      { key: 'numbered', label: 'Numbered — step-by-step' },
      { key: 'strip',    label: 'Strip — horizontal scroll' },
    ],
  },
  bio: {
    label: 'About',
    icon: '◎',
    variants: [
      { key: 'paragraph', label: 'Paragraph — plain text' },
      { key: 'accent',    label: 'Accent — left colour bar' },
      { key: 'callout',   label: 'Callout — tinted quote box' },
      { key: 'dark',      label: 'Dark — black background' },
    ],
  },
  gallery: {
    label: 'Gallery',
    icon: '▦',
    variants: [
      { key: 'grid',     label: 'Grid — uniform squares' },
      { key: 'featured', label: 'Featured — hero + thumbnails' },
      { key: 'masonry',  label: 'Masonry — variable heights' },
      { key: 'scroll',   label: 'Scroll — horizontal strip' },
    ],
  },
  faq: {
    label: 'FAQ',
    icon: '◐',
    variants: [
      { key: 'accordion', label: 'Accordion — expand/collapse' },
      { key: 'twocol',    label: 'Two column — always visible' },
    ],
  },
  contact: {
    label: 'Contact',
    icon: '◌',
    variants: [
      { key: 'both',      label: 'Form + WhatsApp' },
      { key: 'form',      label: 'Booking form only' },
      { key: 'whatsapp',  label: 'WhatsApp only' },
      { key: 'minimal',   label: 'Minimal — link cards' },
      { key: 'dark',      label: 'Dark — black background' },
    ],
  },
}

const ALL_KEYS = Object.keys(SECTION_META)

const BG_PRESETS = [
  { id: 'white',        value: '#FFFFFF', dark: false },
  { id: 'warm-cream',   value: '#FFF8ED', dark: false },
  { id: 'cool-linen',   value: '#F5F5F0', dark: false },
  { id: 'ivory',        value: '#FFFFF0', dark: false },
  { id: 'sand',         value: '#F5E6D3', dark: false },
  { id: 'rose-blush',   value: '#FDE8E8', dark: false },
  { id: 'lavender',     value: '#EDE9FE', dark: false },
  { id: 'forest-mist',  value: '#E6F4EA', dark: false },
  { id: 'ocean',        value: '#E0F2FE', dark: false },
  { id: 'slate-blue',   value: '#3B5B8C', dark: true  },
  { id: 'sage',         value: '#6B8F71', dark: true  },
  { id: 'terracotta',   value: '#C1714F', dark: true  },
  { id: 'amber-glow',   value: '#D4860B', dark: true  },
  { id: 'steel',        value: '#4A5568', dark: true  },
  { id: 'charcoal',     value: '#2D3748', dark: true  },
  { id: 'midnight',     value: '#0D0D0D', dark: true  },
] as const

const PHOTO_BG_KEYS = new Set(['hero', 'services', 'highlights', 'bio'])
const PLAN_RANK: Record<string, number> = { seed: 0, sprout: 1, grow: 2, thrive: 3, elevate: 4 }

interface Props {
  providerId: string
  slug: string
  initialSections: SectionEntry[]
  plan: string
}

export default function SectionsTab({ providerId, slug, initialSections, plan }: Props) {
  const [sections, setSections] = useState<SectionEntry[]>(
    [...initialSections].sort((a, b) => a.order - b.order)
  )
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState('')
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const rank     = PLAN_RANK[plan ?? 'seed'] ?? 0
  const isSeed   = rank < 1
  const isGrow   = rank >= 2

  const activeKeys = sections.map(s => s.sectionKey)
  const available  = ALL_KEYS.filter(k => !activeKeys.includes(k))

  function move(index: number, dir: -1 | 1) {
    const next = [...sections]
    const swap = index + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[index], next[swap]] = [next[swap], next[index]]
    setSections(next.map((s, i) => ({ ...s, order: i + 1 })))
    setSaved(false)
  }

  function setVariant(sectionKey: string, variant: string) {
    setSections(prev => prev.map(s => s.sectionKey === sectionKey ? { ...s, variant } : s))
    setSaved(false)
  }

  function updateStyle(sectionKey: string, update: (s: SectionStyle) => SectionStyle) {
    setSections(prev => prev.map(s =>
      s.sectionKey === sectionKey ? { ...s, style: update(s.style ?? {}) } : s
    ))
    setSaved(false)
  }

  function setBgColor(sectionKey: string, value: string | null) {
    if (value === null) {
      updateStyle(sectionKey, s => { const n = { ...s }; delete n.bg; return n })
    } else {
      updateStyle(sectionKey, s => ({ ...s, bg: { type: 'color' as const, value } }))
    }
  }

  function clearBgPhoto(sectionKey: string) {
    updateStyle(sectionKey, s => { const n = { ...s }; delete n.bg; return n })
  }

  async function uploadBgPhoto(sectionKey: string, file: File) {
    setUploading(prev => ({ ...prev, [sectionKey]: true }))
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'section-bg')
      fd.append('slug', slug)
      const res = await fetch('/api/my-space/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Upload failed'); return }
      updateStyle(sectionKey, s => ({ ...s, bg: { type: 'photo' as const, value: data.url } }))
    } catch {
      setError('Upload failed — please try again')
    } finally {
      setUploading(prev => ({ ...prev, [sectionKey]: false }))
    }
  }

  function remove(sectionKey: string) {
    setSections(prev =>
      prev.filter(s => s.sectionKey !== sectionKey).map((s, i) => ({ ...s, order: i + 1 }))
    )
    if (expanded === sectionKey) setExpanded(null)
    setSaved(false)
  }

  function add(sectionKey: string) {
    const meta     = SECTION_META[sectionKey]
    const defaultV = meta?.variants[0]?.key ?? 'auto'
    setSections(prev => [
      ...prev,
      { sectionKey, variant: sectionKey === 'hero' ? 'auto' : defaultV, order: prev.length + 1 },
    ])
    setExpanded(sectionKey)
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/my-space/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, sections }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
    } catch {
      setError('Could not save — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto px-4 py-6 space-y-2">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-black text-[#0D0D0D]">Page sections</p>
            <p className="text-xs text-[#999] mt-0.5">Reorder · pick layout · style backgrounds</p>
          </div>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1 text-xs text-[#22C55E] font-semibold">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="#22C55E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Saved
              </span>
            )}
            <a href={`/${slug}/preview`} target="_blank" rel="noopener noreferrer"
              className="text-xs font-semibold text-[#F5A623] hover:underline">
              Preview ↗
            </a>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-xs font-black text-white bg-[#0D0D0D] disabled:opacity-40 hover:opacity-80 transition-opacity">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {/* Seed upgrade nudge */}
        {isSeed && (
          <div className="bg-[#FFF7ED] border border-[#F5A623]/30 rounded-xl px-4 py-3 mb-2">
            <p className="text-xs font-semibold text-[#0D0D0D] mb-1">
              🌿 Upgrade to Sprout to style sections
            </p>
            <p className="text-xs text-[#666]">
              Set background colours and photos on each section of your page.
            </p>
          </div>
        )}

        {error && <p className="text-red-500 text-xs px-1">{error}</p>}

        {/* Section cards */}
        {sections.map((s, i) => {
          const meta          = SECTION_META[s.sectionKey]
          const isExpanded    = expanded === s.sectionKey
          const variantLabel  = meta?.variants.find(v => v.key === s.variant)?.label ?? s.variant
          const currentBg     = s.style?.bg
          const currentFrames = s.style?.frames
          const isUploading   = uploading[s.sectionKey] ?? false

          return (
            <div key={s.sectionKey}
              className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden transition-shadow hover:shadow-sm">

              {/* Card row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => move(i, -1)} disabled={i === 0}
                    className="w-5 h-5 flex items-center justify-center text-[#CCC] hover:text-[#0D0D0D] disabled:opacity-20 transition-colors">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2L1 7h8L5 2z" fill="currentColor"/></svg>
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === sections.length - 1}
                    className="w-5 h-5 flex items-center justify-center text-[#CCC] hover:text-[#0D0D0D] disabled:opacity-20 transition-colors">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 8L1 3h8L5 8z" fill="currentColor"/></svg>
                  </button>
                </div>

                <button
                  onClick={() => setExpanded(isExpanded ? null : s.sectionKey)}
                  className="flex-1 flex items-center gap-3 text-left">
                  {/* BG preview dot */}
                  <span
                    className="w-5 h-5 shrink-0 rounded-full border border-[#E5E5E5] flex items-center justify-center text-[10px] text-[#999] overflow-hidden"
                    style={
                      currentBg?.type === 'color'
                        ? { background: currentBg.value, borderColor: 'transparent' }
                        : currentBg?.type === 'photo'
                        ? { backgroundImage: `url(${currentBg.value})`, backgroundSize: 'cover', borderColor: 'transparent' }
                        : undefined
                    }>
                    {!currentBg && meta?.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-[#0D0D0D] leading-tight">{meta?.label}</p>
                    <p className="text-[10px] text-[#999] truncate leading-tight">{variantLabel}</p>
                  </div>
                  <svg
                    className="ml-auto shrink-0 text-[#CCC] transition-transform duration-200"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 4.5l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {s.sectionKey !== 'hero' && (
                  <button onClick={() => remove(s.sectionKey)}
                    className="shrink-0 w-6 h-6 flex items-center justify-center text-[#CCC] hover:text-red-400 transition-colors rounded">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Expanded panel */}
              {isExpanded && meta && (
                <div className="border-t border-[#F0F0F0] bg-[#FAFAFA]">

                  {/* Layout variants */}
                  <div className="px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#999] mb-2.5">Layout</p>
                    <div className="flex flex-wrap gap-1.5">
                      {meta.variants.map(v => (
                        <button key={v.key}
                          onClick={() => setVariant(s.sectionKey, v.key)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
                          style={{
                            background:  s.variant === v.key ? '#0D0D0D' : 'white',
                            color:       s.variant === v.key ? 'white'   : '#444',
                            borderColor: s.variant === v.key ? '#0D0D0D' : '#E5E5E5',
                          }}>
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Background styling */}
                  <div className={`border-t border-[#F0F0F0] px-4 py-3 ${isSeed ? 'opacity-50 pointer-events-none select-none' : ''}`}>
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#999]">Background</p>
                      {currentBg && !isSeed && (
                        <button
                          onClick={() => setBgColor(s.sectionKey, null)}
                          className="text-[10px] font-semibold text-[#999] hover:text-red-400 transition-colors">
                          Reset
                        </button>
                      )}
                    </div>

                    {/* 16 colour swatches */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {BG_PRESETS.map(preset => {
                        const active = currentBg?.type === 'color' && currentBg.value === preset.value
                        return (
                          <button
                            key={preset.id}
                            title={preset.id.replace(/-/g, ' ')}
                            onClick={() => setBgColor(s.sectionKey, active ? null : preset.value)}
                            className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110 active:scale-95"
                            style={{
                              background:  preset.value,
                              borderColor: active ? '#0D0D0D' : preset.value === '#FFFFFF' ? '#E5E5E5' : 'transparent',
                              boxShadow:   active ? '0 0 0 2px rgba(0,0,0,0.15)' : undefined,
                            }}
                          />
                        )
                      })}
                    </div>

                    {/* Photo upload (hero / services / highlights / bio) */}
                    {PHOTO_BG_KEYS.has(s.sectionKey) && (
                      <>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          ref={el => { fileRefs.current[s.sectionKey] = el }}
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (file) uploadBgPhoto(s.sectionKey, file)
                            e.target.value = ''
                          }}
                        />
                        {currentBg?.type === 'photo' ? (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#E5E5E5] shrink-0">
                              <img src={currentBg.value} alt="" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-[10px] text-[#666] flex-1">Photo background</span>
                            <button onClick={() => clearBgPhoto(s.sectionKey)}
                              className="text-[10px] font-semibold text-red-400 hover:text-red-600 transition-colors">
                              Remove
                            </button>
                            <button onClick={() => fileRefs.current[s.sectionKey]?.click()}
                              className="text-[10px] font-semibold text-[#666] hover:text-[#0D0D0D] transition-colors">
                              Change
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => fileRefs.current[s.sectionKey]?.click()}
                            disabled={isUploading}
                            className="flex items-center gap-2 text-xs font-semibold text-[#666] border border-dashed border-[#CCC] rounded-lg px-3 py-2 hover:border-[#0D0D0D] hover:text-[#0D0D0D] transition-colors disabled:opacity-50 w-full">
                            {isUploading
                              ? <div className="w-3 h-3 border-2 border-[#0D0D0D] border-t-transparent rounded-full animate-spin" />
                              : <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                </svg>
                            }
                            {isUploading ? 'Uploading…' : 'Add photo background'}
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Moving frames — hero only, Grow+ */}
                  {s.sectionKey === 'hero' && (
                    <div className={`border-t border-[#F0F0F0] px-4 py-3 ${!isGrow ? 'opacity-50 pointer-events-none select-none' : ''}`}>
                      <div className="flex items-center justify-between mb-2.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#999]">Moving Frames</p>
                        {!isGrow && (
                          <span className="text-[9px] font-bold text-[#F5A623] bg-[#FFF7ED] px-2 py-0.5 rounded uppercase tracking-wide">
                            Grow+
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Toggle */}
                        <button
                          onClick={() => updateStyle(s.sectionKey, st => ({
                            ...st,
                            frames: { enabled: !(currentFrames?.enabled ?? true), count: currentFrames?.count ?? 2 },
                          }))}
                          className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
                            (currentFrames?.enabled ?? true) ? 'bg-[#0D0D0D]' : 'bg-[#E5E5E5]'
                          }`}>
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                            (currentFrames?.enabled ?? true) ? 'translate-x-4' : 'translate-x-0'
                          }`} />
                        </button>
                        <span className="text-xs text-[#666]">
                          {(currentFrames?.enabled ?? true) ? 'On' : 'Off'}
                        </span>
                        {(currentFrames?.enabled ?? true) && (
                          <div className="flex items-center gap-1.5 ml-auto">
                            <span className="text-[10px] text-[#999]">Frames:</span>
                            {([1, 2, 3] as const).map(n => (
                              <button key={n}
                                onClick={() => updateStyle(s.sectionKey, st => ({
                                  ...st,
                                  frames: { enabled: true, count: n },
                                }))}
                                className="w-6 h-6 text-[10px] font-black rounded-md border transition-all"
                                style={{
                                  background:  (currentFrames?.count ?? 2) === n ? '#0D0D0D' : 'white',
                                  color:       (currentFrames?.count ?? 2) === n ? 'white'   : '#666',
                                  borderColor: (currentFrames?.count ?? 2) === n ? '#0D0D0D' : '#E5E5E5',
                                }}>
                                {n}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Add section */}
        {available.length > 0 && (
          <div className="pt-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#999] mb-2.5 px-1">Add section</p>
            <div className="flex flex-wrap gap-2">
              {available.map(key => (
                <button key={key} onClick={() => add(key)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-dashed border-[#CCC] text-[#666] hover:border-[#0D0D0D] hover:text-[#0D0D0D] transition-colors bg-white">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                  {SECTION_META[key]?.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-[#CCC] text-center pt-6 pb-2">
          Changes apply when you hit Save
        </p>
      </div>
    </div>
  )
}
