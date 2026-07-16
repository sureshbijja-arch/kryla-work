'use client'

import { useState, useEffect } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface InstallPromptResult {
  canInstall:  boolean
  isInstalled: boolean
  installApp:  () => Promise<void>
}

export function useInstallPrompt(): InstallPromptResult {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Already in standalone mode
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    ) {
      setIsInstalled(true)
      return
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
    }
    function onInstalled() {
      setIsInstalled(true)
      setPromptEvent(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function installApp() {
    if (!promptEvent) return
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === 'accepted') setIsInstalled(true)
    setPromptEvent(null)
  }

  return { canInstall: !!promptEvent, isInstalled, installApp }
}
