/**
 * POST /api/onboarding
 *
 * Saves the 5 onboarding answers, creates the provider row,
 * then fires the Inngest job to build the page asynchronously.
 * Returns immediately (< 200ms) — never blocks on Claude.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { inngest } from "@/inngest/client"
import { getVertical } from "@/config/verticals"

const schema = z.object({
  persona:  z.string().min(1),
  name:     z.string().min(1).max(100),
  slug:     z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  email:    z.string().email(),
  phone:    z.string().optional(),
  city:     z.string().optional(),
  country:  z.string().optional(),
  plan:     z.enum(["grow", "thrive", "elevate"]).default("grow"),
  answers:  z.record(z.string()),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = schema.parse(body)

    // Validate persona exists
    const vertical = getVertical(data.persona)
    if (!vertical) {
      return NextResponse.json({ error: "Unknown persona" }, { status: 400 })
    }

    // Check slug availability
    const { data: existing } = await supabaseAdmin
      .from("providers")
      .select("id")
      .eq("slug", data.slug)
      .single()

    if (existing) {
      return NextResponse.json({ error: "That name is already taken — try another one" }, { status: 409 })
    }

    // Create provider row
    const { data: provider, error: providerError } = await supabaseAdmin
      .from("providers")
      .insert({
        slug:     data.slug,
        name:     data.name,
        email:    data.email,
        phone:    data.phone ?? null,
        plan:     data.plan,
        plan_status: "pending_payment",
        persona:  data.persona,
        city:     data.city ?? null,
        country:  data.country ?? null,
        verified: false,
        page_live: false,
      })
      .select()
      .single()

    if (providerError || !provider) {
      console.error("[onboarding] Provider insert failed:", providerError)
      return NextResponse.json(
        { error: "Something went wrong on our end — we're on it" },
        { status: 500 }
      )
    }

    // Fire async page build — user never waits on Claude
    await inngest.send({
      name: "kryla/page.build.requested",
      data: {
        providerId: provider.id,
        persona:    data.persona,
        name:       data.name,
        city:       data.city ?? "",
        answers:    data.answers,
      },
    })

    return NextResponse.json({
      success:  true,
      slug:     data.slug,
      profileUrl: `https://${data.slug}.kryla.work`,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 422 })
    }
    console.error("[onboarding] Unexpected error:", err)
    return NextResponse.json(
      { error: "Something went wrong on our end — we're on it" },
      { status: 500 }
    )
  }
}
