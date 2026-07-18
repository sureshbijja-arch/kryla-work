-- My Tools tile config — backfills `mykryla_tools_label` / `mykryla_tools` keys into
-- personas.studio_config (jsonb) so the MyKryla dashboard's My Tools tile is fully
-- DB-driven: no hardcoded persona->copy lookup table in source (standing project rule).
--
-- Absence of `mykryla_tools` in a persona's studio_config is the "hide the tile" signal
-- — no explicit show:false flag needed. All updates below use `||` jsonb merge so any
-- existing keys (patient_noun, library_label, studio_label, etc.) are preserved.
--
-- No UI code change required beyond reading these two keys — SpaceClient.tsx renders
-- the tile purely from what this migration seeds.

-- ── 1. Advocate — has no studio_config row at all yet ─────────────────────────
UPDATE personas
SET studio_config = studio_config || jsonb_build_object(
  'mykryla_tools_label', 'Legal Tools',
  'mykryla_tools', jsonb_build_array(
    jsonb_build_object(
      'action', 'court',
      'icon', '⚖️',
      'title', 'Court Tools',
      'description', 'CNR lookup, case status, cause lists, orders'
    ),
    jsonb_build_object(
      'action', 'draft',
      'icon', '📝',
      'title', 'Drafting Studio',
      'description', 'Draft, proofread, and manage legal documents'
    )
  )
)
WHERE id = 'advocate';

-- ── 2. Tutor — already has studio_config (patient_noun/library_label etc.) ────
-- Merge in, don't replace existing keys.
UPDATE personas
SET studio_config = studio_config || jsonb_build_object(
  'mykryla_tools_label', 'Students',
  'mykryla_tools', jsonb_build_array(
    jsonb_build_object(
      'action', 'persona-tab',
      'icon', '🎓',
      'title', 'Students',
      'description', 'Manage your student roster and sessions'
    )
  )
)
WHERE id = 'tutor';

-- ── 3. Every other studio-enabled persona (clinical / storefront / distributor /
--      agency families) — all already seeded with studio_label in studio_config.
--      Single set-based statement, not per-row inserts.
UPDATE personas
SET studio_config = studio_config || jsonb_build_object(
  'mykryla_tools_label', studio_config->>'studio_label',
  'mykryla_tools', jsonb_build_array(
    jsonb_build_object(
      'action', 'studio',
      'icon', '🧰',
      'title', studio_config->>'studio_label',
      'description', 'Generate and manage your documents'
    )
  )
)
WHERE studio_archetype IS NOT NULL
  AND studio_config->>'studio_label' IS NOT NULL;

-- All remaining personas (no studio_archetype, not advocate/tutor) are left
-- untouched — absence of mykryla_tools in studio_config hides the My Tools tile.
