/**
 * POST /api/mychat/working
 *
 * Physio Working Studio — AI clinical documentation endpoint.
 *
 * Modes (primary):
 *   'assess'   — generate initial evaluation note from structured assessment data
 *   'note'     — generate SOAP progress note from session bullet-points
 *   'plan'     — generate treatment/care plan from assessment findings
 *   'hep'      — generate patient-facing HEP handout from exercise list
 *   'report'   — generate clinical report (referral, discharge, insurance, etc.)
 *   'review'   — analyse pasted document for completeness / medico-legal risks
 *   'refine'   — rewrite / improve existing document per instruction (with redline)
 *
 * Editor actions (bubble menu / slash commands):
 *   'continue'          — continue writing from cursor (SSE stream)
 *   'rewrite'           — rewrite selected text, same clinical meaning
 *   'simplify'          — rewrite in patient-friendly plain English
 *   'explain'           — explain the selected clinical text
 *   'brainstorm'        — generate treatment ideas / exercise progressions (SSE stream)
 *   'suggest_exercises' — suggest missing exercises as JSON array
 *   'completeness_check'— check document for clinical completeness (JSON array)
 *
 * Streaming: 'continue' and 'brainstorm' return SSE (text/event-stream).
 * All others return { message: string } JSON.
 *
 * Gated: feature_key 'working' (Thrive+ in /admin/plans).
 * Rate-limited: WORKING_DAILY_LIMIT calls/day per member (default 20).
 */

import { createClient }              from '@/lib/supabase/server'
import { supabaseAdmin }             from '@/lib/supabase/admin'
import { getPlanGate }               from '@/lib/plans'
import { buildClinicalSystemPrompt, buildCompletenessCheckPrompt } from '@/lib/researchPrompt'
import { getVertical }               from '@/config/verticals'
import Anthropic                     from '@anthropic-ai/sdk'
import { NextResponse }              from 'next/server'

const anthropic   = new Anthropic({ maxRetries: 2 })
const DAILY_LIMIT = parseInt(process.env.WORKING_DAILY_LIMIT ?? '20', 10)

export const maxDuration = 60

// SSE-streaming actions
const STREAMING_ACTIONS = new Set(['continue', 'brainstorm'])

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    providerId,
    mode,             // primary: 'assess' | 'note' | 'plan' | 'hep' | 'report' | 'review' | 'refine'
    action,           // editor: 'continue' | 'rewrite' | 'simplify' | 'explain' | 'brainstorm' | 'suggest_exercises' | 'completeness_check'
    // Assess mode
    subjectiveData,   // { chiefComplaint, painScore, onset, aggravating, easing, pastHistory, medications }
    objectiveData,    // { observation, romFindings, strengthFindings, specialTests, palpation, posture }
    bodyChart,        // serialised body-chart pain markers
    redFlags,         // string — comma-separated red-flag checklist results
    // Note mode
    sessionBullets,   // plain-text bullet list of session events
    patientContext,   // { name, diagnosis, treatmentGoals, lastSessionSummary }
    // Plan mode
    assessmentSummary,// free text — assessment findings to base the plan on
    // HEP mode
    exercises,        // array of { name, sets, reps, hold, duration, frequency, cues }
    hepInstructions,  // general HEP instructions / precautions
    // Report mode
    reportType,       // 'referral_letter' | 'discharge_summary' | 'progress_report' | 'insurance_report' | 'return_to_work_certificate'
    reportLabel,      // display label of the report type
    reportFields,     // Record<string, string> — field answers from the template
    // Refine / Review / Editor actions
    docBody,          // current document HTML
    instruction,      // refine instruction
    selectedHtml,     // selected text for bubble menu actions
    docTypeHint,      // document type context for suggest_exercises / completeness_check
  } = body as {
    providerId:        string
    mode?:             string
    action?:           string
    subjectiveData?:   Record<string, string>
    objectiveData?:    Record<string, string>
    bodyChart?:        string
    redFlags?:         string
    sessionBullets?:   string
    patientContext?:   Record<string, string>
    assessmentSummary?: string
    exercises?:        Array<Record<string, string>>
    hepInstructions?:  string
    reportType?:       string
    reportLabel?:      string
    reportFields?:     Record<string, string>
    docBody?:          string
    instruction?:      string
    selectedHtml?:     string
    docTypeHint?:      string
  }

  const effectiveMode = mode ?? action ?? ''

  if (!providerId || !effectiveMode) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // ── Ownership ─────────────────────────────────────────────────────────────
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, email, first_name, persona, location, plan')
    .eq('id', providerId)
    .eq('email', user.email)
    .single()

  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  if (provider.persona !== 'physio') {
    return NextResponse.json({ error: 'Working Studio is for the physio persona only.' }, { status: 403 })
  }

  // ── Plan gate ─────────────────────────────────────────────────────────────
  const gate = await getPlanGate()
  if (!gate.allows('working', provider.plan ?? 'grow')) {
    return NextResponse.json({
      message: 'The Working Studio is available on the Thrive plan and above. Upgrade in My Plan to unlock it.',
    })
  }

  // ── Daily rate limit ──────────────────────────────────────────────────────
  const dayKey = new Date().toISOString().split('T')[0]
  const { data: usageRow } = await supabaseAdmin
    .from('working_usage')
    .select('count')
    .eq('provider_id', providerId)
    .eq('day_key', dayKey)
    .maybeSingle()

  if ((usageRow?.count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json({
      message: `You've used all ${DAILY_LIMIT} Working Studio generations for today. They reset at midnight UTC.`,
    })
  }

  // ── Build system prompt ───────────────────────────────────────────────────
  const vertical     = getVertical('physio')
  const systemPrompt = effectiveMode === 'completeness_check'
    ? buildCompletenessCheckPrompt()
    : buildClinicalSystemPrompt({
        name:            provider.first_name ?? 'there',
        persona:         'physio',
        location:        provider.location ?? '',
        workingGuidance: vertical?.workingGuidance ?? '',
        mode:            effectiveMode,
      })

  // ── Build user message ────────────────────────────────────────────────────
  let userMessage = ''

  switch (effectiveMode) {

    // ── Primary modes ─────────────────────────────────────────────────────────

    case 'assess': {
      if (!subjectiveData && !objectiveData) {
        return NextResponse.json({ error: 'Missing assessment data' }, { status: 400 })
      }
      const subj = Object.entries(subjectiveData ?? {})
        .filter(([, v]) => v?.trim())
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n') || 'Not provided'
      const obj = Object.entries(objectiveData ?? {})
        .filter(([, v]) => v?.trim())
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n') || 'Not provided'

      userMessage = `MODE: ASSESS

SUBJECTIVE FINDINGS:
${subj}

OBJECTIVE FINDINGS:
${obj}

BODY CHART:
${bodyChart?.trim() || 'Not provided'}

RED-FLAG SCREENING:
${redFlags?.trim() || 'All red flags negative / not assessed'}

Please generate a structured initial physiotherapy evaluation note. Include: subjective summary, objective findings, body chart interpretation, red-flag screening summary, clinical impression, and recommended next steps. Flag any red flags with [RED FLAG — ASSESS URGENTLY]. Return as valid HTML (use <h1>–<h3>, <p>, <strong>, <ul>/<li>) — no markdown.`
      break
    }

    case 'note': {
      if (!sessionBullets?.trim()) {
        return NextResponse.json({ error: 'Missing session data for note mode' }, { status: 400 })
      }
      const ctx = patientContext
        ? `Patient: ${patientContext.name ?? 'N/A'}
Diagnosis: ${patientContext.diagnosis ?? 'N/A'}
Treatment goals: ${patientContext.treatmentGoals ?? 'N/A'}
Last session: ${patientContext.lastSessionSummary ?? 'N/A'}`
        : 'No prior patient context provided'

      userMessage = `MODE: NOTE

PATIENT CONTEXT:
${ctx}

SESSION NOTES (bullet points):
${sessionBullets}

Please generate a complete SOAP progress note (Subjective / Objective / Assessment / Plan) from the session data above. Reference the treatment goals in the Assessment section if available. Flag any new red flags. Return as valid HTML (use <h1>–<h3>, <p>, <strong>, <ul>/<li>) — no markdown.`
      break
    }

    case 'plan': {
      if (!assessmentSummary?.trim()) {
        return NextResponse.json({ error: 'Missing assessment summary for plan mode' }, { status: 400 })
      }
      userMessage = `MODE: PLAN

ASSESSMENT FINDINGS:
${assessmentSummary}

Please generate a structured physiotherapy treatment / care plan. Include: working diagnosis, SMART short-term goals (4–6 weeks), SMART long-term goals, proposed modalities and techniques, treatment frequency/duration, phased progression with criteria for advancement, outcome measures to track, and HEP summary. Return as valid HTML (use <h1>–<h3>, <p>, <strong>, <ul>/<li>, <ol>) — no markdown.`
      break
    }

    case 'hep': {
      if (!exercises?.length) {
        return NextResponse.json({ error: 'No exercises provided for HEP mode' }, { status: 400 })
      }
      const exerciseList = exercises.map((ex, i) => {
        const parts = [
          ex.name,
          ex.sets ? `Sets: ${ex.sets}` : '',
          ex.reps ? `Reps: ${ex.reps}` : '',
          ex.hold ? `Hold: ${ex.hold}s` : '',
          ex.duration ? `Duration: ${ex.duration}` : '',
          ex.frequency ? `Frequency: ${ex.frequency}` : '',
          ex.cues ? `Instructions: ${ex.cues}` : '',
        ].filter(Boolean)
        return `${i + 1}. ${parts.join(' | ')}`
      }).join('\n')

      userMessage = `MODE: HEP

EXERCISES:
${exerciseList}

GENERAL INSTRUCTIONS / PRECAUTIONS:
${hepInstructions?.trim() || 'Perform the exercises as prescribed. Stop if you experience sharp or worsening pain.'}

Please generate a clear, patient-friendly Home Exercise Program handout. Format: title, introduction paragraph, numbered exercise list (bold name, clear steps, sets/reps/hold/frequency), safety disclaimer at the end. Use plain English. Return as valid HTML — no markdown.`
      break
    }

    case 'report': {
      if (!reportType || !reportFields) {
        return NextResponse.json({ error: 'Missing reportType or fields for report mode' }, { status: 400 })
      }
      const fieldsText = Object.entries(reportFields)
        .filter(([, v]) => v?.trim())
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n')

      userMessage = `MODE: REPORT
Report type: ${reportLabel ?? reportType}

INFORMATION PROVIDED:
${fieldsText}

Please generate a complete, professional ${reportLabel ?? reportType}. Use correct clinical report formatting (formal letterhead-ready structure, clear sections, professional language). Return as valid HTML — no markdown.`
      break
    }

    case 'review': {
      if (!docBody?.trim()) {
        return NextResponse.json({ error: 'Missing document content for review mode' }, { status: 400 })
      }
      userMessage = `MODE: REVIEW
Please analyse the following physiotherapy clinical document for: completeness, missing objective findings, unaddressed goals, inconsistencies, red-flag documentation, and medico-legal risks. Present findings clearly.

---
${docBody}
---`
      break
    }

    case 'refine': {
      if (!docBody?.trim() || !instruction?.trim()) {
        return NextResponse.json({ error: 'Missing docBody or instruction for refine mode' }, { status: 400 })
      }
      userMessage = `MODE: REFINE
Instruction: ${instruction}

Current document:
---
${docBody}
---

Please apply the instruction and return the complete revised document as valid HTML — no markdown.`
      break
    }

    // ── Editor actions ─────────────────────────────────────────────────────────

    case 'continue': {
      const context = docBody ?? selectedHtml ?? ''
      userMessage = `MODE: CONTINUE
Continue writing the following clinical document from where it ends. Maintain the same clinical style, tone, and formatting. Return only the continuation (no repeated content) as valid HTML.

Current document:
---
${context}
---`
      break
    }

    case 'rewrite': {
      const text = selectedHtml ?? docBody ?? ''
      userMessage = `MODE: REWRITE
Rewrite the following clinical text while preserving its meaning and clinical accuracy. Improve clarity and flow. Return ONLY the rewritten text as a valid HTML fragment — no preamble.

Text:
---
${text}
---`
      break
    }

    case 'simplify': {
      const text = selectedHtml ?? docBody ?? ''
      userMessage = `MODE: SIMPLIFY
Rewrite the following clinical text in plain, patient-friendly English. Preserve all clinical facts and instructions. Return ONLY the simplified text as a valid HTML fragment — no preamble.

Text:
---
${text}
---`
      break
    }

    case 'explain': {
      const text = selectedHtml ?? docBody ?? ''
      userMessage = `MODE: EXPLAIN
Explain what the following clinical text means in plain terms: (a) what it describes, (b) why it is clinically relevant, (c) any implications for the patient's management. Return as HTML with <p> and <ul>/<li>.

Text:
---
${text}
---`
      break
    }

    case 'brainstorm': {
      const context = docBody ?? selectedHtml ?? ''
      userMessage = `MODE: BRAINSTORM
Based on the following clinical context, suggest treatment approaches, exercise progressions, outcome measures, or management strategies the physiotherapist might consider. Be evidence-informed and specific. Return as HTML with <p> and <ul>/<li>.

Context:
---
${context}
---`
      break
    }

    case 'suggest_exercises': {
      const docContent = docBody ?? ''
      userMessage = `MODE: SUGGEST_EXERCISES
Document type / clinical context: ${docTypeHint ?? 'general physiotherapy'}

Analyse the following document and suggest exercises that appear to be missing from the home exercise program or that would logically progress the patient's rehabilitation. Consider the condition, current exercises, and treatment phase.

Current document:
---
${docContent}
---

Return ONLY a valid JSON array. Each item: {"category":"...","name":"...","reason":"..."} — no markdown, no explanation.`
      break
    }

    case 'completeness_check': {
      userMessage = `Analyse the following physiotherapy clinical document for completeness issues:

---
${docBody ?? ''}
---`
      break
    }

    default:
      return NextResponse.json({ error: 'Invalid mode/action' }, { status: 400 })
  }

  // ── Anthropic call ────────────────────────────────────────────────────────
  const incrementUsage = () => {
    supabaseAdmin
      .from('working_usage')
      .upsert(
        { provider_id: providerId, day_key: dayKey, count: (usageRow?.count ?? 0) + 1 },
        { onConflict: 'provider_id,day_key' },
      )
      .then(() => {/* fire-and-forget */})
  }

  // SSE streaming
  if (STREAMING_ACTIONS.has(effectiveMode)) {
    const stream = anthropic.messages.stream({
      model:      'claude-sonnet-4-6',
      max_tokens: 4096,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userMessage }],
    })

    const encoder  = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ token: chunk.delta.text })}\n\n`)
              )
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch {
          controller.enqueue(encoder.encode('data: [ERROR]\n\n'))
        } finally {
          controller.close()
          incrementUsage()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
      },
    })
  }

  // Non-streaming
  try {
    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 4096,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userMessage }],
    })

    const message = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim()

    incrementUsage()
    return NextResponse.json({ message })
  } catch (err) {
    console.error('[working] Anthropic call failed:', err)
    return NextResponse.json(
      { error: 'Generation failed — please try again.', message: 'Generation failed — please try again.' },
      { status: 502 },
    )
  }
}
