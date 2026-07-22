import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function getAuthedProvider(providerId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null

  const { data } = await supabaseAdmin
    .from('providers')
    .select('id')
    .eq('id', providerId)
    .eq('email', user.email)
    .maybeSingle()
  return data ?? null
}

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth:   z.string().min(1),
  }),
})

const postSchema = z.object({
  providerId:   z.string().uuid(),
  subscription: subscriptionSchema,
})

// POST — save (or refresh) a push subscription for the signed-in member
export async function POST(req: NextRequest) {
  let parsed: z.infer<typeof postSchema>
  try { parsed = postSchema.parse(await req.json()) }
  catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 422 })
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const provider = await getAuthedProvider(parsed.providerId)
  if (!provider) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabaseAdmin
    .from('push_subscriptions')
    .upsert({
      provider_id: parsed.providerId,
      endpoint:    parsed.subscription.endpoint,
      p256dh:      parsed.subscription.keys.p256dh,
      auth:        parsed.subscription.keys.auth,
      user_agent:  req.headers.get('user-agent') ?? null,
    }, { onConflict: 'endpoint' })

  if (error) {
    console.error('[push-subscribe] upsert error:', error)
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

const deleteSchema = z.object({
  providerId: z.string().uuid(),
  endpoint:   z.string().url(),
})

// DELETE — remove a subscription (member turns off alerts, or unsubscribes)
export async function DELETE(req: NextRequest) {
  let parsed: z.infer<typeof deleteSchema>
  try { parsed = deleteSchema.parse(await req.json()) }
  catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 422 })
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const provider = await getAuthedProvider(parsed.providerId)
  if (!provider) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await supabaseAdmin
    .from('push_subscriptions')
    .delete()
    .eq('provider_id', parsed.providerId)
    .eq('endpoint', parsed.endpoint)

  return NextResponse.json({ ok: true })
}
