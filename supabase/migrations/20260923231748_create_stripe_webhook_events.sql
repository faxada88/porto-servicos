-- ============================================================
-- PORTO SERVIÇOS
-- Stripe Webhooks + processamento financeiro idempotente
-- ============================================================

-- ============================================================
-- 1. Registro dos eventos recebidos do Stripe
-- ============================================================

create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,

  event_type text not null,

  status text not null default 'processing'
    check (
      status in (
        'processing',
        'processed',
        'failed',
        'ignored'
      )
    ),

  error_message text,

  processed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint stripe_webhook_events_event_id_not_empty
    check (length(trim(stripe_event_id)) > 0),

  constraint stripe_webhook_events_event_type_not_empty
    check (length(trim(event_type)) > 0)
);

create index if not exists
  stripe_webhook_events_status_idx
on public.stripe_webhook_events (status);

create index if not exists
  stripe_webhook_events_created_at_idx
on public.stripe_webhook_events (created_at desc);

drop trigger if exists
  set_stripe_webhook_events_updated_at
on public.stripe_webhook_events;

create trigger set_stripe_webhook_events_updated_at
before update
on public.stripe_webhook_events
for each row
execute function public.set_updated_at();

-- ============================================================
-- 2. Segurança da tabela de eventos
--
-- Nenhum usuário do navegador deve ler ou alterar eventos
-- financeiros do Stripe.
-- ============================================================

alter table public.stripe_webhook_events
enable row level security;

revoke all
on public.stripe_webhook_events
from anon;

revoke all
on public.stripe_webhook_events
from authenticated;

-- ============================================================
-- 3. Função atômica para compra de pacote de créditos
--
-- Essa função:
-- - trava a carteira do parceiro;
-- - verifica idempotência;
-- - adiciona créditos;
-- - registra a movimentação;
-- - impede o mesmo Checkout de creditar duas vezes.
-- ============================================================

create or replace function public.apply_partner_credit_purchase(
  target_provider_user_id uuid,
  target_credit_package_id uuid,
  target_external_reference text
)
returns table (
  new_balance integer,
  credited_amount integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  package_credits integer;
  current_balance integer;
  resulting_balance integer;
begin
  if target_provider_user_id is null then
    raise exception 'provider_user_id obrigatório';
  end if;

  if target_credit_package_id is null then
    raise exception 'credit_package_id obrigatório';
  end if;

  if target_external_reference is null
     or length(trim(target_external_reference)) = 0 then
    raise exception 'external_reference obrigatória';
  end if;

  -- ----------------------------------------------------------
  -- Se a referência já foi processada, retorna o estado
  -- existente sem adicionar créditos novamente.
  -- ----------------------------------------------------------

  select
    pct.balance_after,
    pct.amount
  into
    resulting_balance,
    package_credits
  from public.partner_credit_transactions pct
  where pct.external_reference = target_external_reference
  limit 1;

  if found then
    return query
    select
      resulting_balance,
      package_credits;

    return;
  end if;

  -- ----------------------------------------------------------
  -- Busca o pacote oficial no banco.
  -- A quantidade de créditos NÃO vem do Stripe nem do cliente.
  -- ----------------------------------------------------------

  select pcp.credits
  into package_credits
  from public.partner_credit_packages pcp
  where pcp.id = target_credit_package_id
    and pcp.is_active = true;

  if not found then
    raise exception 'Pacote de créditos inválido ou inativo';
  end if;

  -- ----------------------------------------------------------
  -- Garante existência da carteira.
  -- ----------------------------------------------------------

  insert into public.partner_credit_wallets (
    provider_user_id,
    balance,
    lifetime_purchased,
    lifetime_consumed
  )
  values (
    target_provider_user_id,
    0,
    0,
    0
  )
  on conflict (provider_user_id) do nothing;

  -- ----------------------------------------------------------
  -- Bloqueia a carteira durante a operação financeira.
  -- ----------------------------------------------------------

  select pcw.balance
  into current_balance
  from public.partner_credit_wallets pcw
  where pcw.provider_user_id = target_provider_user_id
  for update;

  if not found then
    raise exception 'Carteira do parceiro não encontrada';
  end if;

  resulting_balance := current_balance + package_credits;

  -- ----------------------------------------------------------
  -- Atualiza saldo e total comprado.
  -- ----------------------------------------------------------

  update public.partner_credit_wallets
  set
    balance = resulting_balance,
    lifetime_purchased =
      lifetime_purchased + package_credits
  where provider_user_id = target_provider_user_id;

  -- ----------------------------------------------------------
  -- Registra ledger.
  --
  -- A UNIQUE de external_reference é uma segunda barreira
  -- contra duplicação.
  -- ----------------------------------------------------------

  insert into public.partner_credit_transactions (
    provider_user_id,
    type,
    amount,
    balance_after,
    description,
    reference_type,
    reference_id,
    external_reference
  )
  values (
    target_provider_user_id,
    'purchase',
    package_credits,
    resulting_balance,
    'Compra de pacote de créditos via Stripe',
    'credit_package',
    target_credit_package_id,
    target_external_reference
  );

  return query
  select
    resulting_balance,
    package_credits;
end;
$$;

revoke all
on function public.apply_partner_credit_purchase(
  uuid,
  uuid,
  text
)
from public;

revoke all
on function public.apply_partner_credit_purchase(
  uuid,
  uuid,
  text
)
from anon;

revoke all
on function public.apply_partner_credit_purchase(
  uuid,
  uuid,
  text
)
from authenticated;

grant execute
on function public.apply_partner_credit_purchase(
  uuid,
  uuid,
  text
)
to service_role;

-- ============================================================
-- 4. Função para sincronizar assinatura do parceiro
--
-- O webhook usa esta função para criar/atualizar a assinatura
-- correspondente ao Stripe Subscription.
-- ============================================================

create or replace function public.upsert_partner_subscription_from_stripe(
  target_provider_user_id uuid,
  target_plan_id uuid,
  target_status text,
  target_stripe_customer_id text,
  target_stripe_subscription_id text,
  target_current_period_start timestamptz default null,
  target_current_period_end timestamptz default null,
  target_cancel_at_period_end boolean default false,
  target_canceled_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  subscription_record_id uuid;
begin
  if target_provider_user_id is null then
    raise exception 'provider_user_id obrigatório';
  end if;

  if target_plan_id is null then
    raise exception 'plan_id obrigatório';
  end if;

  if target_stripe_customer_id is null
     or length(trim(target_stripe_customer_id)) = 0 then
    raise exception 'stripe_customer_id obrigatório';
  end if;

  if target_stripe_subscription_id is null
     or length(trim(target_stripe_subscription_id)) = 0 then
    raise exception 'stripe_subscription_id obrigatório';
  end if;

  if target_status not in (
    'pending',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'paused'
  ) then
    raise exception 'Status de assinatura inválido';
  end if;

  if not exists (
    select 1
    from public.provider_profiles pp
    where pp.user_id = target_provider_user_id
  ) then
    raise exception 'Parceiro não encontrado';
  end if;

  if not exists (
    select 1
    from public.partner_plans pp
    where pp.id = target_plan_id
  ) then
    raise exception 'Plano não encontrado';
  end if;

  -- ----------------------------------------------------------
  -- Mantém o vínculo permanente com o Stripe Customer.
  -- ----------------------------------------------------------

  insert into public.partner_billing_customers (
    provider_user_id,
    stripe_customer_id
  )
  values (
    target_provider_user_id,
    target_stripe_customer_id
  )
  on conflict (provider_user_id)
  do update set
    stripe_customer_id = excluded.stripe_customer_id;

  -- ----------------------------------------------------------
  -- Atualiza uma assinatura existente pelo ID do Stripe.
  -- ----------------------------------------------------------

  select ps.id
  into subscription_record_id
  from public.partner_subscriptions ps
  where ps.stripe_subscription_id =
    target_stripe_subscription_id
  limit 1;

  if subscription_record_id is not null then
    update public.partner_subscriptions
    set
      provider_user_id = target_provider_user_id,
      plan_id = target_plan_id,
      status = target_status,
      stripe_customer_id = target_stripe_customer_id,
      current_period_start =
        target_current_period_start,
      current_period_end =
        target_current_period_end,
      cancel_at_period_end =
        target_cancel_at_period_end,
      canceled_at =
        target_canceled_at
    where id = subscription_record_id;

    return subscription_record_id;
  end if;

  -- ----------------------------------------------------------
  -- Caso ainda não exista, cria.
  -- ----------------------------------------------------------

  insert into public.partner_subscriptions (
    provider_user_id,
    plan_id,
    status,
    stripe_customer_id,
    stripe_subscription_id,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    canceled_at
  )
  values (
    target_provider_user_id,
    target_plan_id,
    target_status,
    target_stripe_customer_id,
    target_stripe_subscription_id,
    target_current_period_start,
    target_current_period_end,
    target_cancel_at_period_end,
    target_canceled_at
  )
  returning id
  into subscription_record_id;

  return subscription_record_id;
end;
$$;

revoke all
on function public.upsert_partner_subscription_from_stripe(
  uuid,
  uuid,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  boolean,
  timestamptz
)
from public;

revoke all
on function public.upsert_partner_subscription_from_stripe(
  uuid,
  uuid,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  boolean,
  timestamptz
)
from anon;

revoke all
on function public.upsert_partner_subscription_from_stripe(
  uuid,
  uuid,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  boolean,
  timestamptz
)
from authenticated;

grant execute
on function public.upsert_partner_subscription_from_stripe(
  uuid,
  uuid,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  boolean,
  timestamptz
)
to service_role;

-- ============================================================
-- 5. Comentários
-- ============================================================

comment on table public.stripe_webhook_events is
  'Registro idempotente dos eventos Stripe processados pela Porto Serviços.';

comment on function public.apply_partner_credit_purchase(
  uuid,
  uuid,
  text
) is
  'Aplica atomicamente uma compra Stripe à carteira de créditos do parceiro.';

comment on function public.upsert_partner_subscription_from_stripe(
  uuid,
  uuid,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  boolean,
  timestamptz
) is
  'Cria ou atualiza uma assinatura da Porto Serviços a partir de dados validados do Stripe.';