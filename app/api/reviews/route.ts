import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Public GET — published reviews for a provider
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select('id, author_name, rating, body, created_at')
    .eq('provider_id', providerId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reviews: data ?? [] })
}

// Public POST — submit a new review
export async function POST(req: Request) {
  const body = await req.json()
  const { providerId, authorName, rating, reviewBody } = body

  if (!providerId || !authorName || !rating) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 422 })
  }

  // Pending by default — the member approves from ReviewsTab before it
  // goes live. Previously inserted as 'published' with no auth, rate
  // limit, or moderation at all.
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .insert({
      provider_id: providerId,
      author_name: authorName,
      rating,
      body:        reviewBody ?? null,
      status:      'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ review: data })
}
