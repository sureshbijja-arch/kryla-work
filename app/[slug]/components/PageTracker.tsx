'use client'

import { useEffect } from 'react'

export default function PageTracker({ providerId, slug }: { providerId: string; slug: string }) {
  useEffect(() => {
    const key = `kryla_viewed_${slug}`
    if (typeof window === 'undefined' || localStorage.getItem(key)) return

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId,
        eventType: 'page_view',
        referrer:  document.referrer || null,
      }),
    }).then(() => {
      localStorage.setItem(key, '1')
    }).catch(() => { /* non-fatal */ })
  }, [providerId, slug])

  return null
}
