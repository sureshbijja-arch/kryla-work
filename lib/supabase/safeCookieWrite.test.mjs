// Unit test for safeCookieWrite — run with: node --test lib/supabase/safeCookieWrite.test.mjs
//
// Regression coverage for the production crash on /{slug}/mykryla: auth-js
// tries to clear a stale/invalid session by calling the cookie adapter's
// set/remove. In a Server Component, Next's cookies() store throws
// "Cookies can only be modified in a Server Action or Route Handler" on any
// write. That throw happened inside auth-js's internal refresh-token promise
// chain, so it became an unhandled rejection and crashed the whole
// serverless process instead of being caught by React's error boundary.
//
// safeCookieWrite() is the fix: it must never let a write throw past it.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeCookieWrite } from './safeCookieWrite.mjs'

test('calls the write function and returns normally when it succeeds', () => {
  let called = false
  safeCookieWrite(() => { called = true })
  assert.equal(called, true)
})

test('swallows a throw instead of propagating it (read-only Server Component cookies())', () => {
  const readOnlyCookieStore = {
    set() {
      throw new Error('Cookies can only be modified in a Server Action or Route Handler.')
    },
  }

  // Must not throw.
  assert.doesNotThrow(() => {
    safeCookieWrite(() => readOnlyCookieStore.set('sb-auth-token', 'value'))
  })
})

test('swallows a throw from remove() the same way as set()', () => {
  const readOnlyCookieStore = {
    remove() {
      throw new Error('Cookies can only be modified in a Server Action or Route Handler.')
    },
  }

  assert.doesNotThrow(() => {
    safeCookieWrite(() => readOnlyCookieStore.remove('sb-auth-token'))
  })
})
