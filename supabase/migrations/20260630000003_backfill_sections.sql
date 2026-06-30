-- Backfill sections for existing members who have sections IS NULL.
-- Only affects pages built before W4 (Inngest now sets sections on all new builds).
UPDATE pages p
SET sections = CASE pr.persona
  WHEN 'baker' THEN '[
    {"sectionKey":"hero",       "variant":"auto",      "order":1},
    {"sectionKey":"services",   "variant":"menu",      "order":2},
    {"sectionKey":"highlights", "variant":"stats",     "order":3},
    {"sectionKey":"bio",        "variant":"callout",   "order":4},
    {"sectionKey":"faq",        "variant":"accordion", "order":5},
    {"sectionKey":"contact",    "variant":"both",      "order":6}
  ]'::jsonb
  WHEN 'chef' THEN '[
    {"sectionKey":"hero",       "variant":"auto",      "order":1},
    {"sectionKey":"services",   "variant":"menu",      "order":2},
    {"sectionKey":"gallery",    "variant":"grid",      "order":3},
    {"sectionKey":"bio",        "variant":"callout",   "order":4},
    {"sectionKey":"contact",    "variant":"whatsapp",  "order":5}
  ]'::jsonb
  WHEN 'salon' THEN '[
    {"sectionKey":"hero",       "variant":"auto",      "order":1},
    {"sectionKey":"services",   "variant":"pricing",   "order":2},
    {"sectionKey":"gallery",    "variant":"scroll",    "order":3},
    {"sectionKey":"highlights", "variant":"cards",     "order":4},
    {"sectionKey":"faq",        "variant":"accordion", "order":5},
    {"sectionKey":"contact",    "variant":"minimal",   "order":6}
  ]'::jsonb
  WHEN 'trainer' THEN '[
    {"sectionKey":"hero",       "variant":"auto",      "order":1},
    {"sectionKey":"highlights", "variant":"numbered",  "order":2},
    {"sectionKey":"services",   "variant":"features",  "order":3},
    {"sectionKey":"bio",        "variant":"accent",    "order":4},
    {"sectionKey":"faq",        "variant":"accordion", "order":5},
    {"sectionKey":"contact",    "variant":"both",      "order":6}
  ]'::jsonb
  WHEN 'photographer' THEN '[
    {"sectionKey":"hero",       "variant":"auto",      "order":1},
    {"sectionKey":"gallery",    "variant":"featured",  "order":2},
    {"sectionKey":"bio",        "variant":"dark",      "order":3},
    {"sectionKey":"services",   "variant":"list",      "order":4},
    {"sectionKey":"contact",    "variant":"minimal",   "order":5}
  ]'::jsonb
  WHEN 'doctor' THEN '[
    {"sectionKey":"hero",       "variant":"auto",      "order":1},
    {"sectionKey":"highlights", "variant":"numbered",  "order":2},
    {"sectionKey":"services",   "variant":"grid",      "order":3},
    {"sectionKey":"bio",        "variant":"paragraph", "order":4},
    {"sectionKey":"faq",        "variant":"accordion", "order":5},
    {"sectionKey":"contact",    "variant":"both",      "order":6}
  ]'::jsonb
  WHEN 'musician' THEN '[
    {"sectionKey":"hero",       "variant":"auto",      "order":1},
    {"sectionKey":"bio",        "variant":"dark",      "order":2},
    {"sectionKey":"gallery",    "variant":"scroll",    "order":3},
    {"sectionKey":"services",   "variant":"list",      "order":4},
    {"sectionKey":"highlights", "variant":"stats",     "order":5},
    {"sectionKey":"contact",    "variant":"minimal",   "order":6}
  ]'::jsonb
  WHEN 'tutor' THEN '[
    {"sectionKey":"hero",       "variant":"auto",      "order":1},
    {"sectionKey":"highlights", "variant":"numbered",  "order":2},
    {"sectionKey":"services",   "variant":"features",  "order":3},
    {"sectionKey":"bio",        "variant":"callout",   "order":4},
    {"sectionKey":"faq",        "variant":"accordion", "order":5},
    {"sectionKey":"contact",    "variant":"both",      "order":6}
  ]'::jsonb
  ELSE '[
    {"sectionKey":"hero",       "variant":"auto",      "order":1},
    {"sectionKey":"services",   "variant":"features",  "order":2},
    {"sectionKey":"highlights", "variant":"icons",     "order":3},
    {"sectionKey":"bio",        "variant":"paragraph", "order":4},
    {"sectionKey":"faq",        "variant":"accordion", "order":5},
    {"sectionKey":"contact",    "variant":"both",      "order":6}
  ]'::jsonb
END
FROM providers pr
WHERE p.provider_id = pr.id
AND p.sections IS NULL;
