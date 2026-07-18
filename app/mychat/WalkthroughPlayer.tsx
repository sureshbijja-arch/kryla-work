'use client'

import { useEffect, useRef, useState } from 'react'
import KLogo from './KLogo'

/**
 * In-app "video" explainer for new Members — a full-screen, auto-advancing
 * scene player (captioned narration + storyboard beats) built from the
 * MyKryla video explainer script. Not a rendered video file: no ffmpeg/
 * render pipeline exists in this project, so the script is played back as a
 * timed slideshow instead — same content, no new infra.
 */

interface Scene {
  emoji: string
  title: string
  narration: string
  seconds: number
}

const SCENES: Scene[] = [
  {
    emoji: '👋',
    title: "You're live",
    narration:
      "Priya — you're live. This is your place online, and it took about fifteen minutes to build. Let me show you around your space.",
    seconds: 7,
  },
  {
    emoji: '🌐',
    title: 'What customers see',
    narration:
      'Your services, your prices, what people are already saying — and a Book or WhatsApp-me button so business comes straight to you.',
    seconds: 7,
  },
  {
    emoji: '🏡',
    title: 'Meet your space',
    narration:
      'Four tiles hold everything: My Page, My Services, My Plan, and My Tools. And your assistant is always one tap away at the bottom.',
    seconds: 7,
  },
  {
    emoji: '🏠',
    title: 'My Page',
    narration:
      'Where your online home lives — reorder sections, change your layout and colors, manage photos, and preview before you publish.',
    seconds: 8,
  },
  {
    emoji: '🧰',
    title: 'My Services',
    narration:
      'Your services and pricing, messages from your page, booking requests waiting for a reply, your client list, and your hours.',
    seconds: 8,
  },
  {
    emoji: '✨',
    title: 'Ask your assistant',
    narration:
      "No drag-and-drop, no dashboards to learn — just ask. “Add a Saturday morning batch” and it's done.",
    seconds: 7,
  },
  {
    emoji: '📈',
    title: 'My Plan',
    narration:
      "See how many people looked you up, read your reviews, refer a friend — and when you're ready, moving up a plan is one tap.",
    seconds: 7,
  },
  {
    emoji: '🛠️',
    title: 'My Tools + Ask us',
    narration:
      "My Tools is built around your craft. And if you ever get stuck — ask us, we're on WhatsApp and always here.",
    seconds: 7,
  },
]

interface WalkthroughPlayerProps {
  firstName: string
  onClose: () => void
}

export default function WalkthroughPlayer({ firstName, onClose }: WalkthroughPlayerProps) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number>(0)

  const scene = SCENES[index]
  const isLast = index === SCENES.length - 1

  useEffect(() => {
    if (!playing) return
    startRef.current = performance.now()
    setProgress(0)

    function tick(now: number) {
      const elapsed = (now - startRef.current) / 1000
      const pct = Math.min(1, elapsed / scene.seconds)
      setProgress(pct)
      if (pct >= 1) {
        if (isLast) {
          setPlaying(false)
        } else {
          setIndex(i => i + 1)
        }
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, playing])

  function goTo(i: number) {
    setIndex(Math.max(0, Math.min(SCENES.length - 1, i)))
    setPlaying(true)
  }

  const narration = scene.narration.replace('Priya', firstName || 'there')

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0D0D0D]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-3">
        <div className="flex items-center gap-2">
          <KLogo size={22} strokeColor="#ffffff" accentColor="#F5A623" />
          <span className="text-sm font-extrabold tracking-tight text-white">kryla</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-white/70 border border-white/20 hover:bg-white/10 transition-colors"
        >
          Close ✕
        </button>
      </div>

      {/* Progress segments */}
      <div className="flex gap-1.5 px-5">
        {SCENES.map((s, i) => (
          <div key={i} className="h-1 flex-1 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full bg-mc-accent"
              style={{
                width: i < index ? '100%' : i === index ? `${progress * 100}%` : '0%',
                transition: i === index ? 'none' : 'width 0.2s',
              }}
            />
          </div>
        ))}
      </div>

      {/* Scene stage */}
      <button
        onClick={() => setPlaying(p => !p)}
        className="flex-1 flex flex-col items-center justify-center px-8 text-center"
      >
        <span className="text-7xl mb-6">{scene.emoji}</span>
        <h2 className="text-2xl font-extrabold text-white mb-4">{scene.title}</h2>
        <p className="max-w-md text-base leading-relaxed text-white/80">{narration}</p>
        {!playing && (
          <span className="mt-6 text-xs font-semibold text-mc-accent">
            {isLast ? 'Tap Replay below' : 'Paused — tap to resume'}
          </span>
        )}
      </button>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3 px-5 pb-8 pt-2" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
        <button
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="rounded-full px-4 py-2.5 text-sm font-semibold text-white/70 disabled:opacity-30 border border-white/20 hover:bg-white/10 transition-colors"
        >
          ← Back
        </button>
        <span className="text-xs font-medium text-white/50">
          {index + 1} / {SCENES.length}
        </span>
        {isLast && !playing ? (
          <button
            onClick={() => goTo(0)}
            className="rounded-full px-5 py-2.5 text-sm font-bold text-white bg-mc-accent hover:opacity-90 transition-opacity"
          >
            Replay ↻
          </button>
        ) : (
          <button
            onClick={() => goTo(index + 1)}
            className="rounded-full px-5 py-2.5 text-sm font-bold text-white bg-mc-accent hover:opacity-90 transition-opacity"
          >
            {isLast ? 'Done' : 'Next →'}
          </button>
        )}
      </div>
    </div>
  )
}
