-- plan_features had no unique constraint on (plan_id, feature_key) — only a
-- surrogate uuid PK. The 20260713220000_distributor_agency_personas.sql
-- migration's `ON CONFLICT DO NOTHING` on this table matched nothing as a
-- result, so re-running it (or any future migration following the same
-- pattern) would silently insert duplicate feature-gating rows per plan.
-- feature_key is nullable (null = display-only row), so scope the constraint
-- to rows that actually gate a feature.

CREATE UNIQUE INDEX IF NOT EXISTS plan_features_plan_id_feature_key_key
  ON plan_features (plan_id, feature_key)
  WHERE feature_key IS NOT NULL;
