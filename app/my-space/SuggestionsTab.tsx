'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Suggestion {
  id: string
  suggestion_id: string
  description: string
  created_at: string
  status: string
  auto_implement: boolean
  comments: string | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  in_review: 'In review',
  implementing: 'Implementing',
  done: 'Done',
  rejected: 'Rejected',
}

const STATUS_BG: Record<string, string> = {
  pending:       '#E5E5E5',
  in_review:     '#FEF3C7',
  implementing:  '#DBEAFE',
  done:          '#DCFCE7',
  rejected:      '#FEE2E2',
}

const STATUS_TEXT: Record<string, string> = {
  pending:       '#666',
  in_review:     '#92400E',
  implementing:  '#1E40AF',
  done:          '#166534',
  rejected:      '#991B1B',
}

interface Props {
  providerId: string
  onSuggestionFromChat?: (handler: (text: string) => void) => void
}

export default function SuggestionsTab({ providerId, onSuggestionFromChat }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading]         = useState(true)
  const [text, setText]               = useState('')
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [error, setError]             = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('suggestions')
      .select('id, suggestion_id, description, created_at, status, auto_implement, comments')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setSuggestions((data as Suggestion[]) ?? [])
        setLoading(false)
      })
  }, [providerId])

  // Allow the chat tab to pre-fill + submit a suggestion detected from chat
  useEffect(() => {
    if (!onSuggestionFromChat) return
    onSuggestionFromChat((capturedText: string) => {
      setText(capturedText)
    })
  }, [onSuggestionFromChat])

  async function submit(overrideText?: string) {
    const body = (overrideText ?? text).trim()
    if (!body) return
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch('/api/my-space/suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, description: body }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to submit'); return }
      setSuggestions(prev => [data.suggestion, ...prev])
      setText('')
      setSaved(true)
      setTimeout(() => setSaved(false), 3500)
    } catch {
      setError('Something went wrong — try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-1">
          {[0, 150, 300].map(d => (
            <div key={d} className="w-2 h-2 rounded-full bg-[#E5E5E5] animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-5 max-w-2xl mx-auto w-full space-y-6">

        {/* Submit form */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D] mb-1">Suggest a feature</p>
          <p className="text-xs text-[#999] mb-3">Got an idea to improve Kryla? Share it — we read every one.</p>
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setSaved(false) }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
            placeholder="Describe the feature or improvement you'd like to see…"
            rows={4}
            className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
          />
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => submit()}
              disabled={saving || !text.trim()}
              className="text-sm font-semibold text-white rounded-xl px-4 py-2.5 disabled:opacity-50 transition-opacity"
              style={{ background: '#0D0D0D' }}>
              {saving ? 'Submitting…' : 'Submit'}
            </button>
            {saved  && <p className="text-xs text-green-600">Submitted — thank you!</p>}
            {error  && <p className="text-red-500 text-xs">{error}</p>}
          </div>
        </section>

        {/* Past suggestions */}
        {suggestions.length > 0 && (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D] mb-3">
              Your suggestions <span className="text-[#999] font-normal normal-case tracking-normal">({suggestions.length})</span>
            </p>
            <div className="space-y-2">
              {suggestions.map(s => (
                <div key={s.id} className="border border-[#E5E5E5] rounded-xl px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-[#0D0D0D] flex-1 leading-relaxed">{s.description}</p>
                    <span
                      className="shrink-0 text-[10px] font-semibold uppercase tracking-wide rounded-full px-2.5 py-1"
                      style={{ background: STATUS_BG[s.status] ?? '#E5E5E5', color: STATUS_TEXT[s.status] ?? '#666' }}>
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[10px] font-mono text-[#bbb]">{s.suggestion_id}</span>
                    <span className="text-[10px] text-[#ddd]">·</span>
                    <span className="text-[10px] text-[#999]">
                      {new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {s.auto_implement && (
                      <>
                        <span className="text-[10px] text-[#ddd]">·</span>
                        <span className="text-[10px] font-semibold text-[#3B82F6]">Auto-implement</span>
                      </>
                    )}
                  </div>
                  {s.comments && (
                    <p className="text-xs text-[#666] mt-2 bg-[#F9F9F9] rounded-lg px-3 py-2 leading-relaxed whitespace-pre-line">
                      {s.comments}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {suggestions.length === 0 && (
          <p className="text-sm text-[#999] text-center py-6">No suggestions yet — share your first idea above.</p>
        )}

      </div>
    </div>
  )
}
