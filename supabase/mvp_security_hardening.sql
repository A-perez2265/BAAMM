-- Candidate upgrade; do not apply to a hosted project before review.
-- Prerequisites: existing profiles/skills/exchanges/disputes/dispute_actions
-- and the avatar column. See docs/database-deployment.md for preflight.
-- This transaction fails intact if legacy data violates the new requirements.
begin;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((auth.jwt()->'app_metadata'->>'is_admin') = 'true', false); $$;
alter function public.is_admin() owner to postgres;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_display_name text;
  v_general_location text;
begin
  v_username := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 6)
  );

  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    v_username
  );

  v_general_location := coalesce(
    nullif(trim(new.raw_user_meta_data->>'general_location'), ''),
    nullif(trim(new.raw_user_meta_data->>'location'), '')
  );

  insert into public.profiles (
    id,
    username,
    display_name,
    general_location,
    location,
    verification_video_link,
    credits_balance,
    is_admin,
    created_at
  ) values (
    new.id,
    v_username,
    v_display_name,
    v_general_location,
    v_general_location,
    null,
    3,
    false,
    now()
  )
  on conflict (id) do update set
    username = coalesce(public.profiles.username, excluded.username),
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    general_location = coalesce(excluded.general_location, public.profiles.general_location),
    location = coalesce(excluded.location, public.profiles.location),
    verification_video_link = coalesce(excluded.verification_video_link, public.profiles.verification_video_link);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Existing videos remain stored. Public URLs stop working after this change.
update storage.buckets set public = false where id = 'verification-videos';
drop policy if exists verification_videos_public_select on storage.objects;
drop policy if exists verification_videos_auth_insert on storage.objects;
drop policy if exists verification_videos_auth_update on storage.objects;
drop policy if exists verification_videos_auth_delete on storage.objects;
drop policy if exists verification_videos_private_select on storage.objects;
create policy verification_videos_private_select on storage.objects for select to authenticated
using (bucket_id = 'verification-videos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- Replace permissive legacy policies on these feature tables. No other tables
-- or buckets are affected. Column grants and RLS independently restrict writes.
do $$ declare p record; begin
  for p in select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('profiles','skills','exchanges','disputes','dispute_actions')
  loop execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename); end loop;
end $$;
alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.exchanges enable row level security;
alter table public.disputes enable row level security;
alter table public.dispute_actions enable row level security;
create policy profiles_own_read on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_own_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy skills_read on public.skills for select to authenticated using (true);
create policy skills_insert on public.skills for insert to authenticated with check (user_id = auth.uid());
create policy skills_update on public.skills for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy skills_delete on public.skills for delete to authenticated using (user_id = auth.uid());
create policy exchanges_participant_read on public.exchanges for select to authenticated using (auth.uid() in (learner_id, teacher_id));
create policy exchanges_learner_insert on public.exchanges for insert to authenticated with check (learner_id = auth.uid());
create policy exchanges_participant_update on public.exchanges for update to authenticated using (auth.uid() in (learner_id, teacher_id)) with check (auth.uid() in (learner_id, teacher_id));
create policy disputes_participant_read on public.disputes for select to authenticated
using (public.is_admin() or exists (select 1 from public.exchanges e where e.id = exchange_id and auth.uid() in (e.learner_id,e.teacher_id)));
create policy dispute_actions_admin_read on public.dispute_actions for select to authenticated using (public.is_admin());

-- Deliberately uses the view owner's access to expose only this safe projection.
-- The explicit session predicate prevents anonymous reads of the definer view.
create or replace view public.public_profiles with (security_barrier = true) as
select id, display_name, username, bio, location, avatar_id from public.profiles where auth.uid() is not null;
alter view public.public_profiles owner to postgres;
revoke all on public.public_profiles from public, anon, authenticated;
grant select on public.public_profiles to authenticated;
revoke all on public.profiles, public.skills, public.exchanges, public.disputes, public.dispute_actions from public, anon, authenticated;
-- Revoke any legacy column grants too; table-level REVOKE alone is insufficient.
do $$ declare c record; begin
  for c in select table_name, column_name from information_schema.columns
    where table_schema = 'public' and table_name in ('profiles','skills','exchanges','disputes','dispute_actions')
  loop execute format('revoke all (%I) on public.%I from public, anon, authenticated', c.column_name, c.table_name); end loop;
end $$;
grant select on public.profiles, public.skills, public.exchanges, public.disputes, public.dispute_actions to authenticated;
grant update (display_name, username, bio, location, avatar_id) on public.profiles to authenticated;
grant insert (user_id, listing_type, title, description, category, tags, experience_level, format, language, location) on public.skills to authenticated;
grant update (listing_type, title, description, category, tags, experience_level, format, language, location) on public.skills to authenticated;
grant delete on public.skills to authenticated;
grant insert (learner_id, teacher_id, skill_id, message, status) on public.exchanges to authenticated;
grant update (status, updated_at) on public.exchanges to authenticated;

-- Preserve historical references even where the hosted schema lacks a skill FK.
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.exchanges'::regclass and conname = 'exchanges_skill_history_fk') then
    alter table public.exchanges add constraint exchanges_skill_history_fk foreign key (skill_id) references public.skills(id) on delete restrict;
  end if;
end $$;
create or replace function public.protect_exchange_skill_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.exchanges where skill_id = old.id) then
    raise exception 'This skill has exchange history and cannot be removed' using errcode = '23503';
  end if;
  return old;
end $$;
drop trigger if exists protect_exchange_skill_history on public.skills;
create trigger protect_exchange_skill_history before delete on public.skills for each row execute function public.protect_exchange_skill_history();

create or replace function public.guard_exchange_write()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  -- Only reviewed definer functions (owned by postgres) may settle or dispute.
  if current_user = 'postgres' then return new; end if;
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if TG_OP = 'INSERT' then
    if new.learner_id is distinct from auth.uid() or new.teacher_id = new.learner_id
       or new.status is distinct from 'pending' or length(trim(new.message)) = 0 then
      raise exception 'Invalid exchange request';
    end if;
    if not exists (select 1 from public.skills where id = new.skill_id and user_id = new.teacher_id and listing_type = 'Teacher') then
      raise exception 'Teacher listing is unavailable';
    end if;
    if not exists (select 1 from public.profiles where id = auth.uid() and credits_balance >= 1) then
      raise exception 'At least one credit is required';
    end if;
  else
    if new.learner_id is distinct from old.learner_id or new.teacher_id is distinct from old.teacher_id
       or new.skill_id is distinct from old.skill_id or new.message is distinct from old.message
       or new.id is distinct from old.id or new.created_at is distinct from old.created_at then
      raise exception 'Exchange participants and request details are immutable';
    end if;
    if auth.uid() is distinct from old.teacher_id or not (
      (old.status = 'pending' and new.status in ('accepted','declined')) or
      (old.status = 'accepted' and new.status = 'session_completed')
    ) then raise exception 'Unauthorized exchange transition'; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists guard_exchange_write on public.exchanges;
create trigger guard_exchange_write before insert or update on public.exchanges for each row execute function public.guard_exchange_write();
create unique index if not exists disputes_one_active_per_exchange on public.disputes(exchange_id) where status in ('open','under_review');

create or replace function public.confirm_skill_exchange(p_exchange_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare e public.exchanges%rowtype; balance integer; profile_count integer;
begin
  select * into e from public.exchanges where id = p_exchange_id for update;
  if not found then raise exception 'Exchange not found'; end if;
  if auth.uid() is null or e.learner_id is distinct from auth.uid() then raise exception 'Only the learner may confirm'; end if;
  if e.status not in ('session_completed','awaiting_confirmation') then raise exception 'Teacher completion is required; exchange cannot be finalized in status %', e.status; end if;
  if e.learner_id = e.teacher_id then raise exception 'Self-exchanges are prohibited'; end if;
  if exists (select 1 from public.disputes where exchange_id = e.id and status in ('open','under_review')) then raise exception 'Dispute blocks confirmation'; end if;
  -- Stable lock order also serializes concurrent exchanges sharing either user.
  perform id from public.profiles where id in (e.learner_id,e.teacher_id) order by id for update;
  get diagnostics profile_count = row_count;
  if profile_count <> 2 then raise exception 'Both participant profiles are required'; end if;
  select credits_balance into balance from public.profiles where id = e.learner_id;
  if balance is null or balance < 1 then raise exception 'Insufficient credits'; end if;
  update public.profiles set credits_balance = credits_balance - 1 where id = e.learner_id;
  update public.profiles set credits_balance = credits_balance + 1 where id = e.teacher_id;
  update public.exchanges set status = 'completed', updated_at = now() where id = e.id;
  return jsonb_build_object('success',true,'exchange_id',e.id,'status','completed','transferred_credits',1);
end $$;

create or replace function public.submit_skill_dispute(p_exchange_id uuid, p_reason text, p_details text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare e public.exchanges%rowtype; dispute_id uuid; other_id uuid; reporter_name text; other_name text; reporter_mail text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_reason is null or length(trim(p_reason)) not between 1 and 200
    or p_details is null or length(trim(p_details)) not between 15 and 2000 then raise exception 'A reason and explanation (15–2000 characters) are required'; end if;
  select * into e from public.exchanges where id = p_exchange_id for update;
  if not found or auth.uid() not in (e.learner_id,e.teacher_id) then raise exception 'Exchange not available to this user'; end if;
  if e.status not in ('accepted','session_completed','awaiting_confirmation') then raise exception 'Only accepted unsettled exchanges can be disputed'; end if;
  other_id := case when auth.uid() = e.learner_id then e.teacher_id else e.learner_id end;
  select username into reporter_name from public.profiles where id = auth.uid();
  select username into other_name from public.profiles where id = other_id;
  select email into reporter_mail from auth.users where id = auth.uid();
  insert into public.disputes(exchange_id,reporter_id,reported_user_id,reporter_email,reporter_username,reported_username,reason,additional_details,status)
    values(e.id,auth.uid(),other_id,reporter_mail,reporter_name,other_name,trim(p_reason),trim(p_details),'open') returning id into dispute_id;
  update public.exchanges set status = 'issue_reported', updated_at = now() where id = e.id;
  return jsonb_build_object('id',dispute_id,'exchange_id',e.id,'status','open');
end $$;

create or replace function public.review_skill_dispute(p_dispute_id uuid, p_status text, p_explanation text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare d public.disputes%rowtype; exchange_id_value uuid; exchange_status text;
begin
  if auth.uid() is null or public.is_admin() is not true then raise exception 'Administrator access required'; end if;
  if p_status is null or p_status not in ('under_review','resolved') then raise exception 'Invalid dispute outcome'; end if;
  if p_explanation is null or length(trim(p_explanation)) not between 15 and 2000 then raise exception 'An explanation (15–2000 characters) is required'; end if;
  select exchange_id into exchange_id_value from public.disputes where id = p_dispute_id;
  if not found then raise exception 'Dispute not found'; end if;
  select status into exchange_status from public.exchanges where id = exchange_id_value for update;
  select * into d from public.disputes where id = p_dispute_id for update;
  if exchange_status is distinct from 'issue_reported' or d.status = 'resolved' or d.status = p_status then raise exception 'Dispute transition is not available'; end if;
  update public.disputes set status = p_status where id = d.id;
  insert into public.dispute_actions(dispute_id,actor_id,actor_label,action,detail)
    values(d.id,auth.uid(),'Administrator','status_changed',
      case when p_status = 'resolved' then 'Closed without payment. ' else 'Under review. ' end || trim(p_explanation));
  return jsonb_build_object('id',d.id,'status',p_status,'transferred_credits',0);
end $$;

-- Keep both legacy signatures routed through the same settlement guard.
create or replace function public.complete_exchange(p_exchange_id uuid)
returns jsonb language sql security invoker set search_path = public
as $$ select public.confirm_skill_exchange(p_exchange_id); $$;
create or replace function public.complete_exchange(p_exchange_id uuid, p_credit_amount integer default 1)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if p_credit_amount is distinct from 1 then raise exception 'Exactly one credit is transferred'; end if;
  perform public.confirm_skill_exchange(p_exchange_id);
end $$;
alter function public.confirm_skill_exchange(uuid) owner to postgres;
alter function public.submit_skill_dispute(uuid,text,text) owner to postgres;
alter function public.review_skill_dispute(uuid,text,text) owner to postgres;
revoke all on function public.confirm_skill_exchange(uuid), public.submit_skill_dispute(uuid,text,text), public.review_skill_dispute(uuid,text,text), public.complete_exchange(uuid), public.complete_exchange(uuid,integer) from public, anon;
grant execute on function public.confirm_skill_exchange(uuid), public.submit_skill_dispute(uuid,text,text), public.review_skill_dispute(uuid,text,text), public.complete_exchange(uuid), public.complete_exchange(uuid,integer) to authenticated;

create or replace function public.protect_profile_sensitive_columns()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin then
    if auth.uid() is null or public.is_admin() is not true then
      raise exception 'Only admins can change admin status';
    end if;
  end if;

  if new.credits_balance is distinct from old.credits_balance then
    if current_user <> 'postgres' then
      if auth.uid() is null or public.is_admin() is not true then
        raise exception 'Only admins can change credits';
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- Ordinary clients have no direct profile insert or protected-column grants.
-- Definer settlement runs as postgres, allowing only its reviewed balance path.
drop trigger if exists protect_profile_sensitive_columns on public.profiles;
create trigger protect_profile_sensitive_columns before update on public.profiles for each row execute function public.protect_profile_sensitive_columns();
notify pgrst, 'reload schema';
commit;
