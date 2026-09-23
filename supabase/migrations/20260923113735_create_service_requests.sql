-- =========================================================
-- Service Requests
-- Porto Serviços
-- =========================================================

-- =========================================================
-- ENUM: status da solicitação
-- =========================================================

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'service_request_status'
  ) then
    create type public.service_request_status as enum (
      'pending',
      'accepted',
      'rejected',
      'cancelled',
      'in_progress',
      'completed'
    );
  end if;
end
$$;

-- =========================================================
-- TABELA
-- =========================================================

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),

  -- Cliente que solicitou
  customer_id uuid not null
    references public.customer_profiles(user_id)
    on delete restrict,

  -- Prestador escolhido
  provider_id uuid not null
    references public.provider_profiles(user_id)
    on delete restrict,

  -- Serviço original
  provider_service_id uuid not null
    references public.provider_services(id)
    on delete restrict,

  -- Categoria original
  category_id uuid not null
    references public.service_categories(id)
    on delete restrict,

  -- =======================================================
  -- SNAPSHOT DO SERVIÇO
  -- =======================================================

  service_name text not null,

  pricing_type public.service_pricing_type not null,

  -- Valor apresentado no momento da solicitação.
  -- NULL quando pricing_type = quote.
  price_cents bigint,

  -- =======================================================
  -- DESCRIÇÃO DO PROBLEMA / PEDIDO
  -- =======================================================

  customer_notes text,

  -- =======================================================
  -- AGENDAMENTO
  -- =======================================================

  scheduled_for timestamptz,

  -- =======================================================
  -- SNAPSHOT DO ENDEREÇO
  --
  -- Guardamos o endereço aqui, além do address_id.
  -- Se o cliente editar/excluir seu endereço depois,
  -- esta solicitação continua com o endereço histórico.
  -- =======================================================

  address_id uuid
    references public.user_addresses(id)
    on delete set null,

  address_label text,

  address_postal_code text not null,
  address_street text not null,
  address_number text not null,
  address_complement text,
  address_neighborhood text not null,
  address_city text not null,
  address_state text not null,
  address_country_code text not null default 'BR',
  address_reference text,

  -- =======================================================
  -- STATUS
  -- =======================================================

  status public.service_request_status
    not null default 'pending',

  -- =======================================================
  -- RESPOSTA / CANCELAMENTO
  -- =======================================================

  rejection_reason text,
  cancellation_reason text,

  cancelled_by uuid
    references public.profiles(id)
    on delete set null,

  -- =======================================================
  -- DATAS DO FLUXO
  -- =======================================================

  accepted_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- =======================================================
  -- CONSTRAINTS
  -- =======================================================

  constraint service_requests_service_name_length
    check (
      char_length(btrim(service_name)) between 2 and 120
    ),

  constraint service_requests_price_non_negative
    check (
      price_cents is null
      or price_cents >= 0
    ),

  constraint service_requests_pricing_consistency
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
    ),

  constraint service_requests_customer_notes_length
    check (
      customer_notes is null
      or char_length(customer_notes) <= 3000
    ),

  constraint service_requests_rejection_reason_length
    check (
      rejection_reason is null
      or char_length(rejection_reason) <= 1000
    ),

  constraint service_requests_cancellation_reason_length
    check (
      cancellation_reason is null
      or char_length(cancellation_reason) <= 1000
    ),

  constraint service_requests_postal_code_format
    check (
      address_postal_code ~ '^[0-9]{8}$'
    ),

  constraint service_requests_state_format
    check (
      address_state ~ '^[A-Z]{2}$'
    ),

  constraint service_requests_country_code_format
    check (
      address_country_code ~ '^[A-Z]{2}$'
    )
);

-- =========================================================
-- ÍNDICES
-- =========================================================

create index if not exists
  idx_service_requests_customer
on public.service_requests(
  customer_id,
  created_at desc
);

create index if not exists
  idx_service_requests_provider
on public.service_requests(
  provider_id,
  created_at desc
);

create index if not exists
  idx_service_requests_provider_status
on public.service_requests(
  provider_id,
  status,
  created_at desc
);

create index if not exists
  idx_service_requests_customer_status
on public.service_requests(
  customer_id,
  status,
  created_at desc
);

create index if not exists
  idx_service_requests_scheduled
on public.service_requests(scheduled_for)
where scheduled_for is not null;

-- =========================================================
-- updated_at automático
-- =========================================================

drop trigger if exists
  service_requests_set_updated_at
on public.service_requests;

create trigger service_requests_set_updated_at
  before update on public.service_requests
  for each row
  execute function public.set_updated_at();

-- =========================================================
-- FUNÇÃO:
-- Criar solicitação com snapshots seguros
--
-- O frontend envia apenas IDs e dados da solicitação.
-- Serviço/preço/endereço são buscados diretamente no banco.
-- =========================================================

create or replace function public.create_service_request(
  target_provider_service_id uuid,
  target_address_id uuid,
  target_scheduled_for timestamptz default null,
  target_customer_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_provider_id uuid;
  v_category_id uuid;

  v_service_name text;
  v_pricing_type public.service_pricing_type;
  v_price_cents bigint;

  v_address public.user_addresses%rowtype;

  v_request_id uuid;
begin

  v_customer_id := auth.uid();

  if v_customer_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if public.current_user_role() <> 'customer' then
    raise exception 'CUSTOMER_ROLE_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.customer_profiles cp
    where cp.user_id = v_customer_id
  ) then
    raise exception 'CUSTOMER_PROFILE_NOT_FOUND';
  end if;

  -- -------------------------------------------------------
  -- Buscar serviço e validar disponibilidade
  -- -------------------------------------------------------

  select
    ps.provider_id,
    ps.category_id,
    ps.name,
    ps.pricing_type,
    ps.price_cents
  into
    v_provider_id,
    v_category_id,
    v_service_name,
    v_pricing_type,
    v_price_cents
  from public.provider_services ps
  join public.provider_profiles pp
    on pp.user_id = ps.provider_id
  join public.service_categories sc
    on sc.id = ps.category_id
  where ps.id = target_provider_service_id
    and ps.is_active = true
    and pp.status = 'approved'
    and sc.is_active = true;

  if v_provider_id is null then
    raise exception 'SERVICE_NOT_AVAILABLE';
  end if;

  -- -------------------------------------------------------
  -- Buscar endereço pertencente ao cliente
  -- -------------------------------------------------------

  select *
  into v_address
  from public.user_addresses
  where id = target_address_id
    and user_id = v_customer_id;

  if not found then
    raise exception 'ADDRESS_NOT_FOUND';
  end if;

  -- -------------------------------------------------------
  -- Criar solicitação
  -- -------------------------------------------------------

  insert into public.service_requests (
    customer_id,
    provider_id,
    provider_service_id,
    category_id,

    service_name,
    pricing_type,
    price_cents,

    customer_notes,
    scheduled_for,

    address_id,
    address_label,
    address_postal_code,
    address_street,
    address_number,
    address_complement,
    address_neighborhood,
    address_city,
    address_state,
    address_country_code,
    address_reference,

    status
  )
  values (
    v_customer_id,
    v_provider_id,
    target_provider_service_id,
    v_category_id,

    v_service_name,
    v_pricing_type,
    v_price_cents,

    target_customer_notes,
    target_scheduled_for,

    v_address.id,
    v_address.label,
    v_address.postal_code,
    v_address.street,
    v_address.number,
    v_address.complement,
    v_address.neighborhood,
    v_address.city,
    v_address.state,
    v_address.country_code,
    v_address.reference,

    'pending'
  )
  returning id into v_request_id;

  return v_request_id;

end;
$$;

-- =========================================================
-- RLS
-- =========================================================

alter table public.service_requests
  enable row level security;

-- =========================================================
-- SELECT
--
-- Cliente vê as próprias solicitações.
-- Prestador vê solicitações destinadas a ele.
-- Admin vê todas.
-- =========================================================

drop policy if exists
  "service_requests_select_participants"
on public.service_requests;

create policy
  "service_requests_select_participants"
on public.service_requests
for select
to authenticated
using (
  auth.uid() = customer_id
  or auth.uid() = provider_id
  or public.is_admin()
);

-- =========================================================
-- Não liberamos INSERT direto.
--
-- Solicitações devem ser criadas através de:
--
-- public.create_service_request(...)
--
-- Isso impede o frontend de manipular:
-- - preço
-- - prestador
-- - categoria
-- - snapshot do endereço
-- =========================================================

revoke insert
  on public.service_requests
  from authenticated;

-- =========================================================
-- Não liberamos UPDATE/DELETE direto nesta etapa.
--
-- Transições de status serão feitas posteriormente
-- através de funções específicas:
--
-- accept_service_request()
-- reject_service_request()
-- cancel_service_request()
-- start_service_request()
-- complete_service_request()
--
-- Isso evita mudanças inválidas de status pelo frontend.
-- =========================================================

revoke update, delete
  on public.service_requests
  from authenticated;

-- =========================================================
-- PERMISSÕES
-- =========================================================

grant select
  on public.service_requests
  to authenticated;

grant execute
  on function public.create_service_request(
    uuid,
    uuid,
    timestamptz,
    text
  )
  to authenticated;