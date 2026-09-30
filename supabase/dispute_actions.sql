create table if not exists public.dispute_actions (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  actor_label text not null,
  action text not null,
  detail text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_dispute_actions_dispute_id
  on public.dispute_actions(dispute_id, created_at desc);

alter table public.dispute_actions enable row level security;

drop policy if exists "dispute_actions_admin_select" on public.dispute_actions;
create policy "dispute_actions_admin_select"
on public.dispute_actions
for select
to authenticated
using (public.is_admin());

drop policy if exists "dispute_actions_admin_insert" on public.dispute_actions;
create policy "dispute_actions_admin_insert"
on public.dispute_actions
for insert
to authenticated
with check (
  public.is_admin()
  and actor_id = auth.uid()
);
