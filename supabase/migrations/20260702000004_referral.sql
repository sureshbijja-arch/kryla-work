ALTER TABLE providers ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS referred_by   TEXT;

-- Seed test referral code for sureshbijja@gmail.com
UPDATE providers SET referral_code = 'BIJJA' WHERE email = 'sureshbijja@gmail.com';
