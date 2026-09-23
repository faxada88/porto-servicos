-- =========================================================
-- Service Categories
-- Porto Serviços
-- =========================================================

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  slug text not null,

  description text,

  -- Pode armazenar nome de ícone utilizado pelo frontend
  -- Ex.: "wrench", "paintbrush", "sparkles"
  icon text,

  -- URL de imagem/capa da categoria
  image_url text,

  -- Ordem de exibição no aplicativo
  sort_order integer not null default 0,

  -- Permite ocultar categoria sem excluí-la
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint service_categories_name_length
    check (
      char_length(btrim(name)) between 2 and 80
    ),

  constraint service_categories_slug_length
    check (
      char_length(btrim(slug)) between 2 and 100
    ),

  constraint service_categories_description_length
    check (
      description is null
      or char_length(description) <= 1000
    ),

  constraint service_categories_sort_order_positive
    check (
      sort_order >= 0
    )
);

-- =========================================================
-- UNIQUE
-- =========================================================

create unique index if not exists
  idx_service_categories_slug_unique
on public.service_categories (lower(slug));

-- =========================================================
-- Índices
-- =========================================================

create index if not exists
  idx_service_categories_active_sort
on public.service_categories (
  is_active,
  sort_order
);

-- =========================================================
-- updated_at automático
-- =========================================================

drop trigger if exists service_categories_set_updated_at
  on public.service_categories;

create trigger service_categories_set_updated_at
  before update on public.service_categories
  for each row
  execute function public.set_updated_at();

-- =========================================================
-- RLS
-- =========================================================

alter table public.service_categories
  enable row level security;

-- =========================================================
-- LEITURA PÚBLICA
--
-- Usuários do app podem visualizar apenas categorias ativas.
-- Isso permite carregar as categorias inclusive antes
-- do login.
-- =========================================================

drop policy if exists "service_categories_public_select_active"
  on public.service_categories;

create policy "service_categories_public_select_active"
  on public.service_categories
  for select
  to anon, authenticated
  using (
    is_active = true
  );

-- =========================================================
-- ADMIN: SELECT
--
-- Admin precisa visualizar inclusive categorias desativadas.
-- =========================================================

drop policy if exists "service_categories_admin_select_all"
  on public.service_categories;

create policy "service_categories_admin_select_all"
  on public.service_categories
  for select
  to authenticated
  using (
    public.is_admin()
  );

-- =========================================================
-- ADMIN: INSERT
-- =========================================================

drop policy if exists "service_categories_admin_insert"
  on public.service_categories;

create policy "service_categories_admin_insert"
  on public.service_categories
  for insert
  to authenticated
  with check (
    public.is_admin()
  );

-- =========================================================
-- ADMIN: UPDATE
-- =========================================================

drop policy if exists "service_categories_admin_update"
  on public.service_categories;

create policy "service_categories_admin_update"
  on public.service_categories
  for update
  to authenticated
  using (
    public.is_admin()
  )
  with check (
    public.is_admin()
  );

-- =========================================================
-- ADMIN: DELETE
--
-- Permitimos no banco, mas no painel administrativo
-- preferiremos desativar com is_active = false.
-- =========================================================

drop policy if exists "service_categories_admin_delete"
  on public.service_categories;

create policy "service_categories_admin_delete"
  on public.service_categories
  for delete
  to authenticated
  using (
    public.is_admin()
  );

-- =========================================================
-- Permissões
-- =========================================================

grant select
  on public.service_categories
  to anon, authenticated;

grant insert, update, delete
  on public.service_categories
  to authenticated;