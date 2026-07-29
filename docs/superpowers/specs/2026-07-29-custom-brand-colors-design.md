# Custom Brand Colors — Design

## Context

The member-page design refresh (`member-page-design-refresh` branch, merged 2026-07-28) replaced flat
per-persona palette/font/mode pickers with curated `layout_presets` — named bundles of template + palette
(accent) + font + design_mode + neutral surface tokens (`page_bg`/`surface`/`border_color`). Members pick a
preset by name (e.g. "Atelier", "Golden Thali") in MyKryla's Layouts tab; the preset drives everything about
their page's look.

Some members want their own brand color — e.g. a salon whose logo is black, a bakery whose brand is pink —
rather than the closest curated preset's accent. This feature adds that escape hatch: **full custom color
theming** (accent + surface + border), layered on top of the preset a member already applied, available to
every member on every plan.

## Locked decisions

| Axis | Decision |
|---|---|
| **Input method** | Color picker (`<input type="color">` or equivalent) + hex text input, both editing the same value |
| **Scope of customization** | Full: accent, surface, and border colors (not accent-only) |
| **Placement** | MyKryla → My Page → Layouts tab, as a "Customize colors" expander that appears once a preset is applied — not a new top-level tile or a separate My Page card |
| **Storage** | Loose nullable override columns on `pages` (no new `layout_presets` rows, no per-member preset cloning) |
| **Contrast** | Soft warning only — computed client-side, shown inline, never blocks save |
| **Plan gating** | None — available on every plan, same as the base Layouts picker's existing Sprout+ gate for *applying* a preset (customizing colors requires a preset to already be applied, so it inherits that gate; no new gate on top) |

## Data model

`pages` currently has (from the design-refresh branch): `palette`, `font`, `design_mode`, and nullable
`page_bg`/`surface`/`border_color` (added in Task C1, wired into `LayoutRenderer.tsx` with `PAGE_BG[palette]`
as fallback, but currently only ever populated from an applied preset's values, never from a direct member
edit).

**New column:** `pages.accent_color text` (nullable, no default) — mirrors the existing three. There is
currently no per-member accent override slot; accent has only ever come from `ACCENT[palette]` via
`app/[slug]/types.ts`. This is the one net-new column this feature requires.

**Relationship to presets:** unchanged from today — a member's applied preset (name, template, font,
design_mode) stays their source of truth for everything except color. The 4 color columns
(`accent_color`/`page_bg`/`surface`/`border_color`) become an optional override layer:
- `NULL` (today's behavior, and any member who never customizes): fall back to the preset's/palette's values,
  exactly as `LayoutRenderer.tsx` already does for the 3 existing columns.
- Set (this feature): the member's own hex values win, regardless of which preset is applied underneath.

No `layout_presets` row is created, cloned, or mutated by this feature. Applying a *different* curated preset
after customizing colors is a separate concern (see Open Question 1 below).

## Render path

`app/[slug]/components/LayoutRenderer.tsx` already injects `--color-accent*`, `--color-surface`,
`--color-border` as inline styles on its wrapper div, with a fallback chain per value (e.g.
`data.pageBg ?? PAGE_BG[palette] ?? '#FFFFFF'`). This feature adds one more link to the accent side of that
chain — `data.accentColor ?? ACCENT[palette] ?? '#F5A623'` — following the identical pattern already
established for the other three. `ProfileData` (`app/[slug]/types.ts`) gains `accentColor?: string | null`,
threaded through `app/[slug]/page.tsx` and `app/[slug]/preview/page.tsx` exactly as `pageBg`/`surface`/
`borderColor` were threaded in Task C1 (select the column, populate the field, respecting each file's
existing live/draft-merge pattern).

## Write path

**New UI:** inside `LayoutsTab.tsx`, once a preset is applied (i.e. `appliedLayout` is set, or more generally
whenever the member has a currently-active layout), a "Customize colors" expander reveals 3 picker+hex pairs
(Accent, Surface, Border), pre-filled with the *currently effective* values (the member's own override if
set, else the applied preset's values) so the member is editing from a real starting point, not a blank
slate. A "Reset to preset colors" action clears all 3 override columns back to `NULL`.

**API:** extend the existing `/api/mychat/layout` POST handler (already accepts `pageBg`/`surface`/
`borderColor` as optional hex fields with `HEX_RE` validation, per Task C1) with a fourth optional
`accentColor` field, validated identically. Reset is a POST with the 4 color fields explicitly set to `null`
(the route's `if (pageBg) pageUpdates.page_bg = pageBg` pattern needs adjusting to distinguish "field omitted"
from "field explicitly nulled" — see Open Question 2) or a small dedicated reset action, whichever the
implementation plan finds cleaner given the route's current shape.

**Publish:** no new work — the existing generic `pages.update(dp)` spread in `/api/mychat/publish/route.ts`
(confirmed in Task A4/C1 to promote any `draft_data.pages` key onto a matching real `pages` column with zero
per-field code) already handles `accent_color` once the column exists, identically to how it already handles
the other three.

## Contrast check

Client-side only, computed in `LayoutsTab.tsx` (or a small shared color-utility module if the computation is
non-trivial) using WCAG 2.0 relative luminance / contrast ratio formulas — no new dependency needed, this is
pure arithmetic on parsed hex values. Checks: accent vs. surface, and (if reasonable to infer) body text vs.
surface. If the ratio fails WCAG AA (4.5:1 for normal text, or the appropriate large-text/UI-component
threshold for the accent-as-CTA-background case), show a small inline warning near the picker — something
like "Low contrast — may be hard to read." Save proceeds regardless; this is advisory only.

## Out of scope

- Gating by plan (explicitly rejected — available to all plans).
- Saving a custom color combination as a new reusable/named preset, private or otherwise (explicitly rejected
  in favor of loose override fields).
- Customizing font or design_mode beyond what the applied preset already provides — this feature is colors
  only.
- Any change to the admin-side `layout_presets` CRUD (`/admin/layouts`) — curated presets are unaffected;
  this is purely a member-facing override layer on top.
- Hard-blocking low-contrast saves — soft warning only, per the locked decision above.

## Open questions for the implementation plan to resolve

1. **Interaction with switching presets after customizing:** if a member customizes colors, then later applies
   a *different* curated preset (e.g. switches from "Atelier" to "Blush"), should their custom colors persist
   (now overriding the new preset too) or reset automatically? Leaning toward "persist" for consistency with
   the loose-override model (the override columns are independent of which preset is applied), but this
   should be confirmed with the user during planning if it's not obvious from the brief, since it's a real UX
   choice (a member might expect switching presets to give them a clean look, not their old custom color
   bolted onto a new template).
2. **Route shape for `null`-as-reset:** `/api/mychat/layout`'s current body-field handling
   (`if (pageBg) pageUpdates.page_bg = pageBg`) treats `undefined` and `falsy` the same way, so it can't
   currently distinguish "member didn't touch this field" from "member wants to clear it back to the preset
   default." The plan should decide: extend this route to accept an explicit `null` sentinel per field, or add
   a small dedicated `POST /api/mychat/layout/reset-colors` (or similar) endpoint. Either is fine
   architecturally; pick based on which reads cleaner against the route's current validation style.
3. **Preview thumbnail in `LayoutsTab.tsx`'s grid:** today's grid card preview (`lo.bg`/`lo.accent` from the
   *preset*, not the member's live page) doesn't need to change for this feature, but worth confirming during
   planning that the "currently applied" card highlight logic (`isCurrent`) doesn't get confused once a
   member's live colors diverge from the preset's stored colors.
