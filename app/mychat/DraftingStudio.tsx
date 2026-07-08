'use client'

/**
 * DraftingStudio — full-screen advocate-only overlay for AI-powered legal drafting.
 *
 * Mirrors the ResearchChat overlay pattern (fixed inset-0 z-50).
 *
 * Three modes:
 *   Draft  — pick a template, fill facts, generate a complete document
 *   Review — paste an existing draft, get AI risk/gap analysis
 *   Refine — load a draft and give an instruction to improve it
 *
 * Saved drafts sidebar lists all saved docs; clicking one loads it.
 */

import { useState, useEffect, useRef, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TemplateField {
  id:          string
  label:       string
  placeholder: string
  required:    boolean
}

interface DraftTemplate {
  id:           string
  doc_type:     string
  label:        string
  description:  string | null
  fields:       TemplateField[]
  body_scaffold: string | null
  is_system:    boolean
}

interface SavedDraft {
  id:         string
  student_id: string | null
  doc_type:   string
  title:      string
  body:       string
  status:     'draft' | 'final'
  share_token: string | null
  updated_at: string
}

interface Client {
  id:   string
  name: string
}

type Mode = 'draft' | 'review' | 'refine'

interface Props {
  providerId: string
  open:       boolean
  onClose:    () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DraftingStudio({ providerId, open, onClose }: Props) {
  const [mode, setMode]                   = useState<Mode>('draft')
  const [showSidebar, setShowSidebar]     = useState(false)

  // Template picker
  const [templates, setTemplates]         = useState<DraftTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<DraftTemplate | null>(null)
  const [facts, setFacts]                 = useState<Record<string, string>>({})

  // Draft body (used in all modes)
  const [draftBody, setDraftBody]         = useState('')
  const [reviewText, setReviewText]       = useState('')  // Review mode paste input
  const [instruction, setInstruction]     = useState('')  // Refine mode instruction
  const [draftTitle, setDraftTitle]       = useState('')

  // AI state
  const [loading, setLoading]             = useState(false)
  const [output, setOutput]               = useState('')   // latest AI response

  // Saved drafts
  const [savedDrafts, setSavedDrafts]     = useState<SavedDraft[]>([])
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null)
  const [saving, setSaving]               = useState(false)

  // Attach-to-matter
  const [clients, setClients]             = useState<Client[]>([])
  const [attachedClientId, setAttachedClientId] = useState<string>('')

  // Share link
  const [shareToken, setShareToken]       = useState<string | null>(null)
  const [copiedShare, setCopiedShare]     = useState(false)

  // Copy-to-clipboard feedback
  const [copied, setCopied]               = useState(false)

  const outputRef = useRef<HTMLTextAreaElement>(null)

  // ── Load templates & clients when opened ─────────────────────────────────
  const loadTemplates = useCallback(async () => {
    const res = await fetch(`/api/mychat/draft-templates?providerId=${providerId}&persona=advocate`)
    if (res.ok) {
      const data = await res.json()
      setTemplates(data.templates ?? [])
    }
  }, [providerId])

  const loadClients = useCallback(async () => {
    const res = await fetch(`/api/mychat/students?providerId=${providerId}`)
    if (res.ok) {
      const data = await res.json()
      setClients((data.students ?? []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })))
    }
  }, [providerId])

  const loadSavedDrafts = useCallback(async () => {
    const res = await fetch(`/api/mychat/drafts?providerId=${providerId}`)
    if (res.ok) {
      const data = await res.json()
      setSavedDrafts(data.drafts ?? [])
    }
  }, [providerId])

  useEffect(() => {
    if (open) {
      loadTemplates()
      loadClients()
      loadSavedDrafts()
    }
  }, [open, loadTemplates, loadClients, loadSavedDrafts])

  // Reset on close
  useEffect(() => {
    if (!open) {
      setMode('draft')
      setSelectedTemplate(null)
      setFacts({})
      setDraftBody('')
      setReviewText('')
      setInstruction('')
      setOutput('')
      setDraftTitle('')
      setActiveDraftId(null)
      setAttachedClientId('')
      setShareToken(null)
      setShowSidebar(false)
    }
  }, [open])

  // ── AI generation ─────────────────────────────────────────────────────────
  async function generate() {
    if (loading) return

    let body: Record<string, unknown>

    if (mode === 'draft') {
      if (!selectedTemplate) return
      body = {
        providerId,
        mode: 'draft',
        docType:   selectedTemplate.doc_type,
        docLabel:  selectedTemplate.label,
        facts,
      }
    } else if (mode === 'review') {
      if (!reviewText.trim()) return
      body = { providerId, mode: 'review', draftBody: reviewText }
    } else {
      if (!draftBody.trim() || !instruction.trim()) return
      body = { providerId, mode: 'refine', draftBody, instruction }
    }

    setLoading(true)
    setOutput('')

    try {
      const res  = await fetch('/api/mychat/draft', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      const text = data.message ?? 'Something went wrong — please try again.'
      setOutput(text)

      // Auto-populate the editable draft for Draft and Refine modes
      if (mode === 'draft' || mode === 'refine') {
        setDraftBody(text)
        if (!draftTitle && selectedTemplate) setDraftTitle(selectedTemplate.label)
      }
    } catch {
      setOutput('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Save draft ────────────────────────────────────────────────────────────
  async function saveDraft() {
    const bodyToSave = mode === 'review' ? output : draftBody
    if (!bodyToSave.trim()) return

    setSaving(true)
    try {
      if (activeDraftId) {
        // Update existing
        const res = await fetch('/api/mychat/drafts', {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            providerId,
            draftId:   activeDraftId,
            title:     draftTitle || 'Untitled draft',
            draftBody: bodyToSave,
            studentId: attachedClientId || undefined,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          setSavedDrafts(prev => prev.map(d => d.id === activeDraftId ? data.draft : d))
          setShareToken(data.draft.share_token)
        }
      } else {
        // Create new
        const res = await fetch('/api/mychat/drafts', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            providerId,
            docType:   selectedTemplate?.doc_type ?? 'other',
            title:     draftTitle || 'Untitled draft',
            draftBody: bodyToSave,
            studentId: attachedClientId || undefined,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          setActiveDraftId(data.draft.id)
          setShareToken(data.draft.share_token ?? null)
          setSavedDrafts(prev => [data.draft, ...prev])
        }
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle share link ─────────────────────────────────────────────────────
  async function toggleShare(enable: boolean) {
    if (!activeDraftId) { await saveDraft(); return }
    const res = await fetch('/api/mychat/drafts', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ providerId, draftId: activeDraftId, enableShare: enable }),
    })
    if (res.ok) {
      const data = await res.json()
      setShareToken(data.draft.share_token ?? null)
      setSavedDrafts(prev => prev.map(d => d.id === activeDraftId ? data.draft : d))
    }
  }

  // ── Load a saved draft into the editor ───────────────────────────────────
  function loadDraft(draft: SavedDraft) {
    setActiveDraftId(draft.id)
    setDraftBody(draft.body)
    setDraftTitle(draft.title)
    setAttachedClientId(draft.student_id ?? '')
    setShareToken(draft.share_token)
    setOutput('')
    setMode('refine')   // Switch to refine mode so they can improve it
    setShowSidebar(false)
  }

  // ── Delete a saved draft ─────────────────────────────────────────────────
  async function deleteDraft(draftId: string) {
    await fetch('/api/mychat/drafts', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ providerId, draftId }),
    })
    setSavedDrafts(prev => prev.filter(d => d.id !== draftId))
    if (activeDraftId === draftId) {
      setActiveDraftId(null)
      setDraftBody('')
      setDraftTitle('')
    }
  }

  // ── Copy to clipboard ─────────────────────────────────────────────────────
  function copyToClipboard() {
    const text = mode === 'review' ? output : draftBody
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function copyShareLink() {
    if (!shareToken) return
    const url = `${window.location.origin}/draft/${shareToken}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedShare(true)
      setTimeout(() => setCopiedShare(false), 2000)
    })
  }

  if (!open) return null

  const currentBody  = mode === 'review' ? output : draftBody
  const hasContent   = currentBody.trim().length > 0
  const canGenerate  = mode === 'draft'
    ? (selectedTemplate !== null)
    : mode === 'review'
    ? reviewText.trim().length > 0
    : draftBody.trim().length > 0 && instruction.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-[#E5E5E5] px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {/* Scale icon */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1v14M1 13h14M4 13V9L1 5M12 13V9l3-4" stroke="#0D0D0D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-sm font-semibold text-[#0D0D0D]">Drafting Studio</span>

          {/* Mode tabs */}
          <div className="flex items-center gap-0.5 ml-2 bg-[#F5F5F5] rounded-lg p-0.5">
            {(['draft', 'review', 'refine'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-colors ${
                  mode === m ? 'bg-white text-[#0D0D0D] shadow-sm' : 'text-[#999] hover:text-[#0D0D0D]'
                }`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Saved drafts toggle */}
          <button
            onClick={() => setShowSidebar(s => !s)}
            title="Saved drafts"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${showSidebar ? 'bg-[#0D0D0D] text-white' : 'text-[#666] hover:bg-[#F5F5F5]'}`}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M4 4.5h6M4 7h6M4 9.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>

          <button
            onClick={onClose}
            title="Close Drafting Studio"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#666] hover:bg-[#F5F5F5] hover:text-[#0D0D0D] transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── Body (main + optional sidebar) ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Main content area ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

            {/* ── DRAFT MODE ── */}
            {mode === 'draft' && (
              <>
                {/* Template picker */}
                {!selectedTemplate ? (
                  <div>
                    <h2 className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">Choose a document type</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {templates.map(tpl => (
                        <button
                          key={tpl.id}
                          onClick={() => { setSelectedTemplate(tpl); setFacts({}); setOutput(''); setDraftBody('') }}
                          className="text-left px-4 py-3.5 rounded-xl border border-[#E5E5E5] hover:border-[#0D0D0D] transition-colors group">
                          <p className="text-sm font-semibold text-[#0D0D0D] group-hover:text-[#0D0D0D]">{tpl.label}</p>
                          {tpl.description && (
                            <p className="text-xs text-[#999] mt-0.5 leading-relaxed">{tpl.description}</p>
                          )}
                        </button>
                      ))}
                    </div>
                    {templates.length === 0 && (
                      <p className="text-sm text-[#999]">Loading templates…</p>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Back + template name */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setSelectedTemplate(null); setFacts({}); setOutput(''); setDraftBody('') }}
                        className="text-xs text-[#999] hover:text-[#0D0D0D] flex items-center gap-1 transition-colors">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        Templates
                      </button>
                      <span className="text-[#E5E5E5]">/</span>
                      <span className="text-sm font-semibold text-[#0D0D0D]">{selectedTemplate.label}</span>
                    </div>

                    {/* Fact fields */}
                    <div className="space-y-3.5">
                      {selectedTemplate.fields.map(field => (
                        <div key={field.id}>
                          <label className="block text-xs font-semibold text-[#666] mb-1">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-0.5">*</span>}
                          </label>
                          <textarea
                            rows={2}
                            placeholder={field.placeholder}
                            value={facts[field.id] ?? ''}
                            onChange={e => setFacts(prev => ({ ...prev, [field.id]: e.target.value }))}
                            className="w-full resize-none border border-[#E5E5E5] rounded-xl px-3 py-2.5 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Generate button */}
                    <button
                      onClick={generate}
                      disabled={loading || !canGenerate}
                      className="w-full py-3 rounded-xl bg-[#0D0D0D] text-white text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-40">
                      {loading ? 'Generating…' : 'Generate document'}
                    </button>

                    {/* Editable output */}
                    {draftBody && (
                      <DraftEditor
                        value={draftBody}
                        onChange={setDraftBody}
                        title={draftTitle}
                        onTitleChange={setDraftTitle}
                      />
                    )}
                  </>
                )}
              </>
            )}

            {/* ── REVIEW MODE ── */}
            {mode === 'review' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#666] mb-1.5">Paste your draft below</label>
                  <textarea
                    rows={10}
                    placeholder="Paste any legal document, clause, or draft here…"
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                    className="w-full resize-none border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
                  />
                </div>
                <button
                  onClick={generate}
                  disabled={loading || !canGenerate}
                  className="w-full py-3 rounded-xl bg-[#0D0D0D] text-white text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-40">
                  {loading ? 'Analysing…' : 'Analyse draft'}
                </button>
                {output && (
                  <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] px-5 py-4">
                    <p className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">Analysis</p>
                    <p className="text-sm text-[#0D0D0D] whitespace-pre-wrap leading-relaxed">{output}</p>
                  </div>
                )}
              </>
            )}

            {/* ── REFINE MODE ── */}
            {mode === 'refine' && (
              <>
                {!draftBody && (
                  <div>
                    <label className="block text-xs font-semibold text-[#666] mb-1.5">Current draft</label>
                    <textarea
                      rows={10}
                      placeholder="Paste or type the draft you want to refine…"
                      value={draftBody}
                      onChange={e => setDraftBody(e.target.value)}
                      className="w-full resize-none border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
                    />
                  </div>
                )}
                {draftBody && (
                  <DraftEditor
                    value={draftBody}
                    onChange={setDraftBody}
                    title={draftTitle}
                    onTitleChange={setDraftTitle}
                    compact
                  />
                )}
                <div>
                  <label className="block text-xs font-semibold text-[#666] mb-1.5">Refinement instruction</label>
                  <textarea
                    rows={2}
                    placeholder='e.g. "Make the tone firmer", "Change jurisdiction to Delhi", "Add a confidentiality clause"'
                    value={instruction}
                    onChange={e => setInstruction(e.target.value)}
                    className="w-full resize-none border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
                  />
                </div>
                <button
                  onClick={generate}
                  disabled={loading || !canGenerate}
                  className="w-full py-3 rounded-xl bg-[#0D0D0D] text-white text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-40">
                  {loading ? 'Refining…' : 'Refine document'}
                </button>
              </>
            )}

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-center py-4">
                <div className="flex gap-1 items-center">
                  {[0, 150, 300].map(d => (
                    <div key={d} className="w-1.5 h-1.5 rounded-full bg-[#bbb] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Action bar (shown when there's content) ── */}
            {hasContent && !loading && (
              <div className="sticky bottom-4">
                <div className="bg-white border border-[#E5E5E5] rounded-2xl px-4 py-3 shadow-lg flex flex-wrap items-center gap-3">

                  {/* Title input */}
                  <input
                    type="text"
                    placeholder="Document title…"
                    value={draftTitle}
                    onChange={e => setDraftTitle(e.target.value)}
                    className="flex-1 min-w-[120px] text-sm border-none outline-none text-[#0D0D0D] placeholder:text-[#bbb]"
                  />

                  {/* Divider */}
                  <div className="w-px h-5 bg-[#E5E5E5]" />

                  {/* Attach to matter */}
                  {clients.length > 0 && (
                    <select
                      value={attachedClientId}
                      onChange={e => setAttachedClientId(e.target.value)}
                      className="text-xs text-[#666] border-none outline-none bg-transparent cursor-pointer">
                      <option value="">No client</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}

                  {/* Save */}
                  <button
                    onClick={saveDraft}
                    disabled={saving}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#0D0D0D] text-white hover:opacity-80 disabled:opacity-50 transition-opacity">
                    {saving ? 'Saving…' : activeDraftId ? 'Save' : 'Save draft'}
                  </button>

                  {/* Copy */}
                  <button
                    onClick={copyToClipboard}
                    title="Copy to clipboard"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#666] hover:bg-[#F5F5F5] transition-colors">
                    {copied ? (
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M2 6.5l3 3 6-6" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                        <path d="M2 9V2h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                    )}
                  </button>

                  {/* Download .txt */}
                  <button
                    onClick={() => downloadText(currentBody, `${slugify(draftTitle || 'draft')}.txt`)}
                    title="Download as .txt"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#666] hover:bg-[#F5F5F5] transition-colors">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M6.5 1v8M3.5 6.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M1 10v1a1 1 0 001 1h9a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  </button>

                  {/* Share link toggle */}
                  {activeDraftId && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => shareToken ? toggleShare(false) : toggleShare(true)}
                        title={shareToken ? 'Disable share link' : 'Generate share link'}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${shareToken ? 'bg-[#22C55E] text-white' : 'text-[#666] hover:bg-[#F5F5F5]'}`}>
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                          <circle cx="10" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                          <circle cx="10" cy="10.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                          <circle cx="3" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                          <path d="M4.3 5.8L8.7 3.2M4.3 7.2L8.7 9.8" stroke="currentColor" strokeWidth="1.2"/>
                        </svg>
                      </button>
                      {shareToken && (
                        <button
                          onClick={copyShareLink}
                          className="text-xs text-[#666] hover:text-[#0D0D0D] transition-colors">
                          {copiedShare ? '✓ Copied' : 'Copy link'}
                        </button>
                      )}
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>
        </main>

        {/* ── Saved Drafts Sidebar ── */}
        {showSidebar && (
          <aside className="w-64 border-l border-[#E5E5E5] bg-[#FAFAFA] flex flex-col shrink-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E5E5]">
              <p className="text-xs font-semibold text-[#999] uppercase tracking-wide">Saved drafts</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {savedDrafts.length === 0 ? (
                <p className="text-xs text-[#bbb] px-4 py-4">No saved drafts yet.</p>
              ) : (
                savedDrafts.map(draft => (
                  <div key={draft.id} className={`px-4 py-3 border-b border-[#F0F0F0] group ${activeDraftId === draft.id ? 'bg-white' : 'hover:bg-white'} transition-colors`}>
                    <button
                      onClick={() => loadDraft(draft)}
                      className="text-left w-full">
                      <p className="text-xs font-semibold text-[#0D0D0D] truncate">{draft.title}</p>
                      <p className="text-[10px] text-[#999] mt-0.5">{draft.doc_type.replace(/_/g, ' ')} · {new Date(draft.updated_at).toLocaleDateString()}</p>
                      {draft.status === 'final' && (
                        <span className="inline-block mt-1 text-[9px] font-semibold px-1.5 py-0.5 bg-[#22C55E]/10 text-[#166534] rounded">Final</span>
                      )}
                    </button>
                    <button
                      onClick={() => deleteDraft(draft.id)}
                      className="hidden group-hover:flex w-5 h-5 rounded items-center justify-center text-[#bbb] hover:text-red-500 transition-colors mt-1">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

// ── Sub-component: Editable draft body ───────────────────────────────────────
function DraftEditor({
  value, onChange, title, onTitleChange, compact = false,
}: {
  value: string
  onChange: (v: string) => void
  title: string
  onTitleChange: (v: string) => void
  compact?: boolean
}) {
  return (
    <div className="rounded-xl border border-[#E5E5E5] overflow-hidden">
      <div className="bg-[#FAFAFA] border-b border-[#F0F0F0] px-4 py-2 flex items-center justify-between">
        <p className="text-[10px] font-semibold text-[#999] uppercase tracking-wide">Draft (editable)</p>
        <span className="text-[10px] text-[#bbb]">{value.length} chars</span>
      </div>
      <textarea
        rows={compact ? 12 : 20}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full resize-none px-5 py-4 text-sm text-[#0D0D0D] font-mono leading-relaxed focus:outline-none"
        placeholder="Generated document will appear here…"
      />
    </div>
  )
}
