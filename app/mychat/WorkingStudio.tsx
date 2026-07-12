'use client'

/**
 * WorkingStudio — full-screen physiotherapy clinical documentation workspace.
 * Physio persona analog of DraftingStudio (advocate).
 *
 * Modes: Assess · Note · Plan · Exercise (HEP) · Report · Refine
 *
 * Architecture mirrors DraftingStudio exactly:
 *   - fixed inset-0 z-50 overlay, if (!open) return null
 *   - Props: { providerId, open, onClose, seed props }
 *   - Reuses app/mychat/editor/* (LegalEditor → same component, domain-neutral)
 *   - All AI calls → POST /api/mychat/working
 *   - Persistence: /api/mychat/clinical-notes, /treatment-plans, /hep
 *   - Rate-limited, plan-gated (feature_key 'working')
 */

import dynamic      from 'next/dynamic'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { computeRedlineOps, buildRedlineHtml, acceptAllRedline, rejectAllRedline } from '@/lib/editor/redline'

import RibbonToolbar from './editor/RibbonToolbar'
import OutlinePanel  from './editor/OutlinePanel'
import StatusBar     from './editor/StatusBar'
import ExercisePanel from './editor/ExercisePanel'
import type { MarginPreset } from './editor/LegalEditor'
import type { ClinicalFinding, Exercise, ExerciseSuggestion, HepExerciseEntry } from './editor/types'

// TipTap editor — client-only (same component used by DraftingStudio)
const LegalEditor = dynamic(() => import('./editor/LegalEditor'), { ssr: false })

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = 'assess' | 'note' | 'plan' | 'hep' | 'report' | 'refine'

export interface WorkingSeed {
  studentId?:   string
  patientName?: string
  mode?:        Mode
}

interface ClinicalTemplate {
  id:         string
  doc_type:   string
  label:      string
  description?: string
  fields:     Array<{ id: string; label: string; placeholder: string; required: boolean }>
  is_system:  boolean
}

interface SavedDocument {
  id:         string
  title:      string
  doc_type?:  string
  note_type?: string
  status:     string
  visit_date?: string
  updated_at: string
}

interface Props {
  providerId:    string
  open:          boolean
  onClose:       () => void
  seedStudentId?: string
  seedPatientName?: string
  seedMode?:     Mode
}

// Daily limit message constant
const DISCLAIMER = '⚕️ AI-assisted documentation aid — always review and adapt to your clinical judgement before finalising.'

// ── Component ─────────────────────────────────────────────────────────────────

export default function WorkingStudio({
  providerId,
  open,
  onClose,
  seedStudentId,
  seedPatientName,
  seedMode,
}: Props) {
  // ── Mode & UI state ─────────────────────────────────────────────────────────
  const [mode,           setMode]          = useState<Mode>(seedMode ?? 'note')
  const [sidebarOpen,    setSidebarOpen]   = useState(true)
  const [rightPanel,     setRightPanel]    = useState<'exercises' | 'outline'>('outline')
  const [rightOpen,      setRightOpen]     = useState(true)
  const [focusMode,      setFocusMode]     = useState(false)

  // ── Patient context ─────────────────────────────────────────────────────────
  const [patientName,    setPatientName]   = useState(seedPatientName ?? '')
  const [studentId,      setStudentId]     = useState(seedStudentId ?? '')

  // ── Editor state ────────────────────────────────────────────────────────────
  const [editorHtml,     setEditorHtml]    = useState('')
  const [docTitle,       setDocTitle]      = useState('')
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null)
  const [zoom,           setZoom]          = useState(1)
  const [margin,         setMargin]        = useState<MarginPreset>('normal')
  const [lineHeight,     setLineHeight]    = useState('1.5')
  const [hasRedline,     setHasRedline]    = useState(false)

  // ── AI / generation state ───────────────────────────────────────────────────
  const [loading,        setLoading]       = useState(false)
  const [error,          setError]         = useState('')
  const [findings,       setFindings]      = useState<ClinicalFinding[]>([])
  const [exerciseSugs,   setExerciseSugs]  = useState<ExerciseSuggestion[]>([])

  // ── Templates & saved docs ──────────────────────────────────────────────────
  const [templates,      setTemplates]     = useState<ClinicalTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<ClinicalTemplate | null>(null)
  const [templateFields, setTemplateFields] = useState<Record<string, string>>({})
  const [savedDocs,      setSavedDocs]     = useState<SavedDocument[]>([])
  const [activeDocId,    setActiveDocId]   = useState<string | null>(null)
  const [shareToken,     setShareToken]    = useState<string | null>(null)
  const [attachedPatient, setAttachedPatient] = useState(studentId)

  // ── Mode-specific form state ────────────────────────────────────────────────
  // Assess
  const [subjectiveFields, setSubjectiveFields] = useState({ chiefComplaint: '', painScore: '', onset: '', aggravating: '', easing: '', pastHistory: '', medications: '' })
  const [objectiveFields,  setObjectiveFields]  = useState({ observation: '', romFindings: '', strengthFindings: '', specialTests: '', palpation: '', posture: '' })
  const [redFlags,         setRedFlags]         = useState('')
  // Note
  const [sessionBullets,   setSessionBullets]   = useState('')
  const [patientContext,   setPatientContext]    = useState({ name: patientName, diagnosis: '', treatmentGoals: '', lastSessionSummary: '' })
  // Plan
  const [assessmentSummary, setAssessmentSummary] = useState('')
  // HEP
  const [hepExercises,     setHepExercises]     = useState<HepExerciseEntry[]>([])
  const [hepInstructions,  setHepInstructions]  = useState('')
  // Refine
  const [refineInstruction, setRefineInstruction] = useState('')

  const hasEditor = editorHtml.trim().length > 0

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !providerId) return
    Promise.all([
      fetch(`/api/mychat/clinical-templates?providerId=${providerId}&persona=physio`).then(r => r.json()),
      fetch(`/api/mychat/clinical-notes?providerId=${providerId}`).then(r => r.json()),
    ]).then(([tData, dData]) => {
      setTemplates(tData.templates ?? [])
      setSavedDocs((dData.notes ?? []).map((n: Record<string, string>) => ({
        id: n.id, title: n.title || `Note ${n.visit_date || ''}`, doc_type: n.note_type, note_type: n.note_type, status: n.status, visit_date: n.visit_date, updated_at: n.updated_at,
      })))
    })
  }, [open, providerId])

  useEffect(() => {
    if (seedStudentId) setStudentId(seedStudentId)
    if (seedPatientName) { setPatientName(seedPatientName); setPatientContext(p => ({ ...p, name: seedPatientName })) }
    if (seedMode) setMode(seedMode)
  }, [seedStudentId, seedPatientName, seedMode])

  // ── AI call helper ────────────────────────────────────────────────────────
  const callWorking = useCallback(async (payload: Record<string, unknown>) => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/mychat/working', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, ...payload }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Generation failed'); return null }
      return data.message as string
    } catch {
      setError('Network error — please try again')
      return null
    } finally {
      setLoading(false)
    }
  }, [providerId])

  // ── SSE streaming ─────────────────────────────────────────────────────────
  const streamWorking = useCallback(async (payload: Record<string, unknown>, onToken: (t: string) => void) => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/mychat/working', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, ...payload }),
      })
      if (!res.ok || !res.body) { setError('Generation failed'); return }
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]' || payload === '[ERROR]') break
          try { const { token } = JSON.parse(payload); onToken(token) } catch { /* skip */ }
        }
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }, [providerId])

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    let payload: Record<string, unknown> = {}

    switch (mode) {
      case 'assess':
        payload = { mode: 'assess', subjectiveData: subjectiveFields, objectiveData: objectiveFields, redFlags }
        break
      case 'note':
        payload = { mode: 'note', sessionBullets, patientContext }
        break
      case 'plan':
        payload = { mode: 'plan', assessmentSummary }
        break
      case 'hep':
        if (hepExercises.length === 0) { setError('Add at least one exercise first'); return }
        payload = { mode: 'hep', exercises: hepExercises, hepInstructions }
        break
      case 'report':
        if (!selectedTemplate) { setError('Select a report type first'); return }
        payload = { mode: 'report', reportType: selectedTemplate.doc_type, reportLabel: selectedTemplate.label, reportFields: templateFields }
        break
      case 'refine':
        if (!editorHtml.trim()) { setError('Load a document first'); return }
        payload = { mode: 'refine', docBody: editorHtml, instruction: refineInstruction }
        if (refineInstruction) {
          const original = editorHtml
          const result = await callWorking(payload)
          if (result) {
            const ops     = computeRedlineOps(original, result)
            const redline = buildRedlineHtml(ops)
            setEditorHtml(redline); setHasRedline(true)
          }
          return
        }
        break
    }

    const result = await callWorking(payload)
    if (result) {
      setEditorHtml(result)
      if (!docTitle) setDocTitle(mode === 'report' ? (selectedTemplate?.label ?? 'Report') : mode.charAt(0).toUpperCase() + mode.slice(1) + ' Note')
    }
  }, [mode, subjectiveFields, objectiveFields, redFlags, sessionBullets, patientContext, assessmentSummary, hepExercises, hepInstructions, selectedTemplate, templateFields, editorHtml, refineInstruction, callWorking, docTitle])

  // ── Completeness check ────────────────────────────────────────────────────
  const handleCompletenessCheck = async () => {
    if (!editorHtml.trim()) return
    const res = await callWorking({ action: 'completeness_check', docBody: editorHtml })
    if (res) {
      try { setFindings(JSON.parse(res)) } catch { /* if not JSON, ignore */ }
    }
  }

  // ── Suggest exercises ──────────────────────────────────────────────────────
  const handleSuggestExercises = async () => {
    if (!editorHtml.trim()) return
    const res = await callWorking({ action: 'suggest_exercises', docBody: editorHtml, docTypeHint: mode })
    if (res) {
      try { setExerciseSugs(JSON.parse(res)) } catch { /* ignore */ }
    }
  }

  // ── Save document ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!editorHtml.trim()) return
    try {
      let endpoint = '/api/mychat/clinical-notes'
      const body: Record<string, unknown> = {
        providerId,
        studentId: attachedPatient || null,
        docBody: editorHtml,
        title: docTitle || 'Untitled',
      }

      if (mode === 'plan') endpoint = '/api/mychat/treatment-plans'
      else if (mode === 'hep') { endpoint = '/api/mychat/hep'; body.exercises = hepExercises; body.instructions = hepInstructions }
      else { body.note_type = mode === 'assess' ? 'eval' : mode === 'refine' ? 'progress' : 'progress' }

      const method = activeDocId ? 'PATCH' : 'POST'
      if (activeDocId) body.id = activeDocId

      const res = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) {
        const data = await res.json()
        const saved = data.note ?? data.plan ?? data.hep
        if (saved) setActiveDocId(saved.id)
      }
    } catch { /* ignore */ }
  }

  // ── Export .docx ───────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!editorHtml.trim() || !editorInstance) return
    try {
      const json = editorInstance.getJSON()
      const res  = await fetch('/api/mychat/working/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, json, title: docTitle || 'clinical-document' }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href = url; a.download = `${(docTitle || 'document').toLowerCase().replace(/\s+/g, '-')}.docx`
        a.click(); URL.revokeObjectURL(url)
      }
    } catch { /* ignore */ }
  }

  // ── Share link ─────────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (!activeDocId) { await handleSave() }
    const endpoint = mode === 'hep' ? '/api/mychat/hep' : '/api/mychat/clinical-notes'
    const res = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId, id: activeDocId, share: true }),
    })
    if (res.ok) {
      const data = await res.json()
      const token = (data.note ?? data.hep)?.share_token
      if (token) {
        setShareToken(token)
        await navigator.clipboard.writeText(`${window.location.origin}/clinical/${token}`)
      }
    }
  }

  // ── Add exercise to HEP ────────────────────────────────────────────────────
  const handleInsertExercise = (ex: Exercise) => {
    const entry: HepExerciseEntry = {
      exercise_id: ex.id,
      name:      ex.name,
      sets:      ex.default_sets,
      reps:      ex.default_reps ?? undefined,
      hold:      ex.default_hold ?? undefined,
      duration:  ex.default_duration ?? undefined,
      frequency: '2× per day',
      cues:      ex.instructions,
    }
    setHepExercises(prev => [...prev, entry])
    if (mode !== 'hep') setMode('hep')
  }

  const handleSaveExercise = async (category: string, name: string, instructions: string) => {
    await fetch('/api/mychat/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId, category, name, instructions, description: '' }),
    })
  }

  const handleDeleteExercise = async (exerciseId: string) => {
    await fetch(`/api/mychat/exercises?providerId=${providerId}&id=${exerciseId}`, { method: 'DELETE' })
  }

  // ── Early return ───────────────────────────────────────────────────────────
  if (!open) return null

  const MODES: Array<{ id: Mode; label: string }> = [
    { id: 'assess',  label: 'Assess' },
    { id: 'note',    label: 'Note' },
    { id: 'plan',    label: 'Plan' },
    { id: 'hep',     label: 'Exercise' },
    { id: 'report',  label: 'Report' },
    { id: 'refine',  label: 'Refine' },
  ]

  const SEVERITY_COLOR: Record<string, string> = {
    critical:   'bg-red-50 text-red-700 border-red-200',
    caution:    'bg-amber-50 text-amber-700 border-amber-200',
    suggestion: 'bg-blue-50 text-blue-700 border-blue-200',
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* ── Header ── */}
      <header className="bg-white border-b border-[#E5E5E5] px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {/* Close */}
          <button onClick={onClose} className="text-[#666] hover:text-[#0D0D0D] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-[#0D0D0D]">Working Studio</span>
          {patientName && <span className="text-xs text-[#999] hidden sm:block">— {patientName}</span>}
        </div>

        {/* Mode pills */}
        <div className="flex items-center bg-[#F5F5F5] rounded-lg p-0.5 gap-0.5">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                mode === m.id
                  ? 'bg-white text-[#0D0D0D] shadow-sm'
                  : 'text-[#666] hover:text-[#0D0D0D]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-2">
          {hasEditor && (
            <>
              <button
                onClick={handleCompletenessCheck}
                disabled={loading}
                className="hidden lg:flex text-xs items-center gap-1 text-[#666] hover:text-[#0D0D0D] border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 hover:bg-[#F5F5F5] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Check
              </button>
              {hasRedline && (
                <div className="flex items-center gap-1">
                  <button onClick={() => { const html = editorInstance?.getHTML() ?? editorHtml; setEditorHtml(acceptAllRedline(html)); setHasRedline(false) }}
                    className="text-xs text-green-700 border border-green-200 bg-green-50 rounded-lg px-2 py-1.5 hover:bg-green-100">
                    Accept all
                  </button>
                  <button onClick={() => { const html = editorInstance?.getHTML() ?? editorHtml; setEditorHtml(rejectAllRedline(html)); setHasRedline(false) }}
                    className="text-xs text-red-600 border border-red-200 bg-red-50 rounded-lg px-2 py-1.5 hover:bg-red-100">
                    Reject all
                  </button>
                </div>
              )}
            </>
          )}
          <button onClick={() => setFocusMode(f => !f)}
            className="text-xs text-[#666] hover:text-[#0D0D0D] border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 hover:bg-[#F5F5F5] transition-colors hidden lg:block">
            {focusMode ? 'Exit focus' : 'Focus'}
          </button>
        </div>
      </header>

      {/* ── Disclaimer ── */}
      <div className="shrink-0 bg-amber-50 border-b border-amber-100 px-4 py-1.5">
        <p className="text-[11px] text-amber-700">{DISCLAIMER}</p>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left sidebar — saved documents */}
        {sidebarOpen && !focusMode && (
          <aside className="w-56 border-r border-[#E5E5E5] flex flex-col overflow-hidden shrink-0">
            <div className="px-3 py-2 border-b border-[#F0F0F0]">
              <h3 className="text-xs font-semibold text-[#0D0D0D] uppercase tracking-wide">Saved</h3>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {savedDocs.length === 0 ? (
                <p className="text-xs text-[#999] text-center py-4">No saved documents yet</p>
              ) : savedDocs.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => {/* load doc */}}
                  className={`w-full text-left px-2.5 py-2 rounded-lg mb-1 hover:bg-[#F5F5F5] transition-colors ${activeDocId === doc.id ? 'bg-[#F5F5F5]' : ''}`}
                >
                  <p className="text-xs font-medium text-[#0D0D0D] truncate">{doc.title}</p>
                  <p className="text-[10px] text-[#999] mt-0.5">{doc.note_type ?? doc.doc_type} · {doc.visit_date ?? doc.updated_at?.slice(0, 10)}</p>
                  {doc.status === 'final' && (
                    <span className="text-[10px] bg-green-100 text-green-700 rounded px-1.5 py-0.5 mt-0.5 inline-block">Final</span>
                  )}
                </button>
              ))}
            </div>
            <div className="shrink-0 p-2 border-t border-[#F0F0F0]">
              <input
                value={patientName}
                onChange={e => { setPatientName(e.target.value); setPatientContext(p => ({ ...p, name: e.target.value })) }}
                placeholder="Patient name…"
                className="w-full text-xs border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#999]"
              />
            </div>
          </aside>
        )}

        {/* Center — forms + editor */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Editor ribbon (only when document is loaded) */}
          {hasEditor && editorInstance && (
            <RibbonToolbar
              editor={editorInstance}
              onInsertClause={() => { setRightPanel('exercises'); setRightOpen(true) }}
              onProofread={() => {}}
              onCitations={() => {}}
              onAcceptRedline={() => { const html = editorInstance?.getHTML() ?? editorHtml; setEditorHtml(acceptAllRedline(html)); setHasRedline(false) }}
              onRejectRedline={() => { const html = editorInstance?.getHTML() ?? editorHtml; setEditorHtml(rejectAllRedline(html)); setHasRedline(false) }}
              margin={margin}
              lineHeight={lineHeight}
              onMarginChange={setMargin}
              onLineHeightChange={setLineHeight}
              showRedline={hasRedline}
              proofFindingCount={findings.length}
              citationCount={0}
            />
          )}

          {/* Mode-specific input forms */}
          {!focusMode && (
            <div className="shrink-0 overflow-y-auto border-b border-[#E5E5E5] bg-[#FAFAFA] max-h-72">
              <div className="p-4">

                {/* ── Assess ── */}
                {mode === 'assess' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold text-[#0D0D0D] mb-2">Subjective</p>
                      {[
                        ['chiefComplaint', 'Chief complaint', 'e.g. Right shoulder pain for 3 weeks'],
                        ['painScore',      'Pain score (VAS/NPRS)',  'e.g. 7/10 at rest, 9/10 with movement'],
                        ['onset',          'Onset & mechanism',      'e.g. Gradual onset, worse with overhead'],
                        ['aggravating',    'Aggravating factors',    'e.g. Reaching overhead, carrying bags'],
                        ['easing',         'Easing factors',         'e.g. Rest, warmth'],
                        ['pastHistory',    'Past medical history',   'e.g. Previous rotator cuff surgery 2021'],
                        ['medications',    'Current medications',    'e.g. Ibuprofen 400mg PRN'],
                      ].map(([k, label, ph]) => (
                        <div key={k} className="mb-1.5">
                          <label className="text-[11px] text-[#666] block mb-0.5">{label}</label>
                          <input
                            value={subjectiveFields[k as keyof typeof subjectiveFields]}
                            onChange={e => setSubjectiveFields(f => ({ ...f, [k]: e.target.value }))}
                            placeholder={ph}
                            className="w-full text-xs border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#999] bg-white"
                          />
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#0D0D0D] mb-2">Objective</p>
                      {[
                        ['observation',       'Observation',            'e.g. Antalgic posture, muscle guarding'],
                        ['romFindings',        'ROM findings',           'e.g. Flexion 90°, Abduction 70°, ER limited'],
                        ['strengthFindings',   'Strength (MMT)',         'e.g. Supraspinatus 3/5, Deltoid 4/5'],
                        ['specialTests',       'Special tests',          'e.g. Hawkins +ve, Empty Can +ve, NeER +ve'],
                        ['palpation',          'Palpation',              'e.g. Tender over greater tuberosity'],
                        ['posture',            'Posture / gait',         'e.g. Forward head, rounded shoulders'],
                      ].map(([k, label, ph]) => (
                        <div key={k} className="mb-1.5">
                          <label className="text-[11px] text-[#666] block mb-0.5">{label}</label>
                          <input
                            value={objectiveFields[k as keyof typeof objectiveFields]}
                            onChange={e => setObjectiveFields(f => ({ ...f, [k]: e.target.value }))}
                            placeholder={ph}
                            className="w-full text-xs border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#999] bg-white"
                          />
                        </div>
                      ))}
                      <div className="mb-1.5">
                        <label className="text-[11px] text-[#666] block mb-0.5">Red-flag screening</label>
                        <input
                          value={redFlags}
                          onChange={e => setRedFlags(e.target.value)}
                          placeholder="e.g. No red flags identified / Bladder dysfunction — refer urgently"
                          className="w-full text-xs border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#999] bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Note ── */}
                {mode === 'note' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold text-[#0D0D0D] mb-2">Patient context</p>
                      {[
                        ['diagnosis',          'Working diagnosis',     'e.g. Lumbar disc herniation L4/L5'],
                        ['treatmentGoals',     'Treatment goals',       'e.g. Pain-free ADLs, return to tennis'],
                        ['lastSessionSummary', 'Last session summary',  'e.g. Improved ROM, tolerated mobilisations well'],
                      ].map(([k, label, ph]) => (
                        <div key={k} className="mb-1.5">
                          <label className="text-[11px] text-[#666] block mb-0.5">{label}</label>
                          <input
                            value={patientContext[k as keyof typeof patientContext]}
                            onChange={e => setPatientContext(p => ({ ...p, [k]: e.target.value }))}
                            placeholder={ph}
                            className="w-full text-xs border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#999] bg-white"
                          />
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#0D0D0D] block mb-2">Session notes (bullet points)</label>
                      <textarea
                        value={sessionBullets}
                        onChange={e => setSessionBullets(e.target.value)}
                        placeholder="• Reported pain 5/10 today (down from 7/10)&#10;• L4 mobilisation grade III-IV × 3 sets&#10;• Reassessed SLR — negative today&#10;• HEP compliance good, added prone press-ups"
                        rows={7}
                        className="w-full text-xs border border-[#E5E5E5] rounded-lg px-2.5 py-2 outline-none focus:border-[#999] bg-white resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* ── Plan ── */}
                {mode === 'plan' && (
                  <div>
                    <label className="text-xs font-semibold text-[#0D0D0D] block mb-2">Assessment findings / clinical summary</label>
                    <textarea
                      value={assessmentSummary}
                      onChange={e => setAssessmentSummary(e.target.value)}
                      placeholder="Paste your assessment summary or key findings here. Include diagnosis, pain scores, ROM deficits, strength grades, and what the patient cannot do…"
                      rows={6}
                      className="w-full text-xs border border-[#E5E5E5] rounded-lg px-2.5 py-2 outline-none focus:border-[#999] bg-white resize-none"
                    />
                  </div>
                )}

                {/* ── HEP ── */}
                {mode === 'hep' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-[#0D0D0D]">Home Exercise Program</p>
                      <button
                        onClick={() => { setRightPanel('exercises'); setRightOpen(true) }}
                        className="text-xs text-[#666] border border-[#E5E5E5] rounded-lg px-2.5 py-1 hover:bg-[#F5F5F5]"
                      >
                        + Browse library
                      </button>
                    </div>
                    {hepExercises.length === 0 ? (
                      <p className="text-xs text-[#999] py-3">No exercises added yet. Browse the exercise library on the right →</p>
                    ) : (
                      <div className="space-y-1.5">
                        {hepExercises.map((ex, i) => (
                          <div key={i} className="flex items-start gap-2 bg-white border border-[#E5E5E5] rounded-lg px-3 py-2">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-[#0D0D0D]">{ex.name}</p>
                              <p className="text-[11px] text-[#666] mt-0.5">
                                {[ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`, ex.hold && `hold ${ex.hold}s`, ex.duration, ex.frequency].filter(Boolean).join(' · ')}
                              </p>
                            </div>
                            <button onClick={() => setHepExercises(prev => prev.filter((_, j) => j !== i))} className="text-[#bbb] hover:text-red-500 mt-0.5">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-2">
                      <label className="text-[11px] text-[#666] block mb-1">General instructions / precautions</label>
                      <input
                        value={hepInstructions}
                        onChange={e => setHepInstructions(e.target.value)}
                        placeholder="e.g. Stop if you experience sharp or worsening pain. Perform daily."
                        className="w-full text-xs border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#999] bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* ── Report ── */}
                {mode === 'report' && (
                  <div>
                    {!selectedTemplate ? (
                      <div>
                        <p className="text-xs font-semibold text-[#0D0D0D] mb-2">Select report type</p>
                        <div className="grid grid-cols-2 gap-2">
                          {templates.map(t => (
                            <button
                              key={t.id}
                              onClick={() => { setSelectedTemplate(t); setTemplateFields({}) }}
                              className="text-left border border-[#E5E5E5] rounded-lg p-2.5 hover:bg-[#F5F5F5] hover:border-[#999] transition-colors"
                            >
                              <p className="text-xs font-medium text-[#0D0D0D]">{t.label}</p>
                              {t.description && <p className="text-[11px] text-[#999] mt-0.5">{t.description}</p>}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-[#0D0D0D]">{selectedTemplate.label}</p>
                          <button onClick={() => setSelectedTemplate(null)} className="text-xs text-[#666] hover:text-[#0D0D0D]">← Change</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {selectedTemplate.fields.map(f => (
                            <div key={f.id}>
                              <label className="text-[11px] text-[#666] block mb-0.5">{f.label}{f.required && ' *'}</label>
                              <input
                                value={templateFields[f.id] ?? ''}
                                onChange={e => setTemplateFields(prev => ({ ...prev, [f.id]: e.target.value }))}
                                placeholder={f.placeholder}
                                className="w-full text-xs border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#999] bg-white"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Refine ── */}
                {mode === 'refine' && (
                  <div>
                    <label className="text-xs font-semibold text-[#0D0D0D] block mb-2">Refinement instruction</label>
                    <input
                      value={refineInstruction}
                      onChange={e => setRefineInstruction(e.target.value)}
                      placeholder="e.g. Make the assessment section more concise · Add a patient education section · Simplify for patient reading"
                      className="w-full text-xs border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#999] bg-white"
                    />
                  </div>
                )}

                {/* Generate button */}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="flex items-center gap-2 bg-[#0D0D0D] text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-[#333] disabled:opacity-50 transition-colors"
                  >
                    {loading ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Generating…
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {mode === 'assess' ? 'Generate eval note' : mode === 'note' ? 'Generate SOAP note' : mode === 'plan' ? 'Generate treatment plan' : mode === 'hep' ? 'Generate HEP handout' : mode === 'report' ? 'Generate report' : 'Refine document'}
                      </>
                    )}
                  </button>
                  {error && <p className="text-xs text-red-500">{error}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Document title bar */}
          {hasEditor && (
            <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-[#E5E5E5] bg-white">
              <input
                value={docTitle}
                onChange={e => setDocTitle(e.target.value)}
                placeholder="Document title…"
                className="flex-1 text-sm font-medium text-[#0D0D0D] outline-none bg-transparent placeholder:text-[#bbb]"
              />
              <button onClick={() => setSidebarOpen(s => !s)} className="text-[#999] hover:text-[#0D0D0D] p-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </button>
            </div>
          )}

          {/* Editor canvas */}
          <div className="flex-1 overflow-hidden relative">
            {hasEditor ? (
              <LegalEditor
                initialHtml={editorHtml}
                onChange={html => setEditorHtml(html)}
                onEditorReady={ed => setEditorInstance(ed)}
                findings={[]}
                citations={[]}
                onBubbleAction={async () => {}}
                onOpenClausePanel={() => { setRightPanel('exercises'); setRightOpen(true) }}
                zoom={zoom}
                margin={margin}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-xs">
                  <div className="text-4xl mb-3">🧑‍⚕️</div>
                  <h3 className="text-sm font-semibold text-[#0D0D0D] mb-1">Working Studio</h3>
                  <p className="text-xs text-[#999] leading-relaxed">
                    Fill in the form above and click <strong>Generate</strong> to create your clinical document — evaluation note, SOAP note, treatment plan, HEP, or report.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* StatusBar */}
          {hasEditor && editorInstance && (
            <StatusBar editor={editorInstance} zoom={zoom} onZoom={setZoom} />
          )}

          {/* Action bar */}
          {hasEditor && (
            <div className="shrink-0 border-t border-[#E5E5E5] px-4 py-2 flex items-center gap-2 flex-wrap">
              <select
                value={attachedPatient}
                onChange={e => setAttachedPatient(e.target.value)}
                className="text-xs border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 outline-none bg-white max-w-[160px]"
              >
                <option value="">Attach to patient…</option>
              </select>
              <button onClick={handleSave} className="text-xs text-[#666] border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 hover:bg-[#F5F5F5]">Save</button>
              <button onClick={handleExport} className="text-xs text-[#666] border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 hover:bg-[#F5F5F5]">.docx</button>
              <button
                onClick={() => window.print()}
                className="text-xs text-[#666] border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 hover:bg-[#F5F5F5]"
              >
                Print
              </button>
              <button
                onClick={handleShare}
                className="text-xs text-[#666] border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 hover:bg-[#F5F5F5]"
              >
                {shareToken ? '✓ Link copied' : 'Share'}
              </button>
              {mode === 'hep' && (
                <button
                  onClick={handleSuggestExercises}
                  disabled={loading}
                  className="text-xs text-[#666] border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 hover:bg-[#F5F5F5] disabled:opacity-40"
                >
                  Suggest exercises
                </button>
              )}
            </div>
          )}

          {/* Completeness findings panel */}
          {findings.length > 0 && (
            <div className="shrink-0 border-t border-[#E5E5E5] max-h-40 overflow-y-auto px-4 py-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-[#0D0D0D]">Completeness check — {findings.length} finding{findings.length !== 1 ? 's' : ''}</p>
                <button onClick={() => setFindings([])} className="text-[11px] text-[#999] hover:text-[#666]">Dismiss</button>
              </div>
              {findings.map(f => (
                <div key={f.id} className={`text-xs border rounded-lg px-2.5 py-2 mb-1.5 ${SEVERITY_COLOR[f.severity] ?? 'bg-[#F5F5F5] text-[#666]'}`}>
                  <span className="font-semibold uppercase text-[10px] mr-1">{f.severity}</span>
                  {f.message}
                  {f.suggestion && <p className="mt-0.5 opacity-80">{f.suggestion}</p>}
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Right panel — Exercise library / Outline */}
        {rightOpen && !focusMode && (
          <aside className="w-64 border-l border-[#E5E5E5] flex flex-col overflow-hidden shrink-0">
            <div className="flex border-b border-[#F0F0F0] shrink-0">
              {(['outline', 'exercises'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setRightPanel(p)}
                  className={`flex-1 text-xs py-2 font-medium transition-colors ${
                    rightPanel === p
                      ? 'border-b-2 border-[#0D0D0D] text-[#0D0D0D]'
                      : 'text-[#999] hover:text-[#666]'
                  }`}
                >
                  {p === 'outline' ? 'Outline' : 'Exercises'}
                </button>
              ))}
              <button onClick={() => setRightOpen(false)} className="px-2 text-[#bbb] hover:text-[#666]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {rightPanel === 'outline' ? (
                <OutlinePanel editor={editorInstance} />
              ) : (
                <ExercisePanel
                  providerId={providerId}
                  suggestions={exerciseSugs}
                  onInsertExercise={handleInsertExercise}
                  onSaveExercise={handleSaveExercise}
                  onDeleteExercise={handleDeleteExercise}
                />
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
