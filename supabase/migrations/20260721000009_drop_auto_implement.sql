-- suggestions.auto_implement was written by the admin toggle and the AI
-- agent but read by nothing anywhere in the codebase (verified: zero
-- consumers) — a prominent control implying an auto-implement pipeline
-- that doesn't exist. All code references removed; dropping the column
-- per the project's no-tech-debt rule.

alter table suggestions drop column if exists auto_implement;
