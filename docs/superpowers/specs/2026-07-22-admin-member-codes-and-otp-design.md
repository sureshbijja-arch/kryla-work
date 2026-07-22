# Admin Members: Invite/Referral codes + one-time OTP

**Date:** 2026-07-22
**Status:** Approved design — ready for implementation plan

## Context

Two unrelated improvements to the admin **Members** tab (`/admin/members`), bundled because they touch the same screen:

1. **Surface and edit invite/referral codes.** Admins currently see name, slug, plan, joined date, and two kill-switch toggles — but not the referral data that already exists on every member. We want two new columns: the **invite code** the member used at signup, and the member's own **referral code** (which they set in MyKryla → My Plan → Refer). The referral code (and the invite code) should be admin-editable.

2. **Fix admin OTP re-prompting.** Today, clicking any admin tab reloads the whole page, which remounts the auth shell and re-runs the session check — flashing a "Loading…" state and, on any cookie/token hiccup, dropping the admin back to the OTP login screen. The admin should enter OTP **once** per login and never be re-prompted while navigating tabs.

**Out of scope (deferred):** letting a member grant another person access to their MyKryla dashboard. That is a genuinely new many-users-to-one-provider capability (no shared-access table exists today; access is strictly `providers.email == auth.email` everywhere including RLS) and will get its own spec later.

## Key finding: invite code and referral code already exist

There is **no separate invite-code table or whitelist**. In this codebase "invite code" and "referral code" are the same 5-char string, stored in two columns on `providers`:

- **`providers.referred_by`** (TEXT, not unique, no FK) — the code the member typed at `/join` when signing up. This is the **"invite code used while signing up."** Written once by `/api/onboarding/submit`.
- **`providers.referral_code`** (TEXT, **UNIQUE**) — the member's *own* shareable code, set/edited in MyKryla → My Plan → Refer (`app/mychat/ReferTab.tsx` → `/api/mychat/referral-code`). Others type this at `/join`; it is validated against `providers.referral_code`.

Both columns are defined in `supabase/migrations/20260702000004_referral.sql`. **No schema/migration change is required** — both columns already exist.

## Part A — Invite code + referral code columns, with edit

### Field mapping (UI label → column)

| UI label | Column | Unique? | Editable |
|---|---|---|---|
| Invite code | `providers.referred_by` | No | Yes |
| Referral code | `providers.referral_code` | Yes (global) | Yes |

### Validation rules (mirror the member-side ReferTab)

- Normalize input to **uppercase**, strip to `[A-Z0-9]`, max 5 chars.
- A non-empty value must match `^[A-Z0-9]{5}$`.
- Empty input → store `NULL` (clears the code).
- `referral_code` collisions surface Postgres `23505` → API returns **409** → modal shows "That code is already taken" (same wording/behavior as `/api/mychat/referral-code`).
- `referred_by` has no uniqueness constraint — free 5-char field.

### UI

Reuse the existing modal pattern in `app/admin/members/page.tsx` (the Overrides modal is the template). Per-row action row gains an **"Edit codes"** button alongside "Overrides" and "Delete".

- Modal title: `Codes — {slug}`
- Two inputs using the existing `.field-label` / `.field-input` classes:
  - **Invite code (used at signup)** → bound to `referred_by`
  - **Referral code (member's own)** → bound to `referral_code`
- Both inputs enforce the 5-char `[A-Z0-9]` uppercasing on change (same handler shape as `ReferTab.tsx`).
- Save button PATCHes the member; on success, patch the row in local `members` state from the returned member object (same as the existing `toggle()` flow); on 409, show the taken-code error inside the modal.

Two new **columns** are also added to the table, placed after "Plan" and before "Joined": **Invite code** then **Referral code**, each showing the current value (or an em-dash when null), monospaced. These are display-only in the table; editing happens through the modal.

### API changes

**`PATCH /api/admin/members/[id]/route.ts`** — extend beyond the current boolean-only whitelist:

- Keep the existing `page_live` / `suspended` boolean handling unchanged.
- Add handling for `referral_code` and `referred_by`:
  - Accept `string` values; normalize (`trim().toUpperCase().slice(0,5)`).
  - Empty string → `null`.
  - Non-empty must pass `^[A-Z0-9]{5}$`, else 400.
  - Include the normalized values in the `patch` object.
- Wrap the update so a `23505` unique violation (only possible from `referral_code`) returns **409** with `{ error: 'That code is already taken' }` (mirrors `app/api/mychat/referral-code/route.ts`).
- Extend the `.select(...)` column list to include `referral_code, referred_by` so the returned member carries them.

**`GET /api/admin/members/route.ts`** — add `referral_code, referred_by` to the `.select(...)` list so the table can render them. (Search behavior unchanged.)

### Client type

`app/admin/members/page.tsx` — extend the `Member` interface with `referral_code: string | null` and `referred_by: string | null`.

## Part B — One-time admin OTP

### Root cause

`app/admin/AdminLayoutClient.tsx` renders the nav tabs (and the logo / "admin" breadcrumb) as plain `<a href>` anchors. Each click is a **full-page navigation** → `AdminLayoutClient` unmounts and remounts → `authState` resets to `'loading'` and the `useEffect` re-runs `supabase.auth.getUser()` (a network call). This always causes a "Loading…" flash, and because `/admin/*` is **not** covered by the session-refreshing middleware (middleware only guards `/mychat`/`/mykryla`), any cookie/token-refresh hiccup during that re-check drops `authState` to `'login_email'` — re-prompting for OTP.

### Fix

Convert the admin in-shell navigation from `<a href>` to Next.js `<Link>` (`next/link`):

- Convert the `NAV.map(...)` tab links (lines ~181–190) to `<Link>`.
- Convert the "admin" breadcrumb (`href="/admin"`) to `<Link>`.
- Leave the logo link (`href="/"`) as a plain `<a>` — leaving the admin area intentionally does a full navigation, and keeping the shell mounted there has no benefit.

With client-side navigation, `AdminLayoutClient` stays mounted across tab switches, `getUser()` runs once per session, and there is no remount, no loading flash, and no OTP re-prompt.

No new state, no new dependencies, no schema change.

## Files touched

- `app/admin/members/page.tsx` — `Member` type + two columns + "Edit codes" modal & handler.
- `app/api/admin/members/[id]/route.ts` — PATCH whitelist extension + 23505→409 + select columns.
- `app/api/admin/members/route.ts` — GET select columns.
- `app/admin/AdminLayoutClient.tsx` — nav tabs (and `/admin` breadcrumb) `<a>` → `<Link>`.

## Verification

1. **OTP once:** Sign into `/admin`, complete OTP once, then click through every tab (Layouts → Plans → … → Members). Expected: no "Loading…" flash, no OTP re-prompt, session persists. Confirm client-side nav via no full-page reload (Network tab shows no document request per tab click).
2. **Codes visible:** On Members, confirm the two new columns render, showing existing values (e.g. seeded `BIJJA` referral code for `sureshbijja@gmail.com`) and em-dashes for null.
3. **Edit referral code (happy path):** Open "Edit codes" on a member, set a fresh 5-char code, save. Confirm the row updates and the value persists on reload. Cross-check it now validates at `/join` (it's a real referral code).
4. **Edit referral code (collision):** Try to set a member's referral code to another member's existing code. Expected: 409, modal shows "That code is already taken", no change persisted.
5. **Edit invite code:** Set/change a member's invite code (`referred_by`) to a valid 5-char code; confirm it persists. Blank it out; confirm it clears to null.
6. **Validation:** Attempt a 4-char or lowercase/symbol code; confirm it's normalized/rejected consistently with the member-side ReferTab rules.
