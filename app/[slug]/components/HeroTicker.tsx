'use client'

import { useState, useEffect } from 'react'

export default function HeroTicker({
  words,
  className = '',
}: {
  words:      string[]
  className?: string
}) {
  const [idx, setIdx]   = useState(0)
  const [show, setShow] = useState(true)

  useEffect(() => {
    if (!words.length) return
    const interval = setInterval(() => {
      setShow(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % words.length)
        setShow(true)
      }, 300)
    }, 2200)
    return () => clearInterval(interval)
  }, [words])

  if (!words.length) return null

  return (
    <span
      className={`inline-block transition-all duration-300 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'} ${className}`}
      aria-live="polite">
      {words[idx]}
    </span>
  )
}
