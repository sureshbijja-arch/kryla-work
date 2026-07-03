'use client'

import { useState, useEffect } from 'react'
import {
  ACCENT, PAGE_BG, TEMPLATE_LABEL, FONT_LABEL, PERSONAS,
  type TemplateKey, type PaletteKey, type FontKey,
} from '@/lib/layouts'

// ── Types ──────────────────────────────────────────────────────────────────

interface Preset {
  id:          string
  persona:     string
  name:        string
  description: string
  template:    string
  palette:     string
  font:        string
  sort_order:  number
  active:      boolean
  image_url:   string | null
  sections:    SectionEntry[] | null
  created_at:  string
}

interface SectionEntry {
  sectionKey: string
  variant:    string
  order:      number
}

interface SectionType {
  key:      string
  label:    string
  variants: { key: string; label: string }[]
}

interface FormState {
  persona:     string
  name:        string
  description: string
  template:    string
  palette:     string
  font:        string
  sort_order:  string
  imageUrl:    string
  useSections: boolean
  sections:    SectionEntry[]
}

const BLANK_FORM: FormState = {
  persona: 'tutor', name: '', description: '',
  template: 'focus', palette: 'professional', font: 'inter',
  sort_order: '0', imageUrl: '',
  useSections: false, sections: [],
}

const PERSONA_COLOUR: Record<string, string> = {
  tutor: '#3B82F6', trainer: '#22C55E', baker: '#EA8C00', photographer: '#6B7280',
  salon: '#9333EA', chef: '#F97316', doctor: '#06B6D4', musician: '#EC4899',
  other: '#6B7280', all: '#64748B',
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AdminLayoutsPage() {
  const [presets, setPresets]             = useState<Preset[]>([])
  const [sectionTypes, setSectionTypes]   = useState<SectionType[]>([])
  const [filterPersona, setFilterPersona] = useState('all')
  const [editingId, setEditingId]         = useState<string | null>(null)
  const [editForm, setEditForm]           = useState<FormState>(BLANK_FORM)
  const [showCreate, setShowCreate]       = useState(false)
  const [createForm, setCreateForm]       = useState<FormState>(BLANK_FORM)
  const [saving, setSaving]               = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState('')

  useEffect(() => {
    load(); loadSectionTypes()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    setError('')
    const res = await fetch('/api/admin/layouts')
    if (res.status === 401) { window.location.href = '/admin'; return }
    if (res.status === 403) { setError('Not authorized'); setLoading(false); return }
    const data = await res.json()
    setPresets(data.presets ?? [])
    setLoading(false)
  }

  async function loadSectionTypes() {
    try {
      const res = await fetch('/api/admin/layouts/sections')
      if (res.ok) {
        const data = await res.json()
        setSectionTypes(data.sections ?? [])
      }
    } catch { /* non-fatal */ }
  }

  function formPayload(form: FormState) {
    return {
      persona:     form.persona,
      name:        form.name,
      description: form.description,
      template:    form.template,
      palette:     form.palette,
      font:        form.font,
      sort_order:  Number(form.sort_order),
      image_url:   form.imageUrl || null,
      sections:    form.useSections && form.sections.length > 0 ? form.sections : null,
    }
  }

  async function handleCreate() {
    setSaving(true); setError('')
    const res = await fetch('/api/admin/layouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formPayload(createForm)),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Failed to create'); return }
    setPresets(prev => [...prev, data.preset].sort(sortFn))
    setCreateForm(BLANK_FORM)
    setShowCreate(false)
  }

  async function handleUpdate(id: string) {
    setSaving(true); setError('')
    const res = await fetch(`/api/admin/layouts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formPayload(editForm)),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Failed to update'); return }
    setPresets(prev => prev.map(p => p.id === id ? data.preset : p).sort(sortFn))
    setEditingId(null)
  }

  async function handleToggleActive(p: Preset) {
    const res = await fetch(`/api/admin/layouts/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !p.active }),
    })
    if (res.ok) setPresets(prev => prev.map(x => x.id === p.id ? { ...x, active: !p.active } : x))
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/layouts/${id}`, { method: 'DELETE' })
    if (res.ok) { setPresets(prev => prev.filter(p => p.id !== id)); setDeleteConfirm(null) }
  }

  const sortFn = (a: Preset, b: Preset) =>
    a.persona.localeCompare(b.persona) || a.sort_order - b.sort_order

  const visible = filterPersona === 'all'
    ? presets
    : presets.filter(p => p.persona === filterPersona)

  if (loading) {
    return <div className="max-w-4xl mx-auto py-20 text-center text-sm text-[#999]">Loading…</div>
  }

  if (error && presets.length === 0) {
    return <div className="max-w-4xl mx-auto py-20 text-center text-sm text-red-500">{error}</div>
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#0D0D0D]">Layout Presets</h1>
          <p className="text-sm text-[#666] mt-0.5">{presets.length} presets · {presets.filter(p => p.active).length} active</p>
        </div>
        <button onClick={() => { setShowCreate(v => !v); setError('') }}
          className="bg-[#0D0D0D] text-white text-sm font-semibold rounded-xl px-4 py-2 hover:opacity-80 transition-opacity">
          {showCreate ? 'Cancel' : '+ New preset'}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* Create form */}
      {showCreate && (
        <div className="border border-[#E5E5E5] rounded-2xl p-5 mb-6 bg-[#FAFAFA]">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D] mb-4">New preset</p>
          <PresetForm
            form={createForm}
            onChange={setCreateForm}
            onUpload={url => setCreateForm(f => ({ ...f, imageUrl: url }))}
            sectionTypes={sectionTypes}
          />
          <button onClick={handleCreate} disabled={saving || !createForm.name.trim()}
            className="mt-4 bg-[#0D0D0D] text-white text-sm font-semibold rounded-xl px-5 py-2.5 disabled:opacity-40 hover:opacity-80 transition-opacity">
            {saving ? 'Saving…' : 'Create preset'}
          </button>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs font-semibold text-[#666]">Filter:</span>
        {['all', ...PERSONAS].map(p => (
          <button key={p} onClick={() => setFilterPersona(p)}
            className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
              filterPersona === p
                ? 'bg-[#0D0D0D] text-white border-[#0D0D0D]'
                : 'border-[#E5E5E5] text-[#666] hover:border-[#0D0D0D] hover:text-[#0D0D0D]'
            }`}>
            {p}
          </button>
        ))}
      </div>

      {/* Preset list */}
      <div className="space-y-2">
        {visible.length === 0 && (
          <p className="text-sm text-[#999] py-8 text-center">No presets for this filter.</p>
        )}
        {visible.map(p => (
          <div key={p.id} className={`border rounded-2xl overflow-hidden transition-all ${
            p.active ? 'border-[#E5E5E5]' : 'border-[#E5E5E5] opacity-50'
          }`}>
            {editingId === p.id ? (
              <div className="p-4 bg-[#FAFAFA]">
                <PresetForm
                  form={editForm}
                  onChange={setEditForm}
                  onUpload={url => setEditForm(f => ({ ...f, imageUrl: url }))}
                  sectionTypes={sectionTypes}
                />
                <div className="flex gap-2 mt-4">
                  <button onClick={() => handleUpdate(p.id)} disabled={saving}
                    className="bg-[#0D0D0D] text-white text-sm font-semibold rounded-xl px-4 py-2 disabled:opacity-40 hover:opacity-80 transition-opacity">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditingId(null)}
                    className="text-sm text-[#666] hover:text-[#0D0D0D] px-4 py-2">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4">
                {/* Thumbnail or colour swatch */}
                <div className="shrink-0 w-14 h-10 rounded-xl overflow-hidden border border-[#E5E5E5]">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <div style={{ background: ACCENT[p.palette as PaletteKey] ?? '#ccc' }} className="h-3 w-full" />
                      <div style={{ background: PAGE_BG[p.palette as PaletteKey] ?? '#fff' }} className="h-7 w-full" />
                    </>
                  )}
                </div>

                {/* Meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[#0D0D0D]">{p.name}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 text-white"
                      style={{ background: PERSONA_COLOUR[p.persona] ?? '#6B7280' }}>
                      {p.persona}
                    </span>
                    {p.sections && p.sections.length > 0 && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 bg-[#0D0D0D] text-white">
                        {p.sections.length} sections
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#888] mt-0.5">{p.description}</p>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {[TEMPLATE_LABEL[p.template as TemplateKey], p.palette, FONT_LABEL[p.font as FontKey]].map(tag => (
                      <span key={tag} className="text-[9px] font-semibold uppercase tracking-wide bg-[#F0F0F0] text-[#666] rounded px-1.5 py-0.5">
                        {tag}
                      </span>
                    ))}
                    {p.sections && p.sections.length > 0 && (
                      <span className="text-[9px] font-semibold uppercase tracking-wide bg-[#EFF6FF] text-[#3B82F6] rounded px-1.5 py-0.5">
                        {p.sections.map(s => s.sectionKey).join(' › ')}
                      </span>
                    )}
                    <span className="text-[9px] font-semibold uppercase tracking-wide bg-[#F0F0F0] text-[#666] rounded px-1.5 py-0.5">
                      order {p.sort_order}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-2">
                  <button onClick={() => handleToggleActive(p)} title={p.active ? 'Deactivate' : 'Activate'}
                    className={`w-9 h-5 rounded-full transition-colors relative ${p.active ? 'bg-[#22C55E]' : 'bg-[#D1D5DB]'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      p.active ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </button>
                  <button onClick={() => {
                    setEditingId(p.id)
                    const hasSections = Array.isArray(p.sections) && p.sections.length > 0
                    setEditForm({
                      persona: p.persona, name: p.name, description: p.description,
                      template: p.template, palette: p.palette, font: p.font,
                      sort_order: String(p.sort_order), imageUrl: p.image_url ?? '',
                      useSections: hasSections,
                      sections: hasSections ? p.sections! : [],
                    })
                    setError('')
                  }}
                    className="text-xs font-semibold text-[#666] hover:text-[#0D0D0D] px-2 py-1 rounded-lg hover:bg-[#F5F5F5] transition-colors">
                    Edit
                  </button>
                  {deleteConfirm === p.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(p.id)}
                        className="text-xs font-semibold text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                        Confirm
                      </button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-xs text-[#999] hover:text-[#0D0D0D] px-1">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(p.id)}
                      className="text-xs font-semibold text-[#999] hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── PresetForm ─────────────────────────────────────────────────────────────

function PresetForm({ form, onChange, onUpload, sectionTypes }: {
  form:         FormState
  onChange:     (f: FormState) => void
  onUpload:     (url: string) => void
  sectionTypes: SectionType[]
}) {
  const [uploading, setUploading]     = useState(false)
  const [uploadError, setUploadError] = useState('')

  const field = (key: keyof FormState) => (value: string) => onChange({ ...form, [key]: value })

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setUploadError('')
    const fd = new FormData(); fd.append('file', file)
    try {
      const res  = await fetch('/api/admin/layouts/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setUploadError(data.error ?? 'Upload failed'); return }
      onUpload(data.url)
    } catch {
      setUploadError('Upload failed — try again.')
    } finally {
      setUploading(false); e.target.value = ''
    }
  }

  function addSection(key: string) {
    if (form.sections.some(s => s.sectionKey === key)) return
    const st = sectionTypes.find(s => s.key === key)
    const defaultVariant = st?.variants?.[0]?.key ?? 'default'
    const next = [...form.sections, { sectionKey: key, variant: defaultVariant, order: form.sections.length }]
    onChange({ ...form, sections: next })
  }

  function removeSection(key: string) {
    const next = form.sections
      .filter(s => s.sectionKey !== key)
      .map((s, i) => ({ ...s, order: i }))
    onChange({ ...form, sections: next })
  }

  function setVariant(key: string, variant: string) {
    const next = form.sections.map(s => s.sectionKey === key ? { ...s, variant } : s)
    onChange({ ...form, sections: next })
  }

  function moveSection(key: string, dir: -1 | 1) {
    const sorted = [...form.sections].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex(s => s.sectionKey === key)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const next = sorted.map((s, i) => {
      if (i === idx)     return { ...s, order: swapIdx }
      if (i === swapIdx) return { ...s, order: idx }
      return s
    })
    onChange({ ...form, sections: next })
  }

  const sortedSections = [...form.sections].sort((a, b) => a.order - b.order)
  const usedKeys = new Set(form.sections.map(s => s.sectionKey))

  return (
    <div className="space-y-4">
      {/* Core fields */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="field-label">Persona</label>
          <select value={form.persona} onChange={e => field('persona')(e.target.value)} className="field-input">
            {PERSONAS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Name</label>
          <input value={form.name} onChange={e => field('name')(e.target.value)}
            placeholder="e.g. Artisan" className="field-input" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="field-label">Description</label>
          <input value={form.description} onChange={e => field('description')(e.target.value)}
            placeholder="One-line description" className="field-input" />
        </div>
        <div>
          <label className="field-label">Template (fallback)</label>
          <select value={form.template} onChange={e => field('template')(e.target.value)} className="field-input">
            {Object.entries(TEMPLATE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Palette</label>
          <select value={form.palette} onChange={e => field('palette')(e.target.value)} className="field-input">
            {Object.keys(ACCENT).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Font</label>
          <select value={form.font} onChange={e => field('font')(e.target.value)} className="field-input">
            {Object.entries(FONT_LABEL).map(([k, v]) => <option key={k} value={k}>{v} ({k})</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Sort order</label>
          <input type="number" value={form.sort_order} onChange={e => field('sort_order')(e.target.value)} className="field-input" />
        </div>
        <div className="col-span-2">
          <label className="field-label">Preview image (optional)</label>
          <div className="flex items-center gap-3">
            {form.imageUrl && (
              <img src={form.imageUrl} alt="Preview" className="w-20 h-14 object-cover rounded-xl border border-[#E5E5E5]" />
            )}
            <label className="cursor-pointer text-xs font-semibold text-[#666] border border-[#E5E5E5] rounded-xl px-3 py-2 hover:bg-[#F5F5F5] transition-colors">
              {uploading ? 'Uploading…' : form.imageUrl ? 'Change image' : '+ Upload image'}
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
            </label>
            {form.imageUrl && (
              <button type="button" onClick={() => onUpload('')}
                className="text-xs text-[#999] hover:text-red-500 transition-colors">Remove</button>
            )}
          </div>
          {uploadError && <p className="text-red-500 text-xs mt-1">{uploadError}</p>}
        </div>
      </div>

      {/* Section builder toggle */}
      <div className="border-t border-[#E5E5E5] pt-4">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <button type="button"
            onClick={() => onChange({ ...form, useSections: !form.useSections, sections: form.useSections ? [] : form.sections })}
            className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${form.useSections ? 'bg-[#0D0D0D]' : 'bg-[#D1D5DB]'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.useSections ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-sm font-semibold text-[#0D0D0D]">Use section builder</span>
          <span className="text-xs text-[#999]">Compose this layout section by section</span>
        </label>
      </div>

      {/* Section builder */}
      {form.useSections && (
        <div className="border border-[#E5E5E5] rounded-2xl overflow-hidden">
          <div className="p-4 bg-[#F9F9F9] border-b border-[#E5E5E5]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#666] mb-3">Add sections</p>
            <div className="flex flex-wrap gap-2">
              {sectionTypes.map(st => (
                <button key={st.key} type="button"
                  onClick={() => usedKeys.has(st.key) ? removeSection(st.key) : addSection(st.key)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    usedKeys.has(st.key)
                      ? 'bg-[#0D0D0D] text-white border-[#0D0D0D]'
                      : 'border-[#E5E5E5] text-[#666] hover:border-[#0D0D0D] hover:text-[#0D0D0D] bg-white'
                  }`}>
                  {usedKeys.has(st.key) ? '✓ ' : '+ '}{st.label}
                </button>
              ))}
              {sectionTypes.length === 0 && (
                <p className="text-xs text-[#999]">Loading section types…</p>
              )}
            </div>
          </div>

          {sortedSections.length > 0 ? (
            <div className="divide-y divide-[#E5E5E5]">
              {sortedSections.map((s, i) => {
                const st = sectionTypes.find(x => x.key === s.sectionKey)
                return (
                  <div key={s.sectionKey} className="flex items-center gap-3 px-4 py-3 bg-white">
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button type="button" onClick={() => moveSection(s.sectionKey, -1)} disabled={i === 0}
                        className="text-[#999] hover:text-[#0D0D0D] disabled:opacity-20 text-xs leading-none">▲</button>
                      <button type="button" onClick={() => moveSection(s.sectionKey, 1)} disabled={i === sortedSections.length - 1}
                        className="text-[#999] hover:text-[#0D0D0D] disabled:opacity-20 text-xs leading-none">▼</button>
                    </div>
                    <span className="text-xs font-bold text-[#999] w-4 shrink-0">{i + 1}</span>
                    <span className="text-sm font-semibold text-[#0D0D0D] w-28 shrink-0">{st?.label ?? s.sectionKey}</span>
                    <select value={s.variant}
                      onChange={e => setVariant(s.sectionKey, e.target.value)}
                      className="flex-1 text-xs border border-[#E5E5E5] rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-[#0D0D0D]">
                      {st?.variants.map(v => (
                        <option key={v.key} value={v.key}>{v.label}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => removeSection(s.sectionKey)}
                      className="text-xs text-[#999] hover:text-red-500 transition-colors shrink-0 ml-1">✕</button>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-[#999] p-4 text-center">Add sections above to compose the layout.</p>
          )}
        </div>
      )}
    </div>
  )
}
