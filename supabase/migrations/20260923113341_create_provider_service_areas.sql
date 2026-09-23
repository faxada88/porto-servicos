-- =========================================================
-- Provider Service Areas
-- Porto Serviços
-- =========================================================

create table if not exists public.provider_service_areas (
  id uuid primary key default gen_random_uuid(),

  provider_id uuid not null
    references public.provider_profiles(user_id)
    on delete cascade,

  city text not null,

  -- UF brasileira: BA, SP, RJ...
  state text not null,

  -- NULL significa que o prestador atende toda a cidade.
  -- Preenchido significa atendimento específico no bairro.
  neighborhood text,

  country_code text not null default 'BR',

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint provider_service_areas_city_length
    check (
      char_length(btrim(city)) between 2 and 100
    ),

  constraint provider_service_areas_state_format
    check (
      state ~ '^[A-Z]{2}$'
    ),

  constraint provider_service_areas_neighborhood_length
    check (
      neighborhood is null
      or char_length(btrim(neighborhood)) between 2 and 100
    ),

  constraint provider_service_areas_country_code_format
    check (
      country_code ~ '^[A-Z]{2}$'
    )
);

-- =========================================================
-- EVITAR ÁREAS DUPLICADAS
--
-- PostgreSQL considera NULL diferente de NULL em UNIQUE.
-- Por isso utilizamos COALESCE para representar
-- "cidade inteira" de forma consistente.
-- =========================================================

create unique index if not exists
  idx_provider_service_areas_unique
on public.provider_service_areas (
  provider_id,
  lower(city),
  state,
  lower(coalesce(neighborhood, '')),
  country_code
);

-- =========================================================
-- ÍNDICES PARA BUSCA
-- =========================================================

create index if not exists
  idx_provider_service_areas_provider
on public.provider_service_areas(provider_id);

create index if not exists
  idx_provider_service_areas_location
on public.provider_service_areas(
  state,
  city,
  neighborhood
)
where is_active = true;

-- =========================================================
-- updated_at automático
-- =========================================================

drop trigger if exists
  provider_service_areas_set_updated_at
on public.provider_service_areas;

create trigger provider_service_areas_set_updated_at
  before update on public.provider_service_areas
  for each row
  execute function public.set_updated_at();

-- =========================================================
-- RLS
-- =========================================================

alter table public.provider_service_areas
  enable row level security;

-- =========================================================
-- SELECT DO PRÓPRIO PRESTADOR
--
-- Prestador visualiza inclusive áreas desativadas.
-- =========================================================

drop policy if exists
  "provider_service_areas_select_own"
on public.provider_service_areas;

create policy
  "provider_service_areas_select_own"
on public.provider_service_areas
for select
to authenticated
using (
  auth.uid() = provider_id
);

-- =========================================================
-- SELECT ADMIN
-- =========================================================

drop policy if exists
  "provider_service_areas_admin_select"
on public.provider_service_areas;

create policy
  "provider_service_areas_admin_select"
on public.provider_service_areas
for select
to authenticated
using (
  public.is_admin()
);

-- =========================================================
-- SELECT PÚBLICO
--
-- Apenas áreas ativas de prestadores aprovados.
-- =========================================================

drop policy if exists
  "provider_service_areas_public_select"
on public.provider_service_areas;

create policy
  "provider_service_areas_public_select"
on public.provider_service_areas
for select
to anon, authenticated
using (
  is_active = true

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
-- Somente o próprio prestador.
-- =========================================================

drop policy if exists
  "provider_service_areas_insert_own"
on public.provider_service_areas;

create policy
  "provider_service_areas_insert_own"
on public.provider_service_areas
for insert
to authenticated
with check (
  auth.uid() = provider_id
  and public.current_user_role() = 'provider'
);

-- =========================================================
-- UPDATE
-- =========================================================

drop policy if exists
  "provider_service_areas_update_own"
on public.provider_service_areas;

create policy
  "provider_service_areas_update_own"
on public.provider_service_areas
for update
to authenticated
using (
  auth.uid() = provider_id
  and public.current_user_role() = 'provider'
)
with check (
  auth.uid() = provider_id
  and public.current_user_role() = 'provider'
);

-- =========================================================
-- DELETE
-- =========================================================

drop policy if exists
  "provider_service_areas_delete_own"
on public.provider_service_areas;

create policy
  "provider_service_areas_delete_own"
on public.provider_service_areas
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
  "provider_service_areas_admin_insert"
on public.provider_service_areas;

create policy
  "provider_service_areas_admin_insert"
on public.provider_service_areas
for insert
to authenticated
with check (
  public.is_admin()
);


drop policy if exists
  "provider_service_areas_admin_update"
on public.provider_service_areas;

create policy
  "provider_service_areas_admin_update"
on public.provider_service_areas
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


drop policy if exists
  "provider_service_areas_admin_delete"
on public.provider_service_areas;

create policy
  "provider_service_areas_admin_delete"
on public.provider_service_areas
for delete
to authenticated
using (
  public.is_admin()
);

-- =========================================================
-- PERMISSÕES
-- =========================================================

grant select
  on public.provider_service_areas
  to anon, authenticated;

grant insert, update, delete
  on public.provider_service_areas
  to authenticated;