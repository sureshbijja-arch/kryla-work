'use client'

import { useState, useEffect, useCallback } from 'react'

interface Member {
  id:         string
  slug:       string
  first_name: string
  last_name:  string
  email:      string | null
  plan:       string
  page_live:  boolean
  suspended:  boolean
  created_at: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function Toggle({ on, busy, onClick }: { on: boolean; busy: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={busy}
      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-60 ${
        on ? 'bg-[#16A34A]' : 'bg-[#D1D5DB]'
      }`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
        on ? 'translate-x-5' : 'translate-x-0'
      }`} />
    </button>
  )
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [query, setQuery]     = useState('')
  const [busyId, setBusyId]   = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Member | null>(null)
  const [deleteInput, setDeleteInput]     = useState('')
  const [deleting, setDeleting]           = useState(false)

  const load = useCallback(async (q: string) => {
    setError('')
    try {
      const res = await fetch(`/api/admin/members${q ? `?q=${encodeURIComponent(q)}` : ''}`)
      if (res.status === 401) { window.location.href = '/admin'; return }
      if (res.status === 403) { setError('Not authorized'); setLoading(false); return }
      const data = await res.json()
      setMembers(data.members ?? [])
    } catch {
      setError('Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load('') }, [load])

  useEffect(() => {
    const t = setTimeout(() => load(query), 300)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  async function toggle(member: Member, field: 'page_live' | 'suspended') {
    setBusyId(member.id); setError('')
    const nextValue = !member[field]
    try {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ [field]: nextValue }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Update failed'); return }
      setMembers(prev => prev.map(m => m.id === member.id ? data.member : m))
    } catch {
      setError('Update failed')
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDelete() {
    if (!deleteConfirm) return
    setDeleting(true); setError('')
    try {
      const res = await fetch(`/api/admin/members/${deleteConfirm.id}`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ slug: deleteInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Delete failed'); return }
      setMembers(prev => prev.filter(m => m.id !== deleteConfirm.id))
      setDeleteConfirm(null)
      setDeleteInput('')
    } catch {
      setError('Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto pt-8">
        <p className="text-sm text-[#999]">Loading…</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto pt-8 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0D0D0D] mb-1">Members</h1>
        <p className="text-sm text-[#666]">
          Every member site, with two independent kill-switches. A site resolves only when
          both <span className="font-semibold text-[#0D0D0D]">Live</span> and <span className="font-semibold text-[#0D0D0D]">Not suspended</span> are on.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
      )}

      <input value={query} onChange={e => setQuery(e.target.value)}
        placeholder="Search by name, slug, or email…"
        className="field-input max-w-sm" />

      {members.length === 0 ? (
        <div className="bg-white border border-[#E5E5E5] rounded-2xl px-5 py-10 text-center">
          <p className="text-sm text-[#888]">No members found.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E5E5E5] rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#F0F0F0]">
                {['Name', 'Slug', 'Plan', 'Joined', 'Live', 'Not suspended', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-[#888] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => {
                const busy = busyId === m.id
                return (
                  <tr key={m.id} className={`border-b border-[#F9F9F9] ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                    <td className="px-4 py-2.5 whitespace-nowrap text-[#0D0D0D]">{m.first_name} {m.last_name}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <a href={`https://${m.slug}.kryla.work`} target="_blank" rel="noreferrer" className="text-[#C17A3A] hover:underline">{m.slug}</a>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-[#666]">{m.plan}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-[#666]">{formatDate(m.created_at)}</td>
                    <td className="px-4 py-2.5">
                      <Toggle on={m.page_live} busy={busy} onClick={() => toggle(m, 'page_live')} />
                    </td>
                    <td className="px-4 py-2.5">
                      <Toggle on={!m.suspended} busy={busy} onClick={() => toggle(m, 'suspended')} />
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <button onClick={() => { setDeleteConfirm(m); setDeleteInput('') }}
                        className="text-[10px] font-semibold text-red-500 hover:text-red-700 transition-colors">
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 max-w-sm w-full">
            <h2 className="text-base font-bold text-[#0D0D0D] mb-2">Delete {deleteConfirm.slug}?</h2>
            <p className="text-xs text-[#666] mb-4">
              This permanently removes this member and everything tied to them — bookings, reviews,
              documents, WhatsApp history, page content. This cannot be undone.
            </p>
            <label className="field-label">Type <span className="font-mono">{deleteConfirm.slug}</span> to confirm</label>
            <input value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
              className="field-input mb-4" autoFocus />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setDeleteConfirm(null); setDeleteInput('') }}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-[#666] hover:text-[#0D0D0D] transition-colors">
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={deleting || deleteInput.trim() !== deleteConfirm.slug}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-500 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-600 transition-colors">
                {deleting ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
