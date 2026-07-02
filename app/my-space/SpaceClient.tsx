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
import LanguageTab from './LanguageTab'
import SuggestionsTab from './SuggestionsTab'
import ReferTab from './ReferTab'
import { getPersonaConfig } from '@/app/[slug]/personaConfig'

interface Message {
  role: 'user' | 'assistant'
  content: string
  changed?: boolean
  suggestTab?: string
  suggestDesignTab?: string
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
  pageLanguage: string
  customDomain: string | null
  referralCode: string | null
  currentProfile: CurrentProfile
  onRefresh: () => void
}

type UIStrings = {
  tabs:       { chat: string; design: string; messages: string; bookings: string; plan: string; suggestions: string; refer: string }
  sub:        { services: string; sections: string; layouts: string; ads: string; media: string; language: string }
  placeholder: string
  hint:        string
  publish:     string
  publishing:  string
  published:   string
}

const UI: Record<string, UIStrings> = {
  hi: {
    tabs: { chat: 'चैट', design: 'डिज़ाइन', messages: 'संदेश', bookings: 'बुकिंग', plan: 'मेरी योजना', suggestions: 'सुझाव', refer: 'रेफर' },
    sub:  { services: 'सेवाएं', sections: 'पेज लेआउट', layouts: 'लेआउट', ads: 'विज्ञापन', media: 'मीडिया', language: 'भाषा' },
    placeholder: 'आप क्या बदलना चाहते हैं?',
    hint:        'भेजने के लिए Enter · नई पंक्ति Shift+Enter',
    publish: 'प्रकाशित करें →', publishing: 'प्रकाशित हो रहा है…', published: '✓ प्रकाशित',
  },
  ta: {
    tabs: { chat: 'அரட்டை', design: 'வடிவமைப்பு', messages: 'செய்திகள்', bookings: 'பதிவுகள்', plan: 'என் திட்டம்', suggestions: 'யோசனைகள்', refer: 'பரிந்துரை' },
    sub:  { services: 'சேவைகள்', sections: 'பக்க தளவமைப்பு', layouts: 'தளவமைப்புகள்', ads: 'விளம்பரங்கள்', media: 'ஊடகம்', language: 'மொழி' },
    placeholder: 'என்ன மாற்ற விரும்புகிறீர்கள்?',
    hint:        'அனுப்ப Enter · புதிய வரிக்கு Shift+Enter',
    publish: 'வெளியிடு →', publishing: 'வெளியிடுகிறது…', published: '✓ வெளியிடப்பட்டது',
  },
  te: {
    tabs: { chat: 'చాట్', design: 'డిజైన్', messages: 'సందేశాలు', bookings: 'బుకింగ్‌లు', plan: 'నా ప్లాన్', suggestions: 'సూచనలు', refer: 'రెఫర్' },
    sub:  { services: 'సేవలు', sections: 'పేజీ లేఅవుట్', layouts: 'లేఅవుట్‌లు', ads: 'ప్రకటనలు', media: 'మీడియా', language: 'భాష' },
    placeholder: 'మీరు ఏమి మార్చాలనుకుంటున్నారు?',
    hint:        'పంపడానికి Enter · కొత్త వరుసకు Shift+Enter',
    publish: 'ప్రచురించు →', publishing: 'ప్రచురిస్తోంది…', published: '✓ ప్రచురితమైంది',
  },
  kn: {
    tabs: { chat: 'ಚಾಟ್', design: 'ವಿನ್ಯಾಸ', messages: 'ಸಂದೇಶಗಳು', bookings: 'ಬುಕಿಂಗ್‌ಗಳು', plan: 'ನನ್ನ ಯೋಜನೆ', suggestions: 'ಸಲಹೆಗಳು', refer: 'ರೆಫರ್' },
    sub:  { services: 'ಸೇವೆಗಳು', sections: 'ಪೇಜ್ ಲೇಔಟ್', layouts: 'ಲೇಔಟ್‌ಗಳು', ads: 'ಜಾಹೀರಾತುಗಳು', media: 'ಮೀಡಿಯಾ', language: 'ಭಾಷೆ' },
    placeholder: 'ನೀವು ಏನು ಬದಲಾಯಿಸಲು ಬಯಸುತ್ತೀರಿ?',
    hint:        'ಕಳುಹಿಸಲು Enter · ಹೊಸ ಸಾಲಿಗೆ Shift+Enter',
    publish: 'ಪ್ರಕಟಿಸಿ →', publishing: 'ಪ್ರಕಟಿಸಲಾಗುತ್ತಿದೆ…', published: '✓ ಪ್ರಕಟಿಸಲಾಗಿದೆ',
  },
  ml: {
    tabs: { chat: 'ചാറ്റ്', design: 'ഡിസൈൻ', messages: 'സന്ദേശങ്ങൾ', bookings: 'ബുക്കിംഗുകൾ', plan: 'എന്റെ പ്ലാൻ', suggestions: 'നിർദ്ദേശങ്ങൾ', refer: 'റഫർ' },
    sub:  { services: 'സേവനങ്ങൾ', sections: 'പേജ് ലേഔട്ട്', layouts: 'ലേഔട്ടുകൾ', ads: 'പരസ്യങ്ങൾ', media: 'മീഡിയ', language: 'ഭാഷ' },
    placeholder: 'നിങ്ങൾക്ക് എന്ത് മാറ്റണം?',
    hint:        'അയക്കാൻ Enter · പുതിയ വരിക്ക് Shift+Enter',
    publish: 'പ്രസിദ്ധീകരിക്കൂ →', publishing: 'പ്രസിദ്ധീകരിക്കുന്നു…', published: '✓ പ്രസിദ്ധീകരിച്ചു',
  },
  mr: {
    tabs: { chat: 'चॅट', design: 'डिझाइन', messages: 'संदेश', bookings: 'बुकिंग', plan: 'माझी योजना', suggestions: 'सूचना', refer: 'रेफर' },
    sub:  { services: 'सेवा', sections: 'पेज लेआउट', layouts: 'लेआउट', ads: 'जाहिराती', media: 'मीडिया', language: 'भाषा' },
    placeholder: 'तुम्हाला काय बदलायचे आहे?',
    hint:        'पाठवण्यासाठी Enter · नवीन ओळीसाठी Shift+Enter',
    publish: 'प्रकाशित करा →', publishing: 'प्रकाशित होत आहे…', published: '✓ प्रकाशित',
  },
  gu: {
    tabs: { chat: 'ચેટ', design: 'ડિઝાઇન', messages: 'સંદેશ', bookings: 'બુકિંગ', plan: 'મારી યોજના', suggestions: 'સૂચનો', refer: 'રેફર' },
    sub:  { services: 'સેવાઓ', sections: 'પેજ લેઆઉટ', layouts: 'લેઆઉટ', ads: 'જાહેરાત', media: 'મીડિયા', language: 'ભાષા' },
    placeholder: 'તમે શું બદલવા માંગો છો?',
    hint:        'મોકલવા Enter · નવી લાઇન Shift+Enter',
    publish: 'પ્રકાશિત કરો →', publishing: 'પ્રકાશિત થઈ રહ્યું છે…', published: '✓ પ્રકાશિત',
  },
  es: {
    tabs: { chat: 'Chat', design: 'Diseño', messages: 'Mensajes', bookings: 'Reservas', plan: 'Mi plan', suggestions: 'Sugerencias', refer: 'Referir' },
    sub:  { services: 'Servicios', sections: 'Diseño de página', layouts: 'Plantillas', ads: 'Anuncios', media: 'Medios', language: 'Idioma' },
    placeholder: '¿Qué te gustaría cambiar?',
    hint:        'Enter para enviar · Shift+Enter nueva línea',
    publish: 'Publicar →', publishing: 'Publicando…', published: '✓ Publicado',
  },
}

const EN_UI: UIStrings = {
  tabs: { chat: 'Chat', design: 'Design', messages: 'Messages', bookings: '', plan: 'My plan', suggestions: 'Suggest', refer: 'Refer' },
  sub:  { services: 'Services', sections: 'Page layout', layouts: 'Layouts', ads: 'Ads', media: 'Media', language: 'Language' },
  placeholder: 'What would you like to change?',
  hint:        'Enter to send · Shift+Enter for new line',
  publish: 'Publish →', publishing: 'Publishing…', published: '✓ Published',
}

const GREETINGS: Record<string, string> = {
  hi: 'नमस्ते {{name}}! अपने पेज के बारे में कुछ भी पूछें — हेडलाइन, बायो, सेवाएं, रंग, या लेआउट।',
  ta: 'வணக்கம் {{name}}! உங்கள் பக்கம், சேவைகள், வண்ணங்கள் எதையும் கேளுங்கள்.',
  te: 'నమస్కారం {{name}}! మీ పేజీ, సేవలు, రంగులు గురించి ఏదైనా అడగండి.',
  kn: 'ನಮಸ್ಕಾರ {{name}}! ನಿಮ್ಮ ಪೇಜ್, ಸೇವೆಗಳು, ರಂಗುಗಳ ಬಗ್ಗೆ ಏನಾದರೂ ಕೇಳಿ.',
  ml: 'നമസ്കാരം {{name}}! നിങ്ങളുടെ പേജ്, സേവനങ്ങൾ, നിറങ്ങൾ എന്തും ചോദിക്കൂ.',
  mr: 'नमस्कार {{name}}! तुमच्या पेज बद्दल काहीही विचारा — हेडलाइन, बायो, सेवा, रंग.',
  gu: 'નમસ્તે {{name}}! તમારા પેજ વિશે કંઈ પણ પૂછો — હેડલાઈન, બાયો, સેવાઓ, રંગો.',
  es: '¡Hola {{name}}! Pregúntame cualquier cosa sobre tu página — titular, bio, servicios, colores.',
}

function getGreeting(lang: string, name: string): string {
  const tpl = GREETINGS[lang]
  if (tpl) return tpl.replace('{{name}}', name)
  return `Hi ${name}! Ask me anything about your page — change your headline, bio, services, colours, layout, or anything else.`
}

type MainTab   = 'chat' | 'design' | 'messages' | 'bookings' | 'plan' | 'suggestions' | 'refer'
type DesignTab = 'services' | 'sections' | 'layouts' | 'ads' | 'media' | 'language'

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
  plan, region, pageLanguage, customDomain, referralCode, currentProfile, onRefresh,
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
    { role: 'assistant', content: getGreeting(pageLanguage, firstName) },
  ])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceOn, setVoiceOn]   = useState(false)
  const bottomRef               = useRef<HTMLDivElement>(null)
  const inputRef                = useRef<HTMLTextAreaElement>(null)
  const recognitionRef          = useRef<unknown>(null)

  const bookingsLabel = getPersonaConfig(currentProfile.persona).tabLabel
  const t = UI[pageLanguage] ?? EN_UI
  // Bookings tab: use translated generic label unless English (persona-specific)
  const bookingsTabLabel = pageLanguage !== 'en' ? t.tabs.bookings : bookingsLabel

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
        {
          role: 'assistant',
          content: data.message,
          changed: data.changed,
          suggestTab: data.suggestTab,
          suggestDesignTab: data.suggestDesignTab,
        },
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
          {publishing ? t.publishing : published ? t.published : t.publish}
        </button>
      </header>

      {/* Tab bar */}
      <div className="bg-white border-b border-[#E5E5E5] shrink-0">
        <div className="px-4 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {([
            { key: 'chat',        label: t.tabs.chat },
            { key: 'design',      label: t.tabs.design },
            { key: 'messages',    label: t.tabs.messages },
            { key: 'bookings',    label: bookingsTabLabel },
            { key: 'plan',        label: t.tabs.plan },
            { key: 'suggestions', label: t.tabs.suggestions },
            { key: 'refer',       label: t.tabs.refer },
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
              { key: 'services',  label: t.sub.services },
              { key: 'sections',  label: t.sub.sections },
              { key: 'layouts',   label: t.sub.layouts },
              { key: 'ads',       label: t.sub.ads },
              { key: 'media',     label: t.sub.media },
              { key: 'language',  label: t.sub.language },
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
                    {msg.suggestTab && (
                      <button
                        onClick={() => {
                          setTab(msg.suggestTab as MainTab)
                          if (msg.suggestTab === 'design' && msg.suggestDesignTab) {
                            setDesignTab(msg.suggestDesignTab as DesignTab)
                          }
                        }}
                        className="mt-2 ml-1 flex items-center gap-1.5 text-xs font-semibold text-[#0D0D0D] bg-[#F5F5F5] hover:bg-[#E5E5E5] rounded-xl px-3 py-1.5 transition-colors">
                        Yes, take me there
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
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
                placeholder={listening ? '…' : t.placeholder}
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
              <p className="text-[10px] text-[#bbb]">{t.hint}</p>
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

      {/* ── Design: Language ── */}
      {tab === 'design' && designTab === 'language' && (
        <LanguageTab
          providerId={providerId}
          currentLanguage={pageLanguage}
        />
      )}

      {/* ── Messages ── */}
      {tab === 'messages' && (
        <div className="flex-1 flex flex-col min-h-0">
          <MessagesTab providerId={providerId} plan={plan} />
        </div>
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
          <CustomDomainCard providerId={providerId} plan={plan} initialDomain={customDomain} />
        </div>
      )}

      {/* ── Suggestions ── */}
      {tab === 'suggestions' && (
        <SuggestionsTab providerId={providerId} />
      )}

      {/* ── Refer ── */}
      {tab === 'refer' && (
        <ReferTab providerId={providerId} slug={slug} initialCode={referralCode} />
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

function CustomDomainCard({ providerId, plan, initialDomain }: { providerId: string; plan: string; initialDomain: string | null }) {
  const [domain, setDomain]       = useState(initialDomain ?? '')
  const [savedDomain, setSavedDomain] = useState(initialDomain)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [showDns, setShowDns]     = useState(false)
  const [removing, setRemoving]   = useState(false)

  const isGrowPlus = ['grow', 'thrive', 'elevate'].includes(plan)

  async function save() {
    const raw = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
    if (!raw) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/my-space/custom-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, domain: raw }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to save'); return }
      setDomain(data.domain)
      setSavedDomain(data.domain)
      setShowDns(true)
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    setRemoving(true)
    try {
      await fetch('/api/my-space/custom-domain', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId }),
      })
      setDomain('')
      setSavedDomain(null)
      setShowDns(false)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="px-4 pb-6">
      <p className="text-xs font-semibold text-[#999] uppercase tracking-widest mb-3">Your domain</p>
      <div className="rounded-2xl border border-[#E5E5E5] p-5 bg-white">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1">
            <p className="font-bold text-[#0D0D0D] text-sm mb-0.5">Custom domain</p>
            <p className="text-xs text-[#999]">
              {isGrowPlus
                ? 'Use priya.com instead of kryla.work/priya — your brand, your address.'
                : 'Upgrade to Grow to connect your own domain.'}
            </p>
          </div>
          {!isGrowPlus && (
            <span className="shrink-0 text-[10px] font-semibold bg-[#F5F5F5] text-[#999] px-2 py-0.5 rounded-full uppercase tracking-wide">Grow+</span>
          )}
        </div>

        {isGrowPlus ? (
          <>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="priya.com"
                value={domain}
                onChange={e => { setDomain(e.target.value); setError('') }}
                onKeyDown={e => { if (e.key === 'Enter') save() }}
                className="flex-1 border border-[#E5E5E5] rounded-xl px-3.5 py-2.5 text-sm text-[#0D0D0D] placeholder:text-[#bbb] focus:outline-none focus:border-[#0D0D0D] transition-colors"
              />
              <button
                onClick={save}
                disabled={saving || !domain.trim()}
                className="shrink-0 text-sm font-semibold text-white bg-[#0D0D0D] rounded-xl px-4 py-2.5 disabled:opacity-40 hover:opacity-80 transition-opacity">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>

            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

            {savedDomain && (
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-[#22C55E] font-semibold">✓ {savedDomain}</p>
                <button
                  onClick={remove}
                  disabled={removing}
                  className="text-xs text-[#999] hover:text-red-500 transition-colors">
                  {removing ? 'Removing…' : 'Remove'}
                </button>
              </div>
            )}

            {savedDomain && (
              <div>
                <button
                  onClick={() => setShowDns(v => !v)}
                  className="text-xs text-[#999] hover:text-[#0D0D0D] transition-colors mb-2 flex items-center gap-1">
                  {showDns ? '▾' : '▸'} DNS setup instructions
                </button>
                {showDns && (
                  <div className="bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl px-4 py-3 space-y-2">
                    <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wide mb-2">Point your DNS to Kryla</p>
                    <div className="font-mono text-[11px] space-y-1.5">
                      <div className="flex gap-3">
                        <span className="text-[#999] w-12 shrink-0">CNAME</span>
                        <span className="text-[#0D0D0D]">www → cname.vercel-dns.com</span>
                      </div>
                      <div className="flex gap-3">
                        <span className="text-[#999] w-12 shrink-0">A</span>
                        <span className="text-[#0D0D0D]">@ → 76.76.21.21</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-[#bbb] mt-2 leading-relaxed">
                      After saving DNS changes it can take up to 48 h to go live. Set these in your domain registrar (GoDaddy, Namecheap, Google Domains, etc.).
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-[#bbb]">Available on Grow plan (₹799/mo · $12/mo).</p>
        )}
      </div>
    </div>
  )
}
