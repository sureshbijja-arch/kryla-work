'use client'

import posthog from 'posthog-js'
import { useEffect } from 'react'

/**
 * app/global-error.tsx — Catches unhandled errors at the root layout level.
 * Must include <html> and <body> since it replaces the root layout on error.
 * Reports the exception to PostHog and renders a friendly fallback.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    try {
      posthog.captureException(error, { digest: error.digest })
    } catch {
      // don't let reporting crash the error page
    }
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#FAFAFA' }}>
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div style={{
            background: '#0D0D0D', width: 40, height: 40, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 24,
          }}>
            <span style={{ color: '#F5A623', fontWeight: 900, fontSize: 20 }}>K</span>
          </div>
          <h1 style={{ color: '#0D0D0D', fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#666', fontSize: 14, margin: '0 0 24px', textAlign: 'center', maxWidth: 360 }}>
            We hit an unexpected error. Our team has been notified. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              background: '#0D0D0D', color: '#FFF', border: 'none',
              borderRadius: 10, padding: '12px 28px', fontSize: 14,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
