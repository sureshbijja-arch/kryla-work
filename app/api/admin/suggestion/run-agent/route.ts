import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

const ADMIN_EMAILS = (process.env.ADMIN_EMAIL ?? '').split(',').map(e => e.trim()).filter(Boolean)

async function assertAdmin(): Promise<{ email: string } | NextResponse> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ADMIN_EMAILS.includes(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return { email: user.email }
}

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (auth instanceof NextResponse) return auth

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { data: suggestion } = await supabaseAdmin
    .from('suggestions')
    .select('id, suggestion_id, description')
    .eq('id', id)
    .single()

  if (!suggestion) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `You are a product engineer at Kryla.work — a platform that helps independent service providers (tutors, bakers, photographers, trainers, salon owners, chefs, doctors, musicians) create a professional public web page in minutes.

A member submitted this feature suggestion:
"${suggestion.description}"

Respond ONLY with a JSON object (no markdown, no extra text):
{
  "feasibility": "Easy | Medium | Hard | Not feasible",
  "effort": "Hours | Days | Weeks",
  "recommendation": "Auto-implement | Needs review | Backlog | Decline",
  "summary": "2-3 sentence plain-English implementation approach",
  "dependencies": "any blockers or prior work required, or null if none"
}`,
    }],
  })

  const raw = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  let analysis: Record<string, unknown>
  try {
    analysis = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
  } catch {
    return NextResponse.json({ error: 'Agent returned invalid response' }, { status: 500 })
  }

  const comment = [
    `[Agent] ${analysis.feasibility} · ${analysis.effort} · ${analysis.recommendation}`,
    analysis.summary as string,
    analysis.dependencies ? `Dependencies: ${analysis.dependencies}` : null,
  ].filter(Boolean).join('\n')

  const { data, error } = await supabaseAdmin
    .from('suggestions')
    .update({
      comments: comment,
      status: 'in_review',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, suggestion_id, description, created_at, status, comments, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ suggestion: data })
}
