'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ACCENT, PAGE_BG, TEMPLATE_LABEL, FONT_LABEL, PERSONAS,
  type TemplateKey, type PaletteKey, type FontKey, type PersonaKey,
} from '@/lib/layouts'

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
  created_at:  string
}

interface FormState {
  persona:     string
  name:        string
  description: string
  template:    string
  palette:     string
  font:        string
  sort_order:  string
}

const BLANK_FORM: FormState = {
  persona: 'tutor', name: '', description: '',
  template: 'focus', palette: 'professional', font: 'inter', sort_order: '0',
}

const PERSONA_COLOUR: Record<string, string> = {
  tutor: '#3B82F6', trainer: '#22C55E', baker: '#EA8C00', photographer: '#6B7280',
  salon: '#9333EA', chef: '#F97316', doctor: '#06B6D4', musician: '#EC4899',
  other: '#6B7280', all: '#64748B',
}

type AuthState = 'loading' | 'login_email' | 'login_code' | 'not_admin' | 'ready'

export default function AdminLayoutsPage() {
  const [authState, setAuthState]   = useState<AuthState>('loading')
  const [email, setEmail]           = useState('')
  const [code, setCode]             = useState('')
  const [authError, setAuthError]   = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [presets, setPresets]           = useState<Preset[]>([])
  const [filterPersona, setFilterPersona] = useState('all')
  const [editingId, setEditingId]       = useState<string | null>(null)
  const [editForm, setEditForm]         = useState<FormState>(BLANK_FORM)
  const [showCreate, setShowCreate]     = useState(false)
  const [createForm, setCreateForm]     = useState<FormState>(BLANK_FORM)
  const [saving, setSaving]             = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [error, setError]               = useState('')

  const supabase = createClient()

  async function load() {
    const res  = await fetch('/api/admin/layouts')
    if (res.status === 401) { setAuthState('login_email'); return }
    if (res.status === 403) { setAuthState('not_admin'); return }
    const data = await res.json()
    setPresets(data.presets ?? [])
    setAuthState('ready')
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) load()
      else setAuthState('login_email')
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function sendOtp() {
    setAuthLoading(true); setAuthError('')
    const { error } = await supabase.auth.signInWithOtp({ email })
    setAuthLoading(false)
    if (error) { setAuthError(error.message); return }
    setAuthState('login_code')
  }

  async function verifyOtp() {
    setAuthLoading(true); setAuthError('')
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    setAuthLoading(false)
    if (error) { setAuthError(error.message); return }
    await load()
  }

  async function handleCreate() {
    setSaving(true); setError('')
    const res = await fetch('/api/admin/layouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...createForm, sort_order: Number(createForm.sort_order) }),
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
      body: JSON.stringify({ ...editForm, sort_order: Number(editForm.sort_order) }),
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

  // ── Auth ─────────────────────────────────────────────────────────────────

  if (authState === 'loading') {
    return <Shell><div className="flex items-center justify-center h-40 text-[#999] text-sm">Loading…</div></Shell>
  }

  if (authState === 'login_email') {
    return (
      <Shell>
        <div className="max-w-sm mx-auto py-16 px-4">
          <p className="text-lg font-bold mb-1">Admin sign-in</p>
          <p className="text-sm text-[#666] mb-6">Enter your admin email to receive a code.</p>
          <input type="email" value={email} placeholder="you@example.com"
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendOtp()}
            className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:border-[#0D0D0D]" />
          {authError && <p className="text-red-500 text-xs mb-3">{authError}</p>}
          <button onClick={sendOtp} disabled={authLoading || !email}
            className="w-full bg-[#0D0D0D] text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40">
            {authLoading ? 'Sending…' : 'Send code →'}
          </button>
        </div>
      </Shell>
    )
  }

  if (authState === 'login_code') {
    return (
      <Shell>
        <div className="max-w-sm mx-auto py-16 px-4">
          <p className="text-lg font-bold mb-1">Check your email</p>
          <p className="text-sm text-[#666] mb-6">Enter the 6-digit code sent to <strong>{email}</strong>.</p>
          <input type="text" inputMode="numeric" maxLength={6} value={code} placeholder="000000"
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && verifyOtp()}
            className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm tracking-widest text-center mb-3 focus:outline-none focus:border-[#0D0D0D]" />
          {authError && <p className="text-red-500 text-xs mb-3">{authError}</p>}
          <button onClick={verifyOtp} disabled={authLoading || code.length < 6}
            className="w-full bg-[#0D0D0D] text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40">
            {authLoading ? 'Verifying…' : 'Verify →'}
          </button>
          <button onClick={() => { setAuthState('login_email'); setCode(''); setAuthError('') }}
            className="mt-3 text-xs text-[#999] hover:text-[#0D0D0D] w-full text-center">← Back</button>
        </div>
      </Shell>
    )
  }

  if (authState === 'not_admin') {
    return (
      <Shell>
        <div className="max-w-sm mx-auto py-16 px-4 text-center">
          <p className="font-semibold mb-2">Not authorized</p>
          <p className="text-sm text-[#666]">Your email isn&apos;t in the admin list.</p>
        </div>
      </Shell>
    )
  }

  // ── Ready ─────────────────────────────────────────────────────────────────

  return (
    <Shell>
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
          <PresetForm form={createForm} onChange={setCreateForm} />
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
                <PresetForm form={editForm} onChange={setEditForm} />
                <div className="flex gap-2 mt-4">
                  <button onClick={() => handleUpdate(p.id)} disabled={saving}
                    className="bg-[#0D0D0D] text-white text-sm font-semibold rounded-xl px-4 py-2 disabled:opacity-40 hover:opacity-80 transition-opacity">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditingId(null)}
                    className="text-sm text-[#666] hover:text-[#0D0D0D] px-4 py-2">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4">
                {/* Colour swatch */}
                <div className="shrink-0 w-10 h-10 rounded-xl overflow-hidden border border-[#E5E5E5]">
                  <div style={{ background: ACCENT[p.palette as PaletteKey] ?? '#ccc' }} className="h-3 w-full" />
                  <div style={{ background: PAGE_BG[p.palette as PaletteKey] ?? '#fff' }} className="flex-1 h-7" />
                </div>

                {/* Meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[#0D0D0D]">{p.name}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 text-white"
                      style={{ background: PERSONA_COLOUR[p.persona] ?? '#6B7280' }}>
                      {p.persona}
                    </span>
                  </div>
                  <p className="text-xs text-[#888] mt-0.5">{p.description}</p>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {[TEMPLATE_LABEL[p.template as TemplateKey], p.palette, FONT_LABEL[p.font as FontKey]].map(tag => (
                      <span key={tag} className="text-[9px] font-semibold uppercase tracking-wide bg-[#F0F0F0] text-[#666] rounded px-1.5 py-0.5">
                        {tag}
                      </span>
                    ))}
                    <span className="text-[9px] font-semibold uppercase tracking-wide bg-[#F0F0F0] text-[#666] rounded px-1.5 py-0.5">
                      order {p.sort_order}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-2">
                  {/* Active toggle */}
                  <button onClick={() => handleToggleActive(p)} title={p.active ? 'Deactivate' : 'Activate'}
                    className={`w-9 h-5 rounded-full transition-colors relative ${p.active ? 'bg-[#22C55E]' : 'bg-[#D1D5DB]'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      p.active ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </button>

                  <button onClick={() => { setEditingId(p.id); setEditForm({
                    persona: p.persona, name: p.name, description: p.description,
                    template: p.template, palette: p.palette, font: p.font,
                    sort_order: String(p.sort_order),
                  }); setError('') }}
                    className="text-xs font-semibold text-[#666] hover:text-[#0D0D0D] px-2 py-1 rounded-lg hover:bg-[#F5F5F5] transition-colors">
                    Edit
                  </button>

                  {deleteConfirm === p.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(p.id)}
                        className="text-xs font-semibold text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                        Confirm
                      </button>
                      <button onClick={() => setDeleteConfirm(null)}
                        className="text-xs text-[#999] hover:text-[#0D0D0D] px-1">✕</button>
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
    </Shell>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function PresetForm({ form, onChange }: { form: FormState; onChange: (f: FormState) => void }) {
  const field = (key: keyof FormState) => (value: string) => onChange({ ...form, [key]: value })

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div>
        <label className="field-label">Persona</label>
        <select value={form.persona} onChange={e => field('persona')(e.target.value)} className="field-input">
          {PERSONAS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="col-span-2 sm:col-span-1">
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
        <label className="field-label">Template</label>
        <select value={form.template} onChange={e => field('template')(e.target.value)} className="field-input">
          {Object.entries(TEMPLATE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div>
        <label className="field-label">Palette</label>
        <select value={form.palette} onChange={e => field('palette')(e.target.value)} className="field-input">
          {Object.keys(ACCENT).map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
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
        <input type="number" value={form.sort_order} onChange={e => field('sort_order')(e.target.value)}
          className="field-input" />
      </div>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center gap-2 mb-8">
          <a href="/" className="text-xs text-[#999] hover:text-[#0D0D0D]">kryla.work</a>
          <span className="text-[#999]">/</span>
          <span className="text-xs font-semibold text-[#0D0D0D]">admin / layouts</span>
        </div>
        {children}
      </div>

      <style jsx global>{`
        .field-label {
          display: block;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #6B7280;
          margin-bottom: 4px;
        }
        .field-input {
          width: 100%;
          border: 1px solid #E5E5E5;
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 13px;
          background: white;
          outline: none;
          transition: border-color 0.15s;
        }
        .field-input:focus {
          border-color: #0D0D0D;
        }
      `}</style>
    </div>
  )
}
