'use client'

import { useEffect, useState } from 'react'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'

interface Props {
  app:  'customer' | 'mychat'
  slug: string
}

const STORAGE_KEY = 'kryla-install-banner-dismissed'
const VISIT_KEY   = 'kryla-install-banner-visits'

export default function InstallBanner({ app, slug }: Props) {
  const { canInstall, isInstalled, installApp } = useInstallPrompt()
  const [visible, setVisible]   = useState(false)
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | null>(null)

  useEffect(() => {
    const ua = navigator.userAgent
    const isIos     = /iPad|iPhone|iPod/.test(ua)
    const isAndroid = /Android/.test(ua)
    setPlatform(isIos ? 'ios' : isAndroid ? 'android' : 'desktop')

    if (isInstalled) return
    if (localStorage.getItem(STORAGE_KEY) === '1') return

    const visits = parseInt(localStorage.getItem(VISIT_KEY) ?? '0', 10) + 1
    localStorage.setItem(VISIT_KEY, String(visits))
    if (visits >= 2) setVisible(true)
  }, [isInstalled])

  function dismiss() {
    setVisible(false)
    localStorage.setItem(STORAGE_KEY, '1')
  }

  if (!visible || isInstalled) return null
  if (platform === 'desktop') return null // desktop has its own install path

  const installUrl = `/get-app?app=${app}`

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0D0D0D] border-t border-[#2A2A2A] px-4 py-3 pb-safe flex items-center gap-3">
      {/* K-mark icon */}
      <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center shrink-0">
        {/* Canonical Kryla K: spine left, two arms right, lower arm amber */}
        <svg width="18" height="18" viewBox="0 0 22 22" fill="none" aria-hidden>
          <line x1="5" y1="2"  x2="5"  y2="20" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
          <line x1="5" y1="11" x2="17" y2="2"  stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
          <line x1="5" y1="11" x2="17" y2="20" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-semibold leading-tight">
          {app === 'mychat' ? 'MyKryla' : 'This page'} — Add to Home Screen
        </div>
        <div className="text-[#666] text-xs mt-0.5">Opens like a native app</div>
      </div>
      {canInstall ? (
        <button
          onClick={() => { installApp(); dismiss() }}
          className="shrink-0 px-4 py-2 bg-[#F5A623] text-[#0D0D0D] font-bold rounded-xl text-sm">
          Add
        </button>
      ) : (
        <a
          href={installUrl}
          className="shrink-0 px-4 py-2 bg-[#F5A623] text-[#0D0D0D] font-bold rounded-xl text-sm">
          How
        </a>
      )}
      <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 text-[#555] p-1">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}
