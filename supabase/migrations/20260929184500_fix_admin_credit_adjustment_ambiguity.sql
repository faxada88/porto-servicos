-- PORTO SERVICOS
-- Corrige ambiguidade PL/pgSQL na RPC de ajuste administrativo de creditos.

create or replace function public.admin_adjust_partner_credits(
  target_provider_user_id uuid,
  adjustment_amount integer,
  adjustment_reason text
)
returns table (
  provider_user_id uuid,
  amount integer,
  balance_before integer,
  balance_after integer,
  transaction_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_reason text;
  v_balance_before integer;
  v_balance_after integer;
  v_transaction_id uuid;
begin
  v_actor := auth.uid();

  if v_actor is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if target_provider_user_id is null then
    raise exception 'PROVIDER_REQUIRED';
  end if;

  if adjustment_amount is null or adjustment_amount = 0 then
    raise exception 'INVALID_ADJUSTMENT_AMOUNT';
  end if;

  v_reason := btrim(coalesce(adjustment_reason, ''));

  if char_length(v_reason) < 5 then
    raise exception 'ADJUSTMENT_REASON_TOO_SHORT';
  end if;

  if char_length(v_reason) > 500 then
    raise exception 'ADJUSTMENT_REASON_TOO_LONG';
  end if;

  if not exists (
    select 1
    from public.provider_profiles as pp
    where pp.user_id = target_provider_user_id
  ) then
    raise exception 'PROVIDER_PROFILE_NOT_FOUND';
  end if;

  insert into public.partner_credit_wallets (provider_user_id)
  values (target_provider_user_id)
  on conflict on constraint partner_credit_wallets_pkey
  do nothing;

  select pcw.balance
  into v_balance_before
  from public.partner_credit_wallets as pcw
  where pcw.provider_user_id = target_provider_user_id
  for update;

  if not found then
    raise exception 'CREDIT_WALLET_NOT_FOUND';
  end if;

  v_balance_after := v_balance_before + adjustment_amount;

  if v_balance_after < 0 then
    raise exception 'INSUFFICIENT_CREDITS_FOR_ADJUSTMENT';
  end if;

  update public.partner_credit_wallets as pcw
  set balance = v_balance_after, updated_at = now()
  where pcw.provider_user_id = target_provider_user_id;

  insert into public.partner_credit_transactions (
    provider_user_id,
    transaction_type,
    amount,
    balance_after,
    description,
    reference_type
  )
  values (
    target_provider_user_id,
    'admin_adjustment',
    adjustment_amount,
    v_balance_after,
    v_reason,
    'admin_credit_adjustment'
  )
  returning id into v_transaction_id;

  insert into public.admin_credit_adjustment_audit_logs (
    actor_user_id,
    provider_user_id,
    amount,
    balance_before,
    balance_after,
    reason,
    credit_transaction_id
  )
  values (
    v_actor,
    target_provider_user_id,
    adjustment_amount,
    v_balance_before,
    v_balance_after,
    v_reason,
    v_transaction_id
  );

  return query
  select
    target_provider_user_id,
    adjustment_amount,
    v_balance_before,
    v_balance_after,
    v_transaction_id;
end;
$$;

revoke all on function public.admin_adjust_partner_credits(uuid, integer, text) from public;
grant execute on function public.admin_adjust_partner_credits(uuid, integer, text) to authenticated;
