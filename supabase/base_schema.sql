-- Fresh Supabase projects only. Existing hosted projects use the upgrade plan.
begin;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  bio text,
  general_location text,
  location text,
  avatar_id text,
  verification_video_link text,
  credits_balance integer not null default 3 check (credits_balance >= 0),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_type text not null check (listing_type in ('Teacher', 'Learner')),
  title text not null,
  description text not null,
  category text not null,
  tags text[] not null default '{}',
  experience_level text not null check (experience_level in ('Beginner','Intermediate','Advanced','Expert')),
  format text not null check (format in ('Online','In Person','Hybrid')),
  language text not null default 'English',
  location text,
  created_at timestamptz not null default now()
);
create table if not exists public.exchanges (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles(id),
  teacher_id uuid not null references public.profiles(id),
  skill_id uuid not null constraint exchanges_skill_history_fk references public.skills(id) on delete restrict,
  message text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (learner_id <> teacher_id)
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  exchange_id uuid not null references public.exchanges(id),
  reviewer_id uuid not null references public.profiles(id),
  reviewee_id uuid not null references public.profiles(id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (exchange_id, reviewer_id)
);
alter table public.notifications enable row level security;
alter table public.reviews enable row level security;
-- Dashboard activity is derived from exchanges. These retained tables have no
-- client write path in the MVP; database owners can provision historical data.
create policy notifications_own_read on public.notifications for select to authenticated using (user_id = auth.uid());
create policy reviews_member_read on public.reviews for select to authenticated using (true);
revoke all on public.notifications, public.reviews from anon, authenticated;
grant select on public.notifications, public.reviews to authenticated;
commit;
