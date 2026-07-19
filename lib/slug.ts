export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 30)
}

export function suggestSlug(firstName: string, lastName: string): string {
  return toSlug(firstName + lastName) || toSlug(firstName)
}

export function validateSlug(slug: string): string | null {
  if (!slug) return 'Pick an address for your presence'
  if (slug.length < 3) return 'At least 3 characters'
  if (slug.length > 30) return 'Keep it under 30 characters'
  if (!/^[a-z0-9]+$/.test(slug)) return 'Only lowercase letters and numbers'
  if (/^\d+$/.test(slug)) return 'Include at least one letter'
  return null
}

export const RESERVED_SLUGS = new Set([
  'admin', 'api', 'app', 'auth', 'billing', 'blog', 'checkout',
  'community', 'contact', 'dashboard', 'directory', 'docs', 'help', 'home',
  'join', 'kryla', 'login', 'logout', 'me', 'new', 'onboarding',
  'pricing', 'privacy', 'settings', 'signup', 'static', 'support',
  'terms', 'v1', 'v2', 'www',
])
