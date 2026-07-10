'use client'

import { useState, useEffect } from 'react'

interface VerificationData {
  enrolment_no: string | null
  bar_council:  string | null
  state:        string | null
  status:       'pending' | 'verified' | 'rejected' | string
  submitted_at: string | null
  verified_at:  string | null
  verified_by:  string | null
}

interface AdvocateRow {
  id:           string
  first_name:   string
  last_name:    string
  email:        string
  verified:     boolean | null
  verification: VerificationData | null
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export default function AdminVerificationsPage() {
  const [advocates, setAdvocates] = useState<AdvocateRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [acting,    setActing]    = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/verifications')
      .then(r => r.json())
      .then(d => setAdvocates(d.advocates ?? []))
      .catch(() => setError('Failed to load verifications'))
      .finally(() => setLoading(false))
  }, [])

  async function act(providerId: string, status: 'verified' | 'rejected') {
    setActing(providerId + status)
    try {
      const res  = await fetch('/api/admin/verifications', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ providerId, status }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Action failed'); return }
      setAdvocates(prev => prev.map(a =>
        a.id === providerId
          ? { ...a, verified: status === 'verified', verification: data.verification }
          : a
      ))
    } catch {
      setError('Network error')
    } finally {
      setActing(null)
    }
  }

  if (loading) {
    return <div className="max-w-4xl mx-auto pt-8"><p className="text-sm text-[#999]">Loading…</p></div>
  }

  return (
    <div className="max-w-4xl mx-auto pt-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0D0D0D] mb-1">Advocate verifications</h1>
        <p className="text-sm text-[#666]">Review and verify enrolled advocates submitting Bar Council credentials.</p>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
      )}

      {advocates.length === 0 ? (
        <div className="bg-white border border-[#E5E5E5] rounded-2xl px-5 py-10 text-center">
          <p className="text-sm text-[#888]">No verification submissions yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E5E5E5] rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#F0F0F0]">
                {['Advocate', 'Enrolment No.', 'Bar Council', 'Submitted', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-[#888] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {advocates.map((a, i) => {
                const v = a.verification
                const status = v?.status ?? 'unverified'
                return (
                  <tr key={a.id} className={`border-b border-[#F9F9F9] ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#0D0D0D]">{a.first_name} {a.last_name}</p>
                      <p className="text-[#888] mt-0.5">{a.email}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-[#555]">{v?.enrolment_no ?? '—'}</td>
                    <td className="px-4 py-3 text-[#555]">
                      <p>{v?.bar_council ?? '—'}</p>
                      {v?.state && <p className="text-[#888]">{v.state}</p>}
                    </td>
                    <td className="px-4 py-3 text-[#666] whitespace-nowrap">{formatDate(v?.submitted_at ?? null)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        status === 'verified'  ? 'bg-[#F0FDF4] text-[#16A34A]' :
                        status === 'rejected'  ? 'bg-[#FEF2F2] text-red-500'   :
                        status === 'pending'   ? 'bg-[#FFFBEB] text-[#92400E]' :
                        'bg-[#F5F5F5] text-[#888]'
                      }`}>
                        {status}
                      </span>
                      {v?.verified_by && (
                        <p className="text-[10px] text-[#bbb] mt-0.5">by {v.verified_by}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {status !== 'verified' && (
                        <button
                          onClick={() => act(a.id, 'verified')}
                          disabled={acting !== null}
                          className="text-[10px] font-semibold text-[#16A34A] bg-[#F0FDF4] hover:bg-[#DCFCE7] px-2.5 py-1 rounded-lg mr-1.5 disabled:opacity-50 transition-colors">
                          Verify
                        </button>
                      )}
                      {status !== 'rejected' && (
                        <button
                          onClick={() => act(a.id, 'rejected')}
                          disabled={acting !== null}
                          className="text-[10px] font-semibold text-red-500 bg-[#FEF2F2] hover:bg-[#FEE2E2] px-2.5 py-1 rounded-lg disabled:opacity-50 transition-colors">
                          Reject
                        </button>
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
  )
}
