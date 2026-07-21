'use client'

import { useState, useEffect } from 'react'

type GateMode = 'none' | 'all' | 'list'
type RequestStatus = 'pending' | 'approved' | 'rejected' | 'done'
type OutputType = 'native' | 'clone'

interface Gate {
  mode:  GateMode
  codes: string[]
}

interface CopyRequest {
  id:          string
  provider_id: string | null
  slug:        string
  source_url:  string
  status:      RequestStatus
  output_type: OutputType | null
  admin_note:  string | null
  created_at:  string
  reviewed_at: string | null
}

const MODE_LABELS: Record<GateMode, string> = {
  none: 'Off for everyone',
  all:  'On for everyone',
  list: 'Only allowlisted codes',
}

const STATUS_STYLE: Record<RequestStatus, string> = {
  pending:  'bg-[#FFF7ED] text-[#C17A3A]',
  approved: 'bg-[#F0FDF4] text-[#16A34A]',
  rejected: 'bg-[#FEF2F2] text-red-500',
  done:     'bg-[#F5F5F5] text-[#555]',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export default function AdminCopyWebsitePage() {
  const [gate, setGate]         = useState<Gate>({ mode: 'none', codes: [] })
  const [requests, setRequests] = useState<CopyRequest[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [savingGate, setSavingGate] = useState(false)
  const [codesText, setCodesText]   = useState('')
  const [busyId, setBusyId]         = useState<string | null>(null)
  const [outputChoice, setOutputChoice] = useState<Record<string, OutputType>>({})
  const [importingId, setImportingId]   = useState<string | null>(null)
  const [importError, setImportError]   = useState<Record<string, string>>({})

  useEffect(() => { load() }, [])

  async function load() {
    setError('')
    try {
      const res = await fetch('/api/admin/copywebsite')
      if (res.status === 401) { window.location.href = '/admin'; return }
      if (res.status === 403) { setError('Not authorized'); setLoading(false); return }
      const data = await res.json()
      setGate(data.gate ?? { mode: 'none', codes: [] })
      setCodesText((data.gate?.codes ?? []).join(', '))
      setRequests(data.requests ?? [])
    } catch {
      setError('Failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function saveGate(nextMode: GateMode) {
    setSavingGate(true); setError('')
    const codes = codesText.split(',').map(c => c.trim().toUpperCase()).filter(Boolean)
    try {
      const res = await fetch('/api/admin/copywebsite', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mode: nextMode, codes }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Save failed'); return }
      setGate(data.gate)
      setCodesText(data.gate.codes.join(', '))
    } catch {
      setError('Save failed')
    } finally {
      setSavingGate(false)
    }
  }

  async function review(id: string, status: RequestStatus, output_type?: OutputType) {
    setBusyId(id); setError('')
    try {
      const res = await fetch(`/api/admin/copywebsite/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status, ...(output_type ? { output_type } : {}) }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Update failed'); return }
      setRequests(prev => prev.map(r => r.id === id ? data.request : r))
    } catch {
      setError('Update failed')
    } finally {
      setBusyId(null)
    }
  }

  async function importContent(id: string) {
    setImportingId(id)
    setImportError(prev => ({ ...prev, [id]: '' }))
    try {
      const res = await fetch(`/api/admin/copywebsite/${id}/import`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setImportError(prev => ({ ...prev, [id]: data.error ?? 'Import failed to start' })); return }
      setImportError(prev => ({ ...prev, [id]: 'started' }))
    } catch {
      setImportError(prev => ({ ...prev, [id]: 'Import failed to start' }))
    } finally {
      setImportingId(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto pt-8">
        <p className="text-sm text-[#999]">Loading…</p>
      </div>
    )
  }

  const pending = requests.filter(r => r.status === 'pending')
  const reviewed = requests.filter(r => r.status !== 'pending')

  return (
    <div className="max-w-4xl mx-auto pt-8 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0D0D0D] mb-1">CopyWebsite</h1>
        <p className="text-sm text-[#666]">
          Control who can bring an existing website over, and review each request by hand.
          Nothing is ever built automatically — approving a request just marks it ready for you to build in MyKryla.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
      )}

      {/* Gate config */}
      <div>
        <h2 className="text-xs font-semibold text-[#999] uppercase tracking-widest mb-4">Who sees the option</h2>
        <div className="bg-white border border-[#E5E5E5] rounded-2xl px-5 py-4 space-y-4">
          <div className="flex gap-2">
            {(['none', 'list', 'all'] as GateMode[]).map(m => (
              <button key={m} onClick={() => saveGate(m)} disabled={savingGate}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 ${
                  gate.mode === m ? 'bg-[#F5A623] text-[#0D0D0D]' : 'bg-[#F5F5F5] text-[#666] hover:text-[#0D0D0D]'
                }`}>
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
          <div>
            <label className="field-label">Allowlisted referral codes (used when mode is &quot;Only allowlisted codes&quot;)</label>
            <div className="flex gap-2">
              <input value={codesText} onChange={e => setCodesText(e.target.value)}
                placeholder="BIJJA, WELCOME24"
                className="field-input flex-1" />
              <button onClick={() => saveGate(gate.mode)} disabled={savingGate}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0D0D0D] text-white disabled:opacity-60 hover:bg-[#222] transition-colors whitespace-nowrap">
                {savingGate ? 'Saving…' : 'Save codes'}
              </button>
            </div>
            <p className="text-[10px] text-[#bbb] mt-1.5">Comma-separated. Matches the code a member signed up under (providers.referred_by).</p>
          </div>
        </div>
      </div>

      {/* Pending requests */}
      <div>
        <h2 className="text-xs font-semibold text-[#999] uppercase tracking-widest mb-4">
          Pending review{pending.length > 0 ? ` (${pending.length})` : ''}
        </h2>
        {pending.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] rounded-2xl px-5 py-10 text-center">
            <p className="text-sm text-[#888]">No pending requests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(r => {
              const busy = busyId === r.id
              const choice = outputChoice[r.id] ?? 'native'
              return (
                <div key={r.id} className="bg-white border border-[#E5E5E5] rounded-2xl px-5 py-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <p className="text-sm font-semibold text-[#0D0D0D]">{r.slug}</p>
                      <a href={r.source_url} target="_blank" rel="noreferrer"
                        className="text-xs text-[#C17A3A] hover:underline break-all">{r.source_url}</a>
                      <p className="text-[10px] text-[#bbb] mt-1">{formatDate(r.created_at)}</p>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${STATUS_STYLE[r.status]}`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select value={choice} onChange={e => setOutputChoice(prev => ({ ...prev, [r.id]: e.target.value as OutputType }))}
                      className="field-input w-auto text-xs py-1.5">
                      <option value="native">Native pre-fill</option>
                      <option value="clone">Faithful clone</option>
                    </select>
                    <button onClick={() => review(r.id, 'approved', choice)} disabled={busy}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#16A34A] text-white disabled:opacity-60 hover:opacity-90 transition-opacity">
                      {busy ? 'Saving…' : `Approve as ${choice === 'native' ? 'Native' : 'Clone'}`}
                    </button>
                    <button onClick={() => review(r.id, 'rejected')} disabled={busy}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F5F5F5] text-[#666] disabled:opacity-60 hover:text-[#0D0D0D] transition-colors">
                      Reject
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Reviewed requests */}
      <div>
        <h2 className="text-xs font-semibold text-[#999] uppercase tracking-widest mb-4">Reviewed</h2>
        {reviewed.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] rounded-2xl px-5 py-10 text-center">
            <p className="text-sm text-[#888]">Nothing reviewed yet.</p>
          </div>
        ) : (
          <div className="bg-white border border-[#E5E5E5] rounded-2xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#F0F0F0]">
                  {['Member', 'URL', 'Status', 'Output', 'Reviewed', 'Note', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-[#888] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reviewed.map((r, i) => {
                  const importing = importingId === r.id
                  const importMsg = importError[r.id]
                  const canImport = (r.status === 'approved' || r.status === 'done') && r.output_type === 'native'
                  return (
                  <tr key={r.id} className={`border-b border-[#F9F9F9] ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                    <td className="px-4 py-2.5 whitespace-nowrap text-[#0D0D0D]">{r.slug}</td>
                    <td className="px-4 py-2.5 max-w-[220px] truncate">
                      <a href={r.source_url} target="_blank" rel="noreferrer" className="text-[#C17A3A] hover:underline">{r.source_url}</a>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-[#666]">{r.output_type ?? '—'}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-[#666]">{r.reviewed_at ? formatDate(r.reviewed_at) : '—'}</td>
                    <td className="px-4 py-2.5 max-w-[200px] truncate text-[#888]" title={r.admin_note ?? ''}>{r.admin_note ?? '—'}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap space-x-2">
                      {canImport && (
                        <button onClick={() => importContent(r.id)} disabled={importing}
                          className="text-[10px] font-semibold text-[#C17A3A] hover:text-[#8f5623] disabled:opacity-60 transition-colors">
                          {importing ? 'Starting…' : 'Import content'}
                        </button>
                      )}
                      {canImport && (
                        <a href={`https://${r.slug}.kryla.work/preview`} target="_blank" rel="noreferrer"
                          className="text-[10px] font-semibold text-[#666] hover:text-[#0D0D0D] transition-colors">
                          Preview →
                        </a>
                      )}
                      {r.status === 'approved' && (
                        <button onClick={() => review(r.id, 'done')} disabled={busyId === r.id}
                          className="text-[10px] font-semibold text-[#666] hover:text-[#0D0D0D] disabled:opacity-60 transition-colors">
                          Mark done
                        </button>
                      )}
                      {importMsg && importMsg !== 'started' && (
                        <p className="text-[10px] text-red-500 mt-1">{importMsg}</p>
                      )}
                      {importMsg === 'started' && (
                        <p className="text-[10px] text-[#16A34A] mt-1">Import started — refresh shortly</p>
                      )}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
