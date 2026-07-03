import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getPlanGate } from '@/lib/plans'

async function assertOwner(providerId: string, userEmail: string) {
  const { data } = await supabaseAdmin
    .from('providers')
    .select('id')
    .eq('id', providerId)
    .eq('email', userEmail)
    .maybeSingle()
  return !!data
}

function normalizeDomain(raw: string): string | null {
  const cleaned = raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '')
  if (!cleaned || cleaned.length < 3 || !cleaned.includes('.')) return null
  // basic hostname validation — no paths, no ports
  if (/[/:#?@]/.test(cleaned)) return null
  return cleaned
}

// POST — save or update custom domain
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId, domain: rawDomain } = body

  if (!providerId || !rawDomain) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const ok = await assertOwner(providerId, user.email)
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Enforce plan gate — custom_domain feature_key must be allowed by the member's plan
  const { data: prov } = await supabaseAdmin.from('providers').select('plan').eq('id', providerId).single()
  const gate = await getPlanGate()
  if (!gate.allows('custom_domain', prov?.plan ?? 'grow'))
    return NextResponse.json({ error: 'Custom domains are available on the Thrive plan and above' }, { status: 403 })

  const domain = normalizeDomain(rawDomain)
  if (!domain) return NextResponse.json({ error: 'Invalid domain — enter something like priya.com' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('providers')
    .update({ custom_domain: domain })
    .eq('id', providerId)

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'That domain is already connected to another account' }, { status: 409 })
    console.error('[custom-domain] update error:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  // Optionally register with Vercel API (non-fatal if env vars not set)
  const vercelToken   = process.env.VERCEL_API_TOKEN
  const vercelProject = process.env.VERCEL_PROJECT_ID
  const vercelTeam    = process.env.VERCEL_TEAM_ID
  if (vercelToken && vercelProject) {
    try {
      const teamParam = vercelTeam ? `&teamId=${vercelTeam}` : ''
      await fetch(`https://api.vercel.com/v9/projects/${vercelProject}/domains${teamParam ? `?${teamParam.slice(1)}` : ''}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: domain }),
      })
    } catch {
      // non-fatal — DNS instructions are shown regardless
    }
  }

  return NextResponse.json({ ok: true, domain })
}

// DELETE — remove custom domain
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId } = body
  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const ok = await assertOwner(providerId, user.email)
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: existing } = await supabaseAdmin
    .from('providers')
    .select('custom_domain')
    .eq('id', providerId)
    .single()

  await supabaseAdmin
    .from('providers')
    .update({ custom_domain: null })
    .eq('id', providerId)

  // Optionally remove from Vercel (non-fatal)
  const vercelToken   = process.env.VERCEL_API_TOKEN
  const vercelProject = process.env.VERCEL_PROJECT_ID
  const vercelTeam    = process.env.VERCEL_TEAM_ID
  if (vercelToken && vercelProject && existing?.custom_domain) {
    try {
      const teamParam = vercelTeam ? `?teamId=${vercelTeam}` : ''
      await fetch(
        `https://api.vercel.com/v9/projects/${vercelProject}/domains/${existing.custom_domain}${teamParam}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${vercelToken}` } }
      )
    } catch {
      // non-fatal
    }
  }

  return NextResponse.json({ ok: true })
}
