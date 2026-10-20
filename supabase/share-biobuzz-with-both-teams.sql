-- Share the BioBuzz season and its attached CMS entries across both FTC teams.
-- Preserves the season's current/publication status, dates, and page content.
begin;

do $$
begin
  if not exists (select 1 from public.seasons where slug = 'biobuzz') then
    raise exception 'BioBuzz season was not found';
  end if;
  if exists (
    select 1 from public.seasons
    where slug <> 'biobuzz' and team_id is null and is_current
  ) and exists (
    select 1 from public.seasons
    where slug = 'biobuzz' and is_current
  ) then
    raise exception 'Another shared season is already current; resolve that conflict before sharing BioBuzz';
  end if;
end $$;

update public.seasons
set team_id = null, updated_at = now()
where slug = 'biobuzz';

update public.content_entries
set team_id = null, updated_at = now()
where season_id = (select id from public.seasons where slug = 'biobuzz')
  and team_id is not null;

select id, name, slug, team_id, is_current, status
from public.seasons
where slug = 'biobuzz';

commit;
