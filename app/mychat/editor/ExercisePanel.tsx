'use client'

/**
 * ExercisePanel — browse system + member exercise library, insert into HEP,
 * save custom exercises, and view AI-suggested exercises.
 * Physio analog of ClausePanel.
 */

import { useState, useEffect, useCallback } from 'react'
import type { Exercise, ExerciseSuggestion } from './types'

const CATEGORY_LABELS: Record<string, string> = {
  lumbar:       'Lumbar / Lower Back',
  cervical:     'Cervical / Neck',
  shoulder:     'Shoulder',
  hip:          'Hip',
  knee:         'Knee',
  ankle:        'Ankle / Foot',
  core:         'Core',
  upper_limb:   'Upper Limb / Arm',
  lower_limb:   'Lower Limb / Leg',
  balance:      'Balance & Proprioception',
  breathing:    'Breathing / Respiratory',
  general:      'General',
  member:       'My Exercises',
}

interface Props {
  providerId:      string
  suggestions:     ExerciseSuggestion[]
  onInsertExercise:(exercise: Exercise) => void
  onSaveExercise:  (category: string, name: string, instructions: string) => Promise<void>
  onDeleteExercise:(exerciseId: string) => Promise<void>
}

export default function ExercisePanel({
  providerId,
  suggestions,
  onInsertExercise,
  onSaveExercise,
  onDeleteExercise,
}: Props) {
  const [exercises,     setExercises]    = useState<Exercise[]>([])
  const [loading,       setLoading]      = useState(true)
  const [search,        setSearch]       = useState('')
  const [expanded,      setExpanded]     = useState<string | null>(null)
  const [tab,           setTab]          = useState<'library' | 'suggestions'>('library')
  const [saving,        setSaving]       = useState(false)
  const [showSaveForm,  setShowSaveForm] = useState(false)
  const [saveName,      setSaveName]     = useState('')
  const [saveCategory,  setSaveCategory] = useState('general')
  const [saveInstr,     setSaveInstr]    = useState('')

  const loadExercises = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/mychat/exercises?providerId=${providerId}`)
      if (res.ok) {
        const data = await res.json()
        setExercises(data.exercises ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [providerId])

  useEffect(() => { loadExercises() }, [loadExercises])

  // Listen for save-exercise events from the editor bubble menu
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { text } = e.detail ?? {}
      if (text) { setSaveInstr(text); setShowSaveForm(true); setTab('library') }
    }
    window.addEventListener('working-editor:save-exercise', handler as EventListener)
    return () => window.removeEventListener('working-editor:save-exercise', handler as EventListener)
  }, [])

  const handleSave = async () => {
    if (!saveName.trim() || !saveInstr.trim()) return
    setSaving(true)
    try {
      await onSaveExercise(saveCategory, saveName.trim(), saveInstr.trim())
      setSaveName(''); setSaveInstr(''); setShowSaveForm(false)
      await loadExercises()
    } finally {
      setSaving(false)
    }
  }

  const filtered = exercises.filter(ex => {
    const q = search.toLowerCase()
    return (
      ex.name.toLowerCase().includes(q) ||
      ex.description.toLowerCase().includes(q) ||
      (ex.tags as unknown as string[]).some((t: string) => t.toLowerCase().includes(q))
    )
  })

  // Group by category — member exercises shown under 'member'
  const grouped: Record<string, Exercise[]> = {}
  for (const ex of filtered) {
    const key = ex.is_system ? ex.category : 'member'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(ex)
  }
  const orderedCategories = [
    ...Object.keys(CATEGORY_LABELS).filter(k => k !== 'member' && grouped[k]?.length),
    ...(grouped['member']?.length ? ['member'] : []),
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-3 py-2 border-b border-[#F0F0F0] shrink-0">
        <h3 className="text-xs font-semibold text-[#0D0D0D] tracking-wide uppercase">Exercise Library</h3>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#F0F0F0] shrink-0">
        {(['library', 'suggestions'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-xs py-2 font-medium transition-colors ${
              tab === t
                ? 'border-b-2 border-[#0D0D0D] text-[#0D0D0D]'
                : 'text-[#999] hover:text-[#666]'
            }`}
          >
            {t === 'library' ? 'Library' : `Suggested${suggestions.length ? ` (${suggestions.length})` : ''}`}
          </button>
        ))}
      </div>

      {tab === 'library' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Search */}
          <div className="px-3 py-2 shrink-0">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search exercises…"
              className="w-full text-xs border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#999]"
            />
          </div>

          {/* Exercise list */}
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {loading ? (
              <p className="text-xs text-[#999] text-center py-4">Loading…</p>
            ) : orderedCategories.length === 0 ? (
              <p className="text-xs text-[#999] text-center py-4">No exercises found</p>
            ) : (
              orderedCategories.map(cat => (
                <div key={cat} className="mb-3">
                  <p className="text-[10px] font-semibold text-[#999] uppercase tracking-wider px-1 mb-1">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </p>
                  {grouped[cat].map(ex => (
                    <div
                      key={ex.id}
                      className="border border-[#F0F0F0] rounded-lg mb-1 overflow-hidden"
                    >
                      <button
                        onClick={() => setExpanded(expanded === ex.id ? null : ex.id)}
                        className="w-full text-left px-2.5 py-2 text-xs flex items-start gap-2 hover:bg-[#F8F8F8]"
                      >
                        <span className="flex-1 font-medium text-[#0D0D0D] leading-tight">{ex.name}</span>
                        <svg className={`w-3 h-3 text-[#999] shrink-0 mt-0.5 transition-transform ${expanded === ex.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {expanded === ex.id && (
                        <div className="px-2.5 pb-2.5 border-t border-[#F0F0F0] bg-[#FAFAFA]">
                          {ex.description && <p className="text-[11px] text-[#666] mt-1.5 leading-relaxed">{ex.description}</p>}
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {ex.default_sets && <span className="text-[10px] bg-[#F0F0F0] rounded px-1.5 py-0.5 text-[#666]">{ex.default_sets} sets</span>}
                            {ex.default_reps && <span className="text-[10px] bg-[#F0F0F0] rounded px-1.5 py-0.5 text-[#666]">{ex.default_reps} reps</span>}
                            {ex.default_hold && <span className="text-[10px] bg-[#F0F0F0] rounded px-1.5 py-0.5 text-[#666]">Hold {ex.default_hold}s</span>}
                            {ex.default_duration && <span className="text-[10px] bg-[#F0F0F0] rounded px-1.5 py-0.5 text-[#666]">{ex.default_duration}</span>}
                          </div>
                          <div className="flex gap-1 mt-2">
                            <button
                              onClick={() => onInsertExercise(ex)}
                              className="flex-1 text-[11px] font-medium bg-[#0D0D0D] text-white rounded-lg py-1.5 hover:bg-[#333] transition-colors"
                            >
                              Add to HEP
                            </button>
                            {!ex.is_system && (
                              <button
                                onClick={() => onDeleteExercise(ex.id)}
                                className="text-[11px] text-red-500 border border-red-200 rounded-lg px-2.5 py-1.5 hover:bg-red-50 transition-colors"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Save custom exercise form */}
          {showSaveForm ? (
            <div className="shrink-0 border-t border-[#F0F0F0] p-3 bg-[#FAFAFA]">
              <p className="text-xs font-medium text-[#0D0D0D] mb-2">Save custom exercise</p>
              <input
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                placeholder="Exercise name"
                className="w-full text-xs border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#999] mb-1.5"
              />
              <select
                value={saveCategory}
                onChange={e => setSaveCategory(e.target.value)}
                className="w-full text-xs border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#999] mb-1.5 bg-white"
              >
                {Object.entries(CATEGORY_LABELS).filter(([k]) => k !== 'member').map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <textarea
                value={saveInstr}
                onChange={e => setSaveInstr(e.target.value)}
                placeholder="Patient instructions…"
                rows={3}
                className="w-full text-xs border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#999] mb-2 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !saveName.trim() || !saveInstr.trim()}
                  className="flex-1 text-xs font-medium bg-[#0D0D0D] text-white rounded-lg py-1.5 disabled:opacity-40 hover:bg-[#333] transition-colors"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setShowSaveForm(false)}
                  className="text-xs text-[#666] border border-[#E5E5E5] rounded-lg px-3 py-1.5 hover:bg-[#F5F5F5]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="shrink-0 border-t border-[#F0F0F0] p-2">
              <button
                onClick={() => setShowSaveForm(true)}
                className="w-full text-xs text-[#666] hover:text-[#0D0D0D] hover:bg-[#F5F5F5] rounded-lg py-2 transition-colors"
              >
                + Save custom exercise
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'suggestions' && (
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {suggestions.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs text-[#999]">No suggestions yet.</p>
              <p className="text-[11px] text-[#bbb] mt-1">Generate an HEP to see AI-suggested exercises.</p>
            </div>
          ) : (
            suggestions.map((s, i) => (
              <div key={i} className="border border-[#F0F0F0] rounded-lg p-2.5 mb-1.5">
                <p className="text-[10px] text-[#999] uppercase tracking-wide mb-0.5">{s.category}</p>
                <p className="text-xs font-medium text-[#0D0D0D]">{s.name}</p>
                <p className="text-[11px] text-[#666] mt-0.5 leading-relaxed">{s.reason}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
