---
title: 'Persona Expansion + Custom Persona Pipeline'
type: 'feature'
created: '2026-06-29'
status: 'in-review'
baseline_commit: 'NO_VCS'
context:
  - docs/project-context.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Kryla's onboarding grid is fixed at 9 hardcoded personas, leaving professionals like advocates and retailers with no good fit. Members who pick "other" get a generic page with no persona context, and no learning happens for future members with the same niche.

**Approach:** Add advocate and retailer as built-in personas (Part A). Upgrade "other" to accept a free-text custom persona name that triggers an async Claude job to generate a tailored template stored globally in a `persona_templates` Supabase table and applied to the member's page once ready (Part B).

## Boundaries & Constraints

**Always:**
- `providers.persona` stays as text — store `'other'` for custom persona members; custom name goes in a new `custom_persona_name` column
- `persona_templates` row is inserted (status=generating) at submit time, before build-page fires; dedup by normalized persona name (lowercase trimmed)
- build-page always fires immediately using default FocusTemplate for custom personas; generate-persona-template upgrades the page async
- generate-persona-template: on completion, upserts `pages` row with Claude-chosen template/palette, calls `revalidatePath('/{slug}')`, sets status=ready
- Email is non-fatal everywhere; wrap Inngest sends in try/catch
- All DB writes use `supabaseAdmin` (service role)

**Ask First:**
- If a `persona_templates` row for this persona already exists with `status=ready` at submit time — should build-page use the stored template immediately instead of defaulting to focus?

**Never:**
- No human review queue for custom personas in this iteration — no moderation UI, no pending status
- Don't change the existing TEMPLATE_MAP entries for built-in personas
- Don't block onboarding submit while generate-persona-template runs
- Don't add a `persona_templates` status column check to the public profile page

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| New built-in persona | Member picks advocate or retailer | Page built with assigned template/palette; persona stored in providers | Same as existing personas |
| New custom persona | Member picks "other", types "car detailer" | providers row: persona=other, custom_persona_name=car detailer; persona_templates row inserted (status=generating); build fires with FocusTemplate; generate job fires | If Inngest send fails — non-fatal; log and continue |
| Same custom persona (2nd member) | "car detailer" already in persona_templates (generating or ready) | No new row inserted; build fires normally; generate job NOT re-triggered | — |
| generate job completes | persona_templates status=generating | pages row upserted with Claude-chosen template/palette; revalidatePath; status=ready | On Claude failure: retry via Inngest retries; on final failure set status=failed, log |
| Member opens My Space | custom_persona_name set AND persona_templates.status != ready | Banner: "Your page is being personalized…" visible in My Space panel | If API call fails: hide banner silently |

</frozen-after-approval>

## Code Map

- `types/onboarding.ts:1` — Persona union type + PERSONA_LABELS — add advocate, retailer
- `app/onboarding/page.tsx:16` — PERSONAS array — add advocate, retailer; add customPersonaName state + conditional text input when persona=other
- `app/api/onboarding/submit/route.ts` — accept customPersonaName; check/insert persona_templates; fire generate event
- `inngest/build-page.ts:8` — TEMPLATE_MAP + PALETTE_MAP — add advocate, retailer entries
- `lib/inngest.ts` — add GENERATE_PERSONA_EVENT + GeneratePersonaPayload type
- `inngest/generate-persona-template.ts` — NEW: Inngest job; Claude call; upsert pages; revalidatePath; set status=ready
- `app/api/inngest/route.ts` — register generatePersonaFunction
- `app/api/my-space/check-owner/route.ts` — include persona_template_status in response
- `app/[slug]/components/MySpacePanel.tsx:18` — add personaTemplateStatus to OwnerData; render banner in ready state

## Tasks & Acceptance

**Execution:**
- [x] `types/onboarding.ts` -- add `'advocate' | 'retailer'` to Persona union; add labels to PERSONA_LABELS -- type safety for new built-ins
- [x] `app/onboarding/page.tsx` -- add advocate (`⚖️`, `Advocate`) and retailer (`🛍️`, `Retailer`) to PERSONAS array; add `customPersonaName` state; when `answers.persona === 'other'` render text input below the grid; include `customPersonaName` in submit POST body -- Part A grid + Part B input
- [x] `inngest/build-page.ts` -- add `advocate:'focus'` and `retailer:'storefront'` to TEMPLATE_MAP; add `advocate:'professional'` and `retailer:'creative'` to PALETTE_MAP -- correct template assignment for new built-ins
- [x] Supabase migration (SQL) -- `supabase/migrations/20260629_persona_templates.sql` -- global custom persona catalog + custom_persona_name column on providers
- [x] `lib/inngest.ts` -- add `GENERATE_PERSONA_EVENT = 'kryla/persona.template.generate'`; add `GeneratePersonaPayload { personaName: string; providerId: string; slug: string }` -- event contract
- [x] `inngest/generate-persona-template.ts` -- NEW: Inngest function id='generate-persona-template', retries:2; Step 1: Claude call asking which template layout + palette; Step 2: update pages row; Step 3: mark persona_templates ready; Step 4: revalidate via internal API -- async template upgrade
- [x] `app/api/revalidate/route.ts` -- NEW: POST endpoint called by Inngest to trigger ISR revalidatePath; protected by REVALIDATE_SECRET env var
- [x] `app/api/inngest/route.ts` -- import and register generatePersonaFunction alongside buildPageFunction -- Inngest will not pick up the new job otherwise
- [x] `app/api/onboarding/submit/route.ts` -- read `customPersonaName` from body; if `persona==='other'` and customPersonaName provided, normalize (lowercase trim); check `persona_templates` for existing row; if not found: insert with status=generating; fire GENERATE_PERSONA_EVENT (non-fatal try/catch) -- custom persona catalog hydration
- [x] `app/api/my-space/check-owner/route.ts` -- if provider has custom_persona_name, query persona_templates for status; include `personaTemplateStatus: 'generating' | 'ready' | 'failed' | null` in response -- feeds banner
- [x] `app/[slug]/components/MySpacePanel.tsx` -- add `personaTemplateStatus` to OwnerData type; in ready state, if personaTemplateStatus === 'generating' render amber banner above tabs -- Option 3 notification

**Acceptance Criteria:**
- Given onboarding Step 1, when member views the persona grid, then advocate and retailer appear as selectable options
- Given member selects "other", when Step 1 is displayed, then a text input appears asking "What do you do?" with placeholder "e.g. car detailer, crystal healer"
- Given member completes onboarding with a custom persona name, when submit fires, then `providers.custom_persona_name` is set and a `persona_templates` row exists with `status=generating`
- Given two members submit "car detailer" simultaneously, when both submit calls complete, then exactly one `persona_templates` row exists (unique constraint prevents duplicate)
- Given generate-persona-template job completes, when pages row is updated, then visiting the member's profile URL returns the Claude-chosen template (not FocusTemplate)
- Given member opens My Space panel with status=generating, then the amber personalisation banner is visible
- Given generate job completes and member re-opens My Space, then the banner is gone

## Design Notes

**Template selection prompt for generate-persona-template:**
```
You are assigning a page layout for a "${personaName}" professional on Kryla.
Pick the best layout from: focus (personal brand, coaching, teaching), portfolio (creative work, photography, baking), storefront (products, retail, food orders), clinic (appointments, health, consulting).
Respond ONLY with JSON: { "template": "focus|portfolio|storefront|clinic", "palette": "professional|fresh|warm|minimal|creative|calm" }
```

**Dedup via Supabase unique constraint:**  
`INSERT ... ON CONFLICT (persona_name) DO NOTHING` — clean, no race condition handling needed in app code.

**revalidatePath delivery:**  
generate-persona-template step calls `fetch(${NEXT_PUBLIC_APP_URL}/api/revalidate?slug=${slug}&secret=...)` or uses a dedicated internal route — avoids importing Next.js cache APIs inside Inngest worker context.

## Verification

**Manual checks (no CLI):**
- Onboarding Step 1: advocate and retailer tiles visible in grid
- Selecting "other" reveals text input; typing triggers customPersonaName state
- After submit with custom persona: Supabase `persona_templates` has row with `status=generating`; `providers.custom_persona_name` is populated
- After generate job runs: `persona_templates.status='ready'`; member's profile page uses new template
- My Space panel shows amber banner when status=generating; banner absent when status=ready

## Spec Change Log
