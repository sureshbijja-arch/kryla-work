/**
 * lib/observability.ts — Server-side PostHog singleton for exception and event capture.
 *
 * Usage:
 *   captureServerException(err, { route: '/api/...' })
 *   captureServerEvent('admin_alert', { subject: '...' })
 *
 * Safe to call even when POSTHOG_API_KEY is not set — silently no-ops.
 * Never throws; observability must never crash the caller.
 */

import { PostHog } from 'posthog-node'

let _client: PostHog | null = null

function getClient(): PostHog | null {
  const key = process.env.POSTHOG_API_KEY
  if (!key) return null
  if (!_client) {
    _client = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      flushAt: 1,        // flush immediately — critical for serverless (no long-lived process)
      flushInterval: 0,
    })
  }
  return _client
}

export function captureServerException(
  err: unknown,
  context?: Record<string, unknown>,
) {
  try {
    const client = getClient()
    if (!client) return
    const error = err instanceof Error ? err : new Error(String(err))
    client.capture({
      distinctId: 'server',
      event: '$exception',
      properties: {
        $exception_type: error.name,
        $exception_message: error.message,
        $exception_stack_trace_raw: error.stack,
        ...context,
      },
    })
  } catch {
    // never throw from observability
  }
}

export function captureServerEvent(
  event: string,
  properties?: Record<string, unknown>,
  distinctId = 'server',
) {
  try {
    const client = getClient()
    if (!client) return
    client.capture({ distinctId, event, properties })
  } catch {
    // never throw from observability
  }
}
