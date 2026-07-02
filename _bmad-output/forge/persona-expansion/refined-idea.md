# Refined Idea: Persona Expansion + Custom Persona Pipeline

**Forged:** 2026-06-29  
**Status:** Ready for spec / implementation

---

## What This Is

Two distinct features bundled under one idea:

**Part A — New built-in personas**  
Add advocate, retailer, and any other curated personas to the onboarding grid. Each gets a manually written template (like existing personas). No generation pipeline needed. Straightforward addition to `config/verticals/` and the onboarding Step 1 grid.

**Part B — Custom persona pipeline**  
Member types a free-text persona name in an "other" field during onboarding. Claude generates a custom page template for it. That template is stored globally and reused by all future members who pick the same persona.

---

## Part B — Locked Decisions

### Global catalog
- Custom persona templates are global — once generated, available to all future members who pick that persona.
- Storage: `persona_templates` table in Supabase. Schema needs: `persona_name` (unique, normalised), `template_config` (JSONB), `status` (`generating` | `ready`), `created_at`.

### Generation timing (UX: Option Y)
- Onboarding completes **instantly** — member's page goes live immediately using the **default persona template** (FocusTemplate).
- An Inngest job generates the custom template in the background (~10–30s).
- When complete: `revalidatePath` swaps the default for the custom layout. Member doesn't wait on submit.

### Deduplication
- When Member A's custom persona is `status=generating`, Member B submitting the same persona does **not** trigger a second generation.
- Member B's build-page Inngest job polls / waits for `status=ready`, then uses the already-generated template.

### Member notification
- My Space panel shows an in-app banner: **"Your page is being personalized..."**
- Banner clears when the Inngest job completes and revalidation fires.
- No email, no silent drop — member sees it next time they open My Space.

### Moderation
- Not explicitly gated (no human review queue defined in this forge).
- AI classification or basic string sanitation should be added before launch to block clearly off-brand inputs.
- Out of scope for initial implementation — flag as a follow-up.

---

## What the Flow Looks Like

```
Member onboarding (Step 1)
  └── Picks "other" → types "car detailer"
  
Onboarding submit
  └── API: normalise persona name ("car detailer")
  └── Check persona_templates WHERE persona_name = 'car detailer'
        ├── status = ready   → use stored template → fire build-page with template
        ├── status = generating → enqueue build-page, poll for ready
        └── not found        → insert row (status=generating)
                                → fire generate-persona-template Inngest job
                                → fire build-page with default template (FocusTemplate)
                                
generate-persona-template Inngest job
  └── Call Claude: given persona name, generate template config (sections, layout, copy stubs)
  └── Update persona_templates SET status='ready', template_config=...
  └── Trigger revalidatePath for all pages with this persona
  └── (My Space panel banner clears on next poll)
```

---

## Implementation Scope

### New
- `persona_templates` table (Supabase migration)
- `inngest/generate-persona-template.ts` — Claude generation job
- `app/api/onboarding/route.ts` — check/insert persona_templates before build-page
- My Space panel: `status` field check → banner UI

### Changed
- `app/onboarding/page.tsx` Step 1 — add new built-in personas to grid + "other" free-text input
- `inngest/build-page.ts` — accept template config override from persona_templates
- `app/[slug]/components/MySpacePanel.tsx` — personalisation banner

### Not changed
- Existing persona → template mapping in `config/verticals/` (Part A just adds entries here)
- Booking, auth, email flows — untouched

---

## Risks & Follow-ups

| Risk | Mitigation |
|---|---|
| Abusive/off-brand custom persona names | Add AI classifier or allowlist check before insert — defer to v2 |
| Two members submit same persona simultaneously | `status=generating` row acts as a distributed lock — second member's build-page polls |
| Claude generation failure (timeout/error) | Job retries via Inngest. On final failure: leave default template, clear banner, log error |
| Template quality variance | First-member's input context shapes the template — document this as expected behaviour |

---

## Next Step

Hand off to `bmad-quick-dev` or `bmad-create-epics-and-stories` for implementation planning.
