'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type AuthState = 'loading' | 'login_email' | 'login_code' | 'ready'

const NAV = [
  { label: 'Layouts',     href: '/admin/layouts' },
  { label: 'Plans',       href: '/admin/plans' },
  { label: 'Personas',    href: '/admin/personas' },
  { label: 'Suggestions', href: '/admin/suggestions' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname                      = usePathname()
  const [authState, setAuthState]     = useState<AuthState>('loading')
  const [email, setEmail]             = useState('')
  const [code, setCode]               = useState('')
  const [authError, setAuthError]     = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthState(user ? 'ready' : 'login_email')
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function sendOtp() {
    setAuthLoading(true); setAuthError('')
    const { error } = await supabase.auth.signInWithOtp({ email })
    setAuthLoading(false)
    if (error) { setAuthError(error.message); return }
    setAuthState('login_code')
  }

  async function verifyOtp() {
    setAuthLoading(true); setAuthError('')
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    setAuthLoading(false)
    if (error) { setAuthError(error.message); return }
    setAuthState('ready')
  }

  async function signOut() {
    await supabase.auth.signOut()
    setEmail(''); setCode(''); setAuthError(''); setAuthState('login_email')
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center">
        <span className="text-sm text-[#999]">Loading…</span>
      </div>
    )
  }

  // ── OTP screens ────────────────────────────────────────────────────────────

  if (authState === 'login_email' || authState === 'login_code') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">

          {/* Kryla logo */}
          <div className="flex items-center gap-2 mb-10">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <line x1="11" y1="2"  x2="11" y2="20" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" />
              <line x1="11" y1="11" x2="3"  y2="3"  stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" />
              <line x1="11" y1="11" x2="19" y2="3"  stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" />
              <line x1="11" y1="11" x2="19" y2="19" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span className="font-bold text-[#0D0D0D] text-base tracking-tight">
              kryla<span className="text-[#F5A623]">.work</span>
            </span>
          </div>

          {authState === 'login_email' && (
            <>
              <h1 className="text-2xl font-bold text-[#0D0D0D] mb-1">Admin sign in</h1>
              <p className="text-[#666] text-sm mb-8">Enter your admin email to receive a code.</p>
              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && email && sendOtp()}
                  className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
                />
                {authError && <p className="text-red-500 text-sm">{authError}</p>}
                <button onClick={sendOtp} disabled={authLoading || !email}
                  className="w-full py-3 rounded-lg font-semibold text-white text-sm bg-[#0D0D0D] disabled:opacity-60 hover:opacity-80 transition-opacity">
                  {authLoading ? 'Sending…' : 'Send code'}
                </button>
              </div>
            </>
          )}

          {authState === 'login_code' && (
            <>
              <div className="w-10 h-10 rounded-full bg-[#FFF7ED] flex items-center justify-center mb-4">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="2" y="5" width="14" height="10" rx="2" stroke="#EA8C00" strokeWidth="1.5" />
                  <path d="M5 5V4a4 4 0 0 1 8 0v1" stroke="#EA8C00" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-[#0D0D0D] mb-1">Enter your code</h1>
              <p className="text-[#666] text-sm mb-8">
                We sent a 6-digit code to{' '}
                <span className="font-semibold text-[#0D0D0D]">{email}</span>.
              </p>
              <div className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  placeholder="000000"
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && code.length === 6 && verifyOtp()}
                  className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm tracking-widest text-center text-lg font-semibold focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
                />
                {authError && <p className="text-red-500 text-sm">{authError}</p>}
                <button onClick={verifyOtp} disabled={authLoading || code.length < 6}
                  className="w-full py-3 rounded-lg font-semibold text-white text-sm bg-[#0D0D0D] disabled:opacity-60 hover:opacity-80 transition-opacity">
                  {authLoading ? 'Verifying…' : 'Sign in'}
                </button>
                <button onClick={() => { setAuthState('login_email'); setCode(''); setAuthError('') }}
                  className="w-full text-xs text-[#999] hover:text-[#0D0D0D] transition-colors">
                  Use a different email
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    )
  }

  // ── Authenticated shell ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F9F9F9]">

      {/* Top nav */}
      <nav className="bg-white border-b border-[#E5E5E5] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-6">

          {/* Logo + admin label */}
          <a href="/" className="flex items-center gap-2 shrink-0">
            <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
              <line x1="11" y1="2"  x2="11" y2="20" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" />
              <line x1="11" y1="11" x2="3"  y2="3"  stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" />
              <line x1="11" y1="11" x2="19" y2="3"  stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" />
              <line x1="11" y1="11" x2="19" y2="19" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span className="font-bold text-[#0D0D0D] text-sm tracking-tight">
              kryla<span className="text-[#F5A623]">.work</span>
            </span>
          </a>
          <span className="text-[#D1D5DB] text-xs">/</span>
          <a href="/admin" className="text-xs font-semibold text-[#666] hover:text-[#0D0D0D] transition-colors">admin</a>

          {/* Section tabs */}
          <div className="flex items-center gap-1">
            {NAV.map(tab => {
              const active = pathname.startsWith(tab.href)
              return (
                <a key={tab.href} href={tab.href}
                  className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    active
                      ? 'bg-[#F5A623] text-[#0D0D0D]'
                      : 'text-[#666] hover:text-[#0D0D0D] hover:bg-[#F5F5F5]'
                  }`}>
                  {tab.label}
                </a>
              )
            })}
          </div>

          <div className="flex-1" />

          <button onClick={signOut}
            className="text-xs font-semibold text-[#999] hover:text-[#0D0D0D] transition-colors">
            Sign out
          </button>
        </div>
      </nav>

      {/* Page content */}
      <div className="px-4 py-8">
        {children}
      </div>

      <style jsx global>{`
        .field-label {
          display: block; font-size: 10px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.05em;
          color: #6B7280; margin-bottom: 4px;
        }
        .field-input {
          width: 100%; border: 1px solid #E5E5E5; border-radius: 10px;
          padding: 8px 12px; font-size: 13px; background: white;
          outline: none; transition: border-color 0.15s;
        }
        .field-input:focus { border-color: #0D0D0D; }
      `}</style>
    </div>
  )
}
