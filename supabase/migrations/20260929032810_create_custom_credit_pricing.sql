-- ============================================================
-- PORTO SERVIÇOS
-- Créditos personalizados com precificação progressiva segura
-- ============================================================

create table if not exists public.partner_credit_pricing_tiers (
  id uuid primary key default gen_random_uuid(),

  min_credits integer not null,
  max_credits integer,

  price_per_credit_cents integer not null,

  label text,
  description text,

  is_active boolean not null default true,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint partner_credit_pricing_min_positive
    check (min_credits > 0),

  constraint partner_credit_pricing_max_valid
    check (
      max_credits is null
      or max_credits >= min_credits
    ),

  constraint partner_credit_pricing_price_positive
    check (price_per_credit_cents > 0)
);


-- ============================================================
-- Impede duas faixas começarem no mesmo ponto
-- ============================================================

create unique index if not exists
partner_credit_pricing_tiers_min_credits_unique
on public.partner_credit_pricing_tiers (
  min_credits
);


-- ============================================================
-- Índices
-- ============================================================

create index if not exists
partner_credit_pricing_tiers_active_idx
on public.partner_credit_pricing_tiers (
  is_active,
  sort_order,
  min_credits
);


-- ============================================================
-- RLS
-- ============================================================

alter table
  public.partner_credit_pricing_tiers
enable row level security;


drop policy if exists
  "Authenticated users can view active credit pricing"
on public.partner_credit_pricing_tiers;


create policy
  "Authenticated users can view active credit pricing"
on public.partner_credit_pricing_tiers
for select
to authenticated
using (
  is_active = true
);


-- ============================================================
-- FAIXAS INICIAIS
--
-- Mantemos uma progressão baseada na estrutura comercial
-- atual da Porto Serviços.
--
-- 10–29    -> R$ 2,99 / crédito
-- 30–74    -> R$ 2,67 / crédito
-- 75–199   -> R$ 2,40 / crédito
-- 200–499  -> R$ 2,00 / crédito
-- 500+     -> R$ 1,80 / crédito
--
-- Valores em centavos.
-- ============================================================

insert into public.partner_credit_pricing_tiers (
  min_credits,
  max_credits,
  price_per_credit_cents,
  label,
  description,
  is_active,
  sort_order
)
values
  (
    10,
    29,
    299,
    'Começar',
    'Para experimentar novas oportunidades.',
    true,
    10
  ),
  (
    30,
    74,
    267,
    'Essencial',
    'Mais flexibilidade para escolher contatos.',
    true,
    20
  ),
  (
    75,
    199,
    240,
    'Profissional',
    'Melhor equilíbrio para parceiros ativos.',
    true,
    30
  ),
  (
    200,
    499,
    200,
    'Negócios',
    'Custo reduzido para maior volume.',
    true,
    40
  ),
  (
    500,
    null,
    180,
    'Alta demanda',
    'Melhor valor unitário para operações maiores.',
    true,
    50
  )
on conflict (min_credits)
do update set
  max_credits =
    excluded.max_credits,

  price_per_credit_cents =
    excluded.price_per_credit_cents,

  label =
    excluded.label,

  description =
    excluded.description,

  is_active =
    excluded.is_active,

  sort_order =
    excluded.sort_order,

  updated_at =
    now();


-- ============================================================
-- FUNÇÃO:
-- Calcula oficialmente o preço de uma quantidade de créditos.
--
-- IMPORTANTE:
-- O frontend poderá mostrar uma estimativa,
-- mas o valor oficial sempre vem desta função.
-- ============================================================

create or replace function
public.calculate_custom_credit_purchase(
  target_credits integer
)
returns table (
  credits integer,
  price_per_credit_cents integer,
  total_price_cents bigint,
  tier_label text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_tier
    public.partner_credit_pricing_tiers%rowtype;
begin

  if auth.uid() is null then
    raise exception
      'Authentication required';
  end if;


  if target_credits is null then
    raise exception
      'Credit quantity is required';
  end if;


  if target_credits < 10 then
    raise exception
      'Minimum purchase is 10 credits';
  end if;


  if target_credits > 5000 then
    raise exception
      'Maximum purchase is 5000 credits';
  end if;


  select *
  into selected_tier
  from public.partner_credit_pricing_tiers
  where
    is_active = true
    and target_credits >= min_credits
    and (
      max_credits is null
      or target_credits <= max_credits
    )
  order by min_credits desc
  limit 1;


  if selected_tier.id is null then
    raise exception
      'No active pricing tier found';
  end if;


  return query
  select
    target_credits,
    selected_tier.price_per_credit_cents,
    (
      target_credits::bigint
      *
      selected_tier.price_per_credit_cents::bigint
    ),
    selected_tier.label;

end;
$$;


revoke all
on function
public.calculate_custom_credit_purchase(integer)
from public;


grant execute
on function
public.calculate_custom_credit_purchase(integer)
to authenticated;


-- ============================================================
-- REGISTRO DAS COMPRAS PERSONALIZADAS
--
-- Esse registro será criado pelo backend antes do Stripe.
-- O webhook utilizará esse registro como fonte oficial.
-- ============================================================

create table if not exists
public.partner_custom_credit_orders (
  id uuid primary key default gen_random_uuid(),

  provider_user_id uuid not null
    references auth.users(id)
    on delete cascade,

  credits integer not null,

  price_per_credit_cents integer not null,

  total_price_cents bigint not null,

  pricing_tier_label text,

  status text not null default 'pending',

  stripe_checkout_session_id text,
  stripe_payment_intent_id text,

  credited_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint partner_custom_credit_orders_credits_positive
    check (credits > 0),

  constraint partner_custom_credit_orders_unit_price_positive
    check (price_per_credit_cents > 0),

  constraint partner_custom_credit_orders_total_positive
    check (total_price_cents > 0),

  constraint partner_custom_credit_orders_status_valid
    check (
      status in (
        'pending',
        'paid',
        'credited',
        'canceled',
        'failed'
      )
    )
);


create index if not exists
partner_custom_credit_orders_provider_idx
on public.partner_custom_credit_orders (
  provider_user_id,
  created_at desc
);


create unique index if not exists
partner_custom_credit_orders_checkout_unique
on public.partner_custom_credit_orders (
  stripe_checkout_session_id
)
where stripe_checkout_session_id is not null;


alter table
  public.partner_custom_credit_orders
enable row level security;


drop policy if exists
  "Partners can view own custom credit orders"
on public.partner_custom_credit_orders;


create policy
  "Partners can view own custom credit orders"
on public.partner_custom_credit_orders
for select
to authenticated
using (
  provider_user_id = auth.uid()
);


-- ============================================================
-- FUNÇÃO ATÔMICA:
-- Credita uma compra personalizada já paga.
--
-- Esta função NÃO recebe quantidade do Stripe/browser.
-- Ela busca a quantidade no pedido previamente criado
-- pelo servidor.
-- ============================================================

create or replace function
public.apply_custom_credit_purchase(
  target_order_id uuid,
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
  selected_order
    public.partner_custom_credit_orders%rowtype;

  current_balance integer;

  resulting_balance integer;

  existing_transaction
    uuid;
begin

  if target_order_id is null then
    raise exception
      'Order id is required';
  end if;


  if
    target_external_reference is null
    or btrim(target_external_reference) = ''
  then
    raise exception
      'External reference is required';
  end if;


  select *
  into selected_order
  from public.partner_custom_credit_orders
  where id = target_order_id
  for update;


  if selected_order.id is null then
    raise exception
      'Custom credit order not found';
  end if;


  /*
   * Idempotência:
   * se essa referência Stripe já gerou
   * uma transação, não cobramos novamente.
   */
  select id
  into existing_transaction
  from public.partner_credit_transactions
  where
    provider_user_id =
      selected_order.provider_user_id
    and external_reference =
      target_external_reference
  limit 1;


  if existing_transaction is not null then

    select balance
    into current_balance
    from public.partner_credit_wallets
    where provider_user_id =
      selected_order.provider_user_id;


    return query
    select
      coalesce(current_balance, 0),
      selected_order.credits;

    return;

  end if;


  /*
   * Garante existência da carteira.
   */
  insert into public.partner_credit_wallets (
    provider_user_id,
    balance,
    lifetime_purchased,
    lifetime_consumed
  )
  values (
    selected_order.provider_user_id,
    0,
    0,
    0
  )
  on conflict (provider_user_id)
  do nothing;


  /*
   * Bloqueia a carteira durante a operação.
   */
  select balance
  into current_balance
  from public.partner_credit_wallets
  where provider_user_id =
    selected_order.provider_user_id
  for update;


  resulting_balance :=
    coalesce(current_balance, 0)
    +
    selected_order.credits;


  update public.partner_credit_wallets
  set
    balance =
      resulting_balance,

    lifetime_purchased =
      lifetime_purchased
      +
      selected_order.credits,

    updated_at =
      now()

  where provider_user_id =
    selected_order.provider_user_id;


  insert into public.partner_credit_transactions (
    provider_user_id,
    transaction_type,
    amount,
    balance_after,
    description,
    reference_type,
    reference_id,
    external_reference
  )
  values (
    selected_order.provider_user_id,
    'purchase',
    selected_order.credits,
    resulting_balance,
    'Compra personalizada de créditos',
    'custom_credit_order',
    selected_order.id,
    target_external_reference
  );


  update public.partner_custom_credit_orders
  set
    status =
      'credited',

    credited_at =
      coalesce(
        credited_at,
        now()
      ),

    updated_at =
      now()

  where id =
    selected_order.id;


  return query
  select
    resulting_balance,
    selected_order.credits;

end;
$$;


revoke all
on function
public.apply_custom_credit_purchase(uuid, text)
from public;


revoke all
on function
public.apply_custom_credit_purchase(uuid, text)
from authenticated;


grant execute
on function
public.apply_custom_credit_purchase(uuid, text)
to service_role;


-- ============================================================
-- DOCUMENTAÇÃO
-- ============================================================

comment on table
public.partner_credit_pricing_tiers
is
'Faixas oficiais de preço para compras personalizadas de créditos da Porto Serviços.';


comment on table
public.partner_custom_credit_orders
is
'Pedidos de créditos personalizados criados antes do Stripe Checkout e utilizados como fonte confiável pelo webhook.';


comment on function
public.calculate_custom_credit_purchase(integer)
is
'Calcula no servidor o preço oficial de uma quantidade personalizada de créditos.';


comment on function
public.apply_custom_credit_purchase(uuid, text)
is
'Credita atomicamente uma compra personalizada paga, utilizando o pedido salvo no banco como fonte oficial.';