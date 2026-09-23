-- =========================================================
-- User Addresses
-- Porto Serviços
-- =========================================================

create table if not exists public.user_addresses (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references public.profiles(id)
    on delete cascade,

  -- Ex.: Casa, Trabalho, Apartamento
  label text,

  -- CEP somente números: 45810000
  postal_code text not null,

  street text not null,
  number text not null,

  complement text,
  neighborhood text not null,
  city text not null,

  -- UF brasileira: BA, SP, RJ...
  state text not null,

  -- Brasil por padrão, mas preparado para expansão futura.
  country_code text not null default 'BR',

  reference text,

  is_default boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint user_addresses_label_length
    check (
      label is null
      or char_length(btrim(label)) between 1 and 40
    ),

  constraint user_addresses_postal_code_format
    check (
      postal_code ~ '^[0-9]{8}$'
    ),

  constraint user_addresses_street_length
    check (
      char_length(btrim(street)) between 2 and 160
    ),

  constraint user_addresses_number_length
    check (
      char_length(btrim(number)) between 1 and 30
    ),

  constraint user_addresses_complement_length
    check (
      complement is null
      or char_length(complement) <= 120
    ),

  constraint user_addresses_neighborhood_length
    check (
      char_length(btrim(neighborhood)) between 2 and 100
    ),

  constraint user_addresses_city_length
    check (
      char_length(btrim(city)) between 2 and 100
    ),

  constraint user_addresses_state_format
    check (
      state ~ '^[A-Z]{2}$'
    ),

  constraint user_addresses_country_code_format
    check (
      country_code ~ '^[A-Z]{2}$'
    ),

  constraint user_addresses_reference_length
    check (
      reference is null
      or char_length(reference) <= 200
    )
);

-- =========================================================
-- ÍNDICES
-- =========================================================

create index if not exists
  idx_user_addresses_user
on public.user_addresses(user_id);

create index if not exists
  idx_user_addresses_location
on public.user_addresses(
  city,
  state
);

-- =========================================================
-- APENAS UM ENDEREÇO PRINCIPAL POR USUÁRIO
--
-- Índice único parcial.
-- Vários endereços podem existir, mas somente um deles
-- pode possuir is_default = true.
-- =========================================================

create unique index if not exists
  idx_user_addresses_one_default
on public.user_addresses(user_id)
where is_default = true;

-- =========================================================
-- updated_at automático
-- =========================================================

drop trigger if exists user_addresses_set_updated_at
  on public.user_addresses;

create trigger user_addresses_set_updated_at
  before update on public.user_addresses
  for each row
  execute function public.set_updated_at();

-- =========================================================
-- FUNÇÃO:
-- Definir endereço principal de forma atômica
--
-- Primeiro remove o principal atual e depois define o novo.
-- =========================================================

create or replace function public.set_default_address(
  target_address_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin

  select user_id
  into target_user_id
  from public.user_addresses
  where id = target_address_id;

  if target_user_id is null then
    raise exception 'ADDRESS_NOT_FOUND';
  end if;

  if target_user_id <> auth.uid()
     and not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  update public.user_addresses
  set is_default = false
  where user_id = target_user_id
    and is_default = true;

  update public.user_addresses
  set is_default = true
  where id = target_address_id;

end;
$$;

-- =========================================================
-- RLS
-- =========================================================

alter table public.user_addresses
  enable row level security;

-- =========================================================
-- SELECT
-- Usuário vê somente os próprios endereços.
-- Admin pode consultar todos.
-- =========================================================

drop policy if exists
  "user_addresses_select_own"
on public.user_addresses;

create policy
  "user_addresses_select_own"
on public.user_addresses
for select
to authenticated
using (
  auth.uid() = user_id
  or public.is_admin()
);

-- =========================================================
-- INSERT
-- =========================================================

drop policy if exists
  "user_addresses_insert_own"
on public.user_addresses;

create policy
  "user_addresses_insert_own"
on public.user_addresses
for insert
to authenticated
with check (
  auth.uid() = user_id
);

-- =========================================================
-- UPDATE
-- =========================================================

drop policy if exists
  "user_addresses_update_own"
on public.user_addresses;

create policy
  "user_addresses_update_own"
on public.user_addresses
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);

-- =========================================================
-- DELETE
-- =========================================================

drop policy if exists
  "user_addresses_delete_own"
on public.user_addresses;

create policy
  "user_addresses_delete_own"
on public.user_addresses
for delete
to authenticated
using (
  auth.uid() = user_id
);

-- =========================================================
-- ADMIN
-- =========================================================

drop policy if exists
  "user_addresses_admin_insert"
on public.user_addresses;

create policy
  "user_addresses_admin_insert"
on public.user_addresses
for insert
to authenticated
with check (
  public.is_admin()
);

drop policy if exists
  "user_addresses_admin_update"
on public.user_addresses;

create policy
  "user_addresses_admin_update"
on public.user_addresses
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists
  "user_addresses_admin_delete"
on public.user_addresses;

create policy
  "user_addresses_admin_delete"
on public.user_addresses
for delete
to authenticated
using (
  public.is_admin()
);

-- =========================================================
-- PERMISSÕES
-- =========================================================

grant select, insert, update, delete
  on public.user_addresses
  to authenticated;

grant execute
  on function public.set_default_address(uuid)
  to authenticated;