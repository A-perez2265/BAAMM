-- Exchange Engine: one row = one skill-swap request.
-- Run this in the Supabase SQL editor when the team is ready.
-- RLS is turned on, but policies are Amber's job — do not add them here.

create table if not exists public.exchanges (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references auth.users (id),
  teacher_id uuid not null references auth.users (id),
  -- No foreign key yet: Mallory's skills table is not the source of truth in code yet.
  skill_id uuid,
  message text not null default '',
  status text not null default 'pending'
    check (status in (
      'pending',
      'declined',
      'accepted',
      'awaiting_confirmation',
      'confirmed',
      'disputed'
    )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (learner_id <> teacher_id)
);

create index if not exists exchanges_teacher_status_idx
  on public.exchanges (teacher_id, status);

create index if not exists exchanges_learner_status_idx
  on public.exchanges (learner_id, status);

alter table public.exchanges enable row level security;
