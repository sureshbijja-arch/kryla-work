# Forged Idea: Section Custom Design

## What survived

Members can style each of the 6 page sections from inside the Page Layout tab — giving them real ownership of their page's look without ever producing a bad output.

---

## Locks

**Constraint principle**
Design freedom is structurally constrained so bad output is impossible. Member pride/ownership AND business quality are both required outcomes. These are not in tension when the constraints are right.

**Sections in scope**
hero · services · highlights · bio · faq · contact (existing codebase names, unchanged)

**Per-section controls (inline in SectionsTab, each section card)**
- Background colour: 16 curated presets (Warm Cream, Cool Linen, Slate Blue, Forest Mist, Rose Blush, Amber Glow, Charcoal, Midnight, Ocean, Sage, Terracotta, Lavender, Sand, Steel, Ivory, Graphite). System auto-detects luminance and sets text dark or white — member never touches contrast.
- Background photo: upload any photo → system applies auto-scrim overlay for readability. Available on hero, services, highlights, bio only.
- Moving frames (hero only): toggle on/off, pick 1/2/3 frames. Populated from gallery images.

**What stays global (not per-section)**
Palette / accent colour, font, entrance animations — all already implemented page-wide, not touched.

**Plan ladder**

| Tier | Gets |
|---|---|
| Seed | Section style controls visible but greyed out + upgrade prompt |
| Sprout+ | 16 bg colour presets + background photo upload (4 sections) |
| Grow+ | Everything above + moving frames on hero (requires gallery, already Grow+) |

---

## Killed and why

- **Video backgrounds** — LCP killer, CDN cost, bad output risk too high
- **Per-section text editing** — already covered by AI chat editor
- **Custom hex / colour picker** — unconstrained input, bad output factory
- **Per-section font override** — breaks design system coherence
- **Per-section accent colour override** — incoherence across sections
- **Background photo on faq / contact** — text readability and form usability
- **Moving frames below hero** — no value, bad output risk

---

## Implementation shape (for build phase)

- Extend `pages.sections` jsonb entries: `{ sectionKey, variant, order, style?: { bg?: { type: 'color'|'photo', value: string }, frames?: { enabled: boolean, count: 1|2|3 } } }`
- Style changes save to `draft_data` → preview → publish (same flow as AI chat edits, not direct-save like services)
- Auto-scrim: CSS `::before` overlay, dark or light based on section text needs
- Auto-contrast: luminance check on chosen colour → set text token to `#0D0D0D` or `white`
- Upload type: `type=section-bg` added to `/api/my-space/upload`
- Seed gate: controls render with `opacity-50 pointer-events-none` + upgrade nudge (same pattern as Layouts tab)

---

## Downstream
Ready to feed into `bmad-spec` or `bmad-prd` for full story breakdown.
