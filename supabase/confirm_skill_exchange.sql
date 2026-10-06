-- Unique RPC name avoids ambiguous complete_exchange overloads.
-- Preserves both existing functions for older clients.
begin;

create or replace function public.confirm_skill_exchange(p_exchange_id uuid)
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

revoke all on function public.confirm_skill_exchange(uuid) from public;
revoke all on function public.confirm_skill_exchange(uuid) from anon;
grant execute on function public.confirm_skill_exchange(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
