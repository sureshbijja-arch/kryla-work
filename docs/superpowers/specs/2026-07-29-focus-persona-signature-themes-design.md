# Focus-Persona Signature Themes — Design

## Context

The member-page design refresh (merged 2026-07-28) and the custom-brand-colors feature (merged 2026-07-29,
same day as this spec) both landed, but neither delivered real per-persona visual identity. Every curated
`layout_presets` row for the 3 focus personas (Salon: Atelier/Blush/Noir; Tiffin: Home Kitchen/Fresh
Table/Golden Thali; Physio: Clinic/Recover) still points at the same flat 6-value `ACCENT`/`PAGE_BG` enum
(`app/[slug]/types.ts`) and the identical cool-ivory `#FAFAF9`/`#FFFFFF`/`#ECECEA` surface triple. "Curation"
so far means naming and `design_mode`/font grouping, not distinct color identity — the salon, tiffin, and
physio pages are visually interchangeable except for copy.

Investigation (documented earlier in this conversation) found that `frontend-design` — the installed skill
for distinctive, non-templated visual design — was never invoked during that refresh; the salon result landed
on the AI-default look (cream ground, high-contrast serif, terracotta/amber accent). A follow-up CLAUDE.md
rule (`### UI work — required workflow`, inserted 2026-07-29) now requires `frontend-design` to run first on
any aesthetic UI work, across all 46 personas, with the 3 focus personas proven first as a sequencing step.

This spec is that proof: run `frontend-design` for real on Salon, Tiffin, and Physio, and ship the result to
the two components members actually load first — hero and services — using real data, no invented content.
Two before/after mockups were built and approved as artifacts during design (salon-only, then all three)
before any schema was touched.

## Locked design language (per persona)

Grounded in each persona's own materials, not a shared "premium" reskin:

| Persona | Palette | Materials it's grounded in | Signature moment |
|---|---|---|---|
| **Salon** (Atelier preset) | Noir `#16130F` · Porcelain `#F7F3EE` · Rosewood `#7B4B3A` (accent) · Brass `#C9A56A` (signature) · Sage `#8A9184` | Mirror light, hair sheen, wood | Light-sweep animation across the hero portrait ground |
| **Tiffin** (Home Kitchen preset) | Cream `#FBF6EC` · Ink `#2B2114` · Turmeric `#D68A2E` (accent) · Chili `#B5472F` (signature/CTA) · Leaf `#5C7A4E` | The dabba itself, turmeric/dal tones, home-kitchen rhythm | Today's tiffin rendered as real dabba compartments, sourced from the member's actual top services |
| **Physio** (Clinic preset) | Fog `#EEF1F0` · Ink `#1E2A28` · Teal `#2F6E64` (accent) · Clay `#8E6E5C` (signature) | Clinical calm, measured trust | *(cut from this pass — see Out of scope)* |

Each persona spends its "one bold move" (per `frontend-design`'s restraint principle) on exactly one signature
element; everything else stays quiet. Colors are chosen, not defaulted — this specifically breaks the
AI-default look (cream + serif + terracotta) the original refresh landed on.

## Data model

**New column, both tables, additive:**
```sql
ALTER TABLE layout_presets ADD COLUMN palette_tokens jsonb;
ALTER TABLE pages          ADD COLUMN palette_tokens jsonb;
```

Shape (one object, keys map 1:1 to the CSS custom properties already consumed by all 17 files that read
`--color-accent*`):
```json
{
  "accent":        "#7B4B3A",
  "accentSurface": "#7B4B3A0d",
  "accentBorder":  "#7B4B3A26",
  "accentGlow":    "#7B4B3A40",
  "signature":     "#C9A56A"
}
```
`accentSurface`/`accentBorder`/`accentGlow` are pre-computed (not derived at render time) so the palette can
use genuinely independent hues if a future persona calls for it, rather than being locked to one hex's
opacity ramp.

**Relationship to the already-shipped custom-brand-colors override** (`pages.accent_color`, member-editable
in `LayoutsTab.tsx`'s "Customize colors" expander): per the locked decision below, the member override now
covers **both** accent and signature — this spec adds a `pages.signature_color` column (nullable, mirrors
`accent_color`'s pattern exactly) rather than leaving the signature preset-locked.

```sql
ALTER TABLE pages ADD COLUMN signature_color text;
```

**Precedence at render time** (`LayoutRenderer.tsx`), highest first:
1. `pages.accent_color` / `pages.signature_color` — member's own explicit override (existing + new column)
2. `layout_presets.palette_tokens` (via the applied preset, joined at read time — see Read path) — curated
   persona identity
3. `ACCENT[palette]` opacity-derived chain — today's fallback, byte-identical for every page that has neither
   an override nor a palette_tokens-bearing preset applied

This means a member who never customizes colors AND applies "Atelier" gets the rosewood/brass identity from
`palette_tokens`. A member who then customizes just their accent color keeps the curated brass signature
unless they also open the signature picker — matching the "editing from a real starting point" behavior
`LayoutsTab.tsx` already establishes for the other 3 color fields.

## Read path

`ProfileData` (`app/[slug]/types.ts`) gains `paletteTokens?: PaletteTokens | null` and
`signatureColor?: string | null`, threaded through `app/[slug]/page.tsx` and `app/[slug]/preview/page.tsx`
exactly as `accentColor`/`pageBg`/`surface`/`borderColor` already are (select the column — or the joined
preset's `palette_tokens` where a page has an applied preset but no page-level copy of it, matching however
the existing `page_bg`/`surface`/`border_color` denormalization from preset → page already works — confirm
this at plan time by reading the current apply-preset write path).

`LayoutRenderer.tsx` (`app/[slug]/components/LayoutRenderer.tsx:29`) changes its accent derivation from:
```ts
const accent = data.accentColor ?? ACCENT[data.palette as PaletteKey] ?? '#F5A623'
```
to a three-step chain that also resolves the surface/border/glow tints and the new signature var:
```ts
const tokens  = data.paletteTokens
const accent  = data.accentColor ?? tokens?.accent ?? ACCENT[data.palette as PaletteKey] ?? '#F5A623'
const accentSurface = data.accentColor ? `${accent}0d` : (tokens?.accentSurface ?? `${accent}0d`)
// accentBorder / accentGlow follow the same shape
const signature = data.signatureColor ?? tokens?.signature ?? accent // no signature configured → reuse accent, never invent a color
```
Emits one new CSS var, `--color-signature`, alongside the existing four. **All 17 files currently reading
`--color-accent*` need zero changes.** Only `LayoutRenderer.tsx` and `types.ts` touch derivation logic.

Pages/presets with no `palette_tokens` render byte-identical to today — this is the explicit regression
check in Verification.

## Component changes (hero + services only)

Per persona, the *shared* `HeroSection.tsx`/`ServicesSection.tsx` gain new **variants** — not persona-specific
forks — selected the same way `resolveVariant()` already selects `photo`/`dark`/`gradient`/etc. today, so
non-focus personas are completely untouched.

**Salon → `sweep` hero variant** (extends the existing `HeroPhoto` shape): portrait/gallery image as ground,
scrim, headline over it, plus a CSS `@keyframes` light-sweep using `--color-signature` (brass) as the sweep
tint. Gated behind `prefers-reduced-motion: reduce` (animation removed, not just slowed). Services section
gets a `menu` variant: dotted-leader price rows instead of the current card grid — pulls the same
`data.services[]` array, no new data source.

**Tiffin → `dabba` hero variant:** renders the member's top 3 `data.services[]` entries (by existing sort
order) into three visual "compartments" (one large, two small) styled with turmeric/leaf tones. If a member
has fewer than 3 services, or none, the compartments render only for what exists — **never placeholder/lorem
content** (per `frontend-design`'s explicit rule and the project's no-tech-debt standard). Services section
below keeps the existing card layout — the dabba is a hero-only signature, not a services rewrite.

**Physio:** palette (fog/teal/clay) and neutral tokens apply via `palette_tokens` same as the other two, using
existing hero/services variants unchanged. No new hero variant, no recovery-arc component this pass.

## Rollout

Additive and opt-in — no forced migration of existing live pages. A member sees the new look only when
`pages.palette_tokens` resolves to a real value, which happens when:
- They apply the (updated) Atelier / Home Kitchen / Clinic preset via `LayoutsTab.tsx` (existing picker,
  unchanged UI) — a **data migration** updates those 6 already-existing `layout_presets` rows with real
  `palette_tokens`, not new rows.
- An admin sets it directly (no new admin UI required this pass — `/admin/layouts` should render whatever
  `palette_tokens` swatches exist; confirm read-only display at plan time, no CRUD editor needed).

**Signature-color override:** `LayoutsTab.tsx`'s existing "Customize colors" expander (3 pickers: Accent,
Surface, Border, each a `{ label, value, set }` entry mapped over one array) gains a 4th entry, **Signature**,
following the identical pattern. `/api/mychat/layout/route.ts` gains one more optional `signatureColor` field
with the same `HEX_RE` validation and the same `if (x) pageUpdates.x = x` shape already used for the other 4
color fields, plus inclusion in the existing `resetColors === true` branch. No new endpoint.

## Verification (per CLAUDE.md's UI work workflow)

1. **Lighthouse** (chrome-devtools MCP `lighthouse_audit`) on `/{slug}/preview` for one persona with the
   updated preset applied — accessibility ≥ 95, no Core Web Vitals regression from the sweep animation.
2. **WCAG contrast check**, specifically: rosewood-on-porcelain and turmeric-on-cream text pairs (both
   mid-tone, most likely to fail 4.5:1). Adjust hex values if they fail rather than shipping and hoping — this
   overlaps with, but is distinct from, the existing client-side soft-warning contrast check in
   `LayoutsTab.tsx` (that one is advisory for member-chosen colors; this one is a hard gate on the *curated*
   preset colors we're shipping).
3. **Visual proof** (playwright MCP): screenshot each of the 3 updated preset previews at mobile width, with
   and without `prefers-reduced-motion: reduce`.
4. **Regression check:** a page/preset with no `palette_tokens` set renders byte-identical to pre-change
   output (confirms the fallback chain, not just the happy path).

## Out of scope

- **Physio recovery-arc signature element** — cut explicitly (2026-07-29 decision). No new stat column added
  to support it; revisit only once a real outcome-tracking field exists elsewhere in the schema.
- Bio, Highlights, Contact section restyling — hero + services only, this pass.
- Extending signature themes beyond the 3 focus personas — sequencing per the CLAUDE.md rule; a separate spec
  once this proves out.
- New admin UI for authoring/editing `palette_tokens` — ships via migration, matching the existing
  no-hardcoding pattern for all persona/preset config.
- Any change to `page_bg`/`surface`/`border_color`'s existing behavior or the already-shipped
  custom-brand-colors feature's accent/surface/border override flow — this spec only adds the signature slot
  alongside it.

## Open questions for the implementation plan to resolve

1. **Preset → page denormalization mechanics for `palette_tokens`:** confirm at plan time exactly how
   `page_bg`/`surface`/`border_color` currently get copied from an applied `layout_presets` row onto `pages`
   (on apply? read-time join?) and mirror that same mechanism for `palette_tokens`, rather than introducing a
   second pattern.
2. **`/admin/layouts` display:** confirm whether the existing preset list/grid already renders arbitrary swatch
   colors generically (in which case `palette_tokens` "just works" once populated) or needs a small
   read-only addition to show the signature swatch.
