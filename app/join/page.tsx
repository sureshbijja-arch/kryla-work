'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'

export default function JoinPage() {
  const router = useRouter()
  const [code,    setCode]    = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function handleCodeInput(raw: string) {
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)
    setCode(clean)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 5) { setError('Code must be 5 characters'); return }
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/referral/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Invalid code — check and try again'); return }
      posthog.capture('invite_code_accepted', { ref: data.code })
      router.push(`/onboarding?ref=${encodeURIComponent(data.code)}`)
    } catch {
      setError('Something went wrong — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-10">
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
              <path d="M20 10 L20 90" stroke="#0D0D0D" strokeWidth="14" strokeLinecap="round"/>
              <path d="M20 50 L70 10" stroke="#0D0D0D" strokeWidth="14" strokeLinecap="round"/>
              <path d="M20 50 L70 90" stroke="#F5A623" strokeWidth="14" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px' }}>
              <span style={{ color: '#0D0D0D' }}>kryla</span>
              <span style={{ color: '#F5A623' }}>.work</span>
            </span>
          </a>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] px-8 py-10 shadow-sm">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#F5A623] mb-3">Invite only</p>
            <h1 className="text-2xl font-black text-[#0D0D0D] mb-2">Enter your invite code</h1>
            <p className="text-sm text-[#666]">You need an invite code from a Kryla member to join.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={code}
                onChange={e => handleCodeInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(e as unknown as React.FormEvent) }}
                placeholder="e.g. LUCKY"
                maxLength={5}
                autoFocus
                className="w-full border border-[#E5E5E5] rounded-xl px-4 py-4 text-center text-2xl font-black uppercase tracking-[0.3em] focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#CCC] placeholder:tracking-widest"
              />
              {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={code.length !== 5 || loading}
              className="w-full py-4 rounded-xl text-sm font-black text-white bg-[#0D0D0D] hover:opacity-80 disabled:opacity-40 transition-opacity">
              {loading ? 'Checking…' : 'Verify code →'}
            </button>
          </form>

          <p className="text-center text-xs text-[#999] mt-6">
            Don&apos;t have a code?{' '}
            <a href="mailto:hello@kryla.work" className="text-[#0D0D0D] font-semibold hover:underline">
              Contact us
            </a>
          </p>
        </div>

      </div>
    </div>
  )
}
