export function normalizeHandle(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    if (url.hostname.includes('instagram.com')) {
      const username = url.pathname.replace(/^\//, '').split('/')[0]
      return username || null
    }
  } catch { /* not a URL */ }
  return trimmed.replace(/^@/, '') || null
}

export function normalizeNextdoorUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    if (!url.hostname.endsWith('nextdoor.com')) return null
    return url.href
  } catch {
    return null
  }
}
