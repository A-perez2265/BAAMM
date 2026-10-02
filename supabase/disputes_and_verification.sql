alter table public.profiles 
  add column if not exists is_admin boolean not null default false;

alter table public.profiles 
  add column if not exists verification_video_link text;

alter table public.profiles 
  add column if not exists general_location text;

alter table public.profiles 
  add column if not exists location text;

alter table public.profiles 
  alter column credits_balance set default 3;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-videos',
  'verification-videos',
  true,
  26214400,
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 26214400,
  allowed_mime_types = array['video/mp4', 'video/webm', 'video/quicktime'];

alter table storage.objects enable row level security;

drop policy if exists "verification_videos_auth_insert" on storage.objects;
create policy "verification_videos_auth_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'verification-videos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "verification_videos_auth_update" on storage.objects;
create policy "verification_videos_auth_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'verification-videos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'verification-videos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "verification_videos_auth_delete" on storage.objects;
create policy "verification_videos_auth_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'verification-videos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "verification_videos_public_select" on storage.objects;
create policy "verification_videos_public_select"
on storage.objects
for select
to public
using (
  bucket_id = 'verification-videos'
);

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
  v_video_link text;
  v_is_admin boolean;
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
  v_video_link := nullif(trim(new.raw_user_meta_data->>'verification_video_link'), '');
  v_is_admin := coalesce((new.raw_user_meta_data->>'is_admin')::boolean, false);

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
    v_video_link,
    3, 
    v_is_admin,
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

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'),
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean,
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    ),
    false
  );
$$;

do $$
begin
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'exchanges'
  ) then
    alter table public.exchanges drop constraint if exists exchanges_status_check;
    alter table public.exchanges add constraint exchanges_status_check
      check (status in ('pending', 'accepted', 'declined', 'session_completed', 'awaiting_confirmation', 'confirmed', 'completed', 'issue_reported', 'disputed'));
  end if;
end $$;

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  exchange_id uuid not null references public.exchanges(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id),
  reported_user_id uuid not null references public.profiles(id),
  reporter_email text not null,
  reporter_username text not null,
  reported_username text not null,
  reason text not null,
  additional_details text,
  status text not null default 'open' check (status in ('open', 'under_review', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists idx_disputes_exchange_id on public.disputes(exchange_id);
create index if not exists idx_disputes_reporter_id on public.disputes(reporter_id);
create index if not exists idx_disputes_status on public.disputes(status);
create index if not exists idx_disputes_created_at on public.disputes(created_at desc);

alter table public.disputes enable row level security;

drop policy if exists "disputes_insert_participants" on public.disputes;
create policy "disputes_insert_participants"
on public.disputes
for insert
to authenticated
with check (
  auth.uid() = reporter_id
  and exists (
    select 1 from public.exchanges e
    where e.id = exchange_id
      and (e.learner_id = auth.uid() or e.teacher_id = auth.uid())
  )
);

drop policy if exists "disputes_select_policy" on public.disputes;
create policy "disputes_select_policy"
on public.disputes
for select
to authenticated
using (
  auth.uid() = reporter_id
  or public.is_admin()
);

drop policy if exists "disputes_update_admin_policy" on public.disputes;
create policy "disputes_update_admin_policy"
on public.disputes
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.complete_exchange(p_exchange_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exchange record;
  v_learner_balance integer;
begin
  select * into v_exchange
  from public.exchanges
  where id = p_exchange_id
  for update;

  if not found then
    raise exception 'Exchange not found';
  end if;

  if v_exchange.status = 'completed' then
    raise exception 'Exchange is already completed';
  end if;

  if auth.uid() is null or v_exchange.learner_id <> auth.uid() then
    raise exception 'Unauthorized: Only the learner can complete the exchange';
  end if;

  if v_exchange.status not in ('accepted', 'session_completed', 'awaiting_confirmation') then
    raise exception 'Exchange cannot be finalized in its current status: %', v_exchange.status;
  end if;

  select credits_balance into v_learner_balance
  from public.profiles
  where id = v_exchange.learner_id
  for update;

  if v_learner_balance < 1 then
    raise exception 'Insufficient credits to finalize exchange';
  end if;

  update public.profiles
  set credits_balance = credits_balance - 1
  where id = v_exchange.learner_id;

  update public.profiles
  set credits_balance = credits_balance + 1
  where id = v_exchange.teacher_id;

  update public.exchanges
  set status = 'completed',
      updated_at = now()
  where id = p_exchange_id;

  return jsonb_build_object(
    'success', true,
    'exchange_id', p_exchange_id,
    'status', 'completed',
    'transferred_credits', 1
  );
end;
$$;
