'use client'

import { useEffect, useRef, useState } from 'react'
import type { MykrylaToolCard } from './tileTheme'
import type { MCView } from './SpaceClient'

/**
 * Real-screen guided tour for new Members — replaces the old emoji-slideshow
 * WalkthroughPlayer. Instead of narrating over static scenes, this drives
 * the actual MyKryla UI: each step calls `setView` to open the real tile/
 * detail screen, then spotlights the real DOM element (via a `data-tour`
 * anchor) behind a dark scrim, with a caption bubble alongside it.
 *
 * Auto-advances on a timer; Next/Back/Skip give the Member control. There is
 * no tour library in this project (confirmed — no react-joyride/driver.js/
 * floating-ui), so the spotlight math is done by hand with
 * getBoundingClientRect(), consistent with the codebase's existing
 * `fixed inset-0 z-50` overlay pattern (Preview modal, chat expand).
 */

interface TourStep {
  view: MCView
  /** `data-tour` value to spotlight. Omit for a centered, non-spotlit caption (intro/outro). */
  anchor?: string
  title: string
  body: string
  seconds: number
}

const BASE_STEPS: TourStep[] = [
  {
    view: { screen: 'home' },
    anchor: 'home-header',
    title: "This is your space",
    body: "Everything about your business on Kryla lives here. You can see you're live right at the top.",
    seconds: 6,
  },
  {
    view: { screen: 'home' },
    anchor: 'home-tilegrid',
    title: 'Four tiles, everything you need',
    body: 'My Page, My Services, My Plan, and My Tools. Each one holds a piece of your business.',
    seconds: 6,
  },
  // My Page
  {
    view: { screen: 'tile', tile: 'page' },
    anchor: 'tile-page',
    title: 'My Page',
    body: 'This is where your online home lives.',
    seconds: 5,
  },
  {
    view: { screen: 'tile', tile: 'page' },
    anchor: 'card-page-sections',
    title: 'Sections',
    body: 'Decide what people see first — drag it into the order that feels right.',
    seconds: 5,
  },
  {
    view: { screen: 'tile', tile: 'page' },
    anchor: 'card-page-layouts',
    title: 'Layouts',
    body: 'Change the whole feel of your page — a warmer color, a friendlier font — one tap.',
    seconds: 5,
  },
  {
    view: { screen: 'tile', tile: 'page' },
    anchor: 'card-page-media',
    title: 'Media',
    body: 'Your photos live here.',
    seconds: 4,
  },
  {
    view: { screen: 'tile', tile: 'page' },
    anchor: 'card-page-language',
    title: 'Language',
    body: 'Show your presence in the language your customers read.',
    seconds: 4,
  },
  {
    view: { screen: 'tile', tile: 'page' },
    anchor: 'card-page-ads',
    title: 'Ads',
    body: 'When you want to run a little promo banner, it’s right here.',
    seconds: 4,
  },
  {
    view: { screen: 'tile', tile: 'page' },
    anchor: 'card-page-preview',
    title: 'Preview my page',
    body: 'See exactly what a customer will see, then make it live with one tap.',
    seconds: 5,
  },
  // My Services
  {
    view: { screen: 'tile', tile: 'services' },
    anchor: 'tile-services',
    title: 'My Services',
    body: 'Your services, your prices, and the people waiting to hear from you.',
    seconds: 5,
  },
  {
    view: { screen: 'tile', tile: 'services' },
    anchor: 'card-services-services',
    title: 'Services & pricing',
    body: 'List what you do and what it costs — this is exactly what a customer books.',
    seconds: 5,
  },
  {
    view: { screen: 'tile', tile: 'services' },
    anchor: 'card-services-inbox',
    title: 'Messages',
    body: 'When someone reaches out from your presence, it lands right here.',
    seconds: 4,
  },
  {
    view: { screen: 'tile', tile: 'services' },
    anchor: 'card-services-consultations',
    title: 'Consultations',
    body: "Someone's waiting to hear from you — accept, and they're confirmed.",
    seconds: 5,
  },
  {
    view: { screen: 'tile', tile: 'services' },
    anchor: 'card-services-clients',
    title: 'Clients',
    body: 'Everyone you work with, in one place — no more juggling separate chats.',
    seconds: 5,
  },
  {
    view: { screen: 'tile', tile: 'services' },
    anchor: 'card-services-schedule',
    title: 'Schedule',
    body: 'Your hours and availability — so people only ask for times that work.',
    seconds: 5,
  },
  // My Plan
  {
    view: { screen: 'tile', tile: 'plan' },
    anchor: 'tile-plan',
    title: 'My Plan',
    body: 'How your business is doing, and room to grow.',
    seconds: 5,
  },
  {
    view: { screen: 'tile', tile: 'plan' },
    anchor: 'card-plan-plan',
    title: 'Plan & billing',
    body: "When you're ready for more, moving up is one tap away.",
    seconds: 5,
  },
  {
    view: { screen: 'tile', tile: 'plan' },
    anchor: 'card-plan-reviews',
    title: 'Reviews',
    body: 'Real words from real customers — they build trust for the next one.',
    seconds: 5,
  },
  {
    view: { screen: 'tile', tile: 'plan' },
    anchor: 'card-plan-suggestions',
    title: 'Suggestions',
    body: 'Little nudges from us on what could bring more business.',
    seconds: 4,
  },
  {
    view: { screen: 'tile', tile: 'plan' },
    anchor: 'card-plan-stats',
    title: 'Insights',
    body: 'See how many people looked you up — that’s chances at new business.',
    seconds: 5,
  },
  {
    view: { screen: 'tile', tile: 'plan' },
    anchor: 'card-plan-refer',
    title: 'Refer',
    body: 'Know another maker who needs this? Bring them in.',
    seconds: 4,
  },
  // Ask + outro
  {
    view: { screen: 'home' },
    anchor: 'home-askcard',
    title: 'Ask your assistant',
    body: "No drag-and-drop, no dashboards to learn — anytime you want to change something, just ask.",
    seconds: 6,
  },
  {
    view: { screen: 'home' },
    title: "That's your space",
    body: 'Your online home, your services, your plan, your tools — all in one place. Ask us anytime — we’re on WhatsApp and always here.',
    seconds: 6,
  },
]

function toolsStep(mykrylaToolsLabel: string | null): TourStep {
  return {
    view: { screen: 'tile', tile: 'tools' },
    anchor: 'tile-tools',
    title: mykrylaToolsLabel || 'My Tools',
    body: 'Built around your craft — your tools are waiting right here.',
    seconds: 5,
  }
}

interface GuidedTourProps {
  open: boolean
  firstName: string
  persona: string
  mykrylaTools: MykrylaToolCard[]
  mykrylaToolsLabel: string | null
  setView: (view: MCView) => void
  onClose: () => void
}

export default function GuidedTour({
  open,
  firstName,
  persona,
  mykrylaTools,
  mykrylaToolsLabel,
  setView,
  onClose,
}: GuidedTourProps) {
  // Build the step list once per open — filters in persona-gated steps and
  // inserts My Tools right after My Plan, before the Ask card close-out.
  const [steps] = useState<TourStep[]>(() => {
    const list = [...BASE_STEPS]
    const askIndex = list.findIndex(s => s.anchor === 'home-askcard')
    if (mykrylaTools.length > 0) {
      list.splice(askIndex, 0, toolsStep(mykrylaToolsLabel))
    }
    if (persona === 'advocate') {
      const pageLayoutsIdx = list.findIndex(s => s.anchor === 'card-page-language')
      list.splice(pageLayoutsIdx + 1, 0, {
        view: { screen: 'tile', tile: 'page' },
        anchor: 'card-page-letterhead',
        title: 'Letterhead',
        body: "Your firm's letterhead settings.",
        seconds: 4,
      })
      const servicesInboxIdx = list.findIndex(s => s.anchor === 'card-services-inbox')
      list.splice(servicesInboxIdx + 1, 0, {
        view: { screen: 'tile', tile: 'services' },
        anchor: 'card-services-email',
        title: 'Email',
        body: 'Your connected email inbox sits right alongside your messages.',
        seconds: 4,
      })
    }
    return list
  })

  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)

  const step = steps[index]
  const isLast = index === steps.length - 1

  // Navigate to the step's real screen, then locate + measure the anchor.
  useEffect(() => {
    if (!open) return
    setView(step.view)
    setRect(null)

    function measure() {
      if (!step.anchor) {
        setRect(null)
        return
      }
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.anchor}"]`)
      if (!el) {
        // Screen may still be mounting (e.g. tile detail body) — retry next frame.
        rafRef.current = requestAnimationFrame(measure)
        return
      }
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      setRect(el.getBoundingClientRect())
    }
    rafRef.current = requestAnimationFrame(measure)

    function onReflow() {
      if (!step.anchor) return
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.anchor}"]`)
      if (el) setRect(el.getBoundingClientRect())
    }
    window.addEventListener('resize', onReflow)
    window.addEventListener('scroll', onReflow, true)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onReflow)
      window.removeEventListener('scroll', onReflow, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index])

  // Auto-advance timer.
  useEffect(() => {
    if (!open || !playing) return
    timerRef.current = setTimeout(() => {
      if (isLast) {
        setPlaying(false)
      } else {
        setIndex(i => i + 1)
      }
    }, step.seconds * 1000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, playing])

  // Reset to step 0 each time the tour is (re-)opened.
  useEffect(() => {
    if (open) {
      setIndex(0)
      setPlaying(true)
    }
  }, [open])

  if (!open) return null

  function goTo(i: number) {
    setIndex(Math.max(0, Math.min(steps.length - 1, i)))
    setPlaying(true)
  }

  function finish() {
    setView({ screen: 'home' })
    onClose()
  }

  const narration = step.body.replace(/\byou\b/i, firstName ? firstName : 'you')

  // Caption bubble position: below the spotlight if there's room, else above; centered when no anchor.
  const pad = 14
  const captionStyle: React.CSSProperties = rect
    ? {
        position: 'fixed',
        left: Math.max(16, Math.min(rect.left, window.innerWidth - 336)),
        top:
          rect.bottom + 140 < window.innerHeight
            ? rect.bottom + pad
            : Math.max(16, rect.top - 150),
        width: 320,
        maxWidth: 'calc(100vw - 32px)',
      }
    : {
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 320,
        maxWidth: 'calc(100vw - 32px)',
      }

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Scrim with spotlight cutout — single element using an inset box-shadow ring trick */}
      {rect ? (
        <div
          className="fixed z-[61] rounded-2xl pointer-events-none transition-all duration-300"
          style={{
            left: rect.left - 8,
            top: rect.top - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            boxShadow: '0 0 0 9999px rgba(13,13,13,0.72)',
            border: '2px solid var(--mc-accent)',
          }}
        />
      ) : (
        <div className="fixed inset-0 z-[61] bg-[#0D0D0D]/72 pointer-events-none" />
      )}

      {/* Caption bubble */}
      <div
        className="z-[62] rounded-2xl bg-white shadow-xl p-4"
        style={captionStyle}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <p className="font-extrabold text-sm text-[#0D0D0D]">{step.title}</p>
          <button
            onClick={finish}
            className="shrink-0 text-[11px] font-semibold text-[#999] hover:text-[#0D0D0D] transition-colors"
          >
            Skip ✕
          </button>
        </div>
        <p className="text-xs text-[#555] leading-relaxed">{narration}</p>

        <div className="flex items-center gap-1.5 mt-3">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= index ? 'bg-mc-accent' : 'bg-[#EEE]'}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between mt-3">
          <button
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-[#666] disabled:opacity-30 hover:bg-[#F5F5F5] transition-colors"
          >
            ← Back
          </button>
          {isLast ? (
            <button
              onClick={finish}
              className="text-xs font-bold px-4 py-1.5 rounded-lg text-white bg-mc-accent hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          ) : (
            <button
              onClick={() => goTo(index + 1)}
              className="text-xs font-bold px-4 py-1.5 rounded-lg text-white bg-mc-accent hover:opacity-90 transition-opacity"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
