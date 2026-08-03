'use client'
import { useEffect, useRef } from 'react'

/**
 * Shared bottom-sheet shell for OrderModal / CustomOrderModal — previously
 * each file hand-rolled an identical overlay with only a decorative,
 * non-interactive grey drag-handle as its "header" (no close button, no
 * back button, no Escape handler, no dialog semantics, no scroll lock).
 * That left backdrop-click as the only way to dismiss a long form, which on
 * a phone (sheet at max-h-[92svh]) is an ~8vh sliver at the top of the
 * screen.
 *
 * This shell adds a real sticky header (back affordance + pinned title —
 * the title used to live inside the scrolling form body, so it disappeared
 * once the user scrolled past the first field group) plus the missing
 * accessibility basics: role="dialog"/aria-modal, Escape-to-close, a focus
 * trap, focus restore to the trigger on close, and a body scroll-lock.
 *
 * The back affordance reuses the house "← [label]" pattern from
 * app/mychat/HomeBackPill.tsx (word + arrow, never a bare icon) but reads
 * design tokens instead of that component's hardcoded dashboard colors, so
 * it renders correctly on personas with a non-default --radius-btn (e.g.
 * sellganeshidols' 2px radius) — --color-ink and --kryla-border cover the
 * remaining hardcoded hex values.
 */

interface Props {
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}

export default function OrderSheet({ title, subtitle, onClose, children }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<Element | null>(null)

  useEffect(() => {
    triggerRef.current = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const focusable = sheetRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    // Move focus into the sheet once it mounts.
    sheetRef.current?.querySelector<HTMLElement>('button, input, textarea, select')?.focus()

    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKeyDown)
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus()
    }
  }, [onClose])

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-sheet-title"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white max-h-[92svh] overflow-y-auto"
        style={{ borderTopLeftRadius: 'var(--radius-card)', borderTopRightRadius: 'var(--radius-card)' }}
      >
        <div className="sticky top-0 z-10 bg-white flex items-center gap-3 px-4 pt-3 pb-3 border-b"
          style={{ borderColor: 'var(--kryla-border, #E5E5E5)' }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            className="inline-flex items-center gap-1.5 shrink-0 px-3 py-1.5 text-xs font-bold transition-colors hover:opacity-70"
            style={{ borderRadius: 'var(--radius-btn)', border: '1px solid var(--kryla-border, #E5E5E5)', color: 'var(--color-ink, #0D0D0D)' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M7.5 2L3 6l4.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>
          <div className="min-w-0">
            <p id="order-sheet-title" className="font-black text-sm leading-tight truncate" style={{ color: 'var(--color-ink, #0D0D0D)' }}>{title}</p>
            {subtitle && <p className="text-xs text-[#999] truncate">{subtitle}</p>}
          </div>
        </div>
        {children}
      </div>
    </>
  )
}
