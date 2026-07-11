'use client'

import { useState, useRef, useEffect } from 'react'
import LegalNewsTicker from './LegalNewsTicker'

interface ResearchMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: { title: string; url: string }[]
}

interface Props {
  providerId: string
  open: boolean
  onClose: () => void
  /** Optional: pre-fill the input (from the suggest_research nudge) */
  initialQuery?: string
  /** Persona of the member — used to gate the LiveLaw ticker (advocate only) */
  persona?: string
  /** Region of the member — used to gate the LiveLaw ticker (india only) */
  region?: string
}

const GREETING: ResearchMessage = {
  role: 'assistant',
  content: "Hi! I'm your Research co-pilot. Ask me anything — solve a problem step by step, generate practice questions, plan a lesson, look up competitor pricing, explore marketing ideas. What would you like to dig into?",
}

export default function ResearchChat({ providerId, open, onClose, initialQuery, persona, region }: Props) {
  const [messages, setMessages]   = useState<ResearchMessage[]>([GREETING])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const bottomRef                 = useRef<HTMLDivElement>(null)
  const inputRef                  = useRef<HTMLTextAreaElement>(null)

  // Pre-fill input from nudge (only once per open)
  useEffect(() => {
    if (open && initialQuery) {
      setInput(initialQuery)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Reset conversation when overlay is closed
  useEffect(() => {
    if (!open) {
      setMessages([GREETING])
      setInput('')
      setLoading(false)
    }
  }, [open])

  // Scroll to bottom on new message
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ResearchMessage = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/mychat/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          messages: [...messages, userMsg]
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.message ?? 'Something went wrong — please try again.',
          sources: data.sources?.length ? data.sources : undefined,
        },
      ])
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong — please try again.' },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E5E5] px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {/* Magnifier icon */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="#0D0D0D" strokeWidth="1.5"/>
            <path d="M10 10l3.5 3.5" stroke="#0D0D0D" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="text-sm font-semibold text-[#0D0D0D]">Research</span>
        </div>
        <button
          onClick={onClose}
          title="Close Research"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#666] hover:bg-[#F5F5F5] hover:text-[#0D0D0D] transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </header>

      {/* LiveLaw ticker — India-region advocates only */}
      {persona === 'advocate' && region === 'india' && (
        <LegalNewsTicker providerId={providerId} />
      )}

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[85%]">
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[#0D0D0D] text-white rounded-br-sm'
                      : 'bg-white border border-[#E5E5E5] text-[#0D0D0D] rounded-bl-sm'
                  }`}>
                  {msg.content}
                </div>

                {/* Sources panel */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2.5 flex flex-col gap-1 border-t border-[#F0F0F0] pt-2">
                    <p className="text-[10px] font-semibold text-[#bbb] uppercase tracking-wide mb-0.5">Sources</p>
                    {msg.sources.map((s, si) => (
                      <a
                        key={si}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[#666] hover:text-[#0D0D0D] truncate flex items-center gap-1.5 transition-colors">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0">
                          <path d="M4 1.5H2A.5.5 0 001.5 2v6a.5.5 0 00.5.5h6A.5.5 0 008.5 8V6M6 1.5h2.5V4M5 5l3.5-3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {s.title || s.url}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-[#E5E5E5] rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                  {[0, 150, 300].map(delay => (
                    <div
                      key={delay}
                      className="w-1.5 h-1.5 rounded-full bg-[#bbb] animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input */}
      <div className="bg-white border-t border-[#E5E5E5] px-4 py-4 shrink-0">
        <div className="max-w-2xl mx-auto flex gap-2 items-end">
          <textarea
            ref={inputRef}
            rows={1}
            placeholder="Ask anything — solve a problem, plan a lesson, research competitors…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            autoFocus
            className="flex-1 resize-none border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb] disabled:opacity-50 max-h-40 overflow-y-auto"
            style={{ lineHeight: '1.5' }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="shrink-0 w-10 h-10 rounded-xl bg-[#0D0D0D] text-white flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-30">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 12L12 2M12 2H5M12 2v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <p className="max-w-2xl mx-auto mt-1.5 text-[10px] text-[#bbb]">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
