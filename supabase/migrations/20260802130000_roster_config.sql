-- supabase/migrations/20260802130000_roster_config.sql
--
-- Adds personas.roster_config — DB-driven Clients-tab vocabulary (singular/
-- plural noun, empty-state copy, form labels, etc.), replacing the
-- hardcoded ROSTER_COPY map in app/[slug]/personaConfig.ts. That map only
-- covered 28 of 46 personas (advocate/physio/allied-health/distributor/
-- agency families) — every other persona, including sellganeshidols,
-- silently fell back to TUTOR_ROSTER's "student"/"+ Add student" copy in
-- the My Services → Clients tab.
--
-- Same pattern as 20260802120000_ganesh_idol_showcase.sql's order_config:
-- additive nullable jsonb column, NULL stays a valid tutor-default fallback
-- (see lib/rosterConfig.ts's DEFAULT_ROSTER_CONFIG), filtered/validated at
-- read time rather than cast.
--
-- This migration seeds sellganeshidols with customer vocabulary (matching
-- its existing studio_config.patient_noun = 'customer', set by
-- 20260713200000_storefront_personas.sql) and backfills the 10 existing
-- source presets to their currently-mapped persona ids so behavior is
-- unchanged for every persona that already had correct copy.

ALTER TABLE personas ADD COLUMN IF NOT EXISTS roster_config jsonb;

-- ── sellganeshidols — customer vocabulary ───────────────────────────────────
UPDATE personas SET roster_config = '{
  "singular": "customer",
  "plural": "customers",
  "tabLabel": "Customers",
  "emoji": "🛍️",
  "emptyHeading": "No customers yet",
  "emptySubtext": "Customers appear here automatically when you accept an order.",
  "addLabel": "+ Add customer",
  "lessonsBtnLabel": "🧾 Orders",
  "logTitle": "Log an order",
  "topicLabel": "Order details",
  "topicPlaceholder": "e.g. 3 ft Ganesh, gold finish, seated pose",
  "homeworkLabel": "Follow-up",
  "homeworkPlaceholder": "e.g. Confirm pickup time, send delivery address",
  "notesPlaceholder": "Private notes (not shared with customer)",
  "nextLabel": "Pickup / delivery date",
  "nextPlaceholder": "e.g. Chaturthi eve, 5 PM",
  "historyLabel": "Order history",
  "sessionNoun": "order",
  "contactSectionLabel": "Alternate contact (optional)",
  "contactRowLabel": "Contact",
  "quickLogLabel": "✓ Quick log",
  "removeConfirm": "Remove this customer?"
}'::jsonb
WHERE id = 'sellganeshidols' AND roster_config IS NULL;

-- ── Backfill existing presets — preserves today's copy exactly ─────────────

UPDATE personas SET roster_config = '{
  "singular": "student", "plural": "students", "tabLabel": "Students",
  "emoji": "🎓", "emptyHeading": "No students yet",
  "emptySubtext": "Students appear here automatically when you accept a booking.",
  "addLabel": "+ Add student", "lessonsBtnLabel": "📚 Lessons",
  "logTitle": "Log a lesson", "topicLabel": "Topic",
  "topicPlaceholder": "e.g. Quadratic equations", "homeworkLabel": "Homework",
  "homeworkPlaceholder": "Homework assigned (e.g. Practice problems p.42)",
  "notesPlaceholder": "Private notes (not shared with parent)",
  "nextLabel": "Next session", "nextPlaceholder": "e.g. Saturday 10 AM",
  "historyLabel": "History", "sessionNoun": "session",
  "contactSectionLabel": "Parent / guardian (optional)", "contactRowLabel": "Parent",
  "quickLogLabel": "✓ Quick log", "removeConfirm": "Remove this student?"
}'::jsonb
WHERE id = 'tutor' AND roster_config IS NULL;

UPDATE personas SET roster_config = '{
  "singular": "client", "plural": "clients", "tabLabel": "Clients",
  "emoji": "⚖️", "emptyHeading": "No clients yet",
  "emptySubtext": "Clients appear here when you add them or accept a booking.",
  "addLabel": "+ Add client", "lessonsBtnLabel": "🗂 Matters",
  "logTitle": "Log a consultation", "topicLabel": "Matter",
  "topicPlaceholder": "e.g. Property dispute — first hearing", "homeworkLabel": "Action items",
  "homeworkPlaceholder": "Next steps / action items (e.g. Collect title documents)",
  "notesPlaceholder": "Private case notes (not shared with client)",
  "nextLabel": "Next hearing / meeting", "nextPlaceholder": "e.g. Friday 11 AM, District Court",
  "historyLabel": "Matter history", "sessionNoun": "consultation",
  "contactSectionLabel": "Primary contact (optional)", "contactRowLabel": "Contact",
  "quickLogLabel": "✓ Quick log", "removeConfirm": "Remove this client?"
}'::jsonb
WHERE id = 'advocate' AND roster_config IS NULL;

UPDATE personas SET roster_config = '{
  "singular": "patient", "plural": "patients", "tabLabel": "Patients",
  "emoji": "🧑‍⚕️", "emptyHeading": "No patients yet",
  "emptySubtext": "Patients appear here automatically when you accept a booking.",
  "addLabel": "+ Add patient", "lessonsBtnLabel": "📋 Sessions",
  "logTitle": "Log a treatment session", "topicLabel": "Area treated / techniques",
  "topicPlaceholder": "e.g. Lumbar mobilisation, dry needling L4/L5", "homeworkLabel": "Home exercises assigned",
  "homeworkPlaceholder": "HEP assigned (e.g. Pelvic tilts ×10 ×3/day, gentle walks 20 min)",
  "notesPlaceholder": "Private clinical notes (not shared with patient)",
  "nextLabel": "Next appointment", "nextPlaceholder": "e.g. Thursday 10 AM",
  "historyLabel": "Session history", "sessionNoun": "session",
  "contactSectionLabel": "Emergency contact / guardian (optional)", "contactRowLabel": "Contact",
  "quickLogLabel": "✓ Quick log", "removeConfirm": "Remove this patient?"
}'::jsonb
WHERE id = 'physio' AND roster_config IS NULL;

-- HEALTHCARE_PATIENT_ROSTER — occtherapist, speech, chiro
UPDATE personas SET roster_config = '{
  "singular": "patient", "plural": "patients", "tabLabel": "Patients",
  "emoji": "🧑‍⚕️", "emptyHeading": "No patients yet",
  "emptySubtext": "Patients appear here automatically when you accept a booking.",
  "addLabel": "+ Add patient", "lessonsBtnLabel": "📋 Sessions",
  "logTitle": "Log a session", "topicLabel": "Session focus",
  "topicPlaceholder": "e.g. Initial assessment, follow-up session", "homeworkLabel": "Home programme assigned",
  "homeworkPlaceholder": "e.g. Daily exercises, precautions",
  "notesPlaceholder": "Private clinical notes (not shared with patient)",
  "nextLabel": "Next appointment", "nextPlaceholder": "e.g. Thursday 10 AM",
  "historyLabel": "Session history", "sessionNoun": "session",
  "contactSectionLabel": "Emergency contact / guardian (optional)", "contactRowLabel": "Contact",
  "quickLogLabel": "✓ Quick log", "removeConfirm": "Remove this patient?"
}'::jsonb
WHERE id IN ('occtherapist', 'speech', 'chiro') AND roster_config IS NULL;

-- HEALTHCARE_CLIENT_ROSTER — counselor
UPDATE personas SET roster_config = '{
  "singular": "client", "plural": "clients", "tabLabel": "Clients",
  "emoji": "🧠", "emptyHeading": "No clients yet",
  "emptySubtext": "Clients appear here when you add them or accept a booking.",
  "addLabel": "+ Add client", "lessonsBtnLabel": "📋 Sessions",
  "logTitle": "Log a session", "topicLabel": "Session focus",
  "topicPlaceholder": "e.g. Anxiety management, CBT — session 4", "homeworkLabel": "Homework / practice assigned",
  "homeworkPlaceholder": "e.g. Thought record worksheet, mindfulness exercise",
  "notesPlaceholder": "Private clinical notes (confidential)",
  "nextLabel": "Next session", "nextPlaceholder": "e.g. Wednesday 2 PM",
  "historyLabel": "Session history", "sessionNoun": "session",
  "contactSectionLabel": "Emergency contact (optional)", "contactRowLabel": "Contact",
  "quickLogLabel": "✓ Quick log", "removeConfirm": "Remove this client?"
}'::jsonb
WHERE id = 'counselor' AND roster_config IS NULL;

-- HOLISTIC_ROSTER — homeopath, ayurveda
UPDATE personas SET roster_config = '{
  "singular": "patient", "plural": "patients", "tabLabel": "Patients",
  "emoji": "🌿", "emptyHeading": "No patients yet",
  "emptySubtext": "Patients appear here automatically when you accept a booking.",
  "addLabel": "+ Add patient", "lessonsBtnLabel": "📋 Consultations",
  "logTitle": "Log a consultation", "topicLabel": "Chief complaint / follow-up topic",
  "topicPlaceholder": "e.g. Initial case intake, Follow-up #2", "homeworkLabel": "Regimen / instructions given",
  "homeworkPlaceholder": "e.g. Remedy prescribed, dietary changes, follow-up date",
  "notesPlaceholder": "Private case notes (not shared with patient)",
  "nextLabel": "Next follow-up", "nextPlaceholder": "e.g. 4 weeks — review remedy response",
  "historyLabel": "Consultation history", "sessionNoun": "consultation",
  "contactSectionLabel": "Emergency contact / guardian (optional)", "contactRowLabel": "Contact",
  "quickLogLabel": "✓ Quick log", "removeConfirm": "Remove this patient?"
}'::jsonb
WHERE id IN ('homeopath', 'ayurveda') AND roster_config IS NULL;

-- CAREGIVER_ROSTER — homenurse
UPDATE personas SET roster_config = '{
  "singular": "client", "plural": "clients", "tabLabel": "Clients",
  "emoji": "🏥", "emptyHeading": "No clients yet",
  "emptySubtext": "Clients appear here when you add them.",
  "addLabel": "+ Add client", "lessonsBtnLabel": "📋 Care log",
  "logTitle": "Log a care visit", "topicLabel": "Visit type / shift",
  "topicPlaceholder": "e.g. Morning care, Night shift 22:00–07:00", "homeworkLabel": "Handover notes",
  "homeworkPlaceholder": "e.g. Outstanding tasks for next carer",
  "notesPlaceholder": "Private care notes (not shared with client)",
  "nextLabel": "Next visit / shift", "nextPlaceholder": "e.g. Tomorrow 07:00",
  "historyLabel": "Care log", "sessionNoun": "visit",
  "contactSectionLabel": "Family / emergency contact", "contactRowLabel": "Contact",
  "quickLogLabel": "✓ Quick log", "removeConfirm": "Remove this client?"
}'::jsonb
WHERE id = 'homenurse' AND roster_config IS NULL;

-- POSTNATAL_ROSTER — postnatal, lactation
UPDATE personas SET roster_config = '{
  "singular": "mother", "plural": "mothers", "tabLabel": "Mothers",
  "emoji": "👶", "emptyHeading": "No mothers yet",
  "emptySubtext": "Mothers appear here when you add them or accept a booking.",
  "addLabel": "+ Add mother", "lessonsBtnLabel": "📋 Visits",
  "logTitle": "Log a visit", "topicLabel": "Visit type",
  "topicPlaceholder": "e.g. Day 3 postnatal check, Breastfeeding support visit", "homeworkLabel": "Instructions given",
  "homeworkPlaceholder": "e.g. Latch correction technique, wound care instructions",
  "notesPlaceholder": "Private clinical notes (not shared with mother)",
  "nextLabel": "Next visit / review", "nextPlaceholder": "e.g. 48 hours — weight check",
  "historyLabel": "Visit history", "sessionNoun": "visit",
  "contactSectionLabel": "Partner / emergency contact", "contactRowLabel": "Partner",
  "quickLogLabel": "✓ Quick log", "removeConfirm": "Remove this record?"
}'::jsonb
WHERE id IN ('postnatal', 'lactation') AND roster_config IS NULL;

-- DISTRIBUTOR_ROSTER — 7 distributor-family personas
UPDATE personas SET roster_config = '{
  "singular": "account", "plural": "accounts", "tabLabel": "Accounts",
  "emoji": "🏪", "emptyHeading": "No accounts yet",
  "emptySubtext": "Add dealer and retailer accounts to track your relationships.",
  "addLabel": "+ Add account", "lessonsBtnLabel": "📋 Orders",
  "logTitle": "Log an interaction", "topicLabel": "Topic / Purpose",
  "topicPlaceholder": "e.g. Monthly order, product demo, credit review", "homeworkLabel": "Follow-up",
  "homeworkPlaceholder": "Follow-up action (e.g. Send price list, confirm delivery date)",
  "notesPlaceholder": "Private notes (not shared with account)",
  "nextLabel": "Next follow-up", "nextPlaceholder": "e.g. Call on Monday, visit next week",
  "historyLabel": "History", "sessionNoun": "interaction",
  "contactSectionLabel": "Key contact at account (optional)", "contactRowLabel": "Contact",
  "quickLogLabel": "✓ Quick log", "removeConfirm": "Remove this account?"
}'::jsonb
WHERE id IN ('fmcgdist', 'pharmadist', 'electronicsdist', 'autopartsdist', 'buildingdist', 'agridist', 'distributor')
  AND roster_config IS NULL;

-- AGENCY_ROSTER — 9 agency-family personas
UPDATE personas SET roster_config = '{
  "singular": "client", "plural": "clients", "tabLabel": "Clients",
  "emoji": "🏢", "emptyHeading": "No clients yet",
  "emptySubtext": "Add clients to track engagements and follow-ups.",
  "addLabel": "+ Add client", "lessonsBtnLabel": "📋 Engagements",
  "logTitle": "Log an engagement", "topicLabel": "Topic / Service",
  "topicPlaceholder": "e.g. Initial consultation, proposal review, site visit", "homeworkLabel": "Follow-up",
  "homeworkPlaceholder": "Next step (e.g. Send proposal, share documents, confirm meeting)",
  "notesPlaceholder": "Private notes (not shared with client)",
  "nextLabel": "Next meeting / call", "nextPlaceholder": "e.g. Thursday 3 PM, call next week",
  "historyLabel": "History", "sessionNoun": "engagement",
  "contactSectionLabel": "Key contact (optional)", "contactRowLabel": "Contact",
  "quickLogLabel": "✓ Quick log", "removeConfirm": "Remove this client?"
}'::jsonb
WHERE id IN ('travel', 'realestate', 'insurance', 'staffing', 'marketing', 'immigration', 'events', 'logistics', 'agency')
  AND roster_config IS NULL;
