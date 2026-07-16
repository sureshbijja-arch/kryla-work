'use client'

/**
 * DraftingStudio — full-screen advocate-only overlay for AI-powered legal drafting.
 *
 * Phase B: TipTap rich editor (LegalEditor), clause library + outline panels,
 * proofreading overlay, citation flagging, .docx export/import, redline track-changes.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { Editor } from '@tiptap/react'
import type { ProofreadFinding, Citation, ClauseSuggestion } from './editor/types'
import ClausePanel     from './editor/ClausePanel'
import OutlinePanel    from './editor/OutlinePanel'
import RibbonToolbar   from './editor/RibbonToolbar'
import StatusBar       from './editor/StatusBar'
import type { MarginPreset } from './editor/LegalEditor'
import {
  computeRedlineOps,
  buildRedlineHtml,
  acceptAllRedline,
  rejectAllRedline,
} from '@/lib/editor/redline'

// TipTap is client-only — never SSR
const LegalEditor = dynamic(() => import('./editor/LegalEditor'), { ssr: false })

// ── Types ─────────────────────────────────────────────────────────────────────

interface TemplateField {
  id:          string
  label:       string
  placeholder: string
  required:    boolean
}

interface DraftTemplate {
  id:            string
  doc_type:      string
  label:         string
  description:   string | null
  fields:        TemplateField[]
  body_scaffold: string | null
  is_system:     boolean
}

interface SavedDraft {
  id:          string
  student_id:  string | null
  doc_type:    string
  title:       string
  body:        string
  format?:     'html' | 'text'
  status:      'draft' | 'final'
  share_token: string | null
  updated_at:  string
}

interface Client {
  id:   string
  name: string
}

type Mode     = 'draft' | 'review' | 'refine'
type RightTab = 'outline' | 'clauses'

interface Props {
  providerId:     string
  open:           boolean
  onClose:        () => void
  // Phase 5 seed: when opened from a client/matter card, pre-populate template + client
  seedStudentId?: string | null
  seedClientName?: string | null
  seedMatterType?: string | null
  seedDocType?:   string | null
}

// ── Plain text → basic HTML ───────────────────────────────────────────────────

function plainToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map(para => {
      const t = para.trim()
      if (!t) return ''
      if (/^# /.test(t))   return `<h1>${t.slice(2)}</h1>`
      if (/^## /.test(t))  return `<h2>${t.slice(3)}</h2>`
      if (/^### /.test(t)) return `<h3>${t.slice(4)}</h3>`
      if (/^[-*] /.test(t)) {
        const items = t.split('\n').filter(l => /^[-*] /.test(l))
        return `<ul>${items.map(i => `<li>${i.slice(2)}</li>`).join('')}</ul>`
      }
      return `<p>${t.replace(/\n/g, '<br/>')}</p>`
    })
    .filter(Boolean)
    .join('\n')
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DraftingStudio({
  providerId, open, onClose,
  seedStudentId, seedClientName, seedMatterType, seedDocType,
}: Props) {
  const [mode, setMode]                             = useState<Mode>('draft')
  const [showSidebar, setShowSidebar]               = useState(false)
  const [showRightPanel, setShowRightPanel]         = useState(false)
  const [rightTab, setRightTab]                     = useState<RightTab>('outline')

  // Template / fact form
  const [templates, setTemplates]                   = useState<DraftTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate]     = useState<DraftTemplate | null>(null)
  const [facts, setFacts]                           = useState<Record<string, string>>({})

  // Editor HTML content
  const [draftHtml, setDraftHtml]                   = useState('')
  const [reviewText, setReviewText]                 = useState('')
  const [reviewOutput, setReviewOutput]             = useState('')
  const [instruction, setInstruction]               = useState('')
  const [draftTitle, setDraftTitle]                 = useState('')

  // TipTap editor instance (imperative API)
  const [editorInstance, setEditorInstance]         = useState<Editor | null>(null)

  // AI state
  const [loading, setLoading]                       = useState(false)
  const [proofState, setProofState]                 = useState<{ loading: boolean; findings: ProofreadFinding[] }>({ loading: false, findings: [] })
  const [citationState, setCitationState]           = useState<{ loading: boolean; citations: Citation[] }>({ loading: false, citations: [] })
  const [clauseSuggestions, setClauseSuggestions]   = useState<ClauseSuggestion[]>([])

  // Redline track-changes
  const [showRedline, setShowRedline]               = useState(false)

  // Saved drafts
  const [savedDrafts, setSavedDrafts]               = useState<SavedDraft[]>([])
  const [activeDraftId, setActiveDraftId]           = useState<string | null>(null)
  const [saving, setSaving]                         = useState(false)

  // Client matter attach
  const [clients, setClients]                       = useState<Client[]>([])
  const [attachedClientId, setAttachedClientId]     = useState<string>('')

  // Share link
  const [shareToken, setShareToken]                 = useState<string | null>(null)
  const [copiedShare, setCopiedShare]               = useState(false)
  const [copied, setCopied]                         = useState(false)

  // Import
  const importInputRef                              = useRef<HTMLInputElement>(null)
  const [importing, setImporting]                   = useState(false)

  // Word-style layout controls
  const [zoom, setZoom]           = useState(1)
  const [margin, setMargin]       = useState<MarginPreset>('normal')
  const [lineHeight, setLineHeight] = useState('1.5')

  // Focus mode — hides control panel so editor fills full height
  const [focusMode, setFocusMode] = useState(false)

  // Mobile detection — overlay fills full screen on narrow viewports
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Data loading ─────────────────────────────────────────────────────────

  const loadTemplates = useCallback(async () => {
    const res = await fetch(`/api/mychat/draft-templates?providerId=${providerId}&persona=advocate`)
    if (res.ok) { const d = await res.json(); setTemplates(d.templates ?? []) }
  }, [providerId])

  const loadClients = useCallback(async () => {
    const res = await fetch(`/api/mychat/students?providerId=${providerId}`)
    if (res.ok) {
      const d = await res.json()
      setClients((d.students ?? []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })))
    }
  }, [providerId])

  const loadSavedDrafts = useCallback(async () => {
    const res = await fetch(`/api/mychat/drafts?providerId=${providerId}`)
    if (res.ok) { const d = await res.json(); setSavedDrafts(d.drafts ?? []) }
  }, [providerId])

  useEffect(() => {
    if (open) { loadTemplates(); loadClients(); loadSavedDrafts() }
  }, [open, loadTemplates, loadClients, loadSavedDrafts])

  // Phase 5 seed: when opened from a matter card, pre-populate client + template + facts
  useEffect(() => {
    if (!open || !seedStudentId) return
    // Pre-attach client
    setAttachedClientId(seedStudentId)
    // Pre-populate client name fact if a seedDocType template is found (after templates load)
    if (seedClientName) {
      setFacts(prev => ({
        ...prev,
        client_name:    seedClientName,
        sender_name:    seedClientName,
        payee_name:     seedClientName,
        deponent_name:  seedClientName,
      }))
    }
    // Try to auto-select the requested doc type template
    if (seedDocType && templates.length > 0) {
      const match = templates.find(t => t.doc_type === seedDocType)
      if (match) setSelectedTemplate(match)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seedStudentId, seedClientName, seedDocType, templates])

  // Reset on close
  useEffect(() => {
    if (!open) {
      setMode('draft'); setSelectedTemplate(null); setFacts({})
      setDraftHtml(''); setReviewText(''); setReviewOutput(''); setInstruction('')
      setDraftTitle(''); setActiveDraftId(''); setAttachedClientId(''); setShareToken(null)
      setShowSidebar(false); setShowRightPanel(false); setFocusMode(false)
      setProofState({ loading: false, findings: [] })
      setCitationState({ loading: false, citations: [] })
      setClauseSuggestions([]); setShowRedline(false)
    }
  }, [open])

  // ── AI generation (original draft / review / refine modes) ───────────────

  async function generate() {
    if (loading) return
    let body: Record<string, unknown>

    if (mode === 'draft') {
      if (!selectedTemplate) return
      body = { providerId, mode: 'draft', docType: selectedTemplate.doc_type, docLabel: selectedTemplate.label, facts }
    } else if (mode === 'review') {
      if (!reviewText.trim()) return
      body = { providerId, mode: 'review', draftBody: reviewText }
    } else {
      const currentHtml = editorInstance?.getHTML() ?? draftHtml
      if (!currentHtml.trim() || !instruction.trim()) return
      body = { providerId, mode: 'refine', draftBody: currentHtml, instruction }
    }

    setLoading(true)
    try {
      const res  = await fetch('/api/mychat/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      const text = data.message ?? 'Something went wrong — please try again.'

      if (mode === 'review') {
        setReviewOutput(text)
      } else {
        const newHtml = plainToHtml(text)
        const currentHtml = editorInstance?.getHTML() ?? draftHtml

        if (mode === 'refine' && currentHtml.trim()) {
          // Show redline diff between current and refined
          const ops     = computeRedlineOps(currentHtml, newHtml)
          const redline = buildRedlineHtml(ops)
          setDraftHtml(redline)
          editorInstance?.commands.setContent(redline)
          setShowRedline(true)
        } else {
          setDraftHtml(newHtml)
          editorInstance?.commands.setContent(newHtml)
          setShowRedline(false)
        }
        if (!draftTitle && selectedTemplate) setDraftTitle(selectedTemplate.label)
      }
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }

  // ── Bubble menu + slash command handler ───────────────────────────────────

  async function handleBubbleAction(
    action: string,
    selectedText: string,
    from: number,
    to: number,
  ): Promise<void> {
    const currentHtml = editorInstance?.getHTML() ?? draftHtml
    const STREAMING   = new Set(['continue', 'brainstorm'])

    const reqBody = {
      providerId,
      action,
      draftBody:   currentHtml,
      selectedHtml: selectedText,
      docTypeHint: selectedTemplate?.doc_type,
    }

    if (STREAMING.has(action)) {
      const res = await fetch('/api/mychat/draft', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify(reqBody),
      })
      if (!res.body) return
      const reader = res.body.getReader()
      const dec    = new TextDecoder()
      let buf      = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const chunk = line.slice(6)
            if (chunk !== '[DONE]') editorInstance?.commands.insertContent(chunk)
          }
        }
      }
    } else {
      const res  = await fetch('/api/mychat/draft', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify(reqBody),
      })
      const data = await res.json()
      const msg  = data.message ?? ''

      if (action === 'suggest_clauses') {
        try {
          const parsed = JSON.parse(msg)
          setClauseSuggestions(Array.isArray(parsed) ? parsed : [])
          setRightTab('clauses')
          setShowRightPanel(true)
        } catch { /* ignore parse error */ }
      } else if (action === 'explain') {
        // Minimal: append as a blockquote at cursor
        editorInstance?.commands.insertContent(`<blockquote><strong>Explanation:</strong> ${msg}</blockquote>`)
      } else if ((action === 'rewrite' || action === 'firmer' || action === 'simplify') && editorInstance) {
        if (from !== to) {
          // Replace selection with new text
          editorInstance.chain().focus().deleteRange({ from, to }).insertContent(msg).run()
        } else {
          editorInstance.commands.insertContent(msg)
        }
        setDraftHtml(editorInstance.getHTML())
      }
    }
  }

  // ── Proofreading ──────────────────────────────────────────────────────────

  async function runProofread() {
    const html = editorInstance?.getHTML() ?? draftHtml
    if (!html.trim()) return
    setProofState(s => ({ ...s, loading: true }))
    try {
      const res  = await fetch('/api/mychat/draft/proofread', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ providerId, draftBody: html }),
      })
      const data = await res.json()
      setProofState({ loading: false, findings: data.findings ?? [] })
    } catch {
      setProofState(s => ({ ...s, loading: false }))
    }
  }

  // ── Citation check ────────────────────────────────────────────────────────

  async function runCitations() {
    const html = editorInstance?.getHTML() ?? draftHtml
    if (!html.trim()) return
    setCitationState(s => ({ ...s, loading: true }))
    try {
      const res  = await fetch('/api/mychat/draft/citations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ providerId, draftBody: html }),
      })
      const data = await res.json()
      setCitationState({ loading: false, citations: data.citations ?? [] })
    } catch {
      setCitationState(s => ({ ...s, loading: false }))
    }
  }

  // ── DOCX export ───────────────────────────────────────────────────────────

  async function exportDocx() {
    if (!editorInstance) return
    const res = await fetch('/api/mychat/draft/export', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ providerId, json: editorInstance.getJSON(), title: draftTitle || 'Legal Document' }),
    })
    if (!res.ok) return
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${slugify(draftTitle || 'legal-document')}.docx`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── DOCX import ───────────────────────────────────────────────────────────

  async function handleImport(file: File) {
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append('providerId', providerId)
      fd.append('file', file)
      const res  = await fetch('/api/mychat/draft/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.html) {
        setDraftHtml(data.html)
        editorInstance?.commands.setContent(data.html)
        setDraftTitle(file.name.replace(/\.docx$/i, ''))
        setMode('refine')
      }
    } finally {
      setImporting(false)
    }
  }

  // ── Redline accept / reject ───────────────────────────────────────────────

  function acceptRedline() {
    const html  = editorInstance?.getHTML() ?? draftHtml
    const clean = acceptAllRedline(html)
    setDraftHtml(clean); editorInstance?.commands.setContent(clean); setShowRedline(false)
  }

  function rejectRedline() {
    const html  = editorInstance?.getHTML() ?? draftHtml
    const clean = rejectAllRedline(html)
    setDraftHtml(clean); editorInstance?.commands.setContent(clean); setShowRedline(false)
  }

  // ── Save draft ────────────────────────────────────────────────────────────

  async function saveDraft() {
    const html = editorInstance?.getHTML() ?? draftHtml
    if (!html.trim()) return
    setSaving(true)
    try {
      if (activeDraftId) {
        const res = await fetch('/api/mychat/drafts', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ providerId, draftId: activeDraftId, title: draftTitle || 'Untitled draft', draftBody: html, format: 'html', studentId: attachedClientId || undefined }),
        })
        if (res.ok) {
          const d = await res.json()
          setSavedDrafts(prev => prev.map(dr => dr.id === activeDraftId ? d.draft : dr))
          setShareToken(d.draft.share_token)
        }
      } else {
        const res = await fetch('/api/mychat/drafts', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ providerId, docType: selectedTemplate?.doc_type ?? 'other', title: draftTitle || 'Untitled draft', draftBody: html, format: 'html', studentId: attachedClientId || undefined }),
        })
        if (res.ok) {
          const d = await res.json()
          setActiveDraftId(d.draft.id)
          setShareToken(d.draft.share_token ?? null)
          setSavedDrafts(prev => [d.draft, ...prev])
        }
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Share link ────────────────────────────────────────────────────────────

  async function toggleShare(enable: boolean) {
    if (!activeDraftId) { await saveDraft(); return }
    const res = await fetch('/api/mychat/drafts', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId, draftId: activeDraftId, enableShare: enable }),
    })
    if (res.ok) {
      const d = await res.json()
      setShareToken(d.draft.share_token ?? null)
      setSavedDrafts(prev => prev.map(dr => dr.id === activeDraftId ? d.draft : dr))
    }
  }

  // ── Load / delete saved draft ─────────────────────────────────────────────

  function loadDraft(draft: SavedDraft) {
    const html = draft.format === 'html' ? draft.body : plainToHtml(draft.body)
    setActiveDraftId(draft.id)
    setDraftHtml(html)
    editorInstance?.commands.setContent(html)
    setDraftTitle(draft.title)
    setAttachedClientId(draft.student_id ?? '')
    setShareToken(draft.share_token)
    setMode('refine')
    setShowSidebar(false)
    setProofState({ loading: false, findings: [] })
    setCitationState({ loading: false, citations: [] })
    setShowRedline(false)
  }

  async function deleteDraft(draftId: string) {
    await fetch('/api/mychat/drafts', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId, draftId }),
    })
    setSavedDrafts(prev => prev.filter(d => d.id !== draftId))
    if (activeDraftId === draftId) { setActiveDraftId(null); setDraftHtml(''); setDraftTitle('') }
  }

  // ── Clause library ────────────────────────────────────────────────────────

  async function saveClause(title: string, body: string) {
    await fetch('/api/mychat/clauses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId, title, clauseBody: body, persona: 'advocate' }),
    })
  }

  async function deleteClause(clauseId: string) {
    await fetch('/api/mychat/clauses', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId, clauseId }),
    })
  }

  // ── Clipboard ─────────────────────────────────────────────────────────────

  function copyToClipboard() {
    const text = mode === 'review' ? reviewOutput : (editorInstance?.getText() ?? '')
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  function copyShareLink() {
    if (!shareToken) return
    navigator.clipboard.writeText(`${window.location.origin}/draft/${shareToken}`).then(() => {
      setCopiedShare(true); setTimeout(() => setCopiedShare(false), 2000)
    })
  }

  // ── Right panel toggle ────────────────────────────────────────────────────

  function toggleRightPanel(tab: RightTab) {
    if (showRightPanel && rightTab === tab) {
      setShowRightPanel(false)
    } else {
      setRightTab(tab)
      setShowRightPanel(true)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const hasEditor  = (mode === 'draft' || mode === 'refine') && draftHtml.trim().length > 0
  const canGenerate = mode === 'draft'
    ? selectedTemplate !== null
    : mode === 'review'
    ? reviewText.trim().length > 0
    : (editorInstance?.getText() ?? draftHtml).trim().length > 0 && instruction.trim().length > 0

  if (!open) return null

  return (
    <div className={`fixed inset-y-0 right-0 ${isMobile ? 'inset-x-0 w-full' : 'inset-x-0 w-full'} bg-white z-50 flex flex-col`}>

      {/* ── Header ── */}
      <header className="bg-white border-b border-[#E5E5E5] px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {/* Scale icon */}
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
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

        <div className="flex items-center gap-1">

          {/* Proofread — only shown when editor has content */}
          {hasEditor && (
            <button
              onClick={runProofread}
              disabled={proofState.loading}
              title="Proofread document"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                proofState.findings.length > 0
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'text-[#666] hover:bg-[#F5F5F5]'
              }`}>
              {proofState.loading
                ? <span className="block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3"/><path d="M6 4v2.5M6 8.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              }
              {proofState.findings.length > 0 ? `${proofState.findings.length} issues` : 'Proofread'}
            </button>
          )}

          {/* Citations — only shown when editor has content */}
          {hasEditor && (
            <button
              onClick={runCitations}
              disabled={citationState.loading}
              title="Check citations"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                citationState.citations.length > 0
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-[#666] hover:bg-[#F5F5F5]'
              }`}>
              {citationState.loading
                ? <span className="block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 2h4l3 3v5a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2"/><path d="M7 2v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              }
              {citationState.citations.length > 0 ? `${citationState.citations.length} citations` : 'Citations'}
            </button>
          )}

          {(hasEditor) && <div className="w-px h-4 bg-[#E5E5E5] mx-0.5" />}

          {/* Outline panel */}
          <button
            onClick={() => toggleRightPanel('outline')}
            title="Document outline"
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              showRightPanel && rightTab === 'outline' ? 'bg-[#0D0D0D] text-white' : 'text-[#666] hover:bg-[#F5F5F5]'
            }`}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 3h9M2 6h6M2 9h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Clauses panel */}
          <button
            onClick={() => toggleRightPanel('clauses')}
            title="Clause library"
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors relative ${
              showRightPanel && rightTab === 'clauses' ? 'bg-[#0D0D0D] text-white' : 'text-[#666] hover:bg-[#F5F5F5]'
            }`}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <rect x="1" y="1" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M4 5h5M4 8h3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            {clauseSuggestions.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[8px] flex items-center justify-center font-bold">
                {clauseSuggestions.length}
              </span>
            )}
          </button>

          {/* Import .docx */}
          <input
            ref={importInputRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = '' }}
          />
          <button
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            title="Import .docx"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#666] hover:bg-[#F5F5F5] transition-colors disabled:opacity-50">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 8V2M3.5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M1 9.5v2a.5.5 0 00.5.5h10a.5.5 0 00.5-.5v-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>

          <div className="w-px h-4 bg-[#E5E5E5] mx-0.5" />

          {/* Saved drafts sidebar */}
          <button
            onClick={() => setShowSidebar(s => !s)}
            title="Saved drafts"
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              showSidebar ? 'bg-[#0D0D0D] text-white' : 'text-[#666] hover:bg-[#F5F5F5]'
            }`}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <rect x="1" y="1" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M4 4.5h5M4 7h5M4 9.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            title="Close Drafting Studio"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#666] hover:bg-[#F5F5F5] hover:text-[#0D0D0D] transition-colors ml-0.5">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left sidebar: Saved Drafts ── */}
        {showSidebar && (
          <aside className="w-60 border-r border-[#E5E5E5] bg-[#FAFAFA] flex flex-col shrink-0 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#E5E5E5]">
              <p className="text-xs font-semibold text-[#999] uppercase tracking-wide">Saved drafts</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {savedDrafts.length === 0 ? (
                <p className="text-xs text-[#bbb] px-4 py-4">No saved drafts yet.</p>
              ) : (
                savedDrafts.map(draft => (
                  <div
                    key={draft.id}
                    className={`px-4 py-3 border-b border-[#F0F0F0] group ${
                      activeDraftId === draft.id ? 'bg-white' : 'hover:bg-white'
                    } transition-colors`}>
                    <button onClick={() => loadDraft(draft)} className="text-left w-full">
                      <p className="text-xs font-semibold text-[#0D0D0D] truncate">{draft.title}</p>
                      <p className="text-[10px] text-[#999] mt-0.5">
                        {draft.doc_type.replace(/_/g, ' ')} · {new Date(draft.updated_at).toLocaleDateString()}
                      </p>
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

        {/* ── Center: control forms + editor ── */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Control forms — hidden in focus mode, shrinks when editor is visible */}
          {!focusMode && <div
            className="shrink-0 overflow-y-auto border-b border-[#F0F0F0]"
            style={{ maxHeight: hasEditor ? '260px' : undefined }}>
            <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">

              {/* ── DRAFT MODE ── */}
              {mode === 'draft' && (
                <>
                  {!selectedTemplate ? (
                    <div>
                      <h2 className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">Choose a document type</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {templates.map(tpl => (
                          <button
                            key={tpl.id}
                            onClick={() => { setSelectedTemplate(tpl); setFacts({}); setDraftHtml('') }}
                            className="text-left px-4 py-3.5 rounded-xl border border-[#E5E5E5] hover:border-[#0D0D0D] transition-colors group">
                            <p className="text-sm font-semibold text-[#0D0D0D]">{tpl.label}</p>
                            {tpl.description && (
                              <p className="text-xs text-[#999] mt-0.5 leading-relaxed">{tpl.description}</p>
                            )}
                          </button>
                        ))}
                        {templates.length === 0 && (
                          <p className="text-sm text-[#999]">Loading templates…</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setSelectedTemplate(null); setFacts({}); setDraftHtml('') }}
                          className="text-xs text-[#999] hover:text-[#0D0D0D] flex items-center gap-1 transition-colors">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                          Templates
                        </button>
                        <span className="text-[#E5E5E5]">/</span>
                        <span className="text-sm font-semibold text-[#0D0D0D]">{selectedTemplate.label}</span>
                      </div>

                      <div className="space-y-3">
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

                      <button
                        onClick={generate}
                        disabled={loading || !canGenerate}
                        className="w-full py-2.5 rounded-xl bg-[#0D0D0D] text-white text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-40">
                        {loading ? 'Generating…' : draftHtml ? 'Regenerate' : 'Generate document'}
                      </button>
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
                      rows={7}
                      placeholder="Paste any legal document, clause, or draft here…"
                      value={reviewText}
                      onChange={e => setReviewText(e.target.value)}
                      className="w-full resize-none border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
                    />
                  </div>
                  <button
                    onClick={generate}
                    disabled={loading || !canGenerate}
                    className="w-full py-2.5 rounded-xl bg-[#0D0D0D] text-white text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-40">
                    {loading ? 'Analysing…' : 'Analyse draft'}
                  </button>
                  {reviewOutput && (
                    <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] px-5 py-4">
                      <p className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">Analysis</p>
                      <p className="text-sm text-[#0D0D0D] whitespace-pre-wrap leading-relaxed">{reviewOutput}</p>
                    </div>
                  )}
                </>
              )}

              {/* ── REFINE MODE ── */}
              {mode === 'refine' && (
                <>
                  {!draftHtml && (
                    <div>
                      <label className="block text-xs font-semibold text-[#666] mb-1.5">Paste a draft to refine</label>
                      <textarea
                        rows={7}
                        placeholder="Paste the draft you want to refine…"
                        onChange={e => {
                          const html = plainToHtml(e.target.value)
                          setDraftHtml(html)
                          editorInstance?.commands.setContent(html)
                        }}
                        className="w-full resize-none border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
                      />
                    </div>
                  )}
                  {draftHtml && (
                    <div className="flex gap-2">
                      <textarea
                        rows={2}
                        placeholder='e.g. "Make the tone firmer", "Change jurisdiction to Delhi"…'
                        value={instruction}
                        onChange={e => setInstruction(e.target.value)}
                        className="flex-1 resize-none border border-[#E5E5E5] rounded-xl px-3 py-2.5 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
                      />
                      <button
                        onClick={generate}
                        disabled={loading || !canGenerate}
                        className="shrink-0 px-4 py-2.5 rounded-xl bg-[#0D0D0D] text-white text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-40 self-end">
                        {loading ? '…' : 'Refine'}
                      </button>
                    </div>
                  )}
                </>
              )}

              {loading && (
                <div className="flex justify-center py-2">
                  <div className="flex gap-1 items-center">
                    {[0, 150, 300].map(d => (
                      <div key={d} className="w-1.5 h-1.5 rounded-full bg-[#bbb] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>}

          {/* ── Rich editor area ── */}
          {hasEditor && (
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* Document title bar */}
              <div className="flex items-center gap-2 px-4 py-1.5 bg-white border-b border-[#F0F0F0] shrink-0">
                <input
                  type="text"
                  value={draftTitle}
                  onChange={e => setDraftTitle(e.target.value)}
                  placeholder="Document title…"
                  className="flex-1 text-xs font-semibold text-[#0D0D0D] bg-transparent border-none outline-none placeholder:text-[#bbb]"
                />
                {/* Focus mode toggle — expand/collapse the control panel above */}
                <button
                  onClick={() => setFocusMode(f => !f)}
                  title={focusMode ? 'Show controls' : 'Full-screen editor'}
                  className="w-6 h-6 rounded flex items-center justify-center text-[#bbb] hover:text-[#0D0D0D] transition-colors shrink-0">
                  {focusMode ? (
                    /* Collapse / exit full-screen icon */
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M1 4h3V1M10 4H7V1M1 7h3v3M10 7H7v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    /* Expand / full-screen icon */
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M1 4V1h3M7 1h3v3M10 7v3H7M4 10H1V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>

              {/* Word-style ribbon toolbar */}
              <RibbonToolbar
                editor={editorInstance}
                onInsertClause={() => { setRightTab('clauses'); setShowRightPanel(true) }}
                onProofread={runProofread}
                onCitations={runCitations}
                onAcceptRedline={acceptRedline}
                onRejectRedline={rejectRedline}
                margin={margin}
                onMarginChange={setMargin}
                lineHeight={lineHeight}
                onLineHeightChange={setLineHeight}
                showRedline={showRedline}
                proofFindingCount={proofState.findings.length}
                citationCount={citationState.citations.length}
              />

              {/* TipTap LegalEditor (now includes paper-page canvas) */}
              <LegalEditor
                initialHtml={draftHtml}
                onChange={html => setDraftHtml(html)}
                onEditorReady={ed => setEditorInstance(ed)}
                findings={proofState.findings}
                citations={citationState.citations}
                onBubbleAction={handleBubbleAction}
                onOpenClausePanel={() => { setRightTab('clauses'); setShowRightPanel(true) }}
                zoom={zoom}
                margin={margin}
              />

              {/* Status bar — word/char/page count + zoom stepper */}
              <StatusBar
                editor={editorInstance}
                zoom={zoom}
                onZoom={setZoom}
              />

              {/* Action bar */}
              <div className="shrink-0 border-t border-[#F0F0F0] px-4 py-2">
                <div className="flex flex-wrap items-center gap-2">

                  {/* Attach to client matter */}
                  {clients.length > 0 && (
                    <select
                      value={attachedClientId}
                      onChange={e => setAttachedClientId(e.target.value)}
                      className="text-xs text-[#666] border border-[#E5E5E5] rounded-lg px-2 py-1 bg-white cursor-pointer">
                      <option value="">No client</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}

                  <div className="flex-1" />

                  {/* Copy as plain text */}
                  <button
                    onClick={copyToClipboard}
                    title="Copy as plain text"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#666] hover:bg-[#F5F5F5] transition-colors">
                    {copied ? (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.2"/><path d="M2 8V2h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    )}
                  </button>

                  {/* Export .docx */}
                  <button
                    onClick={exportDocx}
                    title="Export as .docx"
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#666] hover:text-[#0D0D0D] border border-[#E5E5E5] rounded-lg hover:border-[#0D0D0D] transition-colors">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M5.5 1v6M3 4.5l2.5 2.5 2.5-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M1 8.5v1a.5.5 0 00.5.5h8a.5.5 0 00.5-.5v-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    .docx
                  </button>

                  {/* Print */}
                  <button
                    onClick={async () => {
                      let id = activeDraftId
                      if (!id) { await saveDraft(); id = activeDraftId }
                      if (!id) return
                      window.open(`/print/document/${id}?providerId=${providerId}&auto=1`, '_blank')
                    }}
                    title="Print"
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#666] hover:text-[#0D0D0D] border border-[#E5E5E5] rounded-lg hover:border-[#0D0D0D] transition-colors">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M3 3V1.5h5V3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                      <rect x="1" y="3" width="9" height="5" rx="1" stroke="currentColor" strokeWidth="1.1"/>
                      <path d="M3 6h5M3 8h5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                      <path d="M3 5.5V9.5h5V5.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Print
                  </button>

                  {/* Download PDF */}
                  <button
                    onClick={async () => {
                      let id = activeDraftId
                      if (!id) { await saveDraft(); id = activeDraftId }
                      if (!id) return
                      window.open(`/api/print/document/${id}/pdf?providerId=${providerId}`, '_blank')
                    }}
                    title="Download PDF"
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#666] hover:text-[#0D0D0D] border border-[#E5E5E5] rounded-lg hover:border-[#0D0D0D] transition-colors">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M5.5 1v6M3 4.5l2.5 2.5 2.5-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M1 8.5v1a.5.5 0 00.5.5h8a.5.5 0 00.5-.5v-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    PDF
                  </button>

                  {/* Share link */}
                  {activeDraftId && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => shareToken ? toggleShare(false) : toggleShare(true)}
                        title={shareToken ? 'Disable share link' : 'Generate share link'}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          shareToken ? 'bg-[#22C55E] text-white' : 'text-[#666] hover:bg-[#F5F5F5]'
                        }`}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <circle cx="9" cy="2" r="1.5" stroke="currentColor" strokeWidth="1.1"/>
                          <circle cx="9" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.1"/>
                          <circle cx="3" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.1"/>
                          <path d="M4.2 5.3L7.8 2.7M4.2 6.7L7.8 9.3" stroke="currentColor" strokeWidth="1.1"/>
                        </svg>
                      </button>
                      {shareToken && (
                        <button
                          onClick={copyShareLink}
                          className="text-[11px] text-[#666] hover:text-[#0D0D0D] transition-colors">
                          {copiedShare ? '✓ Copied' : 'Copy link'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Save */}
                  <button
                    onClick={saveDraft}
                    disabled={saving}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0D0D0D] text-white hover:opacity-80 disabled:opacity-50 transition-opacity">
                    {saving ? 'Saving…' : activeDraftId ? 'Save' : 'Save draft'}
                  </button>

                </div>
              </div>
            </div>
          )}

        </main>

        {/* ── Right panel: Outline / Clause Library ── */}
        {showRightPanel && (
          <aside className="w-64 border-l border-[#E5E5E5] flex flex-col shrink-0 overflow-hidden">
            <div className="flex items-center border-b border-[#E5E5E5] shrink-0">
              <button
                onClick={() => setRightTab('outline')}
                className={`flex-1 py-2 text-[11px] font-semibold transition-colors ${
                  rightTab === 'outline' ? 'text-[#0D0D0D] border-b-2 border-[#0D0D0D]' : 'text-[#999]'
                }`}>
                Outline
              </button>
              <button
                onClick={() => setRightTab('clauses')}
                className={`flex-1 py-2 text-[11px] font-semibold transition-colors relative ${
                  rightTab === 'clauses' ? 'text-[#0D0D0D] border-b-2 border-[#0D0D0D]' : 'text-[#999]'
                }`}>
                Clauses
                {clauseSuggestions.length > 0 && (
                  <span className="absolute top-1.5 right-3 w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[8px] flex items-center justify-center font-bold">
                    {clauseSuggestions.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowRightPanel(false)}
                className="w-8 h-8 flex items-center justify-center text-[#bbb] hover:text-[#0D0D0D] transition-colors shrink-0">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {rightTab === 'outline' ? (
              <OutlinePanel editor={editorInstance} />
            ) : (
              <ClausePanel
                providerId={providerId}
                editor={editorInstance}
                suggestions={clauseSuggestions}
                onSaveClause={saveClause}
                onDeleteClause={deleteClause}
              />
            )}
          </aside>
        )}

      </div>
    </div>
  )
}
