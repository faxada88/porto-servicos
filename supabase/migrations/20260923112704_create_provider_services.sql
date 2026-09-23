-- =========================================================
-- Provider Services
-- Porto Serviços
-- =========================================================

-- =========================================================
-- ENUM: forma de precificação
-- =========================================================

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'service_pricing_type'
  ) then
    create type public.service_pricing_type as enum (
      'fixed',
      'starting_at',
      'hourly',
      'quote'
    );
  end if;
end
$$;

-- =========================================================
-- TABELA: provider_services
-- =========================================================

create table if not exists public.provider_services (
  id uuid primary key default gen_random_uuid(),

  provider_id uuid not null
    references public.provider_profiles(user_id)
    on delete cascade,

  category_id uuid not null
    references public.service_categories(id)
    on delete restrict,

  name text not null,

  description text,

  pricing_type public.service_pricing_type
    not null default 'quote',

  -- Valor armazenado em centavos.
  -- Ex.: R$ 150,00 = 15000
  price_cents bigint,

  -- Permite ao prestador ocultar um serviço sem excluí-lo.
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint provider_services_name_length
    check (
      char_length(btrim(name)) between 2 and 120
    ),

  constraint provider_services_description_length
    check (
      description is null
      or char_length(description) <= 2000
    ),

  constraint provider_services_price_non_negative
    check (
      price_cents is null
      or price_cents >= 0
    ),

  -- Serviços por orçamento não devem possuir preço pré-definido.
  -- Os demais tipos precisam possuir preço.
  constraint provider_services_pricing_consistency
    check (
      (
        pricing_type = 'quote'
        and price_cents is null
      )
      or
      (
        pricing_type <> 'quote'
        and price_cents is not null
      )
    )
);

-- =========================================================
-- ÍNDICES
-- =========================================================

create index if not exists
  idx_provider_services_provider
on public.provider_services(provider_id);

create index if not exists
  idx_provider_services_category
on public.provider_services(category_id);

create index if not exists
  idx_provider_services_provider_active
on public.provider_services(
  provider_id,
  is_active
);

create index if not exists
  idx_provider_services_category_active
on public.provider_services(
  category_id,
  is_active
);

-- =========================================================
-- updated_at automático
-- =========================================================

drop trigger if exists provider_services_set_updated_at
  on public.provider_services;

create trigger provider_services_set_updated_at
  before update on public.provider_services
  for each row
  execute function public.set_updated_at();

-- =========================================================
-- FUNÇÃO
--
-- Verifica se determinada categoria pertence às categorias
-- selecionadas pelo prestador.
-- =========================================================

create or replace function public.provider_has_category(
  target_provider_id uuid,
  target_category_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.provider_service_categories psc
    where psc.provider_id = target_provider_id
      and psc.category_id = target_category_id
  );
$$;

-- =========================================================
-- RLS
-- =========================================================

alter table public.provider_services
  enable row level security;

-- =========================================================
-- SELECT DO PRÓPRIO PRESTADOR
--
-- O prestador consegue visualizar inclusive seus serviços
-- desativados.
-- =========================================================

drop policy if exists
  "provider_services_select_own"
on public.provider_services;

create policy
  "provider_services_select_own"
on public.provider_services
for select
to authenticated
using (
  auth.uid() = provider_id
);

-- =========================================================
-- SELECT ADMIN
-- =========================================================

drop policy if exists
  "provider_services_admin_select"
on public.provider_services;

create policy
  "provider_services_admin_select"
on public.provider_services
for select
to authenticated
using (
  public.is_admin()
);

-- =========================================================
-- SELECT PÚBLICO
--
-- Clientes/visitantes só podem visualizar:
-- - serviço ativo
-- - categoria ativa
-- - prestador aprovado
-- =========================================================

drop policy if exists
  "provider_services_public_select_active"
on public.provider_services;

create policy
  "provider_services_public_select_active"
on public.provider_services
for select
to anon, authenticated
using (
  is_active = true

  and exists (
    select 1
    from public.service_categories sc
    where sc.id = category_id
      and sc.is_active = true
  )

  and exists (
    select 1
    from public.provider_profiles pp
    where pp.user_id = provider_id
      and pp.status = 'approved'
  )
);

-- =========================================================
-- INSERT
--
-- Prestador pode cadastrar serviço somente:
-- - na própria conta
-- - sendo role provider
-- - dentro de uma categoria previamente selecionada
-- =========================================================

drop policy if exists
  "provider_services_insert_own"
on public.provider_services;

create policy
  "provider_services_insert_own"
on public.provider_services
for insert
to authenticated
with check (
  auth.uid() = provider_id
  and public.current_user_role() = 'provider'
  and public.provider_has_category(
    provider_id,
    category_id
  )
);

-- =========================================================
-- UPDATE
-- =========================================================

drop policy if exists
  "provider_services_update_own"
on public.provider_services;

create policy
  "provider_services_update_own"
on public.provider_services
for update
to authenticated
using (
  auth.uid() = provider_id
  and public.current_user_role() = 'provider'
)
with check (
  auth.uid() = provider_id
  and public.current_user_role() = 'provider'
  and public.provider_has_category(
    provider_id,
    category_id
  )
);

-- =========================================================
-- DELETE
-- =========================================================

drop policy if exists
  "provider_services_delete_own"
on public.provider_services;

create policy
  "provider_services_delete_own"
on public.provider_services
for delete
to authenticated
using (
  auth.uid() = provider_id
  and public.current_user_role() = 'provider'
);

-- =========================================================
-- ADMIN
-- =========================================================

drop policy if exists
  "provider_services_admin_insert"
on public.provider_services;

create policy
  "provider_services_admin_insert"
on public.provider_services
for insert
to authenticated
with check (
  public.is_admin()
);

drop policy if exists
  "provider_services_admin_update"
on public.provider_services;

create policy
  "provider_services_admin_update"
on public.provider_services
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists
  "provider_services_admin_delete"
on public.provider_services;

create policy
  "provider_services_admin_delete"
on public.provider_services
for delete
to authenticated
using (
  public.is_admin()
);

-- =========================================================
-- PERMISSÕES
-- =========================================================

grant select
  on public.provider_services
  to anon, authenticated;

grant insert, update, delete
  on public.provider_services
  to authenticated;