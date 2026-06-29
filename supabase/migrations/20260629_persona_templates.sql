-- Add custom_persona_name to providers
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS custom_persona_name text;

-- Global catalog for custom persona templates
CREATE TABLE IF NOT EXISTS persona_templates (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_name   text UNIQUE NOT NULL,
  template       text NOT NULL DEFAULT 'focus',
  palette        text NOT NULL DEFAULT 'professional',
  status         text NOT NULL DEFAULT 'generating',  -- generating | ready | failed
  created_at     timestamptz DEFAULT now()
);
