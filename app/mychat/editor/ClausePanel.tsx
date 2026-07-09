'use client'

/**
 * ClausePanel — browse system + member clause library, insert at cursor,
 * save selected text as a new clause, and view AI-suggested missing clauses.
 */

import { useState, useEffect, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import type { Clause, ClauseSuggestion } from './types'

// Category display labels
const CATEGORY_LABELS: Record<string, string> = {
  dispute_resolution:   'Dispute Resolution',
  jurisdiction:         'Jurisdiction',
  indemnity:            'Indemnity',
  confidentiality:      'Confidentiality',
  force_majeure:        'Force Majeure',
  non_compete:          'Non-Compete',
  termination:          'Termination',
  severability:         'Severability',
  notice:               'Notices',
  limitation_liability: 'Limitation of Liability',
  member:               'My Clauses',
}

interface Props {
  providerId:   string
  editor:       Editor | null
  /** AI-generated missing clause suggestions from the Studio */
  suggestions:  ClauseSuggestion[]
  onSaveClause: (title: string, body: string) => Promise<void>
  onDeleteClause: (clauseId: string) => Promise<void>
}

export default function ClausePanel({
  providerId,
  editor,
  suggestions,
  onSaveClause,
  onDeleteClause,
}: Props) {
  const [clauses,       setClauses]      = useState<Clause[]>([])
  const [loading,       setLoading]      = useState(true)
  const [search,        setSearch]       = useState('')
  const [expanded,      setExpanded]     = useState<string | null>(null)
  const [tab,           setTab]          = useState<'library' | 'suggestions'>('library')
  const [saving,        setSaving]       = useState(false)
  const [saveText,      setSaveText]     = useState('')
  const [saveTitle,     setSaveTitle]    = useState('')
  const [showSaveForm,  setShowSaveForm] = useState(false)

  const loadClauses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/mychat/clauses?providerId=${providerId}&persona=advocate`)
      if (res.ok) {
        const data = await res.json()
        setClauses(data.clauses ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [providerId])

  useEffect(() => { loadClauses() }, [loadClauses])

  // Listen for "save as clause" event from the editor's bubble menu
  useEffect(() => {
    function onSaveClauseEvent(e: Event) {
      const { text } = (e as CustomEvent).detail as { text: string }
      setSaveText(text)
      setSaveTitle('')
      setShowSaveForm(true)
      setTab('library')
    }
    document.addEventListener('legal-editor:save-clause', onSaveClauseEvent)
    return () => document.removeEventListener('legal-editor:save-clause', onSaveClauseEvent)
  }, [])

  function insertClause(clause: Clause) {
    if (!editor) return
    editor.chain().focus().insertContent(`<p>${clause.body}</p>`).run()
  }

  async function handleSave() {
    if (!saveTitle.trim() || !saveText.trim()) return
    setSaving(true)
    try {
      await onSaveClause(saveTitle.trim(), saveText.trim())
      setShowSaveForm(false)
      setSaveText('')
      setSaveTitle('')
      await loadClauses()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(clauseId: string) {
    await onDeleteClause(clauseId)
    setClauses(prev => prev.filter(c => c.id !== clauseId))
  }

  // Group clauses by category
  const filtered = clauses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.body.toLowerCase().includes(search.toLowerCase()) ||
    c.category.includes(search.toLowerCase())
  )

  const systemClauses = filtered.filter(c => c.is_system)
  const memberClauses = filtered.filter(c => !c.is_system)

  const grouped: Record<string, Clause[]> = {}
  for (const c of systemClauses) {
    if (!grouped[c.category]) grouped[c.category] = []
    grouped[c.category].push(c)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* Tabs */}
      <div className="flex border-b border-[#F0F0F0] shrink-0">
        <button
          onClick={() => setTab('library')}
          className={`flex-1 py-2 text-[11px] font-semibold transition-colors ${tab === 'library' ? 'text-[#0D0D0D] border-b-2 border-[#0D0D0D]' : 'text-[#999]'}`}
        >
          Library
        </button>
        <button
          onClick={() => setTab('suggestions')}
          className={`flex-1 py-2 text-[11px] font-semibold transition-colors relative ${tab === 'suggestions' ? 'text-[#0D0D0D] border-b-2 border-[#0D0D0D]' : 'text-[#999]'}`}
        >
          Suggested
          {suggestions.length > 0 && (
            <span className="absolute top-1.5 right-2 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center font-bold">
              {suggestions.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'library' && (
        <>
          {/* Search */}
          <div className="px-3 py-2 border-b border-[#F0F0F0] shrink-0">
            <input
              type="text"
              placeholder="Search clauses…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-xs border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#0D0D0D] placeholder:text-[#bbb]"
            />
          </div>

          {/* Save form (shown after bubble menu "Save clause") */}
          {showSaveForm && (
            <div className="px-3 py-2 bg-amber-50 border-b border-amber-100 shrink-0">
              <p className="text-[10px] font-semibold text-amber-800 mb-1.5">Save selected text as clause</p>
              <input
                type="text"
                placeholder="Clause title…"
                value={saveTitle}
                onChange={e => setSaveTitle(e.target.value)}
                className="w-full text-xs border border-amber-200 rounded-lg px-2 py-1.5 mb-1.5 focus:outline-none bg-white"
              />
              <div className="flex gap-1.5">
                <button
                  onClick={handleSave}
                  disabled={saving || !saveTitle.trim()}
                  className="flex-1 py-1 text-[11px] font-semibold bg-[#0D0D0D] text-white rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setShowSaveForm(false)}
                  className="px-2 py-1 text-[11px] text-[#999] hover:text-[#0D0D0D] rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Clause list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="text-[11px] text-[#bbb] p-3">Loading clauses…</p>
            ) : (
              <>
                {/* Member clauses first */}
                {memberClauses.length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold text-[#999] uppercase tracking-wider px-3 py-1.5 bg-[#FAFAFA]">
                      My Clauses
                    </p>
                    {memberClauses.map(c => (
                      <ClauseRow
                        key={c.id}
                        clause={c}
                        expanded={expanded === c.id}
                        onToggle={() => setExpanded(expanded === c.id ? null : c.id)}
                        onInsert={() => insertClause(c)}
                        onDelete={() => handleDelete(c.id)}
                        isMember
                      />
                    ))}
                  </div>
                )}

                {/* System clauses grouped by category */}
                {Object.entries(grouped).map(([cat, clauses]) => (
                  <div key={cat}>
                    <p className="text-[9px] font-bold text-[#999] uppercase tracking-wider px-3 py-1.5 bg-[#FAFAFA]">
                      {CATEGORY_LABELS[cat] ?? cat.replace(/_/g, ' ')}
                    </p>
                    {clauses.map(c => (
                      <ClauseRow
                        key={c.id}
                        clause={c}
                        expanded={expanded === c.id}
                        onToggle={() => setExpanded(expanded === c.id ? null : c.id)}
                        onInsert={() => insertClause(c)}
                        onDelete={null}
                        isMember={false}
                      />
                    ))}
                  </div>
                ))}

                {filtered.length === 0 && (
                  <p className="text-[11px] text-[#bbb] p-3">No clauses found.</p>
                )}
              </>
            )}
          </div>
        </>
      )}

      {tab === 'suggestions' && (
        <div className="flex-1 overflow-y-auto">
          {suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-3">
              <p className="text-[11px] text-[#bbb] leading-relaxed">
                Run "Suggest missing clauses" from the slash menu (/) to see AI recommendations for your document.
              </p>
            </div>
          ) : (
            suggestions.map((s, i) => (
              <div key={i} className="px-3 py-2.5 border-b border-[#F0F0F0]">
                <p className="text-[11px] font-semibold text-[#0D0D0D]">{s.title}</p>
                <p className="text-[10px] text-amber-700 mb-1">{CATEGORY_LABELS[s.category] ?? s.category}</p>
                <p className="text-[10px] text-[#666] leading-relaxed">{s.reason}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Clause row sub-component ──────────────────────────────────────────────────

function ClauseRow({
  clause, expanded, onToggle, onInsert, onDelete, isMember,
}: {
  clause:   Clause
  expanded: boolean
  onToggle: () => void
  onInsert: () => void
  onDelete: (() => void) | null
  isMember: boolean
}) {
  return (
    <div className={`border-b border-[#F0F0F0] ${expanded ? 'bg-[#FAFAFA]' : ''}`}>
      <div className="flex items-start gap-2 px-3 py-2.5">
        <button onClick={onToggle} className="flex-1 text-left min-w-0">
          <p className="text-[11px] font-semibold text-[#0D0D0D] truncate">{clause.title}</p>
          {!expanded && (
            <p className="text-[10px] text-[#999] truncate mt-0.5">{clause.body.slice(0, 60)}…</p>
          )}
        </button>
        <button
          onClick={onInsert}
          className="shrink-0 text-[10px] font-semibold text-[#666] hover:text-[#0D0D0D] px-2 py-0.5 rounded-lg border border-[#E5E5E5] hover:border-[#0D0D0D] transition-colors"
        >
          Insert
        </button>
        {isMember && onDelete && (
          <button
            onClick={onDelete}
            className="shrink-0 w-5 h-5 flex items-center justify-center text-[#bbb] hover:text-red-500 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {expanded && (
        <div className="px-3 pb-2.5">
          <p className="text-[10px] text-[#666] leading-relaxed whitespace-pre-wrap font-mono bg-white border border-[#F0F0F0] rounded-lg p-2 max-h-40 overflow-y-auto">
            {clause.body}
          </p>
        </div>
      )}
    </div>
  )
}
