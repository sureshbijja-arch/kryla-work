'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import BookingsTab from '@/app/my-space/BookingsTab'
import PlanSection from '@/app/my-space/PlanSection'

type AuthState = 'loading' | 'login_email' | 'login_code' | 'checking' | 'not_owner' | 'ready'
type Tab = 'chat' | 'bookings' | 'plan'

interface Message {
  role: 'user' | 'assistant'
  content: string
  changed?: boolean
}

interface OwnerData {
  provider: {
    id: string
    slug: string
    firstName: string
    plan: string
    planStatus: string
    region: 'india' | 'usa'
    pageLive: boolean
  }
  currentProfile: Record<string, unknown>
}

export default function MySpacePanel({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [email, setEmail]         = useState('')
  const [code, setCode]           = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [ownerData, setOwnerData] = useState<OwnerData | null>(null)
  const [tab, setTab]             = useState<Tab>('chat')

  const [messages, setMessages]   = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  const supabase = createClient()

  const checkOwner = useCallback(async () => {
    setAuthState('checking')
    const res  = await fetch(`/api/my-space/check-owner?slug=${slug}`)
    const data = await res.json()
    if (data.isOwner) {
      setOwnerData(data)
      setMessages([{
        role: 'assistant',
        content: `Hi ${data.provider.firstName}! Tell me what you'd like to change — your headline, bio, services, colours, or anything else.`,
      }])
      setAuthState('ready')
    } else {
      setAuthState('not_owner')
    }
  }, [slug])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        checkOwner()
      } else {
        setAuthState('login_email')
      }
    })
  }, [checkOwner, supabase.auth])

  useEffect(() => {
    if (tab === 'chat') bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, tab])

  async function sendOtp() {
    setAuthLoading(true)
    setAuthError('')
    const { error } = await supabase.auth.signInWithOtp({ email })
    setAuthLoading(false)
    if (error) { setAuthError(error.message); return }
    setAuthState('login_code')
  }

  async function verifyOtp() {
    setAuthLoading(true)
    setAuthError('')
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    setAuthLoading(false)
    if (error) { setAuthError(error.message); return }
    await checkOwner()
  }

  async function sendChat() {
    const text = chatInput.trim()
    if (!text || chatLoading || !ownerData) return
    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setChatInput('')
    setChatLoading(true)
    try {
      const res  = await fetch('/api/my-space/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: ownerData.provider.id,
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          currentProfile: ownerData.currentProfile,
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message, changed: data.changed }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong — please try again.' }])
    } finally {
      setChatLoading(false)
      inputRef.current?.focus()
    }
  }

  const isSeed = !ownerData?.provider.plan || ownerData.provider.plan === 'seed'

  // ── Panel content by auth state ──────────────────────────────────────────

  if (authState === 'loading' || authState === 'checking') {
    return (
      <PanelShell onClose={onClose}>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex gap-1">
            {[0, 150, 300].map(d => (
              <div key={d} className="w-2 h-2 rounded-full bg-[#E5E5E5] animate-bounce" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        </div>
      </PanelShell>
    )
  }

  if (authState === 'login_email') {
    return (
      <PanelShell onClose={onClose}>
        <div className="flex-1 flex flex-col justify-center px-6 py-10 max-w-sm w-full mx-auto">
          <p className="font-bold text-[#0D0D0D] text-lg mb-1">Sign in to My Space</p>
          <p className="text-[#666] text-sm mb-6">We'll send a code to your email.</p>
          <label className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D] mb-1.5 block">Email</label>
          <input
            type="email" value={email} placeholder="you@example.com"
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendOtp()}
            className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors mb-3" />
          {authError && <p className="text-red-500 text-xs mb-3">{authError}</p>}
          <button onClick={sendOtp} disabled={authLoading || !email}
            className="w-full bg-[#0D0D0D] text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40 hover:opacity-80 transition-opacity">
            {authLoading ? 'Sending…' : 'Send code →'}
          </button>
        </div>
      </PanelShell>
    )
  }

  if (authState === 'login_code') {
    return (
      <PanelShell onClose={onClose}>
        <div className="flex-1 flex flex-col justify-center px-6 py-10 max-w-sm w-full mx-auto">
          <p className="font-bold text-[#0D0D0D] text-lg mb-1">Check your email</p>
          <p className="text-[#666] text-sm mb-6">Enter the 6-digit code sent to <span className="font-medium">{email}</span>.</p>
          <label className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D] mb-1.5 block">Code</label>
          <input
            type="text" inputMode="numeric" maxLength={6} value={code} placeholder="000000"
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && verifyOtp()}
            className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm tracking-widest text-center focus:outline-none focus:border-[#0D0D0D] transition-colors mb-3" />
          {authError && <p className="text-red-500 text-xs mb-3">{authError}</p>}
          <button onClick={verifyOtp} disabled={authLoading || code.length < 6}
            className="w-full bg-[#0D0D0D] text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40 hover:opacity-80 transition-opacity">
            {authLoading ? 'Verifying…' : 'Verify →'}
          </button>
          <button onClick={() => { setAuthState('login_email'); setCode(''); setAuthError('') }}
            className="mt-3 text-xs text-[#999] hover:text-[#0D0D0D] transition-colors text-center w-full">
            ← Back
          </button>
        </div>
      </PanelShell>
    )
  }

  if (authState === 'not_owner') {
    return (
      <PanelShell onClose={onClose}>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className="font-semibold text-[#0D0D0D] mb-2">This isn't your page</p>
          <p className="text-[#666] text-sm mb-6">The email you signed in with isn't linked to this profile.</p>
          <a href="/my-space" className="text-sm font-semibold text-[#F5A623] hover:underline">Go to My Space →</a>
        </div>
      </PanelShell>
    )
  }

  // ── Ready state ──────────────────────────────────────────────────────────

  return (
    <PanelShell onClose={onClose}>
      {/* Tabs */}
      <div className="border-b border-[#E5E5E5] px-4 flex items-center gap-5">
        {([['chat', 'Edit profile'], ['bookings', 'Bookings'], ['plan', 'My plan']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors ${
              tab === key ? 'border-[#0D0D0D] text-[#0D0D0D]' : 'border-transparent text-[#999] hover:text-[#0D0D0D]'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Chat tab */}
      {tab === 'chat' && (
        <>
          {isSeed && (
            <div className="px-4 pt-3">
              <div className="flex items-center justify-between gap-2 bg-[#FFF7ED] border border-[#F5A623]/30 rounded-xl px-3 py-2.5">
                <p className="text-xs text-[#444]"><span className="font-semibold">Upgrade to Sprout</span> to add a booking form</p>
                <button onClick={() => setTab('plan')} className="shrink-0 text-xs font-semibold text-[#EA8C00] hover:underline">Plans →</button>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%]">
                  <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#0D0D0D] text-white rounded-br-sm'
                      : 'bg-[#F5F5F5] text-[#0D0D0D] rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                  {msg.changed && (
                    <div className="flex items-center gap-1 mt-1 ml-1">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="text-[10px] text-[#22C55E] font-semibold">Saved</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-[#F5F5F5] rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 150, 300].map(d => (
                      <div key={d} className="w-1.5 h-1.5 rounded-full bg-[#bbb] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="border-t border-[#E5E5E5] px-3 py-3 flex gap-2 items-end">
            <textarea ref={inputRef} rows={1} value={chatInput}
              placeholder="What would you like to change?"
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
              disabled={chatLoading}
              className="flex-1 resize-none border border-[#E5E5E5] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb] disabled:opacity-50 max-h-28 overflow-y-auto" />
            <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
              className="shrink-0 w-9 h-9 rounded-xl bg-[#0D0D0D] text-white flex items-center justify-center disabled:opacity-40 hover:opacity-80 transition-opacity">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 14L14 8 2 2v4.5l8 1.5-8 1.5V14z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </>
      )}

      {/* Bookings tab */}
      {tab === 'bookings' && ownerData && (
        <div className="flex-1 overflow-y-auto">
          <BookingsTab providerId={ownerData.provider.id} />
        </div>
      )}

      {/* Plan tab */}
      {tab === 'plan' && ownerData && (
        <div className="flex-1 overflow-y-auto">
          <PlanSection currentPlan={ownerData.provider.plan} region={ownerData.provider.region} />
        </div>
      )}
    </PanelShell>
  )
}

function PanelShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5] shrink-0">
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
            <line x1="11" y1="2"  x2="11" y2="20" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" />
            <line x1="11" y1="11" x2="3"  y2="3"  stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" />
            <line x1="11" y1="11" x2="19" y2="3"  stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" />
            <line x1="11" y1="11" x2="19" y2="19" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span className="font-bold text-[#0D0D0D] text-sm">My Space</span>
        </div>
        <button onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center text-[#999] hover:bg-[#F5F5F5] hover:text-[#0D0D0D] transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {children}
    </div>
  )
}
