-- Add format column to drafts table.
-- 'html'  = TipTap HTML (new default — TipTap editor output)
-- 'text'  = plain text (legacy rows written by the Phase A textarea editor)
-- Detection: if body starts with '<' treat as html; otherwise treat as legacy text.

ALTER TABLE drafts
  ADD COLUMN IF NOT EXISTS format text NOT NULL DEFAULT 'html';

-- Mark all existing rows as legacy plain text (they were created by the textarea editor).
UPDATE drafts SET format = 'text' WHERE format = 'html' AND body NOT LIKE '<%';
