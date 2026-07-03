'use client'

import { useState, useEffect, useRef } from 'react'

interface Provider {
  id:         string
  first_name: string
  last_name:  string
  slug:       string
  email:      string
}

interface Suggestion {
  id:             string
  suggestion_id:  string
  description:    string
  created_at:     string
  updated_at:     string
  auto_implement: boolean
  status:         string
  comments:       string | null
  providers:      Provider | null
}

const STATUSES = ['pending', 'in_review', 'implementing', 'done', 'rejected'] as const

const STATUS_BG: Record<string, string> = {
  pending:      '#F3F4F6',
  in_review:    '#FEF3C7',
  implementing: '#DBEAFE',
  done:         '#DCFCE7',
  rejected:     '#FEE2E2',
}

const STATUS_TEXT: Record<string, string> = {
  pending:      '#6B7280',
  in_review:    '#92400E',
  implementing: '#1E40AF',
  done:         '#166534',
  rejected:     '#991B1B',
}

export default function AdminSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [runningId, setRunningId]     = useState<string | null>(null)

  useEffect(() => {
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    setError('')
    const res = await fetch('/api/admin/suggestion')
    if (res.status === 401) { window.location.href = '/admin'; return }
    if (res.status === 403) { setError('Not authorized'); setLoading(false); return }
    const data = await res.json()
    setSuggestions(data.suggestions ?? [])
    setLoading(false)
  }

  async function patch(id: string, fields: Record<string, unknown>) {
    const res = await fetch('/api/admin/suggestion', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...fields }),
    })
    if (!res.ok) { setError('Save failed'); return }
    const data = await res.json()
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, ...data.suggestion } : s))
  }

  async function runAgent(id: string) {
    setRunningId(id); setError('')
    try {
      const res = await fetch('/api/admin/suggestion/run-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) { setError('Agent failed — try again'); return }
      const data = await res.json()
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, ...data.suggestion } : s))
    } finally {
      setRunningId(null)
    }
  }

  const visible = filterStatus === 'all'
    ? suggestions
    : suggestions.filter(s => s.status === filterStatus)

  if (loading) {
    return <div className="py-20 text-center text-sm text-[#999]">Loading…</div>
  }

  if (error && suggestions.length === 0) {
    return <div className="py-20 text-center text-sm text-red-500">{error}</div>
  }

  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = suggestions.filter(x => x.status === s).length
    return acc
  }, {})

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0D0D0D]">Suggestions</h1>
          <p className="text-sm text-[#666] mt-0.5">
            {suggestions.length} total · {counts.pending ?? 0} pending · {counts.implementing ?? 0} implementing
          </p>
        </div>
        <button onClick={load}
          className="text-xs font-semibold text-[#666] border border-[#E5E5E5] rounded-xl px-3 py-2 hover:border-[#0D0D0D] hover:text-[#0D0D0D] transition-colors">
          Refresh
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* Status filter pills */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {(['all', ...STATUSES] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
              filterStatus === s
                ? 'bg-[#0D0D0D] text-white border-[#0D0D0D]'
                : 'border-[#E5E5E5] text-[#666] hover:border-[#0D0D0D] hover:text-[#0D0D0D]'
            }`}>
            {s === 'all' ? `All (${suggestions.length})` : `${s.replace('_', ' ')} (${counts[s] ?? 0})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#E5E5E5]">
        <table className="w-full text-sm border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-[#F9F9F9] border-b border-[#E5E5E5]">
              <th className="text-left text-[10px] font-semibold uppercase tracking-wide text-[#999] px-4 py-3 w-8">#</th>
              <th className="text-left text-[10px] font-semibold uppercase tracking-wide text-[#999] px-3 py-3 w-24">ID</th>
              <th className="text-left text-[10px] font-semibold uppercase tracking-wide text-[#999] px-3 py-3">Description</th>
              <th className="text-left text-[10px] font-semibold uppercase tracking-wide text-[#999] px-3 py-3 w-32">Provider</th>
              <th className="text-left text-[10px] font-semibold uppercase tracking-wide text-[#999] px-3 py-3 w-28">Date</th>
              <th className="text-center text-[10px] font-semibold uppercase tracking-wide text-[#999] px-3 py-3 w-24">Auto-impl</th>
              <th className="text-left text-[10px] font-semibold uppercase tracking-wide text-[#999] px-3 py-3 w-36">Status</th>
              <th className="text-left text-[10px] font-semibold uppercase tracking-wide text-[#999] px-3 py-3 w-56">Comments</th>
              <th className="text-left text-[10px] font-semibold uppercase tracking-wide text-[#999] px-3 py-3 w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {visible.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-[#999] text-sm py-12">No suggestions for this filter.</td>
              </tr>
            )}
            {visible.map(s => (
              <SuggestionRow
                key={s.id}
                row={s}
                rowNumber={suggestions.indexOf(s) + 1}
                isRunning={runningId === s.id}
                onPatch={fields => patch(s.id, fields)}
                onRunAgent={() => runAgent(s.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Row component ──────────────────────────────────────────────────────────

function SuggestionRow({
  row, rowNumber, isRunning, onPatch, onRunAgent,
}: {
  row: Suggestion
  rowNumber: number
  isRunning: boolean
  onPatch: (fields: Record<string, unknown>) => void
  onRunAgent: () => void
}) {
  const [comments, setComments] = useState(row.comments ?? '')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function saveComments(val: string) {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onPatch({ comments: val || null }), 800)
  }

  const p = row.providers

  return (
    <tr className="hover:bg-[#FAFAFA] transition-colors align-top">
      <td className="px-4 py-3 text-xs text-[#999]">{rowNumber}</td>
      <td className="px-3 py-3">
        <span className="font-mono text-[11px] text-[#666]">{row.suggestion_id}</span>
      </td>
      <td className="px-3 py-3">
        <p className="text-sm text-[#0D0D0D] leading-relaxed">{row.description}</p>
      </td>
      <td className="px-3 py-3">
        {p ? (
          <div>
            <a href={`/${p.slug}`} target="_blank" rel="noopener noreferrer"
              className="text-xs font-semibold text-[#0D0D0D] hover:underline">
              {p.first_name} {p.last_name}
            </a>
            <p className="text-[10px] text-[#999] mt-0.5 truncate max-w-[120px]">{p.email}</p>
          </div>
        ) : (
          <span className="text-[#ccc] text-xs">—</span>
        )}
      </td>
      <td className="px-3 py-3">
        <p className="text-xs text-[#666]">
          {new Date(row.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
        </p>
      </td>
      <td className="px-3 py-3 text-center">
        <button
          onClick={() => onPatch({ auto_implement: !row.auto_implement })}
          className={`w-9 h-5 rounded-full transition-colors relative inline-flex ${row.auto_implement ? 'bg-[#22C55E]' : 'bg-[#D1D5DB]'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            row.auto_implement ? 'translate-x-4' : 'translate-x-0.5'
          }`} />
        </button>
      </td>
      <td className="px-3 py-3">
        <select
          value={row.status}
          onChange={e => onPatch({ status: e.target.value })}
          className="text-xs font-semibold rounded-full px-2.5 py-1 border-0 outline-none cursor-pointer"
          style={{
            background: STATUS_BG[row.status] ?? '#F3F4F6',
            color: STATUS_TEXT[row.status] ?? '#666',
          }}>
          {STATUSES.map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3">
        <textarea
          value={comments}
          onChange={e => { setComments(e.target.value); saveComments(e.target.value) }}
          placeholder="Add comment or notes…"
          rows={2}
          className="w-full text-xs text-[#444] bg-[#F9F9F9] border border-[#E5E5E5] rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#ccc] leading-relaxed"
        />
      </td>
      <td className="px-3 py-3">
        <button
          onClick={onRunAgent}
          disabled={isRunning}
          className="text-xs font-semibold text-white bg-[#0D0D0D] rounded-lg px-3 py-1.5 disabled:opacity-40 hover:opacity-80 transition-opacity whitespace-nowrap">
          {isRunning ? 'Analysing…' : 'Run agent'}
        </button>
      </td>
    </tr>
  )
}
