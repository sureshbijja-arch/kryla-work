'use client'

/**
 * PractitionerStudio — config-driven full-screen clinical documentation workspace.
 *
 * Replaces WorkingStudio (physio-only) with a persona-agnostic engine.
 * All modes, form fields, and prompts are driven by DB config (studio_archetypes +
 * studio_modes). UI renders the correct form dynamically from mode.form_schema.
 *
 * Supported personas via archetype:
 *   rehab      — physio, occtherapist, speech, chiro
 *   counseling — counselor
 *   holistic   — homeopath, ayurveda
 *   careplan   — homenurse, postnatal, lactation
 *
 * Architecture mirrors DraftingStudio / WorkingStudio:
 *   - fixed inset-0 z-50 overlay
 *   - Props: { providerId, persona, open, onClose, seed props }
 *   - Reuses app/mychat/editor/* verbatim
 *   - AI calls  → POST /api/mychat/studio
 *   - CRUD      → /api/mychat/studio/documents
 *   - Library   → /api/mychat/studio/library (when archetype.has_library)
 *   - Templates → /api/mychat/studio/templates (for 'report' mode)
 */

import dynamic      from 'next/dynamic'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { computeRedlineOps, buildRedlineHtml, acceptAllRedline, rejectAllRedline } from '@/lib/editor/redline'

import RibbonToolbar from './editor/RibbonToolbar'
import OutlinePanel  from './editor/OutlinePanel'
import StatusBar     from './editor/StatusBar'
import LibraryPanel  from './editor/LibraryPanel'
import type { LibraryItem, LibraryItemEntry } from './editor/LibraryPanel'
import type { MarginPreset } from './editor/LegalEditor'
import type { ClinicalFinding } from './editor/types'

const LegalEditor = dynamic(() => import('./editor/LegalEditor'), { ssr: false })

// ── Types ─────────────────────────────────────────────────────────────────────

interface StudioMode {
  id:                  string
  key:                 string
  label:               string
  sort_order:          number
  form_schema:         FormField[]
  prompt_instructions: string
  output_format:       'html' | 'json' | 'redline'
  streaming:           boolean
}

interface FormField {
  id:          string
  label:       string
  type:        'text' | 'textarea' | 'select' | 'library'
  placeholder: string
  required:    boolean
  group:       string
  rows?:       number
  options?:    { value: string; label: string }[]
}

interface StudioArchetype {
  id:           string
  label:        string
  disclaimer:   string
  has_library:  boolean
  library_label: string
  feature_key:  string
}

interface StudioTemplate {
  id:          string
  doc_type:    string
  label:       string
  description?: string
  fields:      Array<{ id: string; label: string; placeholder: string; required: boolean }>
  is_system:   boolean
}

interface SavedDocument {
  id:          string
  title:       string
  doc_type:    string
  status:      string
  visit_date?: string
  updated_at:  string
}

export interface StudioSeed {
  studentId?:  string
  clientName?: string
  modeKey?:    string
}

interface Props {
  providerId:   string
  /** Provider's persona id — used to load archetype + modes from the studio config API */
  persona:      string
  open:         boolean
  onClose:      () => void
  seedStudentId?:  string
  seedClientName?: string
  seedModeKey?:    string
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PractitionerStudio({
  providerId,
  persona,
  open,
  onClose,
  seedStudentId,
  seedClientName,
  seedModeKey,
}: Props) {

  // ── Config loaded from DB ─────────────────────────────────────────────────
  const [archetype,    setArchetype]   = useState<StudioArchetype | null>(null)
  const [modes,        setModes]       = useState<StudioMode[]>([])
  const [patientNoun,  setPatientNoun] = useState('client')
  const [libCategories, setLibCategories] = useState<string[]>([])

  // ── Mode & UI state ───────────────────────────────────────────────────────
  const [modeKey,      setModeKey]     = useState(seedModeKey ?? 'note')
  const [sidebarOpen,  setSidebarOpen] = useState(true)
  const [rightPanel,   setRightPanel]  = useState<'library' | 'outline'>('outline')
  const [rightOpen,    setRightOpen]   = useState(true)
  const [focusMode,    setFocusMode]   = useState(false)

  // ── Client/patient context ────────────────────────────────────────────────
  const [clientName,   setClientName]  = useState(seedClientName ?? '')
  const [studentId,    setStudentId]   = useState(seedStudentId ?? '')

  // ── Editor state ──────────────────────────────────────────────────────────
  const [editorHtml,     setEditorHtml]     = useState('')
  const [docTitle,       setDocTitle]       = useState('')
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null)
  const [zoom,           setZoom]           = useState(1)
  const [margin,         setMargin]         = useState<MarginPreset>('normal')
  const [lineHeight,     setLineHeight]     = useState('1.5')
  const [hasRedline,     setHasRedline]     = useState(false)

  // ── AI / generation state ─────────────────────────────────────────────────
  const [loading,      setLoading]     = useState(false)
  const [error,        setError]       = useState('')
  const [findings,     setFindings]    = useState<ClinicalFinding[]>([])

  // ── Form values (single Record replaces per-mode state) ───────────────────
  const [formValues,   setFormValues]  = useState<Record<string, string>>({})
  const [libraryItems, setLibraryItems] = useState<LibraryItemEntry[]>([])

  // ── Templates + saved docs ────────────────────────────────────────────────
  const [templates,         setTemplates]         = useState<StudioTemplate[]>([])
  const [selectedTemplate,  setSelectedTemplate]  = useState<StudioTemplate | null>(null)
  const [templateFieldVals, setTemplateFieldVals] = useState<Record<string, string>>({})
  const [savedDocs,         setSavedDocs]         = useState<SavedDocument[]>([])
  const [activeDocId,       setActiveDocId]       = useState<string | null>(null)
  const [shareToken,        setShareToken]        = useState<string | null>(null)

  const hasEditor  = editorHtml.trim().length > 0
  const activeMode = modes.find(m => m.key === modeKey) ?? modes[0] ?? null

  // ── Load studio config on mount ───────────────────────────────────────────
  useEffect(() => {
    if (!open || !providerId || !persona) return

    // Load archetype + modes from API
    fetch(`/api/mychat/studio/config?persona=${persona}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        setArchetype(data.archetype)
        setModes(data.modes ?? [])
        setPatientNoun(data.patient_noun ?? 'client')
        setLibCategories(data.library_categories ?? [])
        if (!seedModeKey && data.modes?.length > 0) {
          setModeKey(data.modes[0].key)
        }
      })

    // Load templates + saved docs
    Promise.all([
      fetch(`/api/mychat/studio/templates?providerId=${providerId}&persona=${persona}`).then(r => r.json()),
      fetch(`/api/mychat/studio/documents?providerId=${providerId}`).then(r => r.json()),
    ]).then(([tData, dData]) => {
      setTemplates(tData.templates ?? [])
      setSavedDocs(dData.documents ?? [])
    })
  }, [open, providerId, persona, seedModeKey])

  useEffect(() => {
    if (seedStudentId)  setStudentId(seedStudentId)
    if (seedClientName) setClientName(seedClientName)
    if (seedModeKey)    setModeKey(seedModeKey)
  }, [seedStudentId, seedClientName, seedModeKey])

  // Reset form values when mode changes
  useEffect(() => {
    setFormValues({})
    setLibraryItems([])
    setSelectedTemplate(null)
    setTemplateFieldVals({})
  }, [modeKey])

  // ── AI call helpers ───────────────────────────────────────────────────────

  const callStudio = useCallback(async (payload: Record<string, unknown>) => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/mychat/studio', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ providerId, ...payload }),
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

  const streamStudio = useCallback(async (
    payload: Record<string, unknown>,
    onToken: (t: string) => void,
  ) => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/mychat/studio', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ providerId, ...payload }),
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
          const raw = line.slice(6)
          if (raw === '[DONE]') break
          try { const { delta } = JSON.parse(raw); onToken(delta) } catch { /* skip */ }
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
    if (!activeMode) return

    // Validate required fields
    const schema = activeMode.form_schema ?? []
    const missing = schema.filter(f => f.required && f.type !== 'library' && !formValues[f.id]?.trim())
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.map(f => f.label).join(', ')}`)
      return
    }

    // Build merged formValues including library items as JSON
    const merged: Record<string, string> = { ...formValues }
    if (libraryItems.length > 0) {
      merged['library_items'] = JSON.stringify(libraryItems)
    }

    // For report mode, merge template fields
    if (modeKey === 'report' && selectedTemplate) {
      merged['report_type'] = selectedTemplate.label
      Object.assign(merged, templateFieldVals)
    }

    const payload: Record<string, unknown> = {
      mode:       modeKey,
      formValues: merged,
      docBody:    editorHtml,
    }

    // SSE streaming modes
    if (activeMode.streaming || modeKey === 'continue' || modeKey === 'brainstorm') {
      let accumulated = ''
      await streamStudio(payload, token => {
        accumulated += token
        setEditorHtml(prev => prev + token)
        editorInstance?.commands.insertContent(token)
      })
      return
    }

    const result = await callStudio(payload)
    if (!result) return

    // Redline diff for 'refine' mode
    if (activeMode.output_format === 'redline' && editorHtml) {
      const ops = computeRedlineOps(editorHtml, result)
      const redlineHtml = buildRedlineHtml(ops)
      setEditorHtml(redlineHtml)
      editorInstance?.commands.setContent(redlineHtml)
      setHasRedline(true)
    } else {
      setEditorHtml(result)
      editorInstance?.commands.setContent(result)
      setHasRedline(false)
    }
  }, [activeMode, modeKey, formValues, libraryItems, selectedTemplate, templateFieldVals, editorHtml, editorInstance, callStudio, streamStudio])

  // ── Completeness check ────────────────────────────────────────────────────

  const handleCompletenessCheck = useCallback(async () => {
    if (!editorHtml.trim()) return
    const result = await callStudio({ action: 'completeness_check', docBody: editorHtml })
    if (!result) return
    try {
      const parsed = JSON.parse(result) as ClinicalFinding[]
      setFindings(parsed)
    } catch {
      setError('Could not parse completeness check result.')
    }
  }, [editorHtml, callStudio])

  // ── Editor bubble menu actions ────────────────────────────────────────────

  const handleEditorAction = useCallback(async (
    action: string,
    selectedHtml: string,
  ) => {
    const isStreaming = action === 'continue' || action === 'brainstorm'
    const payload: Record<string, unknown> = { action, docBody: editorHtml, selectedHtml }

    if (isStreaming) {
      await streamStudio(payload, token => {
        editorInstance?.commands.insertContent(token)
        setEditorHtml(prev => prev + token)
      })
      return
    }

    const result = await callStudio(payload)
    if (!result) return

    if (action === 'rewrite' || action === 'simplify') {
      if (selectedHtml && editorInstance) {
        const ops = computeRedlineOps(selectedHtml, result)
        const redlineHtml = buildRedlineHtml(ops)
        editorInstance.commands.insertContent(redlineHtml)
        setEditorHtml(editorInstance.getHTML())
        setHasRedline(true)
      }
    } else {
      editorInstance?.commands.insertContent(result)
      setEditorHtml(editorInstance?.getHTML() ?? result)
    }
  }, [editorHtml, editorInstance, callStudio, streamStudio])

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!editorHtml.trim()) { setError('Nothing to save yet'); return }
    const title = docTitle.trim() || `${activeMode?.label ?? modeKey} — ${new Date().toLocaleDateString()}`
    const body: Record<string, unknown> = {
      providerId,
      studentId:  studentId || null,
      persona,
      doc_type:   modeKey,
      title,
      body:       editorHtml,
      structured: { formValues, libraryItems },
    }
    if (activeDocId) {
      // Update
      const res = await fetch('/api/mychat/studio/documents', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...body, id: activeDocId }),
      })
      if (res.ok) {
        const { document: d } = await res.json()
        setSavedDocs(prev => prev.map(doc => doc.id === d.id ? { ...doc, ...d } : doc))
      }
    } else {
      // Create
      const res = await fetch('/api/mychat/studio/documents', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (res.ok) {
        const { document: d } = await res.json()
        setActiveDocId(d.id)
        setSavedDocs(prev => [d, ...prev])
      }
    }
  }, [editorHtml, docTitle, activeMode, modeKey, providerId, studentId, persona, formValues, libraryItems, activeDocId])

  // ── Share ─────────────────────────────────────────────────────────────────

  const handleShare = useCallback(async () => {
    if (!activeDocId) { await handleSave(); return }
    const res = await fetch('/api/mychat/studio/documents', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ providerId, id: activeDocId, share: true }),
    })
    if (res.ok) {
      const { document: d } = await res.json()
      if (d.share_token) setShareToken(d.share_token)
    }
  }, [activeDocId, providerId, handleSave])

  // ── Export ────────────────────────────────────────────────────────────────

  const handleExport = useCallback(async () => {
    if (!editorHtml.trim()) return
    const res = await fetch('/api/mychat/working/export', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ providerId, docBody: editorHtml, title: docTitle || 'Document' }),
    })
    if (!res.ok) return
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${docTitle || 'document'}.docx`; a.click()
    URL.revokeObjectURL(url)
  }, [editorHtml, docTitle, providerId])

  // ── Library item helpers ──────────────────────────────────────────────────

  const handleInsertLibraryItem = useCallback((item: LibraryItem) => {
    setLibraryItems(prev => [
      ...prev,
      { item_id: item.id, name: item.name, instructions: item.instructions, meta: item.meta },
    ])
  }, [])

  const handleRemoveLibraryItem = useCallback((index: number) => {
    setLibraryItems(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleSaveLibraryItem = useCallback(async (category: string, name: string, instructions: string) => {
    await fetch('/api/mychat/studio/library', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ providerId, persona, category, name, instructions }),
    })
  }, [providerId, persona])

  const handleDeleteLibraryItem = useCallback(async (itemId: string) => {
    await fetch(`/api/mychat/studio/library?providerId=${providerId}&id=${itemId}`, { method: 'DELETE' })
  }, [providerId])

  // ── Load saved document ───────────────────────────────────────────────────

  const handleLoadDoc = useCallback((doc: SavedDocument) => {
    setActiveDocId(doc.id)
    setDocTitle(doc.title)
    setModeKey(doc.doc_type)
    // Note: body is not in the list — trigger a fetch for full document
    fetch(`/api/mychat/studio/documents?providerId=${providerId}&id=${doc.id}`)
      .then(r => r.json())
      .then(data => {
        const d = data.documents?.[0] ?? data.document
        if (d?.body) {
          setEditorHtml(d.body)
          editorInstance?.commands.setContent(d.body)
        }
        if (d?.structured) {
          const s = d.structured as Record<string, unknown>
          if (s.formValues) setFormValues(s.formValues as Record<string, string>)
          if (s.libraryItems) setLibraryItems(s.libraryItems as LibraryItemEntry[])
        }
      })
  }, [providerId, editorInstance])

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!open) return null

  const disclaimer = archetype?.disclaimer ?? '⚕️ AI-assisted documentation aid — always review and adapt to your clinical judgement before finalising.'

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-zinc-50 dark:bg-zinc-900 flex flex-col" aria-modal="true">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors p-1"
            aria-label="Close Studio"
          >
            ✕
          </button>
          <input
            type="text"
            placeholder="Document title…"
            value={docTitle}
            onChange={e => setDocTitle(e.target.value)}
            className="text-sm font-semibold bg-transparent border-none outline-none text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 w-60"
          />
          {clientName && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500 capitalize">{patientNoun}: {clientName}</span>
          )}
        </div>

        {/* Mode pills */}
        <div className="flex gap-1 overflow-x-auto">
          {modes.map(m => (
            <button
              key={m.key}
              onClick={() => setModeKey(m.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${modeKey === m.key ? 'bg-indigo-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {hasRedline && (
            <>
              <button
                onClick={() => { const h = acceptAllRedline(editorHtml); setEditorHtml(h); editorInstance?.commands.setContent(h); setHasRedline(false) }}
                className="px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              >Accept all</button>
              <button
                onClick={() => { const h = rejectAllRedline(editorHtml); setEditorHtml(h); editorInstance?.commands.setContent(h); setHasRedline(false) }}
                className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
              >Reject all</button>
            </>
          )}
          <button onClick={handleSave} className="px-3 py-1.5 text-xs rounded bg-zinc-800 text-white hover:bg-zinc-700 font-medium">
            Save
          </button>
          {shareToken ? (
            <button
              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/studio/${shareToken}`) }}
              className="px-3 py-1.5 text-xs rounded bg-green-600 text-white hover:bg-green-700 font-medium"
            >
              Copy link
            </button>
          ) : (
            <button onClick={handleShare} className="px-3 py-1.5 text-xs rounded border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium">
              Share
            </button>
          )}
          <button onClick={handleExport} className="px-3 py-1.5 text-xs rounded border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium">
            Export .docx
          </button>
          <button
            onClick={() => setFocusMode(f => !f)}
            className="px-2 py-1.5 text-xs rounded border border-zinc-300 dark:border-zinc-600 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {focusMode ? 'Exit focus' : 'Focus'}
          </button>
        </div>
      </div>

      {/* ── Ribbon toolbar ── */}
      {!focusMode && editorInstance && (
        <div className="shrink-0">
          <RibbonToolbar
            editor={editorInstance}
            zoom={zoom}
            onZoomChange={setZoom}
            margin={margin}
            onMarginChange={setMargin}
            lineHeight={lineHeight}
            onLineHeightChange={setLineHeight}
          />
        </div>
      )}

      {/* ── Disclaimer ── */}
      <div className="shrink-0 px-4 py-1 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800/40">
        {disclaimer}
      </div>

      {/* ── Main area ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Left sidebar (form + saved docs) ── */}
        {sidebarOpen && !focusMode && (
          <div className="w-80 border-r border-zinc-200 dark:border-zinc-700 flex flex-col overflow-hidden shrink-0 bg-white dark:bg-zinc-900">

            {/* Saved docs mini-list */}
            {savedDocs.length > 0 && (
              <div className="border-b border-zinc-100 dark:border-zinc-700 max-h-40 overflow-y-auto">
                <p className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Saved</p>
                {savedDocs.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => handleLoadDoc(doc)}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors truncate ${activeDocId === doc.id ? 'text-indigo-600 font-medium' : 'text-zinc-600 dark:text-zinc-400'}`}
                  >
                    {doc.title || `${doc.doc_type} — ${doc.visit_date ?? ''}`}
                  </button>
                ))}
              </div>
            )}

            {/* Dynamic form */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {activeMode ? (
                <DynamicForm
                  mode={activeMode}
                  formValues={formValues}
                  onChange={(id, val) => setFormValues(prev => ({ ...prev, [id]: val }))}
                  // Report mode template picker
                  templates={modeKey === 'report' ? templates : []}
                  selectedTemplate={selectedTemplate}
                  onSelectTemplate={t => { setSelectedTemplate(t); setTemplateFieldVals({}) }}
                  templateFieldVals={templateFieldVals}
                  onTemplateFieldChange={(id, val) => setTemplateFieldVals(prev => ({ ...prev, [id]: val }))}
                  // Library display in form (read-only — actual selection is in the library panel)
                  libraryItems={libraryItems}
                  onRemoveLibraryItem={handleRemoveLibraryItem}
                  patientNoun={patientNoun}
                  clientName={clientName}
                />
              ) : (
                <p className="text-xs text-zinc-400 text-center py-8">Loading…</p>
              )}

              {error && (
                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded p-2">{error}</p>
              )}
            </div>

            {/* Generate button */}
            <div className="p-3 border-t border-zinc-100 dark:border-zinc-700 shrink-0">
              <button
                onClick={handleGenerate}
                disabled={loading || !activeMode}
                className="w-full py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Generating…' : `Generate ${activeMode?.label ?? ''}`}
              </button>
              {hasEditor && (
                <button
                  onClick={handleCompletenessCheck}
                  disabled={loading}
                  className="w-full mt-2 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                >
                  Check completeness
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Sidebar toggle ── */}
        {!focusMode && (
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-4 h-10 flex items-center justify-center bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded-r text-zinc-400 text-xs"
            style={{ left: sidebarOpen ? '20rem' : '0' }}
          >
            {sidebarOpen ? '‹' : '›'}
          </button>
        )}

        {/* ── Editor ── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden relative">
          <LegalEditor
            content={editorHtml}
            onChange={html => setEditorHtml(html)}
            onEditorReady={e => setEditorInstance(e)}
            zoom={zoom}
            margin={margin}
            lineHeight={lineHeight}
            onEditorAction={handleEditorAction}
          />

          {/* Completeness findings overlay */}
          {findings.length > 0 && (
            <div className="absolute bottom-4 right-4 w-80 max-h-64 overflow-y-auto bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Completeness ({findings.length})</p>
                <button onClick={() => setFindings([])} className="text-xs text-zinc-400 hover:text-zinc-600">✕</button>
              </div>
              {findings.map(f => (
                <div key={f.id} className={`text-[11px] p-2 rounded border-l-2 ${f.severity === 'critical' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : f.severity === 'caution' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'}`}>
                  <p className="font-medium text-zinc-800 dark:text-zinc-100">{f.message}</p>
                  {f.suggestion && <p className="text-zinc-500 dark:text-zinc-400 mt-0.5">{f.suggestion}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        {!focusMode && rightOpen && (
          <div className="w-72 border-l border-zinc-200 dark:border-zinc-700 flex flex-col overflow-hidden shrink-0 bg-white dark:bg-zinc-900">
            <div className="flex border-b border-zinc-100 dark:border-zinc-700 shrink-0">
              {archetype?.has_library && (
                <button
                  onClick={() => setRightPanel('library')}
                  className={`flex-1 py-2 text-xs font-medium ${rightPanel === 'library' ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                  {archetype.library_label}
                </button>
              )}
              <button
                onClick={() => setRightPanel('outline')}
                className={`flex-1 py-2 text-xs font-medium ${rightPanel === 'outline' ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                Outline
              </button>
              <button onClick={() => setRightOpen(false)} className="px-2 text-xs text-zinc-400 hover:text-zinc-600">✕</button>
            </div>
            <div className="flex-1 overflow-hidden">
              {rightPanel === 'library' && archetype?.has_library ? (
                <LibraryPanel
                  providerId={providerId}
                  persona={persona}
                  libraryLabel={archetype.library_label}
                  categories={libCategories}
                  selectedItems={libraryItems}
                  onInsertItem={handleInsertLibraryItem}
                  onRemoveItem={handleRemoveLibraryItem}
                  onSaveItem={handleSaveLibraryItem}
                  onDeleteItem={handleDeleteLibraryItem}
                />
              ) : (
                <OutlinePanel editor={editorInstance} />
              )}
            </div>
          </div>
        )}

        {/* Right panel re-open button */}
        {!focusMode && !rightOpen && (
          <button
            onClick={() => setRightOpen(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-4 h-10 flex items-center justify-center bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded-l text-zinc-400 text-xs"
          >
            ‹
          </button>
        )}
      </div>

      {/* ── Status bar ── */}
      <StatusBar editor={editorInstance} />
    </div>
  )
}

// ── DynamicForm ─────────────────────────────────────────────────────────────

interface DynamicFormProps {
  mode:              StudioMode
  formValues:        Record<string, string>
  onChange:          (id: string, val: string) => void
  templates:         StudioTemplate[]
  selectedTemplate:  StudioTemplate | null
  onSelectTemplate:  (t: StudioTemplate | null) => void
  templateFieldVals: Record<string, string>
  onTemplateFieldChange: (id: string, val: string) => void
  libraryItems:      LibraryItemEntry[]
  onRemoveLibraryItem: (index: number) => void
  patientNoun:       string
  clientName:        string
}

function DynamicForm({
  mode,
  formValues,
  onChange,
  templates,
  selectedTemplate,
  onSelectTemplate,
  templateFieldVals,
  onTemplateFieldChange,
  libraryItems,
  onRemoveLibraryItem,
  patientNoun,
  clientName,
}: DynamicFormProps) {
  const schema = mode.form_schema ?? []

  // Report mode — show template picker first
  if (mode.key === 'report') {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">
            Report type
          </label>
          <select
            value={selectedTemplate?.id ?? ''}
            onChange={e => {
              const t = templates.find(t => t.id === e.target.value) ?? null
              onSelectTemplate(t)
            }}
            className="w-full px-2 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            <option value="">Select report type…</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
        {selectedTemplate?.fields?.map(f => (
          <div key={f.id}>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">
              {f.label}{f.required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            <textarea
              rows={2}
              placeholder={f.placeholder}
              value={templateFieldVals[f.id] ?? ''}
              onChange={e => onTemplateFieldChange(f.id, e.target.value)}
              className="w-full px-2 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
            />
          </div>
        ))}
      </div>
    )
  }

  // Group fields by 'group' key to allow 2-col layout later if needed
  return (
    <div className="space-y-3">
      {schema.map(field => {
        if (field.type === 'library') {
          // Library field — shows what's currently selected in the form
          return (
            <div key={field.id}>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">
                {field.label}
              </label>
              {libraryItems.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">Add items from the {patientNoun} panel →</p>
              ) : (
                <ul className="space-y-1">
                  {libraryItems.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs bg-indigo-50 dark:bg-indigo-900/20 rounded px-2 py-1">
                      <span className="flex-1 text-zinc-700 dark:text-zinc-200">{item.name}</span>
                      <button onClick={() => onRemoveLibraryItem(i)} className="text-red-400 hover:text-red-600 text-[10px]">✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        }

        if (field.type === 'select') {
          return (
            <div key={field.id}>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">
                {field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              <select
                value={formValues[field.id] ?? ''}
                onChange={e => onChange(field.id, e.target.value)}
                className="w-full px-2 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                <option value="">{field.placeholder || 'Select…'}</option>
                {(field.options ?? []).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )
        }

        if (field.type === 'textarea') {
          return (
            <div key={field.id}>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">
                {field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              <textarea
                rows={field.rows ?? 4}
                placeholder={field.placeholder}
                value={formValues[field.id] ?? ''}
                onChange={e => onChange(field.id, e.target.value)}
                className="w-full px-2 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
              />
            </div>
          )
        }

        // Default: text input
        return (
          <div key={field.id}>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">
              {field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            <input
              type="text"
              placeholder={field.placeholder}
              value={formValues[field.id] ?? ''}
              onChange={e => onChange(field.id, e.target.value)}
              className="w-full px-2 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
        )
      })}
    </div>
  )
}
