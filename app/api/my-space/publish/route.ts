import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await req.json() as { slug: string }
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id')
    .eq('slug', slug)
    .eq('email', user.email)
    .single()

  if (!provider) return NextResponse.json({ error: 'Not your page' }, { status: 403 })

  revalidatePath(`/${slug}`)
  return NextResponse.json({ ok: true })
}
