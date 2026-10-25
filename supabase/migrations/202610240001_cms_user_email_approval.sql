-- Let CMS administrators add or update an approved user by verified email,
-- without copying an Auth UUID from the Supabase dashboard.
create or replace function public.save_cms_user_by_email(
  p_email text,
  p_role text,
  p_active boolean
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(trim(p_email));
  target_id uuid;
  target_email text;
  old_role public.cms_role;
  old_active boolean;
  audit_action text;
begin
  if not public.is_cms_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if normalized_email = '' or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or p_role is null or p_role not in ('admin', 'editor') or p_active is null then
    raise exception 'Invalid CMS user details' using errcode = '22023';
  end if;

  select u.id, u.email into target_id, target_email
  from auth.users u
  where lower(u.email) = normalized_email and u.email_confirmed_at is not null
  limit 1;
  if target_id is null then
    raise exception using errcode = 'P0001', message = 'cms_user_not_found';
  end if;
  if target_id = (select auth.uid()) then
    raise exception using errcode = 'P0001', message = 'cms_user_self';
  end if;

  select u.role, u.active into old_role, old_active
  from public.cms_users u where u.id = target_id;

  if old_role = 'admin' and old_active
     and (p_role <> 'admin' or not p_active)
     and (select count(*) from public.cms_users where role = 'admin' and active) <= 1 then
    raise exception using errcode = 'P0001', message = 'cms_user_last_admin';
  end if;

  insert into public.cms_users(id, email, role, active)
  values (target_id, target_email, p_role::public.cms_role, p_active)
  on conflict (id) do update
    set email = excluded.email, role = excluded.role, active = excluded.active, updated_at = now();

  audit_action := case when old_role is null then 'cms_user_approved' else 'cms_user_updated' end;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values ((select auth.uid()), audit_action, 'cms_user', target_id,
    jsonb_build_object('role', p_role, 'active', p_active));

  return target_id;
end;
$$;

revoke all on function public.save_cms_user_by_email(text, text, boolean) from public, anon;
grant execute on function public.save_cms_user_by_email(text, text, boolean) to authenticated;

notify pgrst, 'reload schema';
