import { Inngest } from 'inngest'

export const inngest = new Inngest({ id: 'kryla' })

export interface BuildPageJobPayload {
  providerId: string
  slug: string
  persona: string
  firstName: string
  lastName: string
  tagline: string
  location: string
  plan: string
}

export const BUILD_PAGE_EVENT = 'kryla/page.build.requested'
