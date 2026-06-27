import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { validateSlug, RESERVED_SLUGS } from '@/lib/slug'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')?.toLowerCase().trim()

  if (!slug) {
    return NextResponse.json({ available: false, error: 'No slug provided' }, { status: 400 })
  }

  const validationError = validateSlug(slug)
  if (validationError) {
    return NextResponse.json({ available: false, error: validationError })
  }

  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json({ available: false, error: "That one's taken — try something else" })
  }

  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('providers')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ available: false, error: 'Something went wrong on our end — try again' }, { status: 500 })
    }

    if (data) {
      return NextResponse.json({ available: false, error: "That one's taken — try another" })
    }

    return NextResponse.json({ available: true })
  } catch (err) {
    console.error('[check-slug]', err)
    return NextResponse.json({ available: false, error: 'Something went wrong on our end' }, { status: 500 })
  }
}
