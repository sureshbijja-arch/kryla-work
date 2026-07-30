import { describe, it, expect, vi } from 'vitest'

const updateCalls: any[] = []
vi.mock('@/lib/supabase/server', () => ({
  createRouteClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: { email: 'owner@example.com' } } }) },
  }),
}))
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({ eq: () => ({ eq: () => ({ single: () =>
        Promise.resolve({ data: { id: 'p1', plan: 'sprout' }, error: null }) }),
        maybeSingle: () => Promise.resolve({ data: { draft_data: {} }, error: null }) }) }),
      update: (payload: any) => { updateCalls.push({ table, payload }); return { eq: () => Promise.resolve({ error: null }) } },
    }),
  },
}))

import { POST } from './route'
import { NextRequest } from 'next/server'

function req(body: object) {
  return new NextRequest('http://localhost/api/mychat/layout', {
    method: 'POST', body: JSON.stringify(body),
  })
}

describe('POST /api/mychat/layout — palette_tokens + signature_color', () => {
  it('writes paletteTokens and signatureColor onto draft_data.pages', async () => {
    updateCalls.length = 0
    const tokens = { accent: '#7B4B3A', accentSurface: '#7B4B3A0d', accentBorder: '#7B4B3A26', accentGlow: '#7B4B3A40', signature: '#C9A56A' }
    const res = await POST(req({
      slug: 'aanya', template: 'storefront', palette: 'minimal', font: 'inter',
      paletteTokens: tokens, signatureColor: '#C9A56A',
    }))
    expect(res.status).toBe(200)
    const draft = updateCalls[0].payload.draft_data
    expect(draft.pages.palette_tokens).toEqual(tokens)
    expect(draft.pages.signature_color).toBe('#C9A56A')
  })

  it('clears both fields on resetColors', async () => {
    updateCalls.length = 0
    const res = await POST(req({
      slug: 'aanya', template: 'storefront', palette: 'minimal', font: 'inter',
      resetColors: true,
    }))
    expect(res.status).toBe(200)
    const draft = updateCalls[0].payload.draft_data
    expect(draft.pages.palette_tokens).toBeNull()
    expect(draft.pages.signature_color).toBeNull()
  })
})
