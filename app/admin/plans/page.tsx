'use client'

import { useState, useEffect } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────

interface Feature {
  id:          string
  plan_id:     string
  label:       string
  description: string | null
  feature_key: string | null
  sort_order:  number
}

interface Plan {
  id:          string
  name:        string
  emoji:       string
  tagline:     string
  usa_price:   string | null
  india_price: string | null
  is_quote:    boolean
  popular:     boolean
  sort_order:  number
  active:      boolean
  features:    Feature[]
}

interface PlanForm {
  id:          string
  name:        string
  emoji:       string
  tagline:     string
  usa_price:   string
  india_price: string
  is_quote:    boolean
  popular:     boolean
  sort_order:  string
}

interface FeatureForm {
  label:       string
  description: string
  feature_key: string
  sort_order:  string
}

const BLANK_PLAN: PlanForm = {
  id: '', name: '', emoji: '', tagline: '',
  usa_price: '', india_price: '',
  is_quote: false, popular: false, sort_order: '0',
}

const BLANK_FEATURE: FeatureForm = {
  label: '', description: '', feature_key: '', sort_order: '0',
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AdminPlansPage() {
  const [plans, setPlans]   = useState<Plan[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  // Plan editing
  const [showCreate, setShowCreate]     = useState(false)
  const [createForm, setCreateForm]     = useState<PlanForm>(BLANK_PLAN)
  const [editingPlan, setEditingPlan]   = useState<string | null>(null)
  const [editPlanForm, setEditPlanForm] = useState<PlanForm>(BLANK_PLAN)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Feature editing
  const [addingFeatureTo, setAddingFeatureTo]   = useState<string | null>(null)
  const [featureForm, setFeatureForm]           = useState<FeatureForm>(BLANK_FEATURE)
  const [editingFeature, setEditingFeature]     = useState<string | null>(null)
  const [editFeatureForm, setEditFeatureForm]   = useState<FeatureForm>(BLANK_FEATURE)
  const [deleteFeatureConfirm, setDeleteFeatureConfirm] = useState<string | null>(null)

  useEffect(() => {
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    setError('')
    const res = await fetch('/api/admin/plans')
    if (res.status === 401) { window.location.href = '/admin'; return }
    if (res.status === 403) { setError('Not authorized'); setLoading(false); return }
    const data = await res.json()
    setPlans(data.plans ?? [])
    setLoading(false)
  }

  // ── Plan actions ──────────────────────────────────────────────────────────

  async function handleCreatePlan() {
    setSaving(true); setError('')
    const res = await fetch('/api/admin/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...createForm,
        sort_order:  Number(createForm.sort_order),
        usa_price:   createForm.is_quote ? null : (createForm.usa_price   || null),
        india_price: createForm.is_quote ? null : (createForm.india_price || null),
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Failed to create'); return }
    setPlans(prev => [...prev, data.plan].sort((a, b) => a.sort_order - b.sort_order))
    setCreateForm(BLANK_PLAN)
    setShowCreate(false)
  }

  async function handleUpdatePlan(id: string) {
    setSaving(true); setError('')
    const res = await fetch(`/api/admin/plans/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:        editPlanForm.name,
        emoji:       editPlanForm.emoji,
        tagline:     editPlanForm.tagline,
        usa_price:   editPlanForm.is_quote ? null : (editPlanForm.usa_price   || null),
        india_price: editPlanForm.is_quote ? null : (editPlanForm.india_price || null),
        is_quote:    editPlanForm.is_quote,
        popular:     editPlanForm.popular,
        sort_order:  Number(editPlanForm.sort_order),
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Failed to update'); return }
    setPlans(prev => prev.map(p => p.id === id ? { ...p, ...data.plan } : p).sort((a, b) => a.sort_order - b.sort_order))
    setEditingPlan(null)
  }

  async function handleToggleActive(plan: Plan) {
    const res = await fetch(`/api/admin/plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !plan.active }),
    })
    if (res.ok) setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, active: !plan.active } : p))
  }

  async function handleDeletePlan(id: string) {
    const res = await fetch(`/api/admin/plans/${id}`, { method: 'DELETE' })
    if (res.ok) { setPlans(prev => prev.filter(p => p.id !== id)); setDeleteConfirm(null) }
  }

  // ── Feature actions ───────────────────────────────────────────────────────

  async function handleAddFeature(planId: string) {
    setSaving(true); setError('')
    const res = await fetch('/api/admin/plans/features', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_id:     planId,
        label:       featureForm.label,
        description: featureForm.description || null,
        feature_key: featureForm.feature_key || null,
        sort_order:  Number(featureForm.sort_order),
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Failed to add feature'); return }
    setPlans(prev => prev.map(p =>
      p.id === planId ? { ...p, features: [...p.features, data.feature].sort((a: Feature, b: Feature) => a.sort_order - b.sort_order) } : p
    ))
    setFeatureForm(BLANK_FEATURE)
    setAddingFeatureTo(null)
  }

  async function handleUpdateFeature(featureId: string, planId: string) {
    setSaving(true); setError('')
    const res = await fetch(`/api/admin/plans/features/${featureId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label:       editFeatureForm.label,
        description: editFeatureForm.description || null,
        feature_key: editFeatureForm.feature_key || null,
        sort_order:  Number(editFeatureForm.sort_order),
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Failed to update feature'); return }
    setPlans(prev => prev.map(p =>
      p.id === planId
        ? { ...p, features: p.features.map(f => f.id === featureId ? data.feature : f).sort((a, b) => a.sort_order - b.sort_order) }
        : p
    ))
    setEditingFeature(null)
  }

  async function handleDeleteFeature(featureId: string, planId: string) {
    const res = await fetch(`/api/admin/plans/features/${featureId}`, { method: 'DELETE' })
    if (res.ok) {
      setPlans(prev => prev.map(p =>
        p.id === planId ? { ...p, features: p.features.filter(f => f.id !== featureId) } : p
      ))
      setDeleteFeatureConfirm(null)
    }
  }

  if (loading) {
    return <div className="max-w-4xl mx-auto py-20 text-center text-sm text-[#999]">Loading…</div>
  }

  if (error && plans.length === 0) {
    return <div className="max-w-4xl mx-auto py-20 text-center text-sm text-red-500">{error}</div>
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#0D0D0D]">Plans</h1>
          <p className="text-sm text-[#666] mt-0.5">{plans.length} plans · {plans.filter(p => p.active).length} active</p>
        </div>
        <button onClick={() => { setShowCreate(v => !v); setError('') }}
          className="bg-[#0D0D0D] text-white text-sm font-semibold rounded-xl px-4 py-2 hover:opacity-80 transition-opacity">
          {showCreate ? 'Cancel' : '+ New plan'}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* Create plan form */}
      {showCreate && (
        <div className="border border-[#E5E5E5] rounded-2xl p-5 mb-6 bg-[#FAFAFA]">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D] mb-4">New plan</p>
          <PlanForm form={createForm} onChange={setCreateForm} />
          <button onClick={handleCreatePlan} disabled={saving || !createForm.id.trim() || !createForm.name.trim()}
            className="mt-4 bg-[#0D0D0D] text-white text-sm font-semibold rounded-xl px-5 py-2.5 disabled:opacity-40 hover:opacity-80 transition-opacity">
            {saving ? 'Saving…' : 'Create plan'}
          </button>
        </div>
      )}

      {/* Plan list */}
      <div className="space-y-4">
        {plans.map(plan => (
          <div key={plan.id} className={`border rounded-2xl overflow-hidden ${plan.active ? 'border-[#E5E5E5]' : 'border-[#E5E5E5] opacity-60'}`}>

            {/* Plan header */}
            {editingPlan === plan.id ? (
              <div className="p-4 bg-[#FAFAFA]">
                <PlanForm form={editPlanForm} onChange={setEditPlanForm} />
                <div className="flex gap-2 mt-4">
                  <button onClick={() => handleUpdatePlan(plan.id)} disabled={saving}
                    className="bg-[#0D0D0D] text-white text-sm font-semibold rounded-xl px-4 py-2 disabled:opacity-40">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditingPlan(null)} className="text-sm text-[#666] px-4 py-2">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-lg">{plan.emoji}</span>
                    <span className="font-bold text-[#0D0D0D]">{plan.name}</span>
                    {plan.popular && (
                      <span className="text-[10px] font-semibold bg-[#F5A623] text-[#0D0D0D] px-2 py-0.5 rounded-full uppercase tracking-wide">Popular</span>
                    )}
                    <span className="text-xs text-[#666]">
                      {plan.is_quote ? 'Contact for quote' : `${plan.usa_price ?? '—'} / ${plan.india_price ?? '—'}`}
                    </span>
                    <span className="text-[10px] font-mono text-[#999] bg-[#F5F5F5] px-1.5 py-0.5 rounded">id: {plan.id}</span>
                    <span className="text-[10px] text-[#999]">order {plan.sort_order}</span>
                  </div>
                  <p className="text-xs text-[#888]">{plan.tagline}</p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <button onClick={() => handleToggleActive(plan)} title={plan.active ? 'Deactivate' : 'Activate'}
                    className={`w-9 h-5 rounded-full transition-colors relative ${plan.active ? 'bg-[#22C55E]' : 'bg-[#D1D5DB]'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${plan.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <button onClick={() => {
                    setEditingPlan(plan.id)
                    setEditPlanForm({
                      id: plan.id, name: plan.name, emoji: plan.emoji, tagline: plan.tagline,
                      usa_price: plan.usa_price ?? '', india_price: plan.india_price ?? '',
                      is_quote: plan.is_quote, popular: plan.popular, sort_order: String(plan.sort_order),
                    })
                    setError('')
                  }}
                    className="text-xs font-semibold text-[#666] hover:text-[#0D0D0D] px-2 py-1 rounded-lg hover:bg-[#F5F5F5]">
                    Edit
                  </button>
                  {deleteConfirm === plan.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDeletePlan(plan.id)}
                        className="text-xs font-semibold text-red-600 px-2 py-1 rounded-lg hover:bg-red-50">Confirm</button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-xs text-[#999] px-1">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(plan.id)}
                      className="text-xs font-semibold text-[#999] hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Features */}
            <div className="border-t border-[#F0F0F0]">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#FAFAFA]">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#999]">
                  Features ({plan.features.length})
                </p>
                <button
                  onClick={() => { setAddingFeatureTo(addingFeatureTo === plan.id ? null : plan.id); setFeatureForm(BLANK_FEATURE) }}
                  className="text-xs font-semibold text-[#666] hover:text-[#0D0D0D] px-2 py-1 rounded-lg hover:bg-[#EFEFEF]">
                  + Add feature
                </button>
              </div>

              {addingFeatureTo === plan.id && (
                <div className="px-4 pb-3 bg-[#FAFAFA] border-b border-[#F0F0F0]">
                  <FeatureFormUI form={featureForm} onChange={setFeatureForm} />
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleAddFeature(plan.id)} disabled={saving || !featureForm.label.trim()}
                      className="bg-[#0D0D0D] text-white text-xs font-semibold rounded-lg px-4 py-2 disabled:opacity-40">
                      {saving ? 'Adding…' : 'Add'}
                    </button>
                    <button onClick={() => setAddingFeatureTo(null)} className="text-xs text-[#666] px-3">Cancel</button>
                  </div>
                </div>
              )}

              {plan.features.length === 0 && addingFeatureTo !== plan.id && (
                <p className="text-xs text-[#999] px-4 py-3 italic">No features yet.</p>
              )}
              <div className="divide-y divide-[#F5F5F5]">
                {plan.features.map(feature => (
                  <div key={feature.id} className="px-4 py-2.5">
                    {editingFeature === feature.id ? (
                      <>
                        <FeatureFormUI form={editFeatureForm} onChange={setEditFeatureForm} />
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => handleUpdateFeature(feature.id, plan.id)} disabled={saving}
                            className="bg-[#0D0D0D] text-white text-xs font-semibold rounded-lg px-4 py-1.5 disabled:opacity-40">
                            {saving ? 'Saving…' : 'Save'}
                          </button>
                          <button onClick={() => setEditingFeature(null)} className="text-xs text-[#666] px-3">Cancel</button>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-[#0D0D0D]">{feature.label}</span>
                            {feature.feature_key && (
                              <span className="text-[10px] font-mono bg-[#EEF2FF] text-[#6366F1] px-1.5 py-0.5 rounded">
                                key: {feature.feature_key}
                              </span>
                            )}
                            <span className="text-[10px] text-[#bbb]">order {feature.sort_order}</span>
                          </div>
                          {feature.description && (
                            <p className="text-xs text-[#888] mt-0.5">{feature.description}</p>
                          )}
                        </div>
                        <div className="shrink-0 flex items-center gap-1">
                          <button onClick={() => {
                            setEditingFeature(feature.id)
                            setEditFeatureForm({
                              label: feature.label, description: feature.description ?? '',
                              feature_key: feature.feature_key ?? '', sort_order: String(feature.sort_order),
                            })
                          }}
                            className="text-xs text-[#999] hover:text-[#0D0D0D] px-2 py-1 rounded hover:bg-[#F5F5F5]">
                            Edit
                          </button>
                          {deleteFeatureConfirm === feature.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleDeleteFeature(feature.id, plan.id)}
                                className="text-xs text-red-600 px-1.5 py-1 rounded hover:bg-red-50">Confirm</button>
                              <button onClick={() => setDeleteFeatureConfirm(null)} className="text-[10px] text-[#999] px-1">✕</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteFeatureConfirm(feature.id)}
                              className="text-xs text-[#ccc] hover:text-red-500 px-2 py-1 rounded hover:bg-red-50">✕</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}

// ── PlanForm ───────────────────────────────────────────────────────────────

function PlanForm({ form, onChange }: { form: PlanForm; onChange: (f: PlanForm) => void }) {
  const field = (key: keyof PlanForm) => (value: string | boolean) =>
    onChange({ ...form, [key]: value })
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="field-label">ID (unique)</label>
          <input value={form.id} onChange={e => field('id')(e.target.value)}
            placeholder="grow" className="field-input" />
        </div>
        <div>
          <label className="field-label">Name</label>
          <input value={form.name} onChange={e => field('name')(e.target.value)}
            placeholder="Grow" className="field-input" />
        </div>
        <div>
          <label className="field-label">Emoji</label>
          <input value={form.emoji} onChange={e => field('emoji')(e.target.value)}
            placeholder="🌳" className="field-input" />
        </div>
        <div>
          <label className="field-label">Sort order</label>
          <input type="number" value={form.sort_order}
            onChange={e => field('sort_order')(e.target.value)} className="field-input" />
        </div>
      </div>
      <div>
        <label className="field-label">Tagline</label>
        <input value={form.tagline} onChange={e => field('tagline')(e.target.value)}
          placeholder="Get online & take bookings." className="field-input" />
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={form.is_quote}
            onChange={e => onChange({ ...form, is_quote: e.target.checked, usa_price: '', india_price: '' })}
            className="rounded" />
          <span className="text-sm text-[#444]">Contact for quote (no price)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={form.popular}
            onChange={e => field('popular')(e.target.checked)}
            className="rounded" />
          <span className="text-sm text-[#444]">Popular</span>
        </label>
      </div>
      {!form.is_quote && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">USA price</label>
            <input value={form.usa_price} onChange={e => field('usa_price')(e.target.value)}
              placeholder="$9/mo" className="field-input" />
          </div>
          <div>
            <label className="field-label">India price</label>
            <input value={form.india_price} onChange={e => field('india_price')(e.target.value)}
              placeholder="₹299/mo" className="field-input" />
          </div>
        </div>
      )}
    </div>
  )
}

// ── FeatureFormUI ──────────────────────────────────────────────────────────

function FeatureFormUI({ form, onChange }: { form: FeatureForm; onChange: (f: FeatureForm) => void }) {
  const field = (key: keyof FeatureForm) => (value: string) => onChange({ ...form, [key]: value })
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="col-span-2">
          <label className="field-label">Label</label>
          <input value={form.label} onChange={e => field('label')(e.target.value)}
            placeholder="Custom name" className="field-input" />
        </div>
        <div>
          <label className="field-label">Feature key (gating)</label>
          <input value={form.feature_key} onChange={e => field('feature_key')(e.target.value)}
            placeholder="custom_domain" className="field-input" />
        </div>
        <div>
          <label className="field-label">Sort order</label>
          <input type="number" value={form.sort_order}
            onChange={e => field('sort_order')(e.target.value)} className="field-input" />
        </div>
      </div>
      <div>
        <label className="field-label">Description (optional)</label>
        <input value={form.description} onChange={e => field('description')(e.target.value)}
          placeholder="Connect your own domain to your Kryla page" className="field-input" />
      </div>
    </div>
  )
}
