/**
 * Computed default search title/description for a member's public page.
 * Used both by the live page render (app/[slug]/page.tsx) and by the
 * "Get Found" SEO editor (app/api/mychat/seo/route.ts, GetFoundTab) so the
 * editor's preview of "what you get if you don't customize" is always
 * byte-identical to what actually ships on the public page.
 */

export interface DefaultSeoInput {
  firstName: string
  lastName: string
  persona: string
  location: string
}

export function defaultSeoTitle(provider: DefaultSeoInput): string {
  return `${provider.firstName} ${provider.lastName} — ${provider.persona} in ${provider.location}`
}

export function defaultSeoDescription(provider: Pick<DefaultSeoInput, 'firstName'>): string {
  return `Book ${provider.firstName} on Kryla`
}
