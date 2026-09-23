-- =========================================================
-- User Roles
-- Porto Serviços
-- =========================================================

-- =========================================================
-- ENUM: tipos de usuário
-- =========================================================

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'user_role'
  ) then
    create type public.user_role as enum (
      'customer',
      'provider',
      'admin'
    );
  end if;
end
$$;

-- =========================================================
-- Tabela: user_roles
-- =========================================================

create table if not exists public.user_roles (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  role public.user_role not null
    default 'customer',

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);

-- =========================================================
-- Índice
-- =========================================================

create index if not exists idx_user_roles_role
  on public.user_roles(role);

-- =========================================================
-- updated_at automático
-- Reutiliza public.set_updated_at()
-- criada na migration anterior
-- =========================================================

drop trigger if exists user_roles_set_updated_at
  on public.user_roles;

create trigger user_roles_set_updated_at
  before update on public.user_roles
  for each row
  execute function public.set_updated_at();

-- =========================================================
-- Criar role automaticamente para novos usuários
-- Todo novo usuário começa como customer.
--
-- IMPORTANTE:
-- O frontend NÃO decide se alguém é admin.
-- =========================================================

create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  insert into public.user_roles (
    user_id,
    role
  )
  values (
    new.id,
    'customer'
  )
  on conflict (user_id) do nothing;

  return new;

end;
$$;

drop trigger if exists on_auth_user_role_created
  on auth.users;

create trigger on_auth_user_role_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user_role();

-- =========================================================
-- Função auxiliar:
-- retorna o papel do usuário autenticado
-- =========================================================

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.user_roles
  where user_id = auth.uid();
$$;

-- =========================================================
-- Função auxiliar:
-- verifica se usuário atual é admin
-- =========================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select role = 'admin'
      from public.user_roles
      where user_id = auth.uid()
    ),
    false
  );
$$;

-- =========================================================
-- RLS
-- =========================================================

alter table public.user_roles
enable row level security;

-- =========================================================
-- SELECT
--
-- Usuário pode consultar apenas a própria role.
-- Admin pode consultar todas.
-- =========================================================

drop policy if exists "user_roles_select_own"
  on public.user_roles;

create policy "user_roles_select_own"
  on public.user_roles
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or public.is_admin()
  );

-- =========================================================
-- IMPORTANTE
--
-- Não criamos policy de INSERT/UPDATE/DELETE
-- para usuários autenticados.
--
-- Isso impede que alguém faça pelo frontend:
--
-- UPDATE user_roles
-- SET role = 'admin'
--
-- A alteração de role deverá ocorrer somente
-- pelo backend/admin usando credenciais privilegiadas.
-- =========================================================

-- =========================================================
-- Permissões
-- =========================================================

grant select
  on public.user_roles
  to authenticated;

revoke insert, update, delete
  on public.user_roles
  from authenticated;

-- =========================================================
-- Garantir roles para usuários já existentes
-- =========================================================

insert into public.user_roles (
  user_id,
  role
)
select
  id,
  'customer'::public.user_role
from auth.users
on conflict (user_id) do nothing;