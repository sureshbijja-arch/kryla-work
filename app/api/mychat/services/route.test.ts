import { describe, it, expect } from 'vitest'

const updateCalls: any[] = []
vi.mock('@/lib/supabase/server', () => ({
  createRouteClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: { email: 'owner@example.com' } } }) },
  }),
}))
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({ eq: () => ({
        single: () => Promise.resolve({ data: { id: 'p1', email: 'owner@example.com' }, error: null }),
        maybeSingle: () => Promise.resolve({ data: { draft_data: {} }, error: null }),
      }) }),
      update: (payload: any) => { updateCalls.push({ table, payload }); return { eq: () => Promise.resolve({ error: null }) } },
    }),
  },
}))

import { POST } from './route'
import { NextRequest } from 'next/server'
import { vi } from 'vitest'

function req(body: object) {
  return new NextRequest('http://localhost/api/mychat/services', {
    method: 'POST', body: JSON.stringify(body),
  })
}

describe('POST /api/mychat/services — idol→variants validation', () => {
  it('accepts services with no variants key (legacy flat rows, 45 other personas)', async () => {
    updateCalls.length = 0
    const res = await POST(req({
      providerId: 'p1',
      services: [{ name: 'Balayage', description: '', duration_or_unit: '2 hrs', price: '₹4,500' }],
    }))
    expect(res.status).toBe(200)
  })

  it('accepts well-formed variants (sellganeshidols idol catalogue)', async () => {
    updateCalls.length = 0
    const res = await POST(req({
      providerId: 'p1',
      services: [{
        name: 'Natural Shadu Ganesh', description: '', duration_or_unit: null,
        variants: [
          { size: '1 ft', price: '₹3,000' },
          { size: '2 ft', price: '₹5,500', compareAtPrice: '₹6,000', includes: ['Clay base', 'Colours'] },
        ],
      }],
    }))
    expect(res.status).toBe(200)
    const draft = updateCalls[0].payload.draft_data
    expect(draft.pages.services[0].variants).toHaveLength(2)
  })

  it('rejects a variant missing "price"', async () => {
    const res = await POST(req({
      providerId: 'p1',
      services: [{ name: 'Idol', description: '', duration_or_unit: null, variants: [{ size: '1 ft' }] }],
    }))
    expect(res.status).toBe(400)
  })

  it('rejects a variant whose "includes" contains a non-string', async () => {
    const res = await POST(req({
      providerId: 'p1',
      services: [{
        name: 'Idol', description: '', duration_or_unit: null,
        variants: [{ size: '1 ft', price: '₹3,000', includes: ['ok', 42] }],
      }],
    }))
    expect(res.status).toBe(400)
  })

  it('rejects when variants is not an array', async () => {
    const res = await POST(req({
      providerId: 'p1',
      services: [{ name: 'Idol', description: '', duration_or_unit: null, variants: 'not an array' }],
    }))
    expect(res.status).toBe(400)
  })

  it('accepts null variants (explicit clear)', async () => {
    updateCalls.length = 0
    const res = await POST(req({
      providerId: 'p1',
      services: [{ name: 'Idol', description: '', duration_or_unit: '1 ft', price: '₹3,000', variants: null }],
    }))
    expect(res.status).toBe(200)
  })

  it('still rejects the pre-existing invalid-payload case (services not an array)', async () => {
    const res = await POST(req({ providerId: 'p1', services: 'nope' }))
    expect(res.status).toBe(400)
  })
})
