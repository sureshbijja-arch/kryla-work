-- Track consecutive billing-period payment failures per provider.
--
-- consecutive_payment_failures: incremented once per DISTINCT failed invoice
--   (Stripe retries the same invoice multiple times — we dedup by invoice ID).
--   1 = first missed month  → reminder emails
--   2 = second missed month → urgent alert + access restricted at period end
--   Reset to 0 on any successful payment.
--
-- last_payment_failed_invoice: Stripe invoice ID of the last counted failure.
--   Prevents double-counting retries within the same billing period.

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS consecutive_payment_failures int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_payment_failed_invoice  text NULL;
