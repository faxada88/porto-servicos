-- =========================================================
-- Provider Service Categories
-- Porto Serviços
-- =========================================================

create table if not exists public.provider_service_categories (
  id uuid primary key default gen_random_uuid(),

  provider_id uuid not null
    references public.provider_profiles(user_id)
    on delete cascade,

  category_id uuid not null
    references public.service_categories(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  constraint provider_service_categories_unique
    unique (provider_id, category_id)
);

-- =========================================================
-- ÍNDICES
-- =========================================================

-- Busca rápida das categorias de um prestador
create index if not exists
  idx_provider_service_categories_provider
on public.provider_service_categories(provider_id);

-- Busca rápida de prestadores por categoria
create index if not exists
  idx_provider_service_categories_category
on public.provider_service_categories(category_id);

-- =========================================================
-- RLS
-- =========================================================

alter table public.provider_service_categories
  enable row level security;

-- =========================================================
-- SELECT
--
-- A relação pode ser consultada publicamente.
--
-- Isso será útil posteriormente para:
-- categoria -> prestadores
-- prestador -> categorias
--
-- A visibilidade final dos prestadores aprovados será
-- controlada pelas consultas/policies de provider_profiles.
-- =========================================================

drop policy if exists
  "provider_service_categories_public_select"
on public.provider_service_categories;

create policy
  "provider_service_categories_public_select"
on public.provider_service_categories
for select
to anon, authenticated
using (true);

-- =========================================================
-- INSERT
--
-- Apenas o próprio prestador pode adicionar categorias
-- à própria conta.
--
-- A role precisa ser provider.
-- =========================================================

drop policy if exists
  "provider_service_categories_insert_own"
on public.provider_service_categories;

create policy
  "provider_service_categories_insert_own"
on public.provider_service_categories
for insert
to authenticated
with check (
  auth.uid() = provider_id
  and public.current_user_role() = 'provider'
);

-- =========================================================
-- DELETE
--
-- Prestador pode remover apenas categorias da própria conta.
-- =========================================================

drop policy if exists
  "provider_service_categories_delete_own"
on public.provider_service_categories;

create policy
  "provider_service_categories_delete_own"
on public.provider_service_categories
for delete
to authenticated
using (
  auth.uid() = provider_id
  and public.current_user_role() = 'provider'
);

-- =========================================================
-- ADMIN
--
-- Admin pode cadastrar/remover relações manualmente.
-- =========================================================

drop policy if exists
  "provider_service_categories_admin_insert"
on public.provider_service_categories;

create policy
  "provider_service_categories_admin_insert"
on public.provider_service_categories
for insert
to authenticated
with check (
  public.is_admin()
);

drop policy if exists
  "provider_service_categories_admin_delete"
on public.provider_service_categories;

create policy
  "provider_service_categories_admin_delete"
on public.provider_service_categories
for delete
to authenticated
using (
  public.is_admin()
);

-- =========================================================
-- PERMISSÕES
-- =========================================================

grant select
  on public.provider_service_categories
  to anon, authenticated;

grant insert, delete
  on public.provider_service_categories
  to authenticated;