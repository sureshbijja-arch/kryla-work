'use client'

/**
 * ResearchChat — Perplexity-style AI research overlay.
 *
 * Improvements over the original:
 * - Markdown rendering via shared MarkdownMessage component
 * - Richer source cards via shared SourceCards component
 * - Follow-up suggestion chips beneath each answer
 * - Copy / retry message actions
 * - Wider reading column, clearer answer/source separation
 * - Better empty state with example prompts
 *
 * Backend unchanged — POST /api/mychat/research returns { message, sources[] }.
 */

import { useState, useRef, useEffect } from 'react'
import MarkdownMessage from './chat/MarkdownMessage'
import SourceCards from './chat/SourceCards'
import MessageActions from './chat/MessageActions'

interface ResearchMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: { title: string; url: string }[]
  followUps?: string[]
}

interface Props {
  providerId: string
  open: boolean
  onClose: () => void
  /** Optional: pre-fill the input (from the suggest_research nudge) */
  initialQuery?: string
}

const GREETING: ResearchMessage = {
  role: 'assistant',
  content: "Hi! I'm your Research co-pilot. Ask me anything — I'll search the web, think it through, and give you a clear answer with sources.",
}

/** Persona-agnostic example prompts shown on the empty state */
const EXAMPLE_PROMPTS = [
  'What are competitors in my area charging?',
  'Write a lesson plan for fractions (Grade 5)',
  'How do I get more bookings from Google?',
  'Explain the key clauses in a rental agreement',
]

const LOADING_STEPS = ['Searching sources…', 'Reading content…', 'Writing answer…']

/** Extract 2–3 short follow-up chips from an assistant reply */
function deriveFollowUps(message: string): string[] {
  // Simple heuristic: pull quoted phrases or fallback to generic chips
  const lines = message.split('\n').filter(l => l.trim().length > 10 && l.trim().length < 80)
  if (lines.length >= 2) {
    return lines.slice(0, 2).map(l => `Tell me more about: ${l.trim().replace(/^[-•*]\s*/, '').slice(0, 50)}`)
  }
  return []
}

export default function ResearchChat({ providerId, open, onClose, initialQuery }: Props) {
  const [messages, setMessages]   = useState<ResearchMessage[]>([GREETING])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
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

  // Cycle loading step text while searching
  useEffect(() => {
    if (!loading) { setLoadingStep(0); return }
    const id = setInterval(() => setLoadingStep(s => (s + 1) % 3), 1800)
    return () => clearInterval(id)
  }, [loading])

  async function send(text?: string) {
    const query = (text ?? input).trim()
    if (!query || loading) return

    const userMsg: ResearchMessage = { role: 'user', content: query }
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
      const assistantMsg: ResearchMessage = {
        role: 'assistant',
        content: data.message ?? 'Something went wrong — please try again.',
        sources: data.sources?.length ? data.sources : undefined,
        followUps: data.message ? deriveFollowUps(data.message) : [],
      }
      setMessages(prev => [...prev, assistantMsg])
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

  const isEmptyState = messages.length === 1 // only the greeting

  return (
    <div className="fixed inset-0 z-50 bg-[#FAFAFA] flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-[#E5E5E5] px-5 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {/* Magnifier icon */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="#0D0D0D" strokeWidth="1.5"/>
            <path d="M10 10l3.5 3.5" stroke="#0D0D0D" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="text-sm font-semibold text-[#0D0D0D]">Research</span>
          <span className="text-[10px] font-medium text-[#999] bg-[#F5F5F5] rounded-full px-2 py-0.5 ml-1">AI · Web search</span>
        </div>
        <div className="flex items-center gap-0.5">
          {/* New session — only when conversation is active */}
          {!isEmptyState && (
            <button
              onClick={() => { setMessages([GREETING]); setInput('') }}
              title="New research session"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#666] hover:bg-[#F5F5F5] transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            title="Close Research"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#666] hover:bg-[#F5F5F5] hover:text-[#0D0D0D] transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── Messages ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">

          {/* Empty-state: hero + 2×2 example prompts */}
          {isEmptyState && (
            <div className="pt-4">
              <div className="mb-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white border border-[#E5E5E5] shadow-sm flex items-center justify-center mx-auto mb-4">
                  <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
                    <circle cx="6.5" cy="6.5" r="4.5" stroke="#0D0D0D" strokeWidth="1.5"/>
                    <path d="M10 10l3.5 3.5" stroke="#0D0D0D" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-base font-semibold text-[#0D0D0D]">Research Co-pilot</p>
                <p className="text-sm text-[#999] mt-1.5 max-w-xs mx-auto leading-relaxed">Ask anything — I'll search the web, reason through it, and give you a clear answer with sources.</p>
              </div>
              <p className="text-[11px] font-semibold text-[#bbb] uppercase tracking-wide mb-3">Try asking</p>
              <div className="grid grid-cols-2 gap-2">
                {EXAMPLE_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="group text-left px-4 py-3 rounded-2xl bg-white border border-[#E5E5E5] hover:border-[#0D0D0D] transition-colors"
                  >
                    <span className="text-sm text-[#333] group-hover:text-[#0D0D0D] leading-snug">{p}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i}>
              {/* User turn */}
              {msg.role === 'user' && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-[#0D0D0D] text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </div>
              )}

              {/* Assistant turn */}
              {msg.role === 'assistant' && i > 0 && (
                <div className="group">
                  {/* Answer card */}
                  <div className="bg-white rounded-2xl rounded-bl-sm border border-[#E5E5E5] px-5 py-4 shadow-sm">
                    <MarkdownMessage content={msg.content} />

                    {/* Source cards */}
                    {msg.sources && msg.sources.length > 0 && (
                      <SourceCards sources={msg.sources} />
                    )}
                  </div>

                  {/* Message actions */}
                  <MessageActions
                    content={msg.content}
                    showRetry={i === messages.length - 1 && !loading}
                    onRetry={() => {
                      const lastUser = [...messages].reverse().find(m => m.role === 'user')
                      if (lastUser) {
                        setMessages(prev => prev.slice(0, -1))
                        send(lastUser.content)
                      }
                    }}
                  />

                  {/* Follow-up chips */}
                  {msg.followUps && msg.followUps.length > 0 && i === messages.length - 1 && !loading && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {msg.followUps.map(fu => (
                        <button
                          key={fu}
                          onClick={() => send(fu)}
                          className="px-3 py-1.5 rounded-xl border border-[#E5E5E5] bg-white text-[11px] font-medium text-[#444] hover:border-[#0D0D0D] hover:text-[#0D0D0D] transition-colors"
                        >
                          {fu}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Greeting (i=0) — shown with avatar when conversation is active */}
              {msg.role === 'assistant' && i === 0 && !isEmptyState && (
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-7 h-7 rounded-xl bg-[#F5F5F5] flex items-center justify-center mt-0.5">
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                      <circle cx="6.5" cy="6.5" r="4.5" stroke="#0D0D0D" strokeWidth="1.5"/>
                      <path d="M10 10l3.5 3.5" stroke="#0D0D0D" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <p className="text-sm text-[#666] leading-relaxed">{msg.content}</p>
                </div>
              )}
            </div>
          ))}

          {/* Loading state with cycling step label */}
          {loading && (
            <div className="bg-white rounded-2xl rounded-bl-sm border border-[#E5E5E5] px-5 py-4 shadow-sm">
              <div className="flex items-center gap-3 text-[#999] text-xs">
                <div className="flex gap-1">
                  {[0, 150, 300].map(delay => (
                    <div
                      key={delay}
                      className="w-1.5 h-1.5 rounded-full bg-[#bbb] animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
                <span key={loadingStep}>{LOADING_STEPS[loadingStep]}</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* ── Input ── */}
      <div className="bg-white border-t border-[#E5E5E5] px-5 py-4 shrink-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              rows={1}
              placeholder="Ask anything…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              autoFocus
              className="flex-1 resize-none border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb] disabled:opacity-50 max-h-40 overflow-y-auto bg-[#FAFAFA]"
              style={{ lineHeight: '1.5' }}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="shrink-0 w-10 h-10 rounded-xl bg-[#0D0D0D] text-white flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-30">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 12L12 2M12 2H5M12 2v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-[#bbb]">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  )
}
