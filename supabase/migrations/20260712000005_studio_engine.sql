-- Studio Engine — config-driven generalization of the physio Working Studio.
--
-- Replaces the physio-specific clinical_* stack with a persona-agnostic model:
--   studio_archetypes  — 4 archetypes: rehab | counseling | holistic | careplan
--   studio_modes       — per-archetype modes with dynamic form schemas + prompt instructions
--   studio_documents   — generalized doc store (← clinical_notes + treatment_plans + hep_programs)
--   studio_templates   — generalized template store (← clinical_doc_templates)
--   studio_library     — generalized content library (← exercise_library)
--   studio_usage       — generalized rate-limit counter (← working_usage)
--
-- personas table is extended with:
--   studio_archetype   — which archetype this persona uses (null = no studio)
--   studio_guidance    — persona-specific layer added on top of the archetype base prompt
--   studio_config      — jsonb: patient_noun, patient_noun_plural, library_categories, etc.
--
-- Migrates existing physio clinical_* data into the new studio_* tables.
-- clinical_* tables are NOT dropped here — they are retired in Phase 5 after parity verification.

-- ── 1. Studio archetypes ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS studio_archetypes (
  id             text        PRIMARY KEY,   -- 'rehab' | 'counseling' | 'holistic' | 'careplan'
  label          text        NOT NULL,
  base_guidance  text        NOT NULL DEFAULT '',  -- archetype-level guardrail + output conventions
  disclaimer     text        NOT NULL DEFAULT '',  -- amber disclaimer banner text in the studio UI
  has_library    boolean     NOT NULL DEFAULT false,
  library_label  text        NOT NULL DEFAULT 'Library',
  feature_key    text        NOT NULL DEFAULT 'studio',  -- plan gate key (matches plan_features.feature_key)
  active         boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ── 2. Studio modes ───────────────────────────────────────────────────────────
-- Each mode represents one tab in the studio mode switcher.
-- form_schema drives the dynamic input form rendered in PractitionerStudio.
-- prompt_instructions is appended to the user message after the form data.

CREATE TABLE IF NOT EXISTS studio_modes (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  archetype_id        text        NOT NULL REFERENCES studio_archetypes(id) ON DELETE CASCADE,
  key                 text        NOT NULL,   -- 'assess' | 'note' | 'plan' | 'program' | 'report' | 'refine' | etc.
  label               text        NOT NULL,   -- display label in the mode pill
  sort_order          integer     NOT NULL DEFAULT 0,
  -- form_schema: [{id, label, type, placeholder, required, group, options?, rows?}]
  -- type: 'text' | 'textarea' | 'select' | 'library'
  -- group: organises fields into layout columns (e.g. 'subjective' + 'objective' → 2 cols)
  -- options: [{value, label}] for select fields
  -- rows: hint for textarea height
  form_schema         jsonb       NOT NULL DEFAULT '[]',
  prompt_instructions text        NOT NULL DEFAULT '',  -- instruction appended to the user message
  output_format       text        NOT NULL DEFAULT 'html' CHECK (output_format IN ('html', 'json', 'redline')),
  streaming           boolean     NOT NULL DEFAULT false,
  active              boolean     NOT NULL DEFAULT true,
  UNIQUE (archetype_id, key)
);

CREATE INDEX IF NOT EXISTS idx_studio_modes_archetype ON studio_modes(archetype_id, sort_order);

-- ── 3. Extend personas ────────────────────────────────────────────────────────

ALTER TABLE personas
  ADD COLUMN IF NOT EXISTS studio_archetype text REFERENCES studio_archetypes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS studio_guidance  text,
  ADD COLUMN IF NOT EXISTS studio_config    jsonb NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_personas_studio_archetype ON personas(studio_archetype) WHERE studio_archetype IS NOT NULL;

-- ── 4. Generalized document store ─────────────────────────────────────────────
-- Replaces clinical_notes, treatment_plans, hep_programs.
-- doc_type = mode key (e.g. 'assess', 'note', 'plan', 'program', 'report')
-- structured = raw form input as jsonb (for re-editing the form after save)
-- body = generated HTML document (editor output)

CREATE TABLE IF NOT EXISTS studio_documents (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  uuid        NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  student_id   uuid                 REFERENCES students(id) ON DELETE SET NULL,
  persona      text        NOT NULL,
  doc_type     text        NOT NULL,
  title        text        NOT NULL DEFAULT '',
  body         text        NOT NULL DEFAULT '',
  structured   jsonb       NOT NULL DEFAULT '{}',
  status       text        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final')),
  visit_date   date        NOT NULL DEFAULT CURRENT_DATE,
  share_token  uuid        UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_documents_provider ON studio_documents(provider_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_studio_documents_student  ON studio_documents(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_studio_documents_persona  ON studio_documents(persona, doc_type);
CREATE INDEX IF NOT EXISTS idx_studio_documents_token    ON studio_documents(share_token) WHERE share_token IS NOT NULL;

-- ── 5. Generalized template store ─────────────────────────────────────────────
-- Replaces clinical_doc_templates.
-- fields: [{id, label, placeholder, required}] — fields shown in the Report mode form.

CREATE TABLE IF NOT EXISTS studio_templates (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  persona       text        NOT NULL,
  doc_type      text        NOT NULL,
  label         text        NOT NULL,
  description   text,
  fields        jsonb       NOT NULL DEFAULT '[]',
  body_scaffold text,
  is_system     boolean     NOT NULL DEFAULT true,
  provider_id   uuid        REFERENCES providers(id) ON DELETE CASCADE,  -- null = system template
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_templates_persona  ON studio_templates(persona, is_system);
CREATE INDEX IF NOT EXISTS idx_studio_templates_provider ON studio_templates(provider_id) WHERE provider_id IS NOT NULL;

-- ── 6. Generalized content library ────────────────────────────────────────────
-- Replaces exercise_library (physio) and extends the pattern to all archetypes.
-- meta: flexible jsonb for archetype-specific params
--   rehab: {default_sets, default_reps, default_hold, default_duration}
--   counseling: {estimated_duration_min, difficulty}
--   holistic: {dosage_form, typical_dose, contraindications}
--   careplan: {frequency, duration, equipment_needed}

CREATE TABLE IF NOT EXISTS studio_library (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  persona       text        NOT NULL,
  category      text        NOT NULL,
  name          text        NOT NULL,
  description   text        NOT NULL DEFAULT '',
  instructions  text        NOT NULL DEFAULT '',
  meta          jsonb       NOT NULL DEFAULT '{}',
  media_url     text,
  tags          jsonb       NOT NULL DEFAULT '[]',
  is_system     boolean     NOT NULL DEFAULT true,
  provider_id   uuid        REFERENCES providers(id) ON DELETE CASCADE,  -- null = system item
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_library_persona   ON studio_library(persona, is_system);
CREATE INDEX IF NOT EXISTS idx_studio_library_category  ON studio_library(category);
CREATE INDEX IF NOT EXISTS idx_studio_library_provider  ON studio_library(provider_id) WHERE provider_id IS NOT NULL;

-- ── 7. Generalized rate-limit counter ─────────────────────────────────────────
-- Replaces working_usage and drafting_usage (one shared counter for all studio types).

CREATE TABLE IF NOT EXISTS studio_usage (
  provider_id  uuid        NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  day_key      date        NOT NULL,
  count        integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (provider_id, day_key)
);

-- ── 8. Migrate existing physio clinical_* data into studio_* ──────────────────
-- clinical_* tables remain until Phase 5 parity check passes.

-- clinical_doc_templates → studio_templates
INSERT INTO studio_templates (id, persona, doc_type, label, description, fields, body_scaffold, is_system, provider_id, created_at)
SELECT id, persona, doc_type, label, description, fields, body_scaffold, is_system, provider_id, created_at
FROM   clinical_doc_templates
ON CONFLICT (id) DO NOTHING;

-- clinical_notes → studio_documents (note_type maps to doc_type)
INSERT INTO studio_documents (id, provider_id, student_id, persona, doc_type, title, body, structured, status, visit_date, share_token, created_at, updated_at)
SELECT
  id,
  provider_id,
  student_id,
  'physio',
  CASE note_type
    WHEN 'eval'       THEN 'assess'
    WHEN 'progress'   THEN 'note'
    WHEN 'discharge'  THEN 'report'
    ELSE note_type
  END,
  COALESCE(NULLIF(note_type, ''), 'progress') || ' note',
  body,
  jsonb_build_object(
    'subjective',  subjective,
    'objective',   objective,
    'assessment',  assessment,
    'plan',        plan,
    'body_chart',  body_chart
  ),
  status,
  visit_date,
  share_token,
  created_at,
  updated_at
FROM clinical_notes
ON CONFLICT (id) DO NOTHING;

-- treatment_plans → studio_documents
INSERT INTO studio_documents (id, provider_id, student_id, persona, doc_type, title, body, structured, status, visit_date, share_token, created_at, updated_at)
SELECT
  id,
  provider_id,
  student_id,
  'physio',
  'plan',
  title,
  body,
  jsonb_build_object(
    'diagnosis',       diagnosis,
    'goals',           goals,
    'modalities',      modalities,
    'frequency',       frequency,
    'duration_weeks',  duration_weeks,
    'phases',          phases
  ),
  status,
  CURRENT_DATE,
  null,
  created_at,
  updated_at
FROM treatment_plans
ON CONFLICT (id) DO NOTHING;

-- hep_programs → studio_documents
INSERT INTO studio_documents (id, provider_id, student_id, persona, doc_type, title, body, structured, status, visit_date, share_token, created_at, updated_at)
SELECT
  id,
  provider_id,
  student_id,
  'physio',
  'program',
  title,
  body,
  jsonb_build_object(
    'libraryItems',  exercises,
    'instructions',  instructions
  ),
  status,
  CURRENT_DATE,
  share_token,
  created_at,
  updated_at
FROM hep_programs
ON CONFLICT (id) DO NOTHING;

-- exercise_library → studio_library
INSERT INTO studio_library (id, persona, category, name, description, instructions, meta, media_url, tags, is_system, provider_id, created_at)
SELECT
  id,
  persona,
  category,
  name,
  description,
  instructions,
  jsonb_build_object(
    'default_sets',     default_sets,
    'default_reps',     default_reps,
    'default_hold',     default_hold,
    'default_duration', default_duration
  ),
  media_url,
  tags,
  is_system,
  provider_id,
  created_at
FROM exercise_library
ON CONFLICT (id) DO NOTHING;

-- working_usage → studio_usage
INSERT INTO studio_usage (provider_id, day_key, count)
SELECT provider_id, day_key, count
FROM   working_usage
ON CONFLICT (provider_id, day_key) DO NOTHING;
