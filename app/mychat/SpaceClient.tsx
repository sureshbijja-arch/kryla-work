'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { speak, stopSpeaking } from '@/lib/voice'
import type { SectionEntry } from './SectionsTab'
import type { ServiceItem } from './ServicesTab'
import ResearchChat from './ResearchChat'
import DraftingStudio from './DraftingStudio'
import PractitionerStudio from './PractitionerStudio'
import type { StudioSeed } from './PractitionerStudio'
import InstallBanner from '@/components/InstallBanner'
import SectionsTab from './SectionsTab'
import ServicesTab from './ServicesTab'
import LayoutsTab from './LayoutsTab'
import MediaTab from './MediaTab'
import LanguageTab from './LanguageTab'
import LetterheadSettingsTab from './LetterheadSettingsTab'
import AdsTab from './AdsTab'
import MessagesTab from './MessagesTab'
import EmailTab from './EmailTab'
import BookingsTab from './BookingsTab'
import PersonaTab, { type DraftSeed } from './PersonaTab'
import AvailabilityTab from './AvailabilityTab'
import HoursTab from './HoursTab'
import PlanSection from './PlanSection'
import ReviewsTab from './ReviewsTab'
import SuggestionsTab from './SuggestionsTab'
import StatsTab from './StatsTab'
import ReferTab from './ReferTab'
import { DisplayNameCard, CustomNameCard } from './PlanCards'
import MarkdownMessage from './chat/MarkdownMessage'
import SourceCards from './chat/SourceCards'
import MessageActions from './chat/MessageActions'
import { getChatPromptChips } from '@/config/verticals'
import LegalNewsTicker from './LegalNewsTicker'
import CourtToolsPanel from './CourtToolsPanel'
import MyChatHome from './MyChatHome'
import TileDetailShell from './TileDetailShell'
import DetailCardList from './DetailCardList'
import HomeBackPill from './HomeBackPill'
import { TILE_THEME, type MykrylaToolCard } from './tileTheme'

interface Message {
  role: 'user' | 'assistant'
  content: string
  changed?: boolean
  suggestTab?: string
  suggestDesignTab?: string
  sources?: { title: string; url: string }[]
  suggestResearch?: boolean
  /** The user's question, stored so the Research overlay can be pre-filled */
  researchQuery?: string
  /** Advocate: suggest opening the Court Tools overlay */
  suggestCourtTools?: boolean
  /** Advocate: which Court Tools sub-tab + prefill value to open */
  courtLookup?: { kind: string; cnr?: string | null; query?: string | null; state?: string | null } | null
}

interface CurrentProfile {
  firstName: string
  lastName: string
  persona: string
  location: string
  avatarUrl: string | null
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
  /** Archetype id if this persona has a Practitioner Studio configured; null otherwise. */
  studioArchetype: string | null
  /** DB-driven My Tools tile header label (studio_config.mykryla_tools_label); null hides the custom header. */
  mykrylaToolsLabel: string | null
  /** DB-driven My Tools tile card list (studio_config.mykryla_tools); empty array hides the tile entirely. */
  mykrylaTools: MykrylaToolCard[]
}

interface Props {
  providerId: string
  slug: string
  firstName: string
  pageLive: boolean
  plan: string
  planStatus: string
  trialEndsAt: string | null
  billingStatus?: 'success' | 'cancelled'
  region: 'india' | 'usa'
  pageLanguage: string
  customName: string | null
  referralCode: string | null
  plans: import('@/lib/plans').PlanDef[]
  personaPlans: import('@/lib/plans').PlanDef[]
  planOrder: string[]
  canAds: boolean
  canCustomName: boolean
  currentProfile: CurrentProfile
}

type UIStrings = {
  tabs:       { chat: string; design: string; messages: string; bookings: string; plan: string; suggestions: string; refer: string; students: string; reviews: string; schedule: string; stats: string; inbox: string }
  sub:        { services: string; sections: string; layouts: string; ads: string; media: string; language: string }
  placeholder: string
  hint:        string
  publish:     string
  publishing:  string
  published:   string
}

const UI: Record<string, UIStrings> = {
  hi: {
    tabs: { chat: 'चैट', design: 'डिज़ाइन', messages: 'संदेश', bookings: 'बुकिंग', plan: 'मेरी योजना', suggestions: 'सुझाव', refer: 'रेफर', students: 'छात्र', reviews: 'समीक्षाएं', schedule: 'शेड्यूल', stats: 'आंकड़े', inbox: 'इनबॉक्स' },
    sub:  { services: 'सेवाएं', sections: 'पेज लेआउट', layouts: 'लेआउट', ads: 'विज्ञापन', media: 'मीडिया', language: 'भाषा' },
    placeholder: 'आप क्या बदलना चाहते हैं?',
    hint:        'भेजने के लिए Enter · नई पंक्ति Shift+Enter',
    publish: 'प्रकाशित करें →', publishing: 'प्रकाशित हो रहा है…', published: '✓ प्रकाशित',
  },
  ta: {
    tabs: { chat: 'அரட்டை', design: 'வடிவமைப்பு', messages: 'செய்திகள்', bookings: 'பதிவுகள்', plan: 'என் திட்டம்', suggestions: 'யோசனைகள்', refer: 'பரிந்துரை', students: 'மாணவர்கள்', reviews: 'மதிப்புரைகள்', schedule: 'அட்டவணை', stats: 'புள்ளிவிவரங்கள்', inbox: 'உள்ளிடல்' },
    sub:  { services: 'சேவைகள்', sections: 'பக்க தளவமைப்பு', layouts: 'தளவமைப்புகள்', ads: 'விளம்பரங்கள்', media: 'ஊடகம்', language: 'மொழி' },
    placeholder: 'என்ன மாற்ற விரும்புகிறீர்கள்?',
    hint:        'அனுப்ப Enter · புதிய வரிக்கு Shift+Enter',
    publish: 'வெளியிடு →', publishing: 'வெளியிடுகிறது…', published: '✓ வெளியிடப்பட்டது',
  },
  te: {
    tabs: { chat: 'చాట్', design: 'డిజైన్', messages: 'సందేశాలు', bookings: 'బుకింగ్‌లు', plan: 'నా ప్లాన్', suggestions: 'సూచనలు', refer: 'రెఫర్', students: 'విద్యార్థులు', reviews: 'సమీక్షలు', schedule: 'షెడ్యూల్', stats: 'గణాంకాలు', inbox: 'ఇన్‌బాక్స్' },
    sub:  { services: 'సేవలు', sections: 'పేజీ లేఅవుట్', layouts: 'లేఅవుట్‌లు', ads: 'ప్రకటనలు', media: 'మీడియా', language: 'భాష' },
    placeholder: 'మీరు ఏమి మార్చాలనుకుంటున్నారు?',
    hint:        'పంపడానికి Enter · కొత్త వరుసకు Shift+Enter',
    publish: 'ప్రచురించు →', publishing: 'ప్రచురిస్తోంది…', published: '✓ ప్రచురితమైంది',
  },
  kn: {
    tabs: { chat: 'ಚಾಟ್', design: 'ವಿನ್ಯಾಸ', messages: 'ಸಂದೇಶಗಳು', bookings: 'ಬುಕಿಂಗ್‌ಗಳು', plan: 'ನನ್ನ ಯೋಜನೆ', suggestions: 'ಸಲಹೆಗಳು', refer: 'ರೆಫರ್', students: 'ವಿದ್ಯಾರ್ಥಿಗಳು', reviews: 'ವಿಮರ್ಶೆಗಳು', schedule: 'ವೇಳಾಪಟ್ಟಿ', stats: 'ಅಂಕಿಅಂಶಗಳು', inbox: 'ಇನ್‌ಬಾಕ್ಸ್' },
    sub:  { services: 'ಸೇವೆಗಳು', sections: 'ಪೇಜ್ ಲೇಔಟ್', layouts: 'ಲೇಔಟ್‌ಗಳು', ads: 'ಜಾಹೀರಾತುಗಳು', media: 'ಮೀಡಿಯಾ', language: 'ಭಾಷೆ' },
    placeholder: 'ನೀವು ಏನು ಬದಲಾಯಿಸಲು ಬಯಸುತ್ತೀರಿ?',
    hint:        'ಕಳುಹಿಸಲು Enter · ಹೊಸ ಸಾಲಿಗೆ Shift+Enter',
    publish: 'ಪ್ರಕಟಿಸಿ →', publishing: 'ಪ್ರಕಟಿಸಲಾಗುತ್ತಿದೆ…', published: '✓ ಪ್ರಕಟಿಸಲಾಗಿದೆ',
  },
  ml: {
    tabs: { chat: 'ചാറ്റ്', design: 'ഡിസൈൻ', messages: 'സന്ദേശങ്ങൾ', bookings: 'ബുക്കിംഗുകൾ', plan: 'എന്റെ പ്ലാൻ', suggestions: 'നിർദ്ദേശങ്ങൾ', refer: 'റഫർ', students: 'വിദ്യാർത്ഥികൾ', reviews: 'അവലോകനങ്ങൾ', schedule: 'ഷെഡ്യൂൾ', stats: 'സ്ഥിതിവിവരക്കണക്കുകൾ', inbox: 'ഇൻബോക്സ്' },
    sub:  { services: 'സേവനങ്ങൾ', sections: 'പേജ് ലേഔട്ട്', layouts: 'ലേഔട്ടുകൾ', ads: 'പരസ്യങ്ങൾ', media: 'മീഡിയ', language: 'ഭാഷ' },
    placeholder: 'നിങ്ങൾക്ക് എന്ത് മാറ്റണം?',
    hint:        'അയക്കാൻ Enter · പുതിയ വരിക്ക് Shift+Enter',
    publish: 'പ്രസിദ്ധീകരിക്കൂ →', publishing: 'പ്രസിദ്ധീകരിക്കുന്നു…', published: '✓ പ്രസിദ്ധീകരിച്ചു',
  },
  mr: {
    tabs: { chat: 'चॅट', design: 'डिझाइन', messages: 'संदेश', bookings: 'बुकिंग', plan: 'माझी योजना', suggestions: 'सूचना', refer: 'रेफर', students: 'विद्यार्थी', reviews: 'पुनरावलोकने', schedule: 'वेळापत्रक', stats: 'आकडेवारी', inbox: 'इनबॉक्स' },
    sub:  { services: 'सेवा', sections: 'पेज लेआउट', layouts: 'लेआउट', ads: 'जाहिराती', media: 'मीडिया', language: 'भाषा' },
    placeholder: 'तुम्हाला काय बदलायचे आहे?',
    hint:        'पाठवण्यासाठी Enter · नवीन ओळीसाठी Shift+Enter',
    publish: 'प्रकाशित करा →', publishing: 'प्रकाशित होत आहे…', published: '✓ प्रकाशित',
  },
  gu: {
    tabs: { chat: 'ચેટ', design: 'ડિઝાઇન', messages: 'સંદેશ', bookings: 'બુકિંગ', plan: 'મારી યોજના', suggestions: 'સૂચનો', refer: 'રેફર', students: 'વિદ્યાર્થીઓ', reviews: 'સમીક્ષાઓ', schedule: 'શેડ્યૂલ', stats: 'આંકડા', inbox: 'ઇનબોક્સ' },
    sub:  { services: 'સેવાઓ', sections: 'પેજ લેઆઉટ', layouts: 'લેઆઉટ', ads: 'જાહેરાત', media: 'મીડિયા', language: 'ભાષા' },
    placeholder: 'તમે શું બદલવા માંગો છો?',
    hint:        'મોકલવા Enter · નવી લાઇન Shift+Enter',
    publish: 'પ્રકાશિત કરો →', publishing: 'પ્રકાશિત થઈ રહ્યું છે…', published: '✓ પ્રકાશિત',
  },
  es: {
    tabs: { chat: 'Chat', design: 'Diseño', messages: 'Mensajes', bookings: 'Reservas', plan: 'Mi plan', suggestions: 'Sugerencias', refer: 'Referir', students: 'Alumnos', reviews: 'Reseñas', schedule: 'Horario', stats: 'Estadísticas', inbox: 'Bandeja' },
    sub:  { services: 'Servicios', sections: 'Diseño de página', layouts: 'Plantillas', ads: 'Anuncios', media: 'Medios', language: 'Idioma' },
    placeholder: '¿Qué te gustaría cambiar?',
    hint:        'Enter para enviar · Shift+Enter nueva línea',
    publish: 'Publicar →', publishing: 'Publicando…', published: '✓ Publicado',
  },
}

const EN_UI: UIStrings = {
  tabs: { chat: 'Chat', design: 'Design', messages: 'Messages', bookings: '', plan: 'My plan', suggestions: 'Suggest', refer: 'Refer', students: 'Students', reviews: 'Reviews', schedule: 'Schedule', stats: 'Stats', inbox: 'Inbox' },
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

// ── My Chat tile-launcher navigation state ──────────────────────────────────
// Valid `detail` values per tile (documentation only — detail is a plain
// string so goTo() can route legacy AI/internal target strings directly):
//   page:     'sections' | 'layouts' | 'ads' | 'media' | 'language' | 'letterhead'
//   services: 'services' | 'inbox' | 'consultations' | 'clients' | 'email'
//   plan:     'plan' | 'reviews' | 'suggestions' | 'stats' | 'refer'
//   tools:    persona-specific, wired in Phase 2
type MCTile = 'page' | 'services' | 'plan' | 'tools'
type MCView =
  | { screen: 'home' }
  | { screen: 'tile'; tile: MCTile; detail?: string }
  | { screen: 'chat' }

// Card-list config per tile: each entry becomes one tappable card in that
// tile's card list (DetailCardList). `key` is the `detail` value the card
// navigates to. The `tools` tile's list is DB-driven — see `mykrylaTools`
// (from personas.studio_config, no hardcoded per-persona table in source).
interface TileDetailCardConfig {
  key: string
  icon: string
  title: string
  description: string
  /** When true, the card opens the Preview/Publish modal instead of navigating to `detail`. */
  isPreview?: boolean
}

function getTileDetailCards(tile: MCTile, persona: string, mykrylaTools: MykrylaToolCard[]): TileDetailCardConfig[] {
  switch (tile) {
    case 'page':
      return [
        { key: 'sections', icon: '\u{1F9F1}', title: 'Sections', description: 'Reorder and edit your page layout' },
        { key: 'layouts', icon: '\u{1F3A8}', title: 'Layouts', description: 'Templates, palettes, and fonts' },
        { key: 'media', icon: '\u{1F5BC}️', title: 'Media', description: 'Photos and gallery images' },
        { key: 'language', icon: '\u{1F310}', title: 'Language', description: 'Page display language' },
        ...(persona === 'advocate'
          ? [{ key: 'letterhead', icon: '\u{1F4C4}', title: 'Letterhead', description: 'Firm letterhead settings' }]
          : []),
        { key: 'ads', icon: '\u{1F4E3}', title: 'Ads', description: 'Manage promotional banners' },
        { key: 'preview', icon: '\u{1F440}', title: 'Preview my page', description: 'See your live draft and publish', isPreview: true },
      ]
    case 'services':
      return [
        { key: 'services', icon: '\u{1F6E0}️', title: 'Services & pricing', description: 'What you offer and what it costs' },
        { key: 'inbox', icon: '\u{1F4E5}', title: 'Messages', description: 'Inbox from your page visitors' },
        ...(persona === 'advocate'
          ? [{ key: 'email', icon: '✉️', title: 'Email', description: 'Connected email inbox' }]
          : []),
        { key: 'consultations', icon: '\u{1F4C5}', title: 'Consultations', description: 'Booking requests' },
        { key: 'clients', icon: '\u{1F465}', title: 'Clients', description: 'Your client and matter roster' },
        { key: 'schedule', icon: '\u{1F553}', title: 'Schedule', description: 'Hours and availability' },
      ]
    case 'plan':
      return [
        { key: 'plan', icon: '\u{1F4B3}', title: 'Plan & billing', description: 'Your subscription and billing details' },
        { key: 'reviews', icon: '⭐', title: 'Reviews', description: 'What your clients are saying' },
        { key: 'suggestions', icon: '\u{1F4A1}', title: 'Suggestions', description: 'Ideas to grow your page' },
        { key: 'stats', icon: '\u{1F4CA}', title: 'Insights', description: 'Views and engagement stats' },
        { key: 'refer', icon: '\u{1F381}', title: 'Refer', description: 'Invite others to Kryla' },
      ]
    case 'tools':
      // DB-driven — cards come from personas.studio_config.mykryla_tools
      // (see supabase/migrations/20260718033607_mykryla_tools_config.sql).
      // `key` here is the tool's `action` enum value, mapped to the correct
      // overlay/state setter at click time in the render below.
      return mykrylaTools.map(card => ({
        key: card.action,
        icon: card.icon,
        title: card.title,
        description: card.description,
      }))
    default:
      return []
  }
}

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
  providerId, slug, firstName, pageLive,
  plan, planStatus, trialEndsAt, billingStatus,
  region, pageLanguage, customName, referralCode, currentProfile,
  plans, personaPlans, planOrder, canAds, canCustomName,
}: Props) {
  const defaultSections: SectionEntry[] = currentProfile.sections ?? [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'features',  order: 2 },
    { sectionKey: 'highlights', variant: 'icons',     order: 3 },
    { sectionKey: 'bio',        variant: 'paragraph', order: 4 },
    { sectionKey: 'faq',        variant: 'accordion', order: 5 },
    { sectionKey: 'contact',    variant: 'both',      order: 6 },
  ]

  const [view, setView]             = useState<MCView>({ screen: 'chat' })
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
  const mediaRecorderRef        = useRef<MediaRecorder | null>(null)
  const audioChunksRef          = useRef<Blob[]>([])
  const [transcribing, setTranscribing]     = useState(false)
  const [researchOpen, setResearchOpen]     = useState(false)
  const [researchQuery, setResearchQuery]   = useState<string | undefined>(undefined)
  const [draftOpen, setDraftOpen]           = useState(false)
  // Phase 5: seed DraftingStudio from a client/matter card
  const [draftSeed, setDraftSeed]           = useState<DraftSeed | null>(null)
  // Practitioner Studio (all studio personas: physio, occtherapist, speech, chiro, counselor, etc.)
  const [studioOpen, setStudioOpen]         = useState(false)
  const [studioSeed, setStudioSeed]         = useState<StudioSeed | null>(null)
  // Court Tools overlay (advocate only)
  const [courtToolsOpen, setCourtToolsOpen] = useState(false)
  // Chat expand / full-screen toggle
  const [chatExpanded, setChatExpanded]     = useState(false)
  // Preview/Publish modal — replaces the old permanent split-view iframe rail.
  // `previewKey` remounts the modal's iframe to force a fresh draft load.
  const [previewOpen, setPreviewOpen]       = useState(false)
  const [previewKey, setPreviewKey]         = useState(0)

  // Mobile shell: bottom tabs at <768px, desktop split-view unchanged
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Billing return toast ─────────────────────────────────────────────────────
  const router = useRouter()
  const [billingToast, setBillingToast] = useState<'success' | 'cancelled' | null>(billingStatus ?? null)

  useEffect(() => {
    if (!billingStatus) return
    // Clean the ?billing= query param from the URL without triggering a re-render
    router.replace(`/${slug}/mykryla`, { scroll: false })
    const t = setTimeout(() => setBillingToast(null), 5000)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const t = UI[pageLanguage] ?? EN_UI

  useEffect(() => {
    if (view.screen === 'chat') bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, view])

  // Auto-resize textarea as input grows (handles chips, voice, and keyboard input)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 128) + 'px'
    }
  }, [input])

  // Stop speaking when user switches away from chat screen
  useEffect(() => {
    if (view.screen !== 'chat') stopSpeaking()
  }, [view])

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

  async function toggleMic() {
    // Stop an active MediaRecorder recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      return
    }
    // Stop active browser dictation
    if (listening) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(recognitionRef.current as any)?.stop()
      return
    }

    // Try Whisper via MediaRecorder
    if (
      typeof window !== 'undefined' &&
      typeof window.MediaRecorder !== 'undefined' &&
      navigator.mediaDevices?.getUserMedia
    ) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mimeType =
          MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' :
          MediaRecorder.isTypeSupported('audio/mp4')  ? 'audio/mp4'  : 'audio/ogg'
        const recorder = new MediaRecorder(stream, { mimeType })
        audioChunksRef.current = []

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data)
        }

        recorder.onstop = async () => {
          stream.getTracks().forEach(t => t.stop())
          setListening(false)
          setTranscribing(true)
          try {
            const blob = new Blob(audioChunksRef.current, { type: mimeType })
            const ext  = mimeType.split('/')[1].split(';')[0]
            const form = new FormData()
            form.append('file', blob, `audio.${ext}`)
            const res = await fetch('/api/mychat/transcribe', { method: 'POST', body: form })
            if (res.ok) {
              const { text } = await res.json()
              if (text) setInput(prev => (prev ? prev + ' ' : '') + text)
            } else {
              const body = await res.json().catch(() => ({}))
              if (res.status === 503 && body.reason === 'no_key') {
                // Key not configured → fall back to browser dictation (en-US)
                startListening()
              } else {
                // Real Whisper error (billing, quota, bad audio, etc.) — surface it
                // so the user knows and doesn't wonder why English-only is coming back
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: "⚠️ Voice transcription failed. Please check your OpenAI billing at platform.openai.com, or just type your message.",
                }])
              }
            }
          } catch {
            // Network error — show honest message, don't silently re-record in English
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: "⚠️ Couldn't reach the transcription service. Please check your connection, or type your message.",
            }])
          } finally {
            setTranscribing(false)
          }
        }

        mediaRecorderRef.current = recorder
        recorder.start()
        setListening(true)
        return
      } catch {
        // getUserMedia denied or unavailable → fall back
      }
    }

    // Fall back to browser Web Speech API
    startListening()
  }

  // Bumps the preview iframe's remount key. Called after any edit that
  // changes draft content (`data.changed` in send(), a successful publish)
  // and passed to child tabs as `onPreview` so their own "preview" actions
  // also refresh the modal's iframe if it happens to be open.
  function onRefresh() {
    setPreviewKey(k => k + 1)
  }

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      // ── Normal chat path — page editing (Research is now its own overlay) ──
      const res = await fetch('/api/mychat/chat', {
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
          suggestResearch: data.suggestResearch || undefined,
          researchQuery: data.suggestResearch ? text : undefined,
          suggestCourtTools: data.suggestCourtTools || undefined,
          courtLookup: data.courtLookup ?? undefined,
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
      const res = await fetch('/api/mychat/publish', {
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

  // ── Navigation resolver ───────────────────────────────────────────────────
  // Centralises navigation so legacy `suggestTab` values from the chat API
  // (bookings / messages / design / plan / suggestions), the AI's
  // `suggestDesignTab` sub-routing, and internal `onUpgrade` / `onGoToMessages`
  // calls all route to the correct MCView. Services moved from the old Design
  // tab to the My Services tile in this redesign — suggest_design_tab:"services"
  // now routes to tile:'services', not tile:'page'.
  function goTo(target: string, designSub?: string) {
    switch (target) {
      case 'bookings':     setView({ screen: 'tile', tile: 'services', detail: 'consultations' }); break
      case 'students':     setView({ screen: 'tile', tile: 'services', detail: 'clients' });       break
      case 'messages':     setView({ screen: 'tile', tile: 'services', detail: 'inbox' });         break
      case 'reviews':
      case 'stats':
      case 'suggestions':
      case 'refer':         setView({ screen: 'tile', tile: 'plan', detail: target });                break
      case 'plan':           setView({ screen: 'tile', tile: 'plan', detail: 'plan' });                break
      case 'design':
        if (designSub === 'services') {
          setView({ screen: 'tile', tile: 'services', detail: 'services' })
        } else {
          setView({ screen: 'tile', tile: 'page', detail: designSub ?? 'sections' })
        }
        break
      case 'chat':           setView({ screen: 'chat' });                                              break
      case 'home':           setView({ screen: 'home' });                                              break
      default:               setView({ screen: 'home' })
    }
  }

  // ── Tile-detail body dispatch ────────────────────────────────────────────
  // Mounts the real tab component for a given tile + detail key, wired with
  // its exact original props (see .superpowers/pre-phase1-spaceclient-reference.tsx).
  // Returns null for detail keys not yet relocated (My Tools tile — Task 4),
  // letting the caller fall back to the placeholder.
  function renderTileDetailBody(tile: MCTile, detail: string) {
    if (tile === 'page') {
      switch (detail) {
        case 'sections':
          return (
            <SectionsTab
              providerId={providerId}
              slug={slug}
              initialSections={defaultSections}
              plan={plan}
              onPreview={onRefresh}
              isMobile={isMobile}
            />
          )
        case 'layouts':
          return (
            <LayoutsTab
              slug={slug}
              persona={currentProfile.persona}
              plan={plan}
              currentTemplate={currentProfile.template}
              currentPalette={currentProfile.palette}
              currentFont={currentProfile.font}
              onPreview={onRefresh}
              onUpgrade={() => goTo('plan')}
              isMobile={isMobile}
            />
          )
        case 'media':
          return (
            <MediaTab
              providerId={providerId}
              slug={slug}
              firstName={firstName}
              plan={plan}
              onUpgrade={() => goTo('plan')}
              isMobile={isMobile}
            />
          )
        case 'language':
          return (
            <LanguageTab
              providerId={providerId}
              currentLanguage={pageLanguage}
              isMobile={isMobile}
            />
          )
        case 'letterhead':
          return currentProfile.persona === 'advocate' ? (
            <div className={`flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full ${isMobile ? 'pwa-bottom-nav-clearance' : ''}`}>
              <LetterheadSettingsTab providerId={providerId} />
            </div>
          ) : null
        case 'ads':
          return (
            <AdsTab
              providerId={providerId}
              slug={slug}
              plan={plan}
              canAds={canAds}
              onUpgrade={() => goTo('plan')}
              isMobile={isMobile}
            />
          )
        default:
          return null
      }
    }

    if (tile === 'services') {
      switch (detail) {
        case 'services':
          return (
            <ServicesTab
              providerId={providerId}
              slug={slug}
              initialServices={currentProfile.services}
              plan={plan}
              onPreview={onRefresh}
              isMobile={isMobile}
            />
          )
        case 'inbox':
          return (
            <div className="flex-1 flex flex-col min-h-0">
              <MessagesTab providerId={providerId} plan={plan} />
            </div>
          )
        case 'email':
          return currentProfile.persona === 'advocate' ? (
            <div className="flex-1 flex flex-col min-h-0">
              <EmailTab providerId={providerId} slug={slug} />
            </div>
          ) : null
        case 'consultations':
          return (
            <div className={`flex-1 overflow-y-auto ${isMobile ? 'pwa-bottom-nav-clearance' : ''}`}>
              <BookingsTab providerId={providerId} />
            </div>
          )
        case 'clients':
          return (
            <div className={`flex-1 overflow-y-auto ${isMobile ? 'pwa-bottom-nav-clearance' : ''}`}>
              <PersonaTab
                providerId={providerId}
                persona={currentProfile.persona}
                label1Label={
                  currentProfile.persona === 'tutor'    ? 'Grade' :
                  currentProfile.persona === 'trainer'  ? 'Level' :
                  currentProfile.persona === 'advocate' ? 'Matter type' :
                  'Category'
                }
                label2Label={
                  currentProfile.persona === 'tutor'    ? 'Subject' :
                  currentProfile.persona === 'trainer'  ? 'Goal' :
                  currentProfile.persona === 'advocate' ? 'Court / Stage' :
                  'Notes label'
                }
                onDraftFromMatter={currentProfile.persona === 'advocate' ? seed => {
                  setDraftSeed(seed)
                  setDraftOpen(true)
                } : undefined}
                onOpenStudio={currentProfile.studioArchetype ? seed => {
                  setStudioSeed(seed)
                  setStudioOpen(true)
                } : undefined}
              />
            </div>
          )
        case 'schedule':
          return (
            <div className={`flex-1 overflow-y-auto ${isMobile ? 'pwa-bottom-nav-clearance' : ''}`}>
              <AvailabilityTab providerId={providerId} />
              <div className="border-t border-[#F0F0F0]" />
              <HoursTab providerId={providerId} />
            </div>
          )
        default:
          return null
      }
    }

    if (tile === 'plan') {
      switch (detail) {
        case 'plan':
          return (
            <div className={`flex-1 overflow-y-auto ${isMobile ? 'pwa-bottom-nav-clearance' : ''}`}>
              <PlanSection
                currentPlan={plan}
                region={region}
                plans={personaPlans}
                planOrder={planOrder}
                planStatus={planStatus}
                trialEndsAt={trialEndsAt}
                providerId={providerId}
                slug={slug}
                onGoToMessages={() => goTo('messages')}
              />
              <DisplayNameCard providerId={providerId} initialFirstName={currentProfile.firstName} initialLastName={currentProfile.lastName} onSaved={() => router.refresh()} />
              <CustomNameCard providerId={providerId} slug={slug} canUse={canCustomName} initialDomain={customName} />
            </div>
          )
        case 'reviews':
          return (
            <div className={`flex-1 overflow-y-auto ${isMobile ? 'pwa-bottom-nav-clearance' : ''}`}>
              <ReviewsTab providerId={providerId} />
            </div>
          )
        case 'suggestions':
          return <SuggestionsTab providerId={providerId} isMobile={isMobile} />
        case 'stats':
          return (
            <div className={`flex-1 overflow-y-auto ${isMobile ? 'pwa-bottom-nav-clearance' : ''}`}>
              <StatsTab providerId={providerId} />
            </div>
          )
        case 'refer':
          return (
            <ReferTab
              providerId={providerId}
              slug={slug}
              initialCode={referralCode}
              isMobile={isMobile}
              displayName={customName ?? firstName}
              persona={currentProfile.persona}
              avatarUrl={currentProfile.avatarUrl ?? undefined}
            />
          )
        default:
          return null
      }
    }

    return null
  }

  return (
    <div className="h-full flex flex-col bg-[#FAFAFA]">

      {/* ── Full-screen Research chat overlay ── */}
      <ResearchChat
        providerId={providerId}
        open={researchOpen}
        onClose={() => { setResearchOpen(false); setResearchQuery(undefined) }}
        initialQuery={researchQuery}
      />

      {/* ── Advocate-only Court Tools overlay ── */}
      {currentProfile.persona === 'advocate' && (
        <CourtToolsPanel
          providerId={providerId}
          open={courtToolsOpen}
          onClose={() => setCourtToolsOpen(false)}
        />
      )}

      {/* ── Advocate-only Drafting Studio overlay ── */}
      {currentProfile.persona === 'advocate' && (
        <DraftingStudio
          providerId={providerId}
          open={draftOpen}
          onClose={() => { setDraftOpen(false); setDraftSeed(null) }}
          seedStudentId={draftSeed?.studentId}
          seedClientName={draftSeed?.clientName}
          seedMatterType={draftSeed?.matterType}
          seedDocType={draftSeed?.matterType ? 'legal_notice' : undefined}
        />
      )}

      {/* ── Practitioner Studio overlay (all studio-enabled personas) ── */}
      {currentProfile.studioArchetype && (
        <PractitionerStudio
          providerId={providerId}
          persona={currentProfile.persona}
          open={studioOpen}
          onClose={() => { setStudioOpen(false); setStudioSeed(null) }}
          seedStudentId={studioSeed?.studentId}
          seedClientName={studioSeed?.clientName}
          seedModeKey={studioSeed?.modeKey}
        />
      )}

      {/* ── Preview/Publish modal ── */}
      {previewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-6"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="flex flex-col w-full h-[92dvh] sm:h-[85vh] sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-center justify-between gap-2 border-b border-[#E5E5E5] bg-[#F8F8F8] px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-1.5 h-1.5 rounded-full bg-[#F5A623] shrink-0" />
                <span className="text-[10px] font-semibold text-[#888] uppercase tracking-wider truncate">
                  Draft preview — not visible to customers until you publish
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
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
                <button
                  onClick={() => setPreviewOpen(false)}
                  aria-label="Close preview"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#999] hover:text-[#0D0D0D] hover:bg-[#EDEDED] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
            <iframe
              key={previewKey}
              src={`/${slug}/preview`}
              className="flex-1 border-0 w-full"
              title="Draft preview of your page"
            />
          </div>
        </div>
      )}

      {/* ── Billing return toast ── */}
      {billingToast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-medium shadow-xl transition-all ${
          billingToast === 'success'
            ? 'bg-[#166534] text-white'
            : 'bg-[#6B7280] text-white'
        }`}>
          {billingToast === 'success'
            ? 'Payment method added — your first charge is deferred to trial end.'
            : 'Checkout cancelled — no charge was made.'}
        </div>
      )}

      {/* Publish header — shown above chat/tile screens only; the home screen
          carries its own kryla-dark header (see MyChatHome). */}
      {view.screen !== 'home' && (
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
      )}

      {/* ── Home: tile-launcher ── */}
      {view.screen === 'home' && (
        <MyChatHome
          firstName={firstName}
          lastName={currentProfile.lastName}
          persona={currentProfile.persona}
          slug={slug}
          pageLive={pageLive}
          showToolsTile={currentProfile.mykrylaTools.length > 0}
          toolsTileLabel={currentProfile.mykrylaToolsLabel ?? undefined}
          onOpenTile={tile => setView({ screen: 'tile', tile })}
          onOpenChat={() => setView({ screen: 'chat' })}
        />
      )}

      {/* ── Tile detail: two-level nav — card list, then a detail body ── */}
      {view.screen === 'tile' && (() => {
        const tile = view.tile
        const detail = view.detail
        const cards = getTileDetailCards(tile, currentProfile.persona, currentProfile.mykrylaTools)
        const activeCard = detail ? cards.find(c => c.key === detail) : undefined
        const tileTitle = tile === 'tools' && currentProfile.mykrylaToolsLabel
          ? currentProfile.mykrylaToolsLabel
          : TILE_THEME[tile].label

        // My Tools cards don't navigate to a sub-detail page like other tiles —
        // each `action` opens one of the already-existing overlays/setters, or
        // (persona-tab) jumps straight to the Services tile's roster detail.
        function handleToolsCardClick(action: string) {
          switch (action) {
            case 'court':        setCourtToolsOpen(true); break
            case 'draft':        setDraftOpen(true); break
            case 'studio':       setStudioOpen(true); break
            case 'persona-tab':  setView({ screen: 'tile', tile: 'services', detail: 'clients' }); break
            default: break
          }
        }

        return (
          <TileDetailShell
            tile={tile}
            icon={TILE_THEME[tile].emoji}
            title={tileTitle}
            subtitle={detail ? undefined : TILE_THEME[tile].features.join(' · ')}
            onBack={() => setView({ screen: 'home' })}
            onOpenChat={() => setView({ screen: 'chat' })}
          >
            {!detail ? (
              <DetailCardList
                items={cards.map(card => ({
                  icon: card.icon,
                  title: card.title,
                  description: card.description,
                  onClick: card.isPreview
                    ? () => setPreviewOpen(true)
                    : tile === 'tools'
                      ? () => handleToolsCardClick(card.key)
                      : () => setView({ screen: 'tile', tile, detail: card.key }),
                }))}
              />
            ) : (
              <div className="flex flex-col min-h-full">
                <button
                  onClick={() => setView({ screen: 'tile', tile })}
                  className="inline-flex items-center gap-1.5 self-start rounded-full bg-white border border-[#E5E5E5] px-3.5 py-1.5 text-xs font-bold text-[#0D0D0D] shadow-sm transition-colors hover:bg-[#F5F5F5] mb-4"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M7.5 2L3 6l4.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {tileTitle}
                </button>

                {renderTileDetailBody(tile, detail) ?? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-16 gap-2">
                    <p className="text-sm font-semibold text-[#999]">
                      {activeCard?.title ?? 'Coming soon'}
                    </p>
                    <p className="text-xs text-[#bbb] max-w-[220px]">
                      {activeCard?.description ?? 'This tool will be wired in here next.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </TileDetailShell>
        )
      })()}

      {/* ── Chat ── */}
      {view.screen === 'chat' && (
        <div className={chatExpanded ? 'fixed inset-0 z-50 bg-white flex flex-col' : 'contents'}>
          {/* Back-to-home affordance — chat has no bottom tab bar to fall back on anymore */}
          <div className="bg-white border-b border-[#F0F0F0] px-4 py-2 shrink-0">
            <HomeBackPill onBack={() => setView({ screen: 'home' })} />
          </div>

          {/* Style info strip + expand toggle */}
          <div className="bg-white border-b border-[#F0F0F0] px-4 py-2 flex items-center gap-2 flex-wrap shrink-0">
            <span className="text-[10px] font-semibold text-[#999] uppercase tracking-wide">Style</span>
            <Tag label={TEMPLATE_LABELS[currentProfile.template] ?? currentProfile.template} />
            <Tag label={PALETTE_LABELS[currentProfile.palette] ?? currentProfile.palette} />
            <Tag label={FONT_LABELS[currentProfile.font] ?? currentProfile.font} />
            <div className="ml-auto flex items-center gap-0.5">
              {/* Clear conversation — only when there are messages beyond the greeting */}
              {messages.length > 1 && (
                <button
                  onClick={() => setMessages(prev => [prev[0]])}
                  title="New conversation"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[#bbb] hover:text-[#666] hover:bg-[#F5F5F5] transition-colors">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
              <button
                onClick={() => setChatExpanded(v => !v)}
                title={chatExpanded ? 'Collapse chat' : 'Expand chat'}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#999] hover:text-[#0D0D0D] hover:bg-[#F5F5F5] transition-colors"
              >
                {chatExpanded ? (
                  /* compress icon */
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M1 5h4V1M12 5H8V1M1 8h4v4M12 8H8v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  /* expand icon */
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M1 5V1h4M12 5V1H8M1 8v4h4M12 8v4H8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <main className={`flex-1 overflow-y-auto px-4 py-6 ${chatExpanded ? 'max-w-3xl mx-auto w-full' : ''} ${isMobile ? 'pwa-bottom-nav-clearance' : ''}`}>
            <div className="space-y-4">
              {messages.map((msg, i) => {
                // Empty state: render greeting as centered welcome card instead of a bubble
                if (i === 0 && messages.length === 1) {
                  return (
                    <div key={i} className="flex flex-col items-center text-center py-8">
                      <div className="w-11 h-11 rounded-2xl bg-[#F5F5F5] flex items-center justify-center mb-3">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M9 1.5l2.2 6H17l-5 3.6 1.9 6L9 13.4l-4.9 3.2 1.9-6-5-3.6h5.8z" stroke="#0D0D0D" strokeWidth="1.3" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <p className="text-sm text-[#666] leading-relaxed max-w-[240px]">{msg.content}</p>
                    </div>
                  )
                }
                return (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`group ${msg.role === 'user' ? 'max-w-[85%]' : 'max-w-[92%] w-full'}`}>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#0D0D0D] text-white rounded-br-sm'
                          : 'bg-white border border-[#E5E5E5] text-[#0D0D0D] rounded-bl-sm'
                      }`}>
                      {msg.role === 'user' ? (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      ) : (
                        <MarkdownMessage content={msg.content} />
                      )}
                    </div>

                    {/* Draft-saved indicator */}
                    {msg.changed && (
                      <div className="flex items-center gap-1 mt-1.5 ml-1">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-[10px] text-[#22C55E] font-semibold">Draft saved · publish when ready</span>
                      </div>
                    )}

                    {/* Source cards (rich) */}
                    {msg.sources && msg.sources.length > 0 && (
                      <SourceCards sources={msg.sources} />
                    )}

                    {/* Tab-nav suggestion */}
                    {msg.suggestTab && (
                      <button
                        onClick={() => goTo(msg.suggestTab!, msg.suggestDesignTab)}
                        className="mt-2 ml-1 flex items-center gap-1.5 text-xs font-semibold text-[#0D0D0D] bg-[#F5F5F5] hover:bg-[#E5E5E5] rounded-xl px-3 py-1.5 transition-colors">
                        Yes, take me there
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}

                    {/* Research handoff suggestion */}
                    {msg.suggestResearch && (
                      <button
                        onClick={() => {
                          setResearchQuery(msg.researchQuery)
                          setResearchOpen(true)
                        }}
                        className="mt-2 ml-1 flex items-center gap-1.5 text-xs font-semibold text-[#0D0D0D] bg-[#F5F5F5] hover:bg-[#E5E5E5] rounded-xl px-3 py-1.5 transition-colors">
                        Open Research 🔍
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}

                    {/* Court Tools handoff suggestion (advocate only) */}
                    {msg.suggestCourtTools && currentProfile.persona === 'advocate' && (
                      <button
                        onClick={() => setCourtToolsOpen(true)}
                        className="mt-2 ml-1 flex items-center gap-1.5 text-xs font-semibold text-[#92400E] bg-[#FEF3C7] hover:bg-[#FDE68A] rounded-xl px-3 py-1.5 transition-colors">
                        Open Court Tools ⚖️
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}

                    {/* Message actions (copy / retry) — assistant messages only */}
                    {msg.role === 'assistant' && i > 0 && (
                      <MessageActions
                        content={msg.content}
                        showRetry={i === messages.length - 1 && !loading}
                        onRetry={() => {
                          // Re-send the last user message
                          const lastUser = [...messages].reverse().find(m => m.role === 'user')
                          if (lastUser) {
                            setMessages(prev => prev.slice(0, -1))
                            setInput(lastUser.content)
                            setTimeout(() => send(), 50)
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
              )
              })}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-[#E5E5E5] rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1.5 items-center">
                      {[0, 150, 300].map(delay => (
                        <div
                          key={delay}
                          className="w-1.5 h-1.5 rounded-full bg-[#bbb] animate-bounce"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                      <span className="text-[11px] text-[#bbb] ml-1">Thinking…</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </main>

          <div className="bg-white border-t border-[#E5E5E5] px-4 pt-3 pb-4 shrink-0">
            {/* Quick-action prompt chips — shown only when chat is empty (just the greeting) */}
            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {getChatPromptChips(currentProfile.persona).map(chip => (
                  <button
                    key={chip}
                    onClick={() => { setInput(chip); setTimeout(() => inputRef.current?.focus(), 50) }}
                    className="px-3 py-1.5 rounded-xl border border-[#E5E5E5] text-[11px] font-medium text-[#444] hover:border-[#0D0D0D] hover:text-[#0D0D0D] transition-colors bg-white"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Tool buttons row — above textarea; Research + Draft disabled in full-screen */}
            <div className="flex items-center gap-1.5 mb-2">
              {/* Research Chat */}
              <button
                onClick={() => { setResearchQuery(undefined); setResearchOpen(true) }}
                disabled={chatExpanded}
                title={chatExpanded ? 'Exit full-screen to open Research' : 'Research Chat'}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[#F5F5F5] text-[#666] hover:bg-[#E5E5E5] transition-colors disabled:opacity-30 disabled:pointer-events-none">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Research
              </button>

              {/* Advocate-only: Drafting Studio */}
              {currentProfile.persona === 'advocate' && (
                <button
                  onClick={() => setDraftOpen(true)}
                  disabled={chatExpanded}
                  title={chatExpanded ? 'Exit full-screen to open Drafting Studio' : 'Drafting Studio'}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[#F5F5F5] text-[#666] hover:bg-[#E5E5E5] transition-colors disabled:opacity-30 disabled:pointer-events-none">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1v14M1 13h14M4 13V9L1 5M12 13V9l3-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Draft
                </button>
              )}

              {/* Advocate-only: Court Tools */}
              {currentProfile.persona === 'advocate' && (
                <button
                  onClick={() => setCourtToolsOpen(true)}
                  disabled={chatExpanded}
                  title={chatExpanded ? 'Exit full-screen to open Court Tools' : 'Court Tools — CNR, case status, cause list, orders, caveat, process, find court'}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[#FEF3C7] text-[#92400E] hover:bg-[#FDE68A] transition-colors disabled:opacity-30 disabled:pointer-events-none">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Court Tools
                </button>
              )}

              {/* Practitioner Studio — all studio-enabled personas */}
              {currentProfile.studioArchetype && (
                <button
                  onClick={() => setStudioOpen(true)}
                  disabled={chatExpanded}
                  title={chatExpanded ? 'Exit full-screen to open Studio' : 'Practitioner Studio'}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE] transition-colors disabled:opacity-30 disabled:pointer-events-none">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M3 13V5l5-4 5 4v8M6 13V9h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Studio
                </button>
              )}

              {/* Mic — always available */}
              <button
                onClick={toggleMic}
                disabled={transcribing}
                title={listening ? 'Stop recording' : transcribing ? 'Transcribing…' : 'Speak your message'}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                  listening
                    ? 'bg-red-500 text-white animate-pulse'
                    : transcribing
                    ? 'bg-[#F5F5F5] text-[#bbb] cursor-wait'
                    : 'bg-[#F5F5F5] text-[#666] hover:bg-[#E5E5E5]'
                }`}>
                {transcribing ? (
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="animate-spin">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="28" strokeDashoffset="10"/>
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <rect x="5" y="1" width="6" height="9" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M2 8c0 3.314 2.686 6 6 6s6-2.686 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="8" y1="14" x2="8" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
                {transcribing ? 'Transcribing…' : listening ? 'Stop' : 'Speak'}
              </button>
            </div>

            {/* Textarea + send row */}
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                rows={1}
                placeholder={transcribing ? 'Transcribing…' : listening ? '…' : t.placeholder}
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

          {/* LiveLaw ticker — advocate only, below the input area */}
          {currentProfile.persona === 'advocate' && (
            <div className="shrink-0">
              <LegalNewsTicker providerId={providerId} />
            </div>
          )}

        </div>
      )}

      {/* Install banner (My Chat app) */}
      <InstallBanner app="mychat" slug={slug} />

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

