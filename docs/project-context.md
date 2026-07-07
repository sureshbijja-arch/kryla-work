---
project_name: 'kryla.work'
user_name: 'Prath'
date: '2026-06-29'
sections_completed:
  ['technology_stack', 'language_rules', 'framework_rules', 'database_rules', 'ui_rules', 'anti_patterns']
status: 'complete'
optimized_for_llm: true
---

# Project Context for AI Agents

_Critical rules and patterns for implementing code in kryla.work. Focused on unobvious details agents commonly miss._

---

## Technology Stack & Versions

- **Next.js** 14.2.3 — App Router only (no Pages Router)
- **React** 18, **TypeScript** 5 (strict mode)
- **Tailwind CSS** 3
- **Supabase** `@supabase/ssr` ^0.3, `@supabase/supabase-js` ^2
- **Anthropic SDK** `@anthropic-ai/sdk` ^0.24.3 — model: `claude-sonnet-4-6`
- **Inngest** ^3.54.2 — async job queue
- **Zod** ^3 — API route validation
- **Resend** ^3 — email via direct fetch in `lib/email.ts` (NOT the Resend SDK methods)
- **Stripe** ^15 — payments (not yet wired)
- **Node.js** 24+, **Hosting**: Vercel (serverless + ISR)
- **Database**: Supabase Postgres — RLS disabled on all core tables

---

## Language & TypeScript Rules

- **Strict mode on** — no implicit `any`. All params must be typed or clearly inferred.
- **Path alias**: `@/*` = project root. Use `@/lib/...`, `@/app/...` — never `../../` across feature boundaries.
- **Named exports** for all utilities (`lib/`, `config/`, `types/`). Default exports only for pages and components (Next.js requirement).
- **Async/await** everywhere — no raw `.then()` chains.
- **Error handling at boundaries only** — validate at API route entry + external service calls. Don't wrap internal calls.
- **Zod for all API input** — every POST/PATCH parses `req.json()` through a Zod schema first. Return 422 on `ZodError`.
- **No comments** unless the WHY is non-obvious. Never describe what the code does.
- **Shared types**: `app/[slug]/types.ts` (profile types), `types/index.ts` (global). Never duplicate a shape.

---

## Next.js & Framework Rules

### Server vs Client Components
- Default to **Server Components**. Add `'use client'` only for: `useState`, `useEffect`, event handlers, browser APIs, Supabase browser client.
- Never import `lib/supabase/server.ts`, `lib/supabase/admin.ts`, or `next/headers` from a client component — build will break.

### Supabase Client — which to use

| Context | Client | File |
|---|---|---|
| API routes, Server Components | Service role (bypasses RLS) | `lib/supabase/admin.ts` |
| Middleware, My Space page auth | SSR + cookies | `lib/supabase/server.ts` |
| Client components (browser auth, OTP) | Browser client | `lib/supabase/client.ts` |

- `lib/supabase/admin.ts` is a **lazy Proxy** — safe to import at module level. Defers URL check to call time so builds don't fail with blank env vars.
- **`cache: 'no-store'`** is set in the admin client's global fetch override. Never remove it — without it, `revalidatePath` has no effect because Next.js caches Supabase responses.

### ISR & Caching
- `app/[slug]/page.tsx` uses `export const revalidate = 3600` (ISR, not dynamic).
- Call `revalidatePath(`/${slug}`)` after any DB write that must reflect on the public profile.
- `app/mychat/page.tsx` uses `export const dynamic = 'force-dynamic'` (auth guard — slug resolver).

### Middleware & Subdomain Routing
- `priya.kryla.work` → middleware rewrites to `/priya` → `app/[slug]/page.tsx`.
- `/api` and `/_next` are **excluded from slug rewrite** in `middleware.ts`. Never remove this — it prevents `/priya/api/booking` (404).
- `/mychat` is protected: no session → redirect to `/login`. It resolves the member's slug and redirects to `/{slug}/mychat`.

### API Routes
- All DB mutations use `supabaseAdmin` (service role). Never use anon client for writes.
- Non-fatal side effects (email, Inngest) must be in try/catch — never block the primary response.
- Return `NextResponse.json({ error })` with status — never throw unhandled errors.

---

## Database & Schema Rules

### Core Tables
- `providers` — one row per member. `slug` is unique; `email` and `whatsapp_number` are NOT.
- `pages` — one row per provider, joined via `provider_id`. Holds all profile content.
- `bookings` — customer booking requests. Service role only.

### Bookings Table — Dual-Column Writes (CRITICAL)
Legacy columns have NOT NULL constraints and must always be populated alongside new columns:

| New column | Legacy column (NOT NULL, must sync) |
|---|---|
| `customer_name` | `client_name` |
| `customer_phone` | `client_phone` |
| `client_email` | `client_email` (same column, used for customer email) |
| `service` | `service_requested` |
| `preferred_date` | `requested_slot` (use `''` if null) |

**Always write to both column sets on every insert.** Missing a legacy column = NOT NULL violation.

### JSONB Fields in `pages`
- `services`: `[{ name, description, duration_or_unit }]`
- `highlights`: `[{ icon, title, body }]`
- `faq`: `[{ question, answer }]`
- `show_sections`: `{ hero, services, highlights, booking, faq, contact }` (all booleans)

When patching via My Space chat, send the **complete array** — never partial updates.

### Plan Gating
- Plans: `seed` / `sprout` / `grow` / `thrive` / `elevate`
- `seed` = no booking form. Enforced **server-side** in `app/[slug]/page.tsx` (`showSections.booking = false`).
- Never rely on client-side plan checks for feature gating.

---

## UI & Design System Rules

### Logo — Inline SVG Only
Never use image files. Always render the K mark as inline SVG:
- Vertical line + top two diagonals: `stroke="#0D0D0D"`
- Bottom-right diagonal: `stroke="#F5A623"` (amber — never change)

### Colour Tokens
| Token | Value |
|---|---|
| Primary dark | `#0D0D0D` |
| Amber accent | `#F5A623` |
| Muted text | `#666666` |
| Subtle/placeholder | `#999999` |
| Border | `#E5E5E5` |
| Background | `#FAFAFA` |

### Tailwind Conventions
- Tailwind utility classes only — no custom CSS files.
- `style` prop for dynamic values (accent colours, animation delays).
- No emojis unless explicitly requested.

### Template Routing (profile pages)
```
isTutor (persona === 'tutor')     → StudioTemplate
page.template === 'portfolio'     → PortfolioTemplate
page.template === 'storefront'    → StorefrontTemplate
page.template === 'clinic'        → ClinicTemplate
default                           → FocusTemplate
```
All templates receive `ProfileData` from `app/[slug]/types.ts`. Never add template-specific props — extend `ProfileData` instead.

### iOS Safari
- Sliders: pixel-based `translateX(-${n * offsetWidth}px)` — percentage breaks on iOS Safari.

---

## Critical Anti-Patterns & Gotchas

- **Don't create an admin Supabase client without `cache: 'no-store'`.** Already in `lib/supabase/admin.ts` — never bypass or duplicate without it.
- **Don't remove the `/api` exclusion from `middleware.ts`.** Breaks all API calls from subdomain profile pages.
- **Don't write to bookings without populating legacy NOT NULL columns.** See dual-column table above.
- **Don't use anon client for DB writes.** Service role only for all mutations.
- **Don't add `force-dynamic` to `app/[slug]/page.tsx`.** It uses ISR — `force-dynamic` kills caching for all public profiles.
- **Don't use magic links for OTP.** Supabase email template must use `{{ .Token }}` (6-digit code). Sender: `hello@kryla.work` via Resend SMTP.
- **Don't let Inngest `send()` block the response.** Always wrap in try/catch — non-fatal.
- **Don't import server-only modules in client components.** `lib/supabase/server.ts`, `lib/supabase/admin.ts`, `next/headers` are server-only.

### Email
- Send via `sendEmail()` in `lib/email.ts` — calls Resend API directly with `fetch`.
- Requires `RESEND_API_KEY` env var in Vercel.
- `from` must be `Kryla <hello@kryla.work>` (verified domain in Resend).
- Always non-fatal — wrap in try/catch, never block the primary response.

### My Chat Panel Auth
- `SpaceClient.tsx` uses `createBrowserClient` — sets cookies on the current subdomain (`priya.kryla.work`), not on `kryla.work`.
- API calls from the panel go to `/api/mychat/*` on the same subdomain — same-origin, cookies included. Works correctly.
- Do not attempt to share sessions between `kryla.work` and `*.kryla.work` — separate cookie domains by design.

### Slug Rules
- Min 3, max 30 chars, letters + numbers only, not all-digits.
- 30 reserved words blocked — see `lib/slug.ts`.
- Only unique constraint on providers; email/phone are not unique.

---

## Usage Guidelines

**For AI agents:** Read this file before implementing any code. Follow all rules exactly. When in doubt, prefer the more restrictive option. Update this file if new patterns emerge.

**For humans:** Keep lean and focused on agent needs. Update when stack or patterns change. Remove rules that become obvious over time.
