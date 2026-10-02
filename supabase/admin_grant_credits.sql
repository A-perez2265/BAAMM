create or replace function public.admin_grant_credits(
  p_user_id uuid,
  p_amount integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance integer;
begin
  if auth.uid() is null or public.is_admin() is not true then
    raise exception 'Only admins can grant credits';
  end if;

  if p_user_id is null then
    raise exception 'User id is required';
  end if;

  if p_amount is null or p_amount < 1 then
    raise exception 'Amount must be at least 1';
  end if;

  update public.profiles
  set credits_balance = credits_balance + p_amount
  where id = p_user_id
  returning credits_balance into v_new_balance;

  if not found then
    raise exception 'Profile not found';
  end if;

  return jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'amount', p_amount,
    'credits_balance', v_new_balance
  );
end;
$$;

revoke all on function public.admin_grant_credits(uuid, integer) from public;
revoke all on function public.admin_grant_credits(uuid, integer) from anon;
grant execute on function public.admin_grant_credits(uuid, integer) to authenticated;
