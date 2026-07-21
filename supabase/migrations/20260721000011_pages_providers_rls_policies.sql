-- pages/providers have RLS enabled (likely toggled by an automated security
-- linter fix) but had zero policies, silently blocking every client-side
-- browser read against them (anon/authenticated role) while service-role API
-- routes kept working fine. This is why MediaTab.tsx's client-side gallery/
-- avatar load always came back empty even when the DB row had data — CLAUDE.md
-- documented these tables as RLS-disabled, but that's no longer true in prod.
--
-- Mirrors the existing owner-access policy pattern already used for
-- provider_email/emails (see 20260712000001_provider_email.sql): an
-- authenticated member may read/write only their own row(s), matched by
-- providers.email = auth.jwt() email. Service role (used by all API routes)
-- bypasses RLS entirely, so server-side behavior is unchanged.

CREATE POLICY "providers: owner access"
  ON providers FOR ALL
  USING (email = auth.jwt() ->> 'email');

CREATE POLICY "pages: owner access"
  ON pages FOR ALL
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE email = auth.jwt() ->> 'email'
    )
  );
