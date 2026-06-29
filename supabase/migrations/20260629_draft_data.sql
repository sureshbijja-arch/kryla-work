-- Draft column: stores pending chat edits until member confirms & publishes
ALTER TABLE pages ADD COLUMN IF NOT EXISTS draft_data jsonb DEFAULT NULL;
