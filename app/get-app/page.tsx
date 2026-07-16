'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'

type Platform = 'ios' | 'android' | 'desktop'

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

const KMARK = (
  <svg width="24" height="24" viewBox="0 0 22 22" fill="none" aria-hidden>
    <line x1="11" y1="2"  x2="11" y2="20" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
    <line x1="11" y1="11" x2="3"  y2="3"  stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
    <line x1="11" y1="11" x2="19" y2="3"  stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
    <line x1="11" y1="11" x2="19" y2="19" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" />
  </svg>
)

function GetAppContent() {
  const params   = useSearchParams()
  const appParam = params.get('app') ?? 'customer'   // 'customer' | 'mychat'
  const isMychat = appParam === 'mychat'

  const [platform, setPlatform] = useState<Platform>('android')
  const { canInstall, isInstalled, installApp } = useInstallPrompt()

  useEffect(() => { setPlatform(detectPlatform()) }, [])

  const appName    = isMychat ? 'My Chat' : 'your Kryla space'
  const appDesc    = isMychat
    ? 'Manage bookings, messages, and your business — right from your home screen.'
    : 'Share your business with customers — they can open it like a native app.'

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#F5A623] flex items-center justify-center mb-6">
          {KMARK}
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">App installed!</h1>
        <p className="text-[#999] text-sm mb-8">Find it on your home screen.</p>
        <a href={isMychat ? '/mychat' : '/'} className="px-6 py-3 bg-[#F5A623] text-[#0D0D0D] font-bold rounded-xl text-sm">
          Open {isMychat ? 'My Chat' : 'the app'}
        </a>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center px-6 text-center">
      {/* Header */}
      <div className="w-20 h-20 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center mb-6">
        <svg width="40" height="40" viewBox="0 0 22 22" fill="none" aria-hidden>
          <line x1="11" y1="2"  x2="11" y2="20" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
          <line x1="11" y1="11" x2="3"  y2="3"  stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
          <line x1="11" y1="11" x2="19" y2="3"  stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
          <line x1="11" y1="11" x2="19" y2="19" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>

      <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#F5A623]">kryla.work</div>
      <h1 className="text-2xl font-bold text-white mb-2">Install {appName}</h1>
      <p className="text-[#999] text-sm mb-10 max-w-xs">{appDesc}</p>

      {/* Android / Desktop: one-tap install */}
      {(platform === 'android' || platform === 'desktop') && (
        <div className="w-full max-w-xs">
          {canInstall ? (
            <button
              onClick={installApp}
              className="w-full py-4 bg-[#F5A623] text-[#0D0D0D] font-bold rounded-2xl text-base">
              Add to home screen
            </button>
          ) : (
            <div className="text-[#666] text-sm px-4 py-6 border border-[#2A2A2A] rounded-2xl">
              Open this link in <strong className="text-white">Chrome</strong> for the one-tap install prompt.
            </div>
          )}
        </div>
      )}

      {/* iOS: step-by-step guide */}
      {platform === 'ios' && (
        <div className="w-full max-w-xs text-left space-y-4">
          {[
            {
              n: 1,
              label: 'Tap the Share button',
              sub: 'The box-with-arrow icon at the bottom of Safari',
            },
            {
              n: 2,
              label: 'Scroll down and tap "Add to Home Screen"',
              sub: 'It may be labelled "Add to Home Screen" with a + icon',
            },
            {
              n: 3,
              label: 'Tap Add',
              sub: 'The app icon will appear on your home screen immediately',
            },
          ].map(({ n, label, sub }) => (
            <div key={n} className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-[#F5A623] flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[#0D0D0D] font-bold text-sm">{n}</span>
              </div>
              <div>
                <div className="text-white font-semibold text-sm">{label}</div>
                <div className="text-[#666] text-xs mt-0.5">{sub}</div>
              </div>
            </div>
          ))}
          <p className="text-[#555] text-xs text-center pt-2">
            iOS 16.4+ required for full PWA support
          </p>
        </div>
      )}
    </div>
  )
}

export default function GetAppPage() {
  return (
    <Suspense fallback={null}>
      <GetAppContent />
    </Suspense>
  )
}
