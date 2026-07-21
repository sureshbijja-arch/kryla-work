-- Reviews previously published instantly on submit — no auth, no rate
-- limit, no moderation (a spam/defamation vector). New reviews now insert
-- as 'pending' (app/api/reviews/route.ts) and require member approval
-- from ReviewsTab before they appear on the public page. Existing
-- 'published' rows are untouched — no retroactive hiding.

alter table reviews drop constraint if exists reviews_status_check;
alter table reviews add constraint reviews_status_check
  check (status in ('published', 'hidden', 'pending'));

alter table reviews alter column status set default 'pending';
