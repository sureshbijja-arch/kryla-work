'use client'

/**
 * AdvocateIntakeChat — client-side AI intake chat widget shown on advocate public pages.
 *
 * Renders a floating "Book a consultation" button that expands into a chat panel.
 * Calls POST /api/intake with { slug, messages } — unauthenticated, public.
 *
 * Compliance:
 *   - Visible "AI assistant — not legal advice" disclaimer on every turn.
 *   - DPDP consent captured conversationally by Claude during intake.
 *   - On done: shows success state; no further messages possible.
 */

import { useState, useRef, useEffect } from 'react'

interface Message {
  role:    'user' | 'assistant'
  content: string
}

interface Props {
  slug:             string
  advocateName:     string
  accentColor?:     string
  ctaLabel?:        string
  privilegeNotice?: string
}

const DISCLAIMER = 'AI assistant — not legal advice'

export default function AdvocateIntakeChat({ slug, advocateName, accentColor = '#F5A623', ctaLabel = 'Contact the office', privilegeNotice = '' }: Props) {
  const [open, setOpen]           = useState(false)
  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [done, setDone]           = useState(false)
  const [started, setStarted]     = useState(false)
  const bottomRef                 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function startChat() {
    if (started) return
    setStarted(true)
    setLoading(true)
    try {
      // Send an empty opening turn so Claude sends the first greeting
      const res  = await fetch('/api/intake', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ slug, messages: [{ role: 'user', content: 'Hi' }] }),
      })
      const data = await res.json()
      if (data.message) {
        setMessages([
          { role: 'user', content: 'Hi' },
          { role: 'assistant', content: data.message },
        ])
      }
      if (data.done) setDone(true)
    } finally {
      setLoading(false)
    }
  }

  async function send() {
    if (!input.trim() || loading || done) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const nextMessages     = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    try {
      const res  = await fetch('/api/intake', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ slug, messages: nextMessages }),
      })
      const data = await res.json()
      if (data.message) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
      }
      if (data.done) setDone(true)
    } finally {
      setLoading(false)
    }
  }

  function handleOpen() {
    setOpen(true)
    startChat()
  }

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <button
          onClick={handleOpen}
          style={{ background: accentColor }}
          className="fixed bottom-20 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full text-white text-sm font-semibold shadow-lg hover:opacity-90 transition-opacity">
          ⚖️ {ctaLabel}
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-0 right-0 z-40 w-full sm:w-96 sm:right-4 sm:bottom-6 bg-white sm:rounded-2xl shadow-2xl border border-[#E5E5E5] flex flex-col"
          style={{ maxHeight: '80vh' }}>

          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 sm:rounded-t-2xl"
            style={{ background: accentColor }}>
            <div>
              <p className="text-white font-semibold text-sm">{advocateName}&apos;s office</p>
              <p className="text-white/70 text-[10px]">{DISCLAIMER}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white text-lg leading-none">
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#0D0D0D] text-white'
                    : 'bg-[#F5F5F5] text-[#0D0D0D]'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#F5F5F5] px-3 py-2 rounded-2xl">
                  <span className="text-[#999] text-xs">Typing…</span>
                </div>
              </div>
            )}

            {done && (
              <div className="text-center py-3">
                <span className="text-xs font-semibold text-[#16A34A] bg-[#F0FDF4] px-3 py-1.5 rounded-full">
                  ✓ Enquiry received — {advocateName} will be in touch shortly
                </span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {!done && (
            <div className="border-t border-[#E5E5E5] px-3 py-3 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                disabled={loading}
                placeholder="Type your message…"
                className="flex-1 border border-[#E5E5E5] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors disabled:opacity-50"
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                style={{ background: accentColor }}
                className="px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity">
                Send
              </button>
            </div>
          )}

          {/* Persistent disclaimer + privilege notice */}
          <div className="text-[9px] text-[#bbb] text-center pb-2 px-4 space-y-0.5">
            <p>This AI assistant is for intake only. Nothing here constitutes legal advice.</p>
            {privilegeNotice && <p>{privilegeNotice}</p>}
          </div>
        </div>
      )}
    </>
  )
}
