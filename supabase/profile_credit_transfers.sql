begin;

alter function public.confirm_skill_exchange(uuid) owner to postgres;
alter function public.confirm_skill_exchange(uuid) security definer;

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

create or replace function public.complete_exchange(
  p_exchange_id uuid,
  p_credit_amount integer default 1
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_credit_amount is distinct from 1 then
    raise exception 'Exchange confirmation transfers exactly 1 credit';
  end if;

  perform public.confirm_skill_exchange(p_exchange_id);
end;
$$;

revoke all on function public.complete_exchange(uuid, integer) from public;
revoke all on function public.complete_exchange(uuid, integer) from anon;
grant execute on function public.complete_exchange(uuid, integer) to authenticated;

notify pgrst, 'reload schema';
commit;
