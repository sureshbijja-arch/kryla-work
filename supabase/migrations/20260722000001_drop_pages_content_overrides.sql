-- Remove the admin "Overrides" feature (custom CSS + content overlay on
-- pages). Feature fully removed from app code (app/api/admin/members/[id]/overrides
-- route, admin UI, public/preview page consumers); no rows had non-null data
-- in either column at time of removal.
alter table pages
  drop column if exists custom_css,
  drop column if exists content_overrides;
