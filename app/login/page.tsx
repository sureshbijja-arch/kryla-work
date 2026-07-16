'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import posthog from 'posthog-js'

type Channel = 'email' | 'whatsapp'
type Step    = 'input' | 'otp' | 'error'

const KMARK = (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
    <line x1="11" y1="2"  x2="11" y2="20" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" />
    <line x1="11" y1="11" x2="3"  y2="3"  stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" />
    <line x1="11" y1="11" x2="19" y2="3"  stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" />
    <line x1="11" y1="11" x2="19" y2="19" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" />
  </svg>
)

export default function LoginPage() {
  const router = useRouter()

  const [channel, setChannel] = useState<Channel>('email')
  const [step,    setStep]    = useState<Step>('input')
  const [email,   setEmail]   = useState('')
  const [phone,   setPhone]   = useState('')
  const [otp,     setOtp]     = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // ── Email path (unchanged) ─────────────────────────────────────────────────

  async function sendEmailOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErrorMsg('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({ email })
    setLoading(false)
    if (error) { setErrorMsg(error.message || 'Something went wrong'); return }
    posthog.capture('login_otp_requested', { channel: 'email', email })
    setStep('otp')
  }

  async function verifyEmailOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErrorMsg('')
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({ email, token: otp.trim(), type: 'email' })
    setLoading(false)
    if (error) { setErrorMsg('Incorrect code — check your email and try again'); return }
    posthog.identify(email, { email })
    posthog.capture('login_completed', { channel: 'email' })
    router.push('/mychat')
  }

  // ── WhatsApp path ──────────────────────────────────────────────────────────

  async function sendWhatsAppOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErrorMsg('')
    const res = await fetch('/api/auth/whatsapp/start', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ phone: phone.replace(/\D/g, '') }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setErrorMsg(data.error || 'Something went wrong'); return }
    posthog.capture('login_otp_requested', { channel: 'whatsapp' })
    setStep('otp')
  }

  async function verifyWhatsAppOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErrorMsg('')
    const res = await fetch('/api/auth/whatsapp/verify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ phone: phone.replace(/\D/g, ''), code: otp.trim() }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setErrorMsg(data.error || 'Incorrect code — try again'); return }
    posthog.capture('login_completed', { channel: 'whatsapp' })
    router.push(data.redirect ?? '/mychat')
  }

  function reset() { setStep('input'); setOtp(''); setErrorMsg('') }

  // ── Shared UI ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          {KMARK}
          <span className="font-bold text-[#0D0D0D] text-base tracking-tight">
            kryla<span className="text-[#F5A623]">.work</span>
          </span>
        </div>

        {step === 'input' && (
          <>
            <h1 className="text-2xl font-bold text-[#0D0D0D] mb-1">Welcome back</h1>
            <p className="text-[#666] text-sm mb-6">Sign in to My Chat</p>

            {/* Channel segmented control */}
            <div className="flex bg-[#F5F5F5] rounded-xl p-1 mb-6">
              {(['email', 'whatsapp'] as Channel[]).map(ch => (
                <button
                  key={ch}
                  onClick={() => { setChannel(ch); setErrorMsg('') }}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    channel === ch
                      ? 'bg-white text-[#0D0D0D] shadow-sm'
                      : 'text-[#999]'
                  }`}>
                  {ch === 'email' ? 'Email' : 'WhatsApp'}
                </button>
              ))}
            </div>

            {channel === 'email' ? (
              <form onSubmit={sendEmailOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0D0D0D] uppercase tracking-wide mb-1.5">
                    Email address
                  </label>
                  <input
                    required type="email" placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
                  />
                </div>
                {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-lg font-semibold text-white text-sm bg-[#0D0D0D] disabled:opacity-60 hover:opacity-80 transition-opacity">
                  {loading ? 'Sending…' : 'Send code'}
                </button>
              </form>
            ) : (
              <form onSubmit={sendWhatsAppOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0D0D0D] uppercase tracking-wide mb-1.5">
                    WhatsApp number (with country code)
                  </label>
                  <input
                    required type="tel" placeholder="+91 98765 43210"
                    value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
                  />
                  <p className="text-xs text-[#999] mt-1">Enter the same number you registered with</p>
                </div>
                {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-lg font-semibold text-white text-sm bg-[#0D0D0D] disabled:opacity-60 hover:opacity-80 transition-opacity">
                  {loading ? 'Sending…' : 'Send WhatsApp code'}
                </button>
              </form>
            )}
          </>
        )}

        {step === 'otp' && (
          <>
            <div className="w-10 h-10 rounded-full bg-[#FFF7ED] flex items-center justify-center mb-4">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="5" width="14" height="10" rx="2" stroke="#EA8C00" strokeWidth="1.5" />
                <path d="M5 5V4a4 4 0 0 1 8 0v1" stroke="#EA8C00" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#0D0D0D] mb-1">Enter your code</h1>
            <p className="text-[#666] text-sm mb-8">
              {channel === 'email'
                ? <>We sent a 6-digit code to <strong className="text-[#0D0D0D]">{email}</strong>.</>
                : <>We sent a WhatsApp code to <strong className="text-[#0D0D0D]">{phone}</strong>.</>
              }
            </p>

            <form
              onSubmit={channel === 'email' ? verifyEmailOtp : verifyWhatsAppOtp}
              className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0D0D0D] uppercase tracking-wide mb-1.5">
                  6-digit code
                </label>
                <input
                  required type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setOtp(v)
                  }}
                  className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb] tracking-widest text-center text-lg font-semibold"
                />
              </div>
              {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
              <button type="submit" disabled={loading || otp.length < 6}
                className="w-full py-3 rounded-lg font-semibold text-white text-sm bg-[#0D0D0D] disabled:opacity-60 hover:opacity-80 transition-opacity">
                {loading ? 'Verifying…' : 'Sign in'}
              </button>
              <button type="button" onClick={reset}
                className="w-full text-xs text-[#999] hover:text-[#0D0D0D] transition-colors">
                {channel === 'email' ? 'Use a different email' : 'Use a different number'}
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  )
}
