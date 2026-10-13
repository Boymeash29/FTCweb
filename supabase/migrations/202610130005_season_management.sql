alter table public.seasons
  add column if not exists summary text not null default '';

drop policy if exists seasons_published_public_read on public.seasons;
create policy seasons_published_public_read on public.seasons
  for select to anon, authenticated using (status = 'published');
grant select on public.seasons to anon, authenticated;

create or replace function public.save_cms_season(
  p_id uuid,
  p_name text,
  p_slug text,
  p_year_label text,
  p_start_date date,
  p_end_date date,
  p_summary text,
  p_is_current boolean,
  p_status public.content_status
)
returns uuid
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
  if char_length(trim(p_name)) not between 1 and 120 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Invalid season name or slug' using errcode = '22023';
  end if;
  if p_start_date is not null and p_end_date is not null and p_end_date < p_start_date then
    raise exception 'End date must be on or after start date' using errcode = '22023';
  end if;

  if p_is_current then
    update public.seasons
      set is_current = false, updated_at = now()
      where is_current and (p_id is null or id <> p_id);
  end if;

  if p_id is null then
    insert into public.seasons(name, slug, year_label, start_date, end_date, summary, is_current, status, updated_at)
    values (trim(p_name), p_slug, nullif(trim(p_year_label), ''), p_start_date, p_end_date, trim(p_summary), p_is_current, p_status, now())
    returning id into saved_id;
  else
    update public.seasons
      set name = trim(p_name), slug = p_slug, year_label = nullif(trim(p_year_label), ''),
          start_date = p_start_date, end_date = p_end_date, summary = trim(p_summary),
          is_current = p_is_current, status = p_status, updated_at = now()
      where id = p_id
      returning id into saved_id;
    if saved_id is null then
      raise exception 'Season not found' using errcode = 'P0002';
    end if;
  end if;
  return saved_id;
end;
$$;

revoke all on function public.save_cms_season(uuid, text, text, text, date, date, text, boolean, public.content_status) from public, anon;
grant execute on function public.save_cms_season(uuid, text, text, text, date, date, text, boolean, public.content_status) to authenticated;
