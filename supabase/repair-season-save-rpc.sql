-- Repair only the team-aware season-save RPC. This does not modify season rows.
-- Run in the Supabase SQL Editor, then retry saving from the CMS.
begin;

drop function if exists public.save_cms_season(
  uuid, text, text, text, date, date, text, boolean, public.content_status
);
drop function if exists public.save_cms_season(
  uuid, text, text, text, date, date, text, boolean, public.content_status, uuid
);

create function public.save_cms_season(
  p_id uuid,
  p_name text,
  p_slug text,
  p_year_label text,
  p_start_date date,
  p_end_date date,
  p_summary text,
  p_is_current boolean,
  p_status public.content_status,
  p_team_id uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
begin
  if not public.is_cms_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if char_length(trim(p_name)) not between 1 and 120
     or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Invalid season name or slug' using errcode = '22023';
  end if;
  if p_start_date is not null and p_end_date is not null and p_end_date < p_start_date then
    raise exception 'End date must be on or after start date' using errcode = '22023';
  end if;
  if p_team_id is not null and not exists (
    select 1 from public.teams where id = p_team_id
  ) then
    raise exception 'Team not found' using errcode = '23503';
  end if;

  if p_is_current and p_team_id is not null then
    update public.seasons set is_current = false, updated_at = now()
    where team_id = p_team_id and is_current and (p_id is null or id <> p_id);
  elsif p_is_current then
    update public.seasons set is_current = false, updated_at = now()
    where team_id is null and is_current and (p_id is null or id <> p_id);
  end if;

  if p_id is null then
    insert into public.seasons(
      name, slug, year_label, start_date, end_date, summary, is_current, status, team_id, updated_at
    ) values (
      trim(p_name), p_slug, nullif(trim(p_year_label), ''), p_start_date, p_end_date,
      trim(p_summary), p_is_current, p_status, p_team_id, now()
    ) returning id into saved_id;
  else
    update public.seasons set
      name = trim(p_name), slug = p_slug, year_label = nullif(trim(p_year_label), ''),
      start_date = p_start_date, end_date = p_end_date, summary = trim(p_summary),
      is_current = p_is_current, status = p_status, team_id = p_team_id, updated_at = now()
    where id = p_id returning id into saved_id;
    if saved_id is null then
      raise exception 'Season not found' using errcode = 'P0002';
    end if;
  end if;
  return saved_id;
end;
$$;

revoke all on function public.save_cms_season(
  uuid, text, text, text, date, date, text, boolean, public.content_status, uuid
) from public, anon;
grant execute on function public.save_cms_season(
  uuid, text, text, text, date, date, text, boolean, public.content_status, uuid
) to authenticated;

notify pgrst, 'reload schema';
commit;
