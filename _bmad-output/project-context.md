---
project_name: 'kryla.work'
user_name: 'Prath'
date: '2026-06-28'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
rule_count: 52
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code for kryla.work. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- Next.js 14.2.3 (App Router — not Pages Router)
- React 18, TypeScript 5 (strict mode)
- Tailwind CSS 3
- @supabase/supabase-js ^2, @supabase/ssr ^0.3
- @anthropic-ai/sdk ^0.24.3 — model: `claude-sonnet-4-6`, max_tokens: 2000
- inngest ^3.54.2 — event: `'kryla/page.build.requested'`
- stripe ^15, resend ^3, zod ^3
- Node 20+, path alias `@/*` → `./`

---

## Critical Implementation Rules

### Language-Specific Rules

- `strict: true` — no implicit any, no loose nulls
- All DB row shapes live in `types/index.ts` — never inline ad-hoc interfaces for DB types
- `types/onboarding.ts` owns onboarding-specific types (OnboardingAnswers, Persona, Plan, Region)
- Path alias `@/*` maps to `./` — always use `@/lib/...`, `@/types/...`, never relative `../../`
- `moduleResolution: bundler` — do not use CommonJS `require()`
- Named exports everywhere — no default exports except Next.js page components
- Server-only imports (Supabase admin, Inngest server) must never be imported in `'use client'` files
- API routes return `NextResponse.json({ error: '...' }, { status: N })` — never throw unhandled
- Postgres error codes to handle: `23505` (unique), `23502` (not-null), `23503` (FK)
- Non-fatal steps (answers insert, Inngest send) wrapped in try/catch — log, don't rethrow
- `page_live` may be boolean `true` or string `'true'` — always check both: `=== true || === 'true'`

### Framework-Specific Rules

**Next.js App Router**
- Add `'use client'` only when using hooks, browser APIs, or event handlers — all others are Server Components by default
- API routes live in `app/api/**/route.ts` — export named async functions `GET`, `POST`, etc.
- Middleware (`middleware.ts`) rewrites subdomains: `priya.kryla.work` → `/priya` — never break the matcher
- `next.config.js` has `serverActions.allowedOrigins` for `*.kryla.work` — required for cross-subdomain Server Actions

**Supabase Client — use the right client for the context**
- `lib/supabase/server.ts` — SSR client with cookies, for Server Components and Server Actions
- `lib/supabase/client.ts` — browser client, for `'use client'` components
- `lib/supabase/admin.ts` — service role, lazy Proxy pattern (never call `createClient` at module level — breaks Vercel build with blank env vars)
- `lib/supabase.ts` — flat `createServerClient()` helper used in API routes
- RLS is DISABLED on all tables — service role key is used for all writes

**Inngest**
- Client: `lib/inngest.ts` exports `inngest`, `BUILD_PAGE_EVENT`, `BuildPageJobPayload`
- Functions: `inngest/functions/` — wrap each step in `step.run('name', async () => {})`
- `onFailure` envelope shape: `event.data` is `{ function_id, run_id, error, event: EventPayload }` — original payload is at `.event.data`, not `.data` directly
- Serve endpoint: `app/api/inngest/route.ts`

**React Patterns**
- Polling intervals: always use `useRef` synced via a separate `useEffect` for values read inside `setInterval` — prevents stale closures
- Slug stored in `slugRef` (not state closure) for polling: `useEffect(() => { slugRef.current = slug }, [slug])`
- Debounce refs use `ReturnType<typeof setTimeout>` type, not `number`
- iOS Safari: never use percentage-based `translateX` for sliders — use pixel `offsetWidth` calculation

### Testing Rules

- No testing framework is installed — do not add Jest, Vitest, or Playwright without explicit instruction
- No test files exist — do not generate `*.test.ts` or `*.spec.ts` files unless asked
- API routes are the primary integration boundary — manual testing via Vercel logs and Supabase dashboard
- Inngest functions are tested via the Inngest Dev Server (`npx inngest-cli dev`) — not unit tests
- When testing onboarding flow manually: check Vercel function logs for the numbered `[submit] 1–7` sequence to verify execution path
- `page_live` in Supabase may be boolean or string — always verify in DB directly when debugging status polling

### Code Quality & Style Rules

**Naming Conventions**
- Files: kebab-case (`build-page.ts`, `check-slug`) — no PascalCase files except page/layout components
- Components: PascalCase (`HorizontalSlider`, `BuildingScreen`)
- API routes: always `route.ts` inside a named folder (`app/api/onboarding/submit/route.ts`)
- DB column names: snake_case — TypeScript interfaces use camelCase (map at the boundary)
- Inngest step names: kebab-case strings (`'call-claude-api'`, `'mark-page-live'`)

**Design Tokens — never hardcode colors**
- Primary dark: `#0D0D0D` → `kryla.dark`
- Amber brand: `#F5A623` → `amber.brand`
- Background: `#FAFAFA` → `kryla.bg`
- Muted text: `#666666` → `kryla.muted`
- Border: `#E5E5E5` → `kryla.border`
- Logo SVG: vertical + top diagonal `stroke="#0D0D0D"`, bottom diagonal `stroke="#F5A623"` — always inline SVG, never an image file

**Copy / UX Rules**
- Never say "AI" on any member-facing surface — always "Kryla" or "we"
- No tech jargon on member-facing pages (no "slug", "API", "provider", "build")
- Error messages must be specific and human — never raw Postgres error codes to the user
- Timeout / waiting screens: calm tone, no retry loops, no apology language

**Comments**
- No comments explaining what code does — only add a comment when the WHY is non-obvious
- No multi-line comment blocks or docstrings

**Fonts (3 templates)**
- `font-inter` — default / professional
- `font-georgia` — editorial / clinic
- `font-trebuchet` — creative / storefront

### Development Workflow Rules

**Git**
- Default branch: `master` (not `main`) — remote: `github.com/sureshbijja-arch/kryla-work`
- Commit message format: `type: short description` — e.g. `feat:`, `fix:`, `docs:`, `refactor:`
- Never commit `.env.local` or any file containing `SUPABASE_SERVICE_ROLE_KEY` or `ANTHROPIC_API_KEY`

**Environment Variables**
- Required at runtime: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_DOMAIN`
- Week 4 placeholders: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`
- Week 5 placeholders: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `RESEND_API_KEY`
- Never call `createClient()` at module level — env vars are blank at Vercel build time; use the lazy Proxy pattern

**Deployment**
- Hosting: Vercel — push to `master` triggers production deploy
- Inngest registered at `/api/inngest` — must be reachable by Inngest cloud after deploy
- Supabase migrations run manually in Supabase dashboard SQL editor — no migration runner is set up
- Local dev: `npm run dev` + `npx inngest-cli@latest dev` in parallel for full stack

### Critical Don't-Miss Rules

**Anti-Patterns — Never Do These**
- Never use Supabase `.or()` filter — syntax is unreliable; use two sequential `.eq()` queries instead
- Never call `createClient()` at module level in any file imported by the build — use lazy Proxy
- Never add unique constraints on `email` or `phone` in `providers` table — only `slug` is unique
- Never pre-check email/phone uniqueness before insert — causes 409 on first click for returning users
- Never use percentage `translateX` for CSS sliders — breaks iOS Safari; use `offsetWidth` pixels
- Never import server-only modules (`lib/supabase/admin.ts`, Inngest server client) in `'use client'` files
- Never read `event.data` directly in Inngest `onFailure` — original payload is at `event.data.event.data`

**Idempotency — Submit Route**
- Always check for existing provider by `slug` BEFORE inserting
- If exists + `page_live = true` → return success immediately
- If exists + `page_live = false` → re-fire Inngest with existing `providerId`, return success
- Only slug uniqueness causes a hard 409 — all other conflicts handled silently

**Slug Rules (`lib/slug.ts`)**
- Min 3, max 30 chars — letters and numbers only, not all-digits
- `RESERVED_SLUGS` blocks ~30 words (admin, api, app, kryla, help, etc.) — always check before insert
- Auto-suggest from `firstName + lastName` on entering onboarding step 3

**Supabase Schema Gotchas**
- `page_live` stored as boolean in new rows but may be string `'true'` in old rows — always check both
- `onboarding_answers` has `email` column — include it when inserting
- `build_failures` table must exist before `onFailure` hook fires — run migration if missing
- RLS is disabled on `providers`, `pages`, `onboarding_answers` — service role key handles all writes

**Inngest Build Steps (in order)**
1. `call-claude-api` → 2. `parse-response` → 3. `save-raw` → 4. `write-pages-row` → 5. `mark-page-live`
- Step 2 throws on invalid JSON to trigger retry — intentional
- Step 5 sets `page_live = true` — the status poll detects this

**Subdomain Routing**
- `middleware.ts` rewrites `{slug}.kryla.work` → `/[slug]` internally
- Never hardcode `kryla.work` in middleware — use `NEXT_PUBLIC_APP_DOMAIN` env var
- `localhost` bypasses subdomain rewrite intentionally (local dev)

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code in this project
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- If a new pattern emerges that contradicts a rule, flag it rather than silently deviating

**For Humans:**
- Keep this file lean and focused on agent needs
- Update when technology stack or DB schema changes
- Remove rules that become obvious over time

_Last Updated: 2026-06-28_
