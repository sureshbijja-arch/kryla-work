-- Advocate letterhead config stored on the provider row.
-- Shape (all optional): { mode, firmName, advocateName, enrolmentNo, barCouncil, chamberAddress, phone, email, logoUrl }
-- mode: 'full' | 'minimal' | 'none'   default = 'minimal' when null

ALTER TABLE providers ADD COLUMN IF NOT EXISTS letterhead jsonb;
