'use client'

import posthog from 'posthog-js'
import { useEffect } from 'react'

/**
 * app/error.tsx — Catches unhandled errors within the root layout children.
 * Reports to PostHog and renders an inline fallback (doesn't replace the layout).
 */
export default function Error({
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
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-6">
      <div className="w-10 h-10 bg-[#0D0D0D] rounded-lg flex items-center justify-center mb-6">
        <span className="text-[#F5A623] font-black text-xl">K</span>
      </div>
      <h2 className="text-xl font-bold text-[#0D0D0D] mb-2">Something went wrong</h2>
      <p className="text-sm text-[#666] mb-6 text-center max-w-sm">
        We hit an unexpected error. Our team has been notified. Please try again.
      </p>
      <button
        onClick={reset}
        className="bg-[#0D0D0D] text-white rounded-xl px-7 py-3 text-sm font-semibold hover:bg-[#222] transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
