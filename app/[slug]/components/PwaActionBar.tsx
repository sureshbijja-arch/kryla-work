'use client'

import { useEffect, useState } from 'react'
import { waLink } from '@/lib/whatsapp'

interface Props {
  ctaPrimary:      string
  whatsappNumber:  string | null
  location:        string
  slug:            string
  accentColor:     string
}

export default function PwaActionBar({ ctaPrimary, whatsappNumber, location, slug, accentColor }: Props) {
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    setIsStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    )
  }, [])

  if (!isStandalone) return null

  const waHref    = waLink(whatsappNumber)
  const mapsHref  = location
    ? `https://maps.google.com/?q=${encodeURIComponent(location)}`
    : null

  const actions = [
    { label: ctaPrimary || 'Book', href: `/${slug}#booking`, primary: true },
    waHref    ? { label: 'WhatsApp', href: waHref,   primary: false } : null,
    mapsHref  ? { label: 'Directions', href: mapsHref, primary: false } : null,
  ].filter(Boolean) as { label: string; href: string; primary: boolean }[]

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 pb-safe"
      style={{ background: '#0D0D0D' }}>
      <div className="flex border-t border-[#1A1A1A]">
        {actions.map((a, i) => (
          <a
            key={i}
            href={a.href}
            target={a.href.startsWith('http') ? '_blank' : undefined}
            rel={a.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="flex-1 py-4 text-center text-sm font-semibold transition-opacity active:opacity-70"
            style={a.primary
              ? { background: accentColor, color: '#0D0D0D' }
              : { background: 'transparent', color: '#FFFFFF' }
            }>
            {a.label}
          </a>
        ))}
      </div>
    </div>
  )
}
