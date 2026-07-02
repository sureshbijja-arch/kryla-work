'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { speak, stopSpeaking } from '@/lib/voice'
import PlanSection from './PlanSection'
import BookingsTab from './BookingsTab'
import MessagesTab from './MessagesTab'
import SectionsTab from './SectionsTab'
import type { SectionEntry } from './SectionsTab'
import ServicesTab from './ServicesTab'
import type { ServiceItem } from './ServicesTab'
import MediaTab from './MediaTab'
import AdsTab from './AdsTab'
import LayoutsTab from './LayoutsTab'
import { getPersonaConfig } from '@/app/[slug]/personaConfig'

interface Message {
  role: 'user' | 'assistant'
  content: string
  changed?: boolean
}

interface CurrentProfile {
  firstName: string
  lastName: string
  persona: string
  location: string
  whatsappNumber: string | null
  email: string | null
  headline: string
  subheadline: string
  bio: string
  ctaPrimary: string
  ctaSecondary: string
  services: ServiceItem[]
  highlights: unknown[]
  faq: unknown[]
  palette: string
  font: string
  template: string
  showSections: Record<string, boolean>
  sections: SectionEntry[] | null
  designMode: string
}

interface Props {
  providerId: string
  slug: string
  firstName: string
  pageLive: boolean
  plan: string
  planStatus: string
  region: 'india' | 'usa'
  currentProfile: CurrentProfile
  onRefresh: () => void
}

type MainTab   = 'chat' | 'design' | 'messages' | 'bookings' | 'plan'
type DesignTab = 'services' | 'sections' | 'layouts' | 'ads' | 'media'

const PALETTE_LABELS: Record<string, string> = {
  professional: 'Professional', fresh: 'Fresh', warm: 'Warm',
  minimal: 'Minimal', creative: 'Creative', calm: 'Calm',
}
const TEMPLATE_LABELS: Record<string, string> = {
  focus: 'Focus', portfolio: 'Portfolio', storefront: 'Storefront', clinic: 'Clinic',
}
const FONT_LABELS: Record<string, string> = {
  inter: 'Inter', georgia: 'Georgia', trebuchet: 'Trebuchet',
}

export default function SpaceClient({
  providerId, slug, firstName,
  plan, region, currentProfile, onRefresh,
}: Props) {
  const defaultSections: SectionEntry[] = currentProfile.sections ?? [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'features',  order: 2 },
    { sectionKey: 'highlights', variant: 'icons',     order: 3 },
    { sectionKey: 'bio',        variant: 'paragraph', order: 4 },
    { sectionKey: 'faq',        variant: 'accordion', order: 5 },
    { sectionKey: 'contact',    variant: 'both',      order: 6 },
  ]

  const [tab, setTab]             = useState<MainTab>('chat')
  const [designTab, setDesignTab] = useState<DesignTab>('services')
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished]   = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi ${firstName}! Ask me anything about your page — change your headline, bio, services, colours, layout, or anything else.`,
    },
  ])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceOn, setVoiceOn]   = useState(false)
  const bottomRef               = useRef<HTMLDivElement>(null)
  const inputRef                = useRef<HTMLTextAreaElement>(null)
  const recognitionRef          = useRef<unknown>(null)

  const isSeed        = !plan || plan === 'seed'
  const bookingsLabel = getPersonaConfig(currentProfile.persona).tabLabel

  useEffect(() => {
    if (tab === 'chat') bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, tab])

  // Stop speaking when user switches away from chat tab
  useEffect(() => {
    if (tab !== 'chat') stopSpeaking()
  }, [tab])

  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SR) {
      alert("Voice input isn't supported in this browser. Try Chrome or Safari.")
      return
    }

    if (listening) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(recognitionRef.current as any)?.stop()
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.maxAlternatives = 1

    rec.onstart = () => setListening(true)
    rec.onend   = () => setListening(false)
    rec.onerror = () => setListening(false)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transcript = Array.from(e.results as any[]).map((r: any) => r[0].transcript).join('')
      setInput(transcript)
      if (e.results[e.results.length - 1].isFinal) rec.stop()
    }

    recognitionRef.current = rec
    rec.start()
  }, [listening])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/my-space/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          currentProfile,
        }),
      })
      const data = await res.json()
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.message, changed: data.changed },
      ])
      if (data.changed) onRefresh()
      if (voiceOn && data.message) speak(data.message)
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

  async function handlePublish() {
    if (publishing) return
    setPublishing(true)
    try {
      const res = await fetch('/api/my-space/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      if (res.ok) {
        setPublished(true)
        onRefresh()
        setTimeout(() => setPublished(false), 3000)
      }
    } catch {
      // silent
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#FAFAFA]">

      {/* Panel header */}
      <header className="bg-white border-b border-[#E5E5E5] px-4 py-3 flex items-center justify-between shrink-0">
        <a
          href={`/${slug}`}
          className="text-sm text-[#666] hover:text-[#0D0D0D] flex items-center gap-1.5 transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {slug}.kryla.work
        </a>
        <button
          onClick={handlePublish}
          disabled={publishing}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 ${
            published
              ? 'bg-[#22C55E] text-white'
              : 'bg-[#0D0D0D] text-white hover:opacity-80'
          }`}>
          {publishing ? 'Publishing…' : published ? '✓ Published' : 'Publish →'}
        </button>
      </header>

      {/* Tab bar */}
      <div className="bg-white border-b border-[#E5E5E5] shrink-0">
        <div className="px-4 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {([
            { key: 'chat',     label: 'Chat' },
            { key: 'design',   label: 'Design' },
            { key: 'messages', label: 'Messages' },
            { key: 'bookings', label: bookingsLabel },
            { key: 'plan',     label: 'My plan' },
          ] as { key: MainTab; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`py-2.5 px-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                tab === key
                  ? 'border-[#0D0D0D] text-[#0D0D0D]'
                  : 'border-transparent text-[#999] hover:text-[#0D0D0D]'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Design sub-tab bar */}
        {tab === 'design' && (
          <div className="px-4 flex items-center gap-1 border-t border-[#F0F0F0] bg-[#FAFAFA] overflow-x-auto scrollbar-none">
            {([
              { key: 'services', label: 'Services' },
              { key: 'sections', label: 'Page layout' },
              { key: 'layouts',  label: 'Layouts' },
              { key: 'ads',      label: 'Ads' },
              { key: 'media',    label: 'Media' },
            ] as { key: DesignTab; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setDesignTab(key)}
                className={`py-2 px-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  designTab === key
                    ? 'border-[#0D0D0D] text-[#0D0D0D]'
                    : 'border-transparent text-[#999] hover:text-[#0D0D0D]'
                }`}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Chat ── */}
      {tab === 'chat' && (
        <>
          {/* Style info strip */}
          <div className="bg-white border-b border-[#F0F0F0] px-4 py-2 flex items-center gap-2 flex-wrap shrink-0">
            <span className="text-[10px] font-semibold text-[#999] uppercase tracking-wide">Style</span>
            <Tag label={TEMPLATE_LABELS[currentProfile.template] ?? currentProfile.template} />
            <Tag label={PALETTE_LABELS[currentProfile.palette] ?? currentProfile.palette} />
            <Tag label={FONT_LABELS[currentProfile.font] ?? currentProfile.font} />
          </div>

          {isSeed && (
            <div className="px-4 pt-4 shrink-0">
              <div className="flex items-center justify-between gap-3 bg-[#FFF7ED] border border-[#F5A623]/30 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">🌿</span>
                  <p className="text-xs text-[#444]">
                    <span className="font-semibold">Upgrade to Sprout</span> to add a booking form to your page
                  </p>
                </div>
                <button
                  onClick={() => setTab('plan')}
                  className="shrink-0 text-xs font-semibold text-[#EA8C00] hover:underline">
                  See plans →
                </button>
              </div>
            </div>
          )}

          <main className="flex-1 overflow-y-auto px-4 py-6">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[85%]">
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#0D0D0D] text-white rounded-br-sm'
                          : 'bg-white border border-[#E5E5E5] text-[#0D0D0D] rounded-bl-sm'
                      }`}>
                      {msg.content}
                    </div>
                    {msg.changed && (
                      <div className="flex items-center gap-1 mt-1.5 ml-1">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-[10px] text-[#22C55E] font-semibold">Draft saved · publish when ready</span>
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

          <div className="bg-white border-t border-[#E5E5E5] px-4 py-4 shrink-0">
            <div className="flex gap-2 items-end">
              {/* Mic button */}
              <button
                onClick={startListening}
                title={listening ? 'Stop listening' : 'Speak your message'}
                className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  listening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-[#F5F5F5] text-[#666] hover:bg-[#E5E5E5]'
                }`}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="5" y="1" width="6" height="9" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M2 8c0 3.314 2.686 6 6 6s6-2.686 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="8" y1="14" x2="8" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>

              <textarea
                ref={inputRef}
                rows={1}
                placeholder={listening ? 'Listening…' : 'What would you like to change?'}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="flex-1 resize-none border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb] disabled:opacity-50 max-h-32 overflow-y-auto"
                style={{ lineHeight: '1.5' }}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="shrink-0 w-10 h-10 rounded-xl bg-[#0D0D0D] text-white flex items-center justify-center disabled:opacity-40 hover:opacity-80 transition-opacity">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 14L14 8 2 2v4.5l8 1.5-8 1.5V14z" fill="currentColor" />
                </svg>
              </button>
            </div>

            {/* Bottom hint row */}
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-[#bbb]">
                Enter to send · Shift+Enter for new line
              </p>
              {/* Voice reply toggle */}
              <button
                onClick={() => { setVoiceOn(v => !v); if (voiceOn) stopSpeaking() }}
                title={voiceOn ? 'Turn off voice replies' : 'Turn on voice replies'}
                className={`flex items-center gap-1 text-[10px] font-semibold transition-colors ${
                  voiceOn ? 'text-[#F5A623]' : 'text-[#bbb] hover:text-[#999]'
                }`}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 4h2l2-3v10L3 8H1V4z" fill={voiceOn ? '#F5A623' : 'none'} stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                  {voiceOn ? (
                    <>
                      <path d="M8 2.5c1.5 1 1.5 6 0 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      <path d="M9.5 1c2.5 1.8 2.5 8.2 0 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </>
                  ) : (
                    <path d="M8 4l3 4M11 4L8 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  )}
                </svg>
                {voiceOn ? 'Voice on' : 'Voice off'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Design: Services ── */}
      {tab === 'design' && designTab === 'services' && (
        <ServicesTab
          providerId={providerId}
          slug={slug}
          initialServices={currentProfile.services}
          plan={plan}
          onPreview={onRefresh}
        />
      )}

      {/* ── Design: Page layout ── */}
      {tab === 'design' && designTab === 'sections' && (
        <SectionsTab
          providerId={providerId}
          slug={slug}
          initialSections={defaultSections}
          plan={plan}
          onPreview={onRefresh}
        />
      )}

      {/* ── Design: Layouts ── */}
      {tab === 'design' && designTab === 'layouts' && (
        <LayoutsTab
          slug={slug}
          persona={currentProfile.persona}
          plan={plan}
          currentTemplate={currentProfile.template}
          currentPalette={currentProfile.palette}
          currentFont={currentProfile.font}
          onPreview={onRefresh}
          onUpgrade={() => setTab('plan')}
        />
      )}

      {/* ── Design: Ads ── */}
      {tab === 'design' && designTab === 'ads' && (
        <AdsTab
          providerId={providerId}
          slug={slug}
          plan={plan}
          onUpgrade={() => setTab('plan')}
        />
      )}

      {/* ── Design: Media ── */}
      {tab === 'design' && designTab === 'media' && (
        <MediaTab
          providerId={providerId}
          slug={slug}
          firstName={firstName}
          plan={plan}
          onUpgrade={() => setTab('plan')}
        />
      )}

      {/* ── Messages ── */}
      {tab === 'messages' && (
        isSeed ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
            <p className="text-2xl mb-3">💬</p>
            <p className="font-semibold text-[#0D0D0D] mb-1">Upgrade to Sprout</p>
            <p className="text-sm text-[#666] mb-5 max-w-xs">
              Connect WhatsApp Business and reply to customers directly from My Chat.
            </p>
            <button
              onClick={() => setTab('plan')}
              className="bg-[#0D0D0D] text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:opacity-80 transition-opacity">
              See plans →
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <MessagesTab providerId={providerId} plan={plan} />
          </div>
        )
      )}

      {/* ── Bookings ── */}
      {tab === 'bookings' && (
        <div className="flex-1 overflow-y-auto">
          <BookingsTab providerId={providerId} />
        </div>
      )}

      {/* ── My plan ── */}
      {tab === 'plan' && (
        <div className="flex-1 overflow-y-auto">
          <PlanSection currentPlan={plan} region={region} onGoToMessages={() => setTab('messages')} />
        </div>
      )}

    </div>
  )
}

function Tag({ label }: { label: string }) {
  return (
    <span className="text-[10px] font-semibold text-[#666] bg-[#F5F5F5] rounded px-2 py-0.5 uppercase tracking-wide">
      {label}
    </span>
  )
}
