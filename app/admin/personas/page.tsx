'use client'

import { useState, useEffect } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────

interface Persona {
  id:           string
  label:        string
  emoji:        string
  enabled:      boolean
  sort_order:   number
  template:     string
  palette:      string
  font:         string
  needs_config: boolean
}

interface PersonaForm {
  id:         string
  label:      string
  emoji:      string
  sort_order: string
  template:   string
  palette:    string
  font:       string
}

const BLANK_FORM: PersonaForm = {
  id: '', label: '', emoji: '', sort_order: '99',
  template: 'focus', palette: 'professional', font: 'inter',
}

const TEMPLATES = ['focus', 'portfolio', 'clinic', 'storefront']
const PALETTES  = ['professional', 'fresh', 'warm', 'minimal', 'creative', 'calm']
const FONTS     = ['inter', 'georgia', 'trebuchet']

// ── Main page ──────────────────────────────────────────────────────────────

export default function AdminPersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  // Create
  const [showCreate, setShowCreate]   = useState(false)
  const [createForm, setCreateForm]   = useState<PersonaForm>(BLANK_FORM)

  // Edit
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [editForm, setEditForm]       = useState<PersonaForm>(BLANK_FORM)

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setError('')
    const res = await fetch('/api/admin/personas')
    if (res.status === 401) { window.location.href = '/admin'; return }
    if (res.status === 403) { setError('Not authorized'); setLoading(false); return }
    const data = await res.json()
    setPersonas(data.personas ?? [])
    setLoading(false)
  }

  // ── Toggle enabled ─────────────────────────────────────────────────────────

  async function handleToggleEnabled(persona: Persona) {
    const res = await fetch(`/api/admin/personas/${persona.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !persona.enabled }),
    })
    if (res.ok) {
      setPersonas(prev => prev.map(p =>
        p.id === persona.id ? { ...p, enabled: !persona.enabled } : p
      ))
    }
  }

  // ── Create ─────────────────────────────────────────────────────────────────

  async function handleCreate() {
    setSaving(true); setError('')
    const res = await fetch('/api/admin/personas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...createForm,
        sort_order: Number(createForm.sort_order),
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Failed to create'); return }
    setPersonas(prev => [...prev, data.persona].sort((a, b) => a.sort_order - b.sort_order))
    setCreateForm(BLANK_FORM)
    setShowCreate(false)
  }

  // ── Edit / Update ──────────────────────────────────────────────────────────

  function openEdit(persona: Persona) {
    setEditingId(persona.id)
    setEditForm({
      id:         persona.id,
      label:      persona.label,
      emoji:      persona.emoji,
      sort_order: String(persona.sort_order),
      template:   persona.template,
      palette:    persona.palette,
      font:       persona.font,
    })
  }

  async function handleUpdate(id: string) {
    setSaving(true); setError('')
    const res = await fetch(`/api/admin/personas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label:      editForm.label,
        emoji:      editForm.emoji,
        sort_order: Number(editForm.sort_order),
        template:   editForm.template,
        palette:    editForm.palette,
        font:       editForm.font,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Failed to update'); return }
    setPersonas(prev =>
      prev.map(p => p.id === id ? { ...p, ...data.persona } : p)
          .sort((a, b) => a.sort_order - b.sort_order)
    )
    setEditingId(null)
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/personas/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setPersonas(prev => prev.filter(p => p.id !== id))
      setDeleteConfirm(null)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto pt-8">
        <p className="text-sm text-[#999]">Loading…</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0D0D0D] mb-1">Personas</h1>
          <p className="text-sm text-[#666]">
            Toggle, reorder, and configure personas. Disabled personas are hidden from
            onboarding and the landing page.
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setError('') }}
          className="px-4 py-2 rounded-xl bg-[#0D0D0D] text-white text-sm font-semibold hover:opacity-80 transition-opacity"
        >
          + Add persona
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 border border-[#F5A623] rounded-2xl p-5 bg-[#FFFDF5]">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#C17A3A] mb-4">New persona</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="field-label">ID (slug, no spaces)</label>
              <input className="field-input" placeholder="e.g. yoga_instructor"
                value={createForm.id}
                onChange={e => setCreateForm(f => ({ ...f, id: e.target.value }))} />
            </div>
            <div>
              <label className="field-label">Label</label>
              <input className="field-input" placeholder="e.g. Yoga Instructor"
                value={createForm.label}
                onChange={e => setCreateForm(f => ({ ...f, label: e.target.value }))} />
            </div>
            <div>
              <label className="field-label">Emoji</label>
              <input className="field-input" placeholder="e.g. 🧘"
                value={createForm.emoji}
                onChange={e => setCreateForm(f => ({ ...f, emoji: e.target.value }))} />
            </div>
            <div>
              <label className="field-label">Sort order</label>
              <input className="field-input" type="number"
                value={createForm.sort_order}
                onChange={e => setCreateForm(f => ({ ...f, sort_order: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="field-label">Template</label>
              <select className="field-input" value={createForm.template}
                onChange={e => setCreateForm(f => ({ ...f, template: e.target.value }))}>
                {TEMPLATES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Palette</label>
              <select className="field-input" value={createForm.palette}
                onChange={e => setCreateForm(f => ({ ...f, palette: e.target.value }))}>
                {PALETTES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Font</label>
              <select className="field-input" value={createForm.font}
                onChange={e => setCreateForm(f => ({ ...f, font: e.target.value }))}>
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 mb-4">
            ⚠️ New personas are flagged <strong>Needs config</strong> — onboarding questions and AI behavior
            will fall back to the generic &ldquo;other&rdquo; persona until a developer adds rich config in code.
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving || !createForm.id.trim() || !createForm.label.trim()}
              className="px-4 py-2 rounded-xl bg-[#0D0D0D] text-white text-sm font-semibold disabled:opacity-50 hover:opacity-80 transition-opacity">
              {saving ? 'Saving…' : 'Create persona'}
            </button>
            <button onClick={() => { setShowCreate(false); setCreateForm(BLANK_FORM) }}
              className="px-4 py-2 rounded-xl border border-[#E5E5E5] text-sm text-[#666] hover:border-[#0D0D0D] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Persona list */}
      <div className="space-y-3">
        {personas.map(persona => (
          <div key={persona.id}
            className={`border rounded-2xl bg-white transition-colors ${
              persona.enabled ? 'border-[#E5E5E5]' : 'border-[#E5E5E5] opacity-60'
            }`}
          >
            {editingId === persona.id ? (
              /* ── Edit mode ── */
              <div className="p-5">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="field-label">Label</label>
                    <input className="field-input"
                      value={editForm.label}
                      onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} />
                  </div>
                  <div>
                    <label className="field-label">Emoji</label>
                    <input className="field-input"
                      value={editForm.emoji}
                      onChange={e => setEditForm(f => ({ ...f, emoji: e.target.value }))} />
                  </div>
                  <div>
                    <label className="field-label">Sort order</label>
                    <input className="field-input" type="number"
                      value={editForm.sort_order}
                      onChange={e => setEditForm(f => ({ ...f, sort_order: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="field-label">Template</label>
                    <select className="field-input" value={editForm.template}
                      onChange={e => setEditForm(f => ({ ...f, template: e.target.value }))}>
                      {TEMPLATES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Palette</label>
                    <select className="field-input" value={editForm.palette}
                      onChange={e => setEditForm(f => ({ ...f, palette: e.target.value }))}>
                      {PALETTES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Font</label>
                    <select className="field-input" value={editForm.font}
                      onChange={e => setEditForm(f => ({ ...f, font: e.target.value }))}>
                      {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleUpdate(persona.id)} disabled={saving}
                    className="px-4 py-2 rounded-xl bg-[#0D0D0D] text-white text-sm font-semibold disabled:opacity-50 hover:opacity-80 transition-opacity">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditingId(null)}
                    className="px-4 py-2 rounded-xl border border-[#E5E5E5] text-sm text-[#666] hover:border-[#0D0D0D] transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* ── Display mode ── */
              <div className="flex items-center gap-4 p-4">

                {/* Emoji + label */}
                <div className="text-2xl w-8 text-center shrink-0">{persona.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#0D0D0D] text-sm">{persona.label}</span>
                    <span className="text-[10px] font-mono text-[#999] bg-[#F5F5F5] px-1.5 py-0.5 rounded">
                      {persona.id}
                    </span>
                    {persona.needs_config && (
                      <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                        Needs config
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#999] mt-0.5">
                    {persona.template} · {persona.palette} · {persona.font} · order {persona.sort_order}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0">

                  {/* Enabled toggle */}
                  <button
                    onClick={() => handleToggleEnabled(persona)}
                    title={persona.enabled ? 'Disable persona' : 'Enable persona'}
                    className={`w-9 h-5 rounded-full transition-colors relative ${
                      persona.enabled ? 'bg-[#22C55E]' : 'bg-[#D1D5DB]'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      persona.enabled ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </button>

                  {/* Edit */}
                  <button onClick={() => openEdit(persona)}
                    className="text-xs font-semibold text-[#666] hover:text-[#0D0D0D] transition-colors px-2 py-1 rounded-lg hover:bg-[#F5F5F5]">
                    Edit
                  </button>

                  {/* Delete */}
                  {deleteConfirm === persona.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-[#666]">Delete?</span>
                      <button onClick={() => handleDelete(persona.id)}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                        Yes
                      </button>
                      <button onClick={() => setDeleteConfirm(null)}
                        className="text-xs text-[#999] hover:text-[#666] px-2 py-1 rounded-lg transition-colors">
                        No
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(persona.id)}
                      className="text-xs font-semibold text-[#999] hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {personas.length === 0 && !loading && (
        <div className="text-center py-16 text-sm text-[#999]">
          No personas yet. Add one above.
        </div>
      )}
    </div>
  )
}
