-- Add persona column to plan_features.
-- NULL = applies to all personas (generic).
-- Non-null = persona-specific label override for that plan tier.
ALTER TABLE plan_features ADD COLUMN IF NOT EXISTS persona text DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_plan_features_persona ON plan_features (persona);
