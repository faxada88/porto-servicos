-- =========================================================
-- Customer & Provider Profiles
-- Porto Serviços
-- =========================================================

-- =========================================================
-- ENUM: status do prestador
-- =========================================================

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'provider_status'
  ) then
    create type public.provider_status as enum (
      'pending',
      'approved',
      'rejected',
      'suspended'
    );
  end if;
end
$$;

-- =========================================================
-- CUSTOMER PROFILES
-- Dados específicos dos clientes
-- =========================================================

create table if not exists public.customer_profiles (
  user_id uuid primary key
    references public.profiles(id)
    on delete cascade,

  phone text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- PROVIDER PROFILES
-- Dados específicos dos prestadores
-- =========================================================

create table if not exists public.provider_profiles (
  user_id uuid primary key
    references public.profiles(id)
    on delete cascade,

  phone text,

  business_name text,

  description text,

  status public.provider_status not null
    default 'pending',

  approved_at timestamptz,

  approved_by uuid
    references public.profiles(id)
    on delete set null,

  rejection_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint provider_business_name_length
    check (
      business_name is null
      or char_length(btrim(business_name)) between 2 and 120
    ),

  constraint provider_description_length
    check (
      description is null
      or char_length(description) <= 2000
    )
);

-- =========================================================
-- ÍNDICES
-- =========================================================

create index if not exists idx_provider_profiles_status
  on public.provider_profiles(status);

create index if not exists idx_provider_profiles_approved_by
  on public.provider_profiles(approved_by);

-- =========================================================
-- updated_at automático
-- =========================================================

drop trigger if exists customer_profiles_set_updated_at
  on public.customer_profiles;

create trigger customer_profiles_set_updated_at
  before update on public.customer_profiles
  for each row
  execute function public.set_updated_at();


drop trigger if exists provider_profiles_set_updated_at
  on public.provider_profiles;

create trigger provider_profiles_set_updated_at
  before update on public.provider_profiles
  for each row
  execute function public.set_updated_at();

-- =========================================================
-- RLS
-- =========================================================

alter table public.customer_profiles
  enable row level security;

alter table public.provider_profiles
  enable row level security;

-- =========================================================
-- CUSTOMER PROFILES
-- Cliente acessa somente o próprio perfil.
-- Admin pode consultar todos.
-- =========================================================

drop policy if exists "customer_profiles_select_own"
  on public.customer_profiles;

create policy "customer_profiles_select_own"
  on public.customer_profiles
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or public.is_admin()
  );


drop policy if exists "customer_profiles_insert_own"
  on public.customer_profiles;

create policy "customer_profiles_insert_own"
  on public.customer_profiles
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.current_user_role() = 'customer'
  );


drop policy if exists "customer_profiles_update_own"
  on public.customer_profiles;

create policy "customer_profiles_update_own"
  on public.customer_profiles
  for update
  to authenticated
  using (
    auth.uid() = user_id
  )
  with check (
    auth.uid() = user_id
  );

-- =========================================================
-- PROVIDER PROFILES
--
-- Prestador pode:
-- - criar o próprio perfil
-- - consultar o próprio perfil
--
-- Atualização direta pelo cliente Supabase será restrita.
-- Campos sensíveis como status/approved_by devem ser
-- controlados pelo backend/admin.
-- =========================================================

drop policy if exists "provider_profiles_select_own"
  on public.provider_profiles;

create policy "provider_profiles_select_own"
  on public.provider_profiles
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or public.is_admin()
  );


drop policy if exists "provider_profiles_insert_own"
  on public.provider_profiles;

create policy "provider_profiles_insert_own"
  on public.provider_profiles
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.current_user_role() = 'provider'
    and status = 'pending'
    and approved_at is null
    and approved_by is null
    and rejection_reason is null
  );

-- =========================================================
-- PERMISSÕES
--
-- Não damos UPDATE direto em provider_profiles ao usuário.
-- Alterações serão feitas posteriormente por funções RPC
-- específicas ou pelo backend.
-- =========================================================

grant select, insert, update
  on public.customer_profiles
  to authenticated;

grant select, insert
  on public.provider_profiles
  to authenticated;

revoke update, delete
  on public.provider_profiles
  from authenticated;

-- =========================================================
-- Função: verificar se prestador está aprovado
-- =========================================================

create or replace function public.is_approved_provider()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select
        ur.role = 'provider'
        and pp.status = 'approved'
      from public.user_roles ur
      join public.provider_profiles pp
        on pp.user_id = ur.user_id
      where ur.user_id = auth.uid()
    ),
    false
  );
$$;