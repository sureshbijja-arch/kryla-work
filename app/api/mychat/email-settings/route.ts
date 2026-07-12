/**
 * app/api/mychat/email-settings/route.ts
 *
 * Upserts the provider_email row (enable/disable the email inbox).
 * On first enable, derives the address from the provider's slug.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  providerId: z.string().uuid(),
  enabled:    z.boolean(),
})

export async function POST(req: NextRequest) {
  // Auth guard
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let parsed: z.infer<typeof schema>
  try {
    parsed = schema.parse(await req.json())
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 422 })
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Verify caller owns this provider and get the slug
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, slug')
    .eq('id', parsed.providerId)
    .eq('email', user.email)
    .maybeSingle()

  if (!provider) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const address = `${provider.slug}@kryla.work`

  // Upsert: create the row on first enable, or toggle enabled on subsequent calls
  const { error } = await supabaseAdmin
    .from('provider_email')
    .upsert(
      { provider_id: parsed.providerId, address, enabled: parsed.enabled },
      { onConflict: 'provider_id' }
    )

  if (error) {
    console.error('[email-settings] upsert error:', error.message)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, address })
}
