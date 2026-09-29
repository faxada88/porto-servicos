-- ============================================================
-- PORTO SERVIÇOS
-- Pacotes de créditos para parceiros
-- ============================================================

create table if not exists public.partner_credit_packages (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  slug text not null,

  description text,

  credits integer not null
    check (credits > 0),

  price_cents bigint not null
    check (price_cents > 0),

  is_featured boolean not null default false,
  is_active boolean not null default true,

  sort_order integer not null default 0,

  -- Preenchidos posteriormente na integração com Stripe.
  stripe_product_id text,
  stripe_price_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ============================================================
-- ÍNDICES
-- ============================================================

create unique index if not exists
  idx_partner_credit_packages_slug_unique
on public.partner_credit_packages (lower(slug));

create unique index if not exists
  idx_partner_credit_packages_stripe_product_unique
on public.partner_credit_packages (stripe_product_id)
where stripe_product_id is not null;

create unique index if not exists
  idx_partner_credit_packages_stripe_price_unique
on public.partner_credit_packages (stripe_price_id)
where stripe_price_id is not null;

create index if not exists
  idx_partner_credit_packages_active_sort
on public.partner_credit_packages (
  is_active,
  sort_order
);


-- ============================================================
-- UPDATED_AT
-- ============================================================

drop trigger if exists
  partner_credit_packages_set_updated_at
on public.partner_credit_packages;

create trigger partner_credit_packages_set_updated_at
before update on public.partner_credit_packages
for each row
execute function public.set_updated_at();


-- ============================================================
-- RLS
-- ============================================================

alter table public.partner_credit_packages
  enable row level security;


drop policy if exists
  "partner_credit_packages_select_active"
on public.partner_credit_packages;

create policy "partner_credit_packages_select_active"
on public.partner_credit_packages
for select
to authenticated
using (
  is_active = true
);


-- O frontend não pode criar, editar ou excluir pacotes.

revoke insert, update, delete
on public.partner_credit_packages
from authenticated;


-- ============================================================
-- PLANOS MENSAIS
--
-- Valores iniciais de lançamento.
-- stripe_product_id e stripe_price_id ficam NULL até
-- configurarmos os produtos no Stripe.
-- ============================================================

insert into public.partner_plans (
  name,
  slug,
  description,
  monthly_price_cents,
  included_credits,
  max_services,
  is_featured,
  is_active,
  sort_order
)
values

(
  'Presença',
  'presenca',
  'Para parceiros que querem manter sua empresa presente na Porto Serviços.',
  3990,
  0,
  3,
  false,
  true,
  10
),

(
  'Profissional',
  'profissional',
  'Para parceiros que querem ampliar sua presença e acessar mais recursos comerciais.',
  7990,
  0,
  10,
  true,
  true,
  20
),

(
  'Premium',
  'premium',
  'Para parceiros que querem máxima presença e capacidade de divulgação na plataforma.',
  14990,
  0,
  null,
  false,
  true,
  30
)

on conflict (lower(slug))
do update set

  name = excluded.name,
  description = excluded.description,
  monthly_price_cents = excluded.monthly_price_cents,
  included_credits = excluded.included_credits,
  max_services = excluded.max_services,
  is_featured = excluded.is_featured,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();


-- ============================================================
-- PACOTES DE CRÉDITOS
--
-- Créditos serão utilizados para desbloquear leads.
-- O valor do lead será definido pelo backend.
-- ============================================================

insert into public.partner_credit_packages (
  name,
  slug,
  description,
  credits,
  price_cents,
  is_featured,
  is_active,
  sort_order
)
values

(
  'Teste',
  'teste',
  'Pacote inicial para experimentar a geração de oportunidades.',
  10,
  2990,
  false,
  true,
  10
),

(
  'Inicial',
  'inicial',
  'Pacote para parceiros com menor volume de oportunidades.',
  30,
  7990,
  false,
  true,
  20
),

(
  'Profissional',
  'profissional',
  'Pacote recomendado para parceiros que recebem oportunidades regularmente.',
  75,
  17990,
  true,
  true,
  30
),

(
  'Negócios',
  'negocios',
  'Pacote para estabelecimentos com maior volume de oportunidades.',
  200,
  39990,
  false,
  true,
  40
),

(
  'Premium',
  'premium',
  'Pacote de alto volume para parceiros com grande demanda.',
  500,
  89990,
  false,
  true,
  50
)

on conflict (lower(slug))
do update set

  name = excluded.name,
  description = excluded.description,
  credits = excluded.credits,
  price_cents = excluded.price_cents,
  is_featured = excluded.is_featured,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();


-- ============================================================
-- DOCUMENTAÇÃO
-- ============================================================

comment on table public.partner_credit_packages is
'Pacotes de créditos vendidos aos parceiros da Porto Serviços para utilização em oportunidades comerciais.';