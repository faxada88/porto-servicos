-- ============================================================
-- PORTO SERVIÇOS
-- Billing customer permanente por parceiro
-- ============================================================

create table if not exists public.partner_billing_customers (
  provider_user_id uuid primary key
    references public.provider_profiles(user_id)
    on delete cascade,

  stripe_customer_id text not null unique,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint partner_billing_customers_stripe_customer_not_empty
    check (length(trim(stripe_customer_id)) > 0)
);

-- ============================================================
-- Índice auxiliar para consultas pelo Stripe Customer
-- ============================================================

create unique index if not exists
  partner_billing_customers_stripe_customer_id_idx
on public.partner_billing_customers (stripe_customer_id);

-- ============================================================
-- updated_at automático
-- Reutiliza a função já existente no projeto.
-- ============================================================

drop trigger if exists
  set_partner_billing_customers_updated_at
on public.partner_billing_customers;

create trigger set_partner_billing_customers_updated_at
before update
on public.partner_billing_customers
for each row
execute function public.set_updated_at();

-- ============================================================
-- RLS
-- ============================================================

alter table public.partner_billing_customers
enable row level security;

-- O parceiro pode consultar somente o próprio vínculo.
drop policy if exists
  "partner_billing_customers_select_own"
on public.partner_billing_customers;

create policy "partner_billing_customers_select_own"
on public.partner_billing_customers
for select
to authenticated
using (
  provider_user_id = auth.uid()
);

-- ============================================================
-- Segurança de escrita
--
-- O navegador NÃO cria, altera ou remove Stripe Customers.
-- Escritas serão feitas exclusivamente pelo backend usando
-- service_role após validar o usuário autenticado.
-- ============================================================

revoke insert, update, delete
on public.partner_billing_customers
from authenticated;

revoke insert, update, delete
on public.partner_billing_customers
from anon;

grant select
on public.partner_billing_customers
to authenticated;

-- ============================================================
-- Migração de Stripe Customers já conhecidos
--
-- Caso no futuro/existente alguma assinatura possua um
-- stripe_customer_id e ainda não exista vínculo permanente,
-- aproveitamos esse Customer em vez de criar outro.
-- ============================================================

insert into public.partner_billing_customers (
  provider_user_id,
  stripe_customer_id
)
select distinct on (provider_user_id)
  provider_user_id,
  stripe_customer_id
from public.partner_subscriptions
where stripe_customer_id is not null
  and length(trim(stripe_customer_id)) > 0
order by
  provider_user_id,
  created_at desc
on conflict do nothing;

comment on table public.partner_billing_customers is
  'Relaciona permanentemente cada parceiro da Porto Serviços a um Stripe Customer.';

comment on column public.partner_billing_customers.provider_user_id is
  'Usuário que possui o perfil de parceiro.';

comment on column public.partner_billing_customers.stripe_customer_id is
  'Identificador permanente do Customer correspondente no Stripe.';