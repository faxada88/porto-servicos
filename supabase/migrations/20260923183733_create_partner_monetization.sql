-- ============================================================
-- PORTO SERVIÇOS
-- Monetização de parceiros
--
-- Estrutura:
-- 1. Planos comerciais
-- 2. Assinaturas dos parceiros
-- 3. Carteiras de créditos
-- 4. Histórico de créditos
-- 5. Leads
--
-- O Stripe será conectado em uma etapa posterior.
-- ============================================================

-- ============================================================
-- 1. PLANOS DOS PARCEIROS
-- ============================================================

create table if not exists public.partner_plans (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  slug text not null,

  description text,

  monthly_price_cents bigint not null default 0
    check (monthly_price_cents >= 0),

  included_credits integer not null default 0
    check (included_credits >= 0),

  max_services integer
    check (max_services is null or max_services > 0),

  is_featured boolean not null default false,
  is_active boolean not null default true,

  sort_order integer not null default 0,

  -- IDs serão preenchidos quando integrarmos Stripe.
  stripe_product_id text,
  stripe_price_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists
  idx_partner_plans_slug_unique
on public.partner_plans (lower(slug));

create unique index if not exists
  idx_partner_plans_stripe_product_unique
on public.partner_plans (stripe_product_id)
where stripe_product_id is not null;

create unique index if not exists
  idx_partner_plans_stripe_price_unique
on public.partner_plans (stripe_price_id)
where stripe_price_id is not null;

create index if not exists
  idx_partner_plans_active_sort
on public.partner_plans (is_active, sort_order);


-- ============================================================
-- 2. ASSINATURAS DOS PARCEIROS
-- ============================================================

create table if not exists public.partner_subscriptions (
  id uuid primary key default gen_random_uuid(),

  provider_user_id uuid not null
    references public.provider_profiles(user_id)
    on delete cascade,

  plan_id uuid not null
    references public.partner_plans(id)
    on delete restrict,

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'active',
        'past_due',
        'canceled',
        'unpaid',
        'paused'
      )
    ),

  stripe_customer_id text,
  stripe_subscription_id text,

  current_period_start timestamptz,
  current_period_end timestamptz,

  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists
  idx_partner_subscriptions_stripe_subscription_unique
on public.partner_subscriptions (stripe_subscription_id)
where stripe_subscription_id is not null;

create index if not exists
  idx_partner_subscriptions_provider
on public.partner_subscriptions (provider_user_id);

create index if not exists
  idx_partner_subscriptions_status
on public.partner_subscriptions (status);


-- ============================================================
-- 3. CARTEIRA DE CRÉDITOS
-- Uma carteira por parceiro.
-- ============================================================

create table if not exists public.partner_credit_wallets (
  provider_user_id uuid primary key
    references public.provider_profiles(user_id)
    on delete cascade,

  balance integer not null default 0
    check (balance >= 0),

  lifetime_purchased integer not null default 0
    check (lifetime_purchased >= 0),

  lifetime_consumed integer not null default 0
    check (lifetime_consumed >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ============================================================
-- 4. TRANSAÇÕES DE CRÉDITOS
-- Ledger: todo crédito que entra ou sai fica registrado.
-- ============================================================

create table if not exists public.partner_credit_transactions (
  id uuid primary key default gen_random_uuid(),

  provider_user_id uuid not null
    references public.provider_profiles(user_id)
    on delete cascade,

  transaction_type text not null
    check (
      transaction_type in (
        'purchase',
        'subscription_bonus',
        'lead_charge',
        'refund',
        'admin_adjustment'
      )
    ),

  amount integer not null
    check (amount <> 0),

  balance_after integer not null
    check (balance_after >= 0),

  description text,

  reference_type text,
  reference_id uuid,

  -- Será usado para impedir crédito duplicado
  -- quando o Stripe reenviar um webhook.
  external_reference text,

  created_at timestamptz not null default now()
);

create unique index if not exists
  idx_partner_credit_transactions_external_reference_unique
on public.partner_credit_transactions (external_reference)
where external_reference is not null;

create index if not exists
  idx_partner_credit_transactions_provider_created
on public.partner_credit_transactions (
  provider_user_id,
  created_at desc
);


-- ============================================================
-- 5. LEADS
--
-- O turista demonstra interesse.
-- A Porto Serviços registra a oportunidade.
-- O parceiro utiliza créditos para receber o contato.
-- ============================================================

create table if not exists public.partner_leads (
  id uuid primary key default gen_random_uuid(),

  provider_user_id uuid not null
    references public.provider_profiles(user_id)
    on delete cascade,

  service_id uuid not null
    references public.provider_services(id)
    on delete restrict,

  customer_user_id uuid
    references auth.users(id)
    on delete set null,

  customer_name text not null,
  customer_phone text not null,

  desired_date date,

  people_count integer
    check (
      people_count is null
      or people_count > 0
    ),

  notes text,

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'unlocked',
        'insufficient_credits',
        'canceled',
        'invalid'
      )
    ),

  credit_cost integer not null default 5
    check (credit_cost > 0),

  unlocked_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists
  idx_partner_leads_provider_created
on public.partner_leads (
  provider_user_id,
  created_at desc
);

create index if not exists
  idx_partner_leads_customer
on public.partner_leads (customer_user_id);

create index if not exists
  idx_partner_leads_service
on public.partner_leads (service_id);

create index if not exists
  idx_partner_leads_status
on public.partner_leads (status);


-- ============================================================
-- 6. UPDATED_AT
-- Reutiliza a função set_updated_at já existente no projeto.
-- ============================================================

drop trigger if exists partner_plans_set_updated_at
  on public.partner_plans;

create trigger partner_plans_set_updated_at
before update on public.partner_plans
for each row
execute function public.set_updated_at();


drop trigger if exists partner_subscriptions_set_updated_at
  on public.partner_subscriptions;

create trigger partner_subscriptions_set_updated_at
before update on public.partner_subscriptions
for each row
execute function public.set_updated_at();


drop trigger if exists partner_credit_wallets_set_updated_at
  on public.partner_credit_wallets;

create trigger partner_credit_wallets_set_updated_at
before update on public.partner_credit_wallets
for each row
execute function public.set_updated_at();


drop trigger if exists partner_leads_set_updated_at
  on public.partner_leads;

create trigger partner_leads_set_updated_at
before update on public.partner_leads
for each row
execute function public.set_updated_at();


-- ============================================================
-- 7. CRIAÇÃO AUTOMÁTICA DA CARTEIRA
-- Todo parceiro passa a possuir carteira de créditos.
-- ============================================================

create or replace function public.ensure_partner_credit_wallet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.partner_credit_wallets (
    provider_user_id
  )
  values (
    new.user_id
  )
  on conflict (provider_user_id)
  do nothing;

  return new;
end;
$$;

drop trigger if exists
  provider_profile_create_credit_wallet
on public.provider_profiles;

create trigger provider_profile_create_credit_wallet
after insert on public.provider_profiles
for each row
execute function public.ensure_partner_credit_wallet();


-- Cria carteira para parceiros que já existem.
insert into public.partner_credit_wallets (
  provider_user_id
)
select
  pp.user_id
from public.provider_profiles pp
on conflict (provider_user_id)
do nothing;


-- ============================================================
-- 8. RLS
-- ============================================================

alter table public.partner_plans
  enable row level security;

alter table public.partner_subscriptions
  enable row level security;

alter table public.partner_credit_wallets
  enable row level security;

alter table public.partner_credit_transactions
  enable row level security;

alter table public.partner_leads
  enable row level security;


-- ============================================================
-- PLANOS
-- Usuários autenticados podem visualizar planos ativos.
-- ============================================================

drop policy if exists
  "partner_plans_select_active"
on public.partner_plans;

create policy "partner_plans_select_active"
on public.partner_plans
for select
to authenticated
using (is_active = true);


-- ============================================================
-- ASSINATURAS
-- Parceiro visualiza apenas a própria assinatura.
-- ============================================================

drop policy if exists
  "partner_subscriptions_select_own"
on public.partner_subscriptions;

create policy "partner_subscriptions_select_own"
on public.partner_subscriptions
for select
to authenticated
using (
  provider_user_id = auth.uid()
);


-- ============================================================
-- CARTEIRA
-- Parceiro visualiza apenas a própria carteira.
-- Nenhuma alteração direta pelo frontend.
-- ============================================================

drop policy if exists
  "partner_credit_wallets_select_own"
on public.partner_credit_wallets;

create policy "partner_credit_wallets_select_own"
on public.partner_credit_wallets
for select
to authenticated
using (
  provider_user_id = auth.uid()
);


-- ============================================================
-- TRANSAÇÕES
-- Parceiro visualiza apenas o próprio extrato.
-- Nenhum INSERT/UPDATE/DELETE direto pelo frontend.
-- ============================================================

drop policy if exists
  "partner_credit_transactions_select_own"
on public.partner_credit_transactions;

create policy "partner_credit_transactions_select_own"
on public.partner_credit_transactions
for select
to authenticated
using (
  provider_user_id = auth.uid()
);


-- ============================================================
-- LEADS
-- Parceiro pode visualizar leads destinados a ele.
-- Cliente pode visualizar os próprios leads.
--
-- Criação/desconto/liberação serão feitos posteriormente
-- por funções seguras no backend.
-- ============================================================

drop policy if exists
  "partner_leads_select_provider"
on public.partner_leads;

create policy "partner_leads_select_provider"
on public.partner_leads
for select
to authenticated
using (
  provider_user_id = auth.uid()
);


drop policy if exists
  "partner_leads_select_customer"
on public.partner_leads;

create policy "partner_leads_select_customer"
on public.partner_leads
for select
to authenticated
using (
  customer_user_id = auth.uid()
);


-- ============================================================
-- 9. PERMISSÕES
--
-- O frontend pode apenas consultar o que as policies permitem.
-- Operações financeiras serão realizadas posteriormente por
-- RPCs seguras e pelo webhook do Stripe.
-- ============================================================

revoke insert, update, delete
on public.partner_plans
from authenticated;

revoke insert, update, delete
on public.partner_subscriptions
from authenticated;

revoke insert, update, delete
on public.partner_credit_wallets
from authenticated;

revoke insert, update, delete
on public.partner_credit_transactions
from authenticated;

revoke insert, update, delete
on public.partner_leads
from authenticated;


-- ============================================================
-- 10. DOCUMENTAÇÃO
-- ============================================================

comment on table public.partner_plans is
'Planos comerciais disponíveis aos parceiros da Porto Serviços.';

comment on table public.partner_subscriptions is
'Assinaturas mensais dos parceiros. Integração Stripe será vinculada posteriormente.';

comment on table public.partner_credit_wallets is
'Carteira interna de créditos de cada parceiro.';

comment on table public.partner_credit_transactions is
'Ledger imutável das entradas e saídas de créditos dos parceiros.';

comment on table public.partner_leads is
'Oportunidades comerciais geradas por viajantes interessados nas ofertas dos parceiros.';