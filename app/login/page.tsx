'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail]     = useState('')
  const [status, setStatus]   = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setErrorMsg('Something went wrong — please try again')
      setStatus('error')
      return
    }

    setStatus('sent')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <line x1="11" y1="2" x2="11" y2="20" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" />
            <line x1="11" y1="11" x2="3"  y2="3"  stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" />
            <line x1="11" y1="11" x2="19" y2="3"  stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" />
            <line x1="11" y1="11" x2="19" y2="19" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span className="font-bold text-[#0D0D0D] text-base tracking-tight">
            kryla<span className="text-[#F5A623]">.work</span>
          </span>
        </div>

        {status === 'sent' ? (
          <div>
            <div className="w-10 h-10 rounded-full bg-[#F0FDF4] flex items-center justify-center mb-4">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9l4 4 8-8" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[#0D0D0D] mb-2">Check your email</h1>
            <p className="text-[#666666] text-sm leading-relaxed">
              We sent a sign-in link to <span className="font-semibold text-[#0D0D0D]">{email}</span>.
              Click the link to open your dashboard.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-[#0D0D0D] mb-1">Welcome back</h1>
            <p className="text-[#666666] text-sm mb-8">Enter your email to sign in to your profile</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0D0D0D] uppercase tracking-wide mb-1.5">
                  Email address
                </label>
                <input
                  required
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
                />
              </div>

              {status === 'error' && (
                <p className="text-red-500 text-sm">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-3 rounded-lg font-semibold text-white text-sm bg-[#0D0D0D] disabled:opacity-60 hover:opacity-80 transition-opacity">
                {status === 'loading' ? 'Sending…' : 'Send me a sign-in link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
