-- Fix missing columns (all IF NOT EXISTS — safe to run multiple times)
ALTER TABLE providers ADD COLUMN IF NOT EXISTS whatsapp_public boolean DEFAULT true;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS page_language   text    DEFAULT 'en';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS custom_domain   text    UNIQUE;
ALTER TABLE pages     ADD COLUMN IF NOT EXISTS translations    jsonb   DEFAULT '{}'::jsonb;
