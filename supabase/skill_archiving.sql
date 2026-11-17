-- Apply after mvp_security_hardening.sql, before using the paired frontend.
begin;

alter table public.skills add column if not exists archived_at timestamptz;

-- Only this owner-checked operation sets archived_at. Existing column grants
-- intentionally do not permit clients to change it directly.
create or replace function public.remove_skill(p_skill_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_skill public.skills%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select * into v_skill from public.skills where id = p_skill_id for update;
  if not found or v_skill.user_id is distinct from auth.uid() then
    raise exception 'Skill not found or not owned by you' using errcode = '42501';
  end if;

  if v_skill.archived_at is not null or exists (
    select 1 from public.exchanges where skill_id = p_skill_id
  ) then
    update public.skills set archived_at = coalesce(archived_at, now()) where id = p_skill_id;
    return jsonb_build_object('id', p_skill_id, 'action', 'archived');
  end if;

  delete from public.skills where id = p_skill_id;
  return jsonb_build_object('id', p_skill_id, 'action', 'deleted');
end $$;
alter function public.remove_skill(uuid) owner to postgres;
revoke all on function public.remove_skill(uuid) from public, anon, authenticated;
grant execute on function public.remove_skill(uuid) to authenticated;

-- Share locks serialize request creation with removal's update lock. A request
-- that wins the lock is retained; one arriving after removal is rejected.
-- Existing exchanges can still be accepted, completed, confirmed or disputed.
create or replace function public.require_active_exchange_skill()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_archived_at timestamptz;
begin
  select archived_at into v_archived_at from public.skills
    where id = new.skill_id for share;
  if not found or v_archived_at is not null then
    raise exception 'This teacher listing is no longer available' using errcode = '23514';
  end if;
  return new;
end $$;
alter function public.require_active_exchange_skill() owner to postgres;
revoke all on function public.require_active_exchange_skill() from public, anon, authenticated;
drop trigger if exists require_active_exchange_skill on public.exchanges;
create trigger require_active_exchange_skill before insert on public.exchanges
  for each row execute function public.require_active_exchange_skill();

notify pgrst, 'reload schema';
commit;
