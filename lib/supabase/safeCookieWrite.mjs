// Wraps a cookie write (set/remove) so a throw never propagates.
//
// Why: in a Next.js Server Component, `cookies()` returns a read-only store —
// calling `.set()`/`.remove()` on it throws "Cookies can only be modified in
// a Server Action or Route Handler." @supabase/ssr's auth-js calls the
// cookie adapter's set/remove internally when it refreshes or clears a
// session (e.g. after an invalid refresh token), from inside an async
// promise chain. An uncaught throw there becomes an unhandled promise
// rejection, which crashes the whole Node.js serverless process instead of
// being caught by React's error boundary. Middleware is the only place in
// this app that can actually persist a refreshed session; Server Component
// writes are expected to be no-ops.
export function safeCookieWrite(write) {
  try {
    write()
  } catch {
    // Expected in Server Components — middleware owns writing the session.
  }
}
