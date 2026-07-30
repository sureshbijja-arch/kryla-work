import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: () => ({
      select: (cols: string) => {
        (globalThis as any).__lastSelect = cols
        return {
          in: () => ({ eq: () => ({ order: () => ({ order: () =>
            Promise.resolve({ data: [], error: null }) }) }) }),
        }
      },
    }),
  },
}))

import { GET } from './route'
import { NextRequest } from 'next/server'

describe('GET /api/mychat/layouts', () => {
  it('selects palette_tokens and the curated color columns', async () => {
    await GET(new NextRequest('http://localhost/api/mychat/layouts?persona=salon'))
    const cols = (globalThis as any).__lastSelect as string
    expect(cols).toContain('palette_tokens')
    expect(cols).toContain('page_bg')
    expect(cols).toContain('surface')
    expect(cols).toContain('border_color')
    expect(cols).toContain('design_mode')
  })
})
