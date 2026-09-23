-- =========================================================
-- Service Quotes
-- Porto Serviços
-- =========================================================

-- =========================================================
-- ENUM: status do orçamento
-- =========================================================

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'service_quote_status'
  ) then
    create type public.service_quote_status as enum (
      'pending',
      'accepted',
      'rejected',
      'withdrawn',
      'expired'
    );
  end if;
end
$$;

-- =========================================================
-- TABELA: service_quotes
-- =========================================================

create table if not exists public.service_quotes (
  id uuid primary key default gen_random_uuid(),

  service_request_id uuid not null
    references public.service_requests(id)
    on delete cascade,

  provider_id uuid not null
    references public.provider_profiles(user_id)
    on delete restrict,

  customer_id uuid not null
    references public.customer_profiles(user_id)
    on delete restrict,

  -- Valor proposto em centavos.
  -- Ex.: R$ 350,00 = 35000
  amount_cents bigint not null,

  -- Mensagem/descrição do orçamento.
  message text,

  -- Prazo estimado informado pelo prestador.
  estimated_duration_minutes integer,

  -- Data limite para aceite.
  valid_until timestamptz,

  status public.service_quote_status
    not null default 'pending',

  accepted_at timestamptz,
  rejected_at timestamptz,
  withdrawn_at timestamptz,
  expired_at timestamptz,

  rejection_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint service_quotes_amount_positive
    check (
      amount_cents > 0
    ),

  constraint service_quotes_message_length
    check (
      message is null
      or char_length(message) <= 3000
    ),

  constraint service_quotes_duration_positive
    check (
      estimated_duration_minutes is null
      or estimated_duration_minutes > 0
    ),

  constraint service_quotes_rejection_reason_length
    check (
      rejection_reason is null
      or char_length(rejection_reason) <= 1000
    )
);

-- =========================================================
-- ÍNDICES
-- =========================================================

create index if not exists
  idx_service_quotes_request
on public.service_quotes(
  service_request_id,
  created_at desc
);

create index if not exists
  idx_service_quotes_provider
on public.service_quotes(
  provider_id,
  created_at desc
);

create index if not exists
  idx_service_quotes_customer
on public.service_quotes(
  customer_id,
  created_at desc
);

-- =========================================================
-- SOMENTE UM ORÇAMENTO PENDENTE POR SOLICITAÇÃO
-- =========================================================

create unique index if not exists
  idx_service_quotes_one_pending_per_request
on public.service_quotes(service_request_id)
where status = 'pending';

-- =========================================================
-- updated_at automático
-- =========================================================

drop trigger if exists
  service_quotes_set_updated_at
on public.service_quotes;

create trigger service_quotes_set_updated_at
  before update on public.service_quotes
  for each row
  execute function public.set_updated_at();

-- =========================================================
-- CRIAR ORÇAMENTO
--
-- Somente o prestador responsável pela solicitação.
-- O frontend não escolhe customer_id/provider_id.
-- =========================================================

create or replace function public.create_service_quote(
  target_request_id uuid,
  target_amount_cents bigint,
  target_message text default null,
  target_estimated_duration_minutes integer default null,
  target_valid_until timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.service_requests%rowtype;
  v_quote_id uuid;
begin

  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if public.current_user_role() <> 'provider' then
    raise exception 'PROVIDER_ROLE_REQUIRED';
  end if;

  if not public.is_approved_provider() then
    raise exception 'PROVIDER_NOT_APPROVED';
  end if;

  if target_amount_cents is null
     or target_amount_cents <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if target_message is not null
     and char_length(target_message) > 3000 then
    raise exception 'MESSAGE_TOO_LONG';
  end if;

  if target_estimated_duration_minutes is not null
     and target_estimated_duration_minutes <= 0 then
    raise exception 'INVALID_DURATION';
  end if;

  if target_valid_until is not null
     and target_valid_until <= now() then
    raise exception 'INVALID_EXPIRATION';
  end if;

  select *
  into v_request
  from public.service_requests
  where id = target_request_id
  for update;

  if not found then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if v_request.provider_id <> auth.uid() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  -- Orçamento só pode ser enviado enquanto a solicitação
  -- ainda está aguardando decisão.
  if v_request.status <> 'pending' then
    raise exception 'INVALID_REQUEST_STATUS';
  end if;

  -- Nesta primeira versão, orçamento formal é usado
  -- somente para serviços configurados como "quote".
  if v_request.pricing_type <> 'quote' then
    raise exception 'QUOTE_NOT_REQUIRED';
  end if;

  if exists (
    select 1
    from public.service_quotes sq
    where sq.service_request_id = target_request_id
      and sq.status = 'pending'
  ) then
    raise exception 'PENDING_QUOTE_ALREADY_EXISTS';
  end if;

  insert into public.service_quotes (
    service_request_id,
    provider_id,
    customer_id,
    amount_cents,
    message,
    estimated_duration_minutes,
    valid_until,
    status
  )
  values (
    v_request.id,
    v_request.provider_id,
    v_request.customer_id,
    target_amount_cents,
    nullif(btrim(target_message), ''),
    target_estimated_duration_minutes,
    target_valid_until,
    'pending'
  )
  returning id into v_quote_id;

  return v_quote_id;

end;
$$;

-- =========================================================
-- ACEITAR ORÇAMENTO
--
-- Somente o cliente da solicitação.
--
-- Ao aceitar:
-- 1. orçamento -> accepted
-- 2. solicitação -> accepted
-- 3. price_cents recebe o valor acordado
-- 4. accepted_at é registrado
-- =========================================================

create or replace function public.accept_service_quote(
  target_quote_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.service_quotes%rowtype;
  v_request public.service_requests%rowtype;
begin

  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select *
  into v_quote
  from public.service_quotes
  where id = target_quote_id
  for update;

  if not found then
    raise exception 'QUOTE_NOT_FOUND';
  end if;

  if v_quote.customer_id <> auth.uid() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if public.current_user_role() <> 'customer' then
    raise exception 'CUSTOMER_ROLE_REQUIRED';
  end if;

  if v_quote.status <> 'pending' then
    raise exception 'INVALID_QUOTE_STATUS';
  end if;

  if v_quote.valid_until is not null
     and v_quote.valid_until <= now() then

    update public.service_quotes
    set
      status = 'expired',
      expired_at = now()
    where id = target_quote_id;

    return;
  end if;

  select *
  into v_request
  from public.service_requests
  where id = v_quote.service_request_id
  for update;

  if not found then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'INVALID_REQUEST_STATUS';
  end if;

  update public.service_quotes
  set
    status = 'accepted',
    accepted_at = now()
  where id = target_quote_id;

  update public.service_requests
  set
    status = 'accepted',
    price_cents = v_quote.amount_cents,
    accepted_at = now()
  where id = v_request.id;

end;
$$;

-- =========================================================
-- RECUSAR ORÇAMENTO
--
-- Cliente recusa, mas a solicitação continua pending.
-- Isso permite que o prestador envie uma nova proposta.
-- =========================================================

create or replace function public.reject_service_quote(
  target_quote_id uuid,
  target_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.service_quotes%rowtype;
  v_request_status public.service_request_status;
begin

  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if target_reason is not null
     and char_length(target_reason) > 1000 then
    raise exception 'REASON_TOO_LONG';
  end if;

  select *
  into v_quote
  from public.service_quotes
  where id = target_quote_id
  for update;

  if not found then
    raise exception 'QUOTE_NOT_FOUND';
  end if;

  if v_quote.customer_id <> auth.uid() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if public.current_user_role() <> 'customer' then
    raise exception 'CUSTOMER_ROLE_REQUIRED';
  end if;

  if v_quote.status <> 'pending' then
    raise exception 'INVALID_QUOTE_STATUS';
  end if;

  select status
  into v_request_status
  from public.service_requests
  where id = v_quote.service_request_id
  for update;

  if not found then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if v_request_status <> 'pending' then
    raise exception 'INVALID_REQUEST_STATUS';
  end if;

  update public.service_quotes
  set
    status = 'rejected',
    rejection_reason = nullif(btrim(target_reason), ''),
    rejected_at = now()
  where id = target_quote_id;

end;
$$;

-- =========================================================
-- RETIRAR ORÇAMENTO
--
-- Prestador pode retirar uma proposta ainda pendente.
-- =========================================================

create or replace function public.withdraw_service_quote(
  target_quote_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.service_quotes%rowtype;
begin

  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select *
  into v_quote
  from public.service_quotes
  where id = target_quote_id
  for update;

  if not found then
    raise exception 'QUOTE_NOT_FOUND';
  end if;

  if v_quote.provider_id <> auth.uid() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if public.current_user_role() <> 'provider' then
    raise exception 'PROVIDER_ROLE_REQUIRED';
  end if;

  if v_quote.status <> 'pending' then
    raise exception 'INVALID_QUOTE_STATUS';
  end if;

  update public.service_quotes
  set
    status = 'withdrawn',
    withdrawn_at = now()
  where id = target_quote_id;

end;
$$;

-- =========================================================
-- RLS
-- =========================================================

alter table public.service_quotes
  enable row level security;

-- Cliente e prestador envolvidos podem visualizar.
-- Admin pode visualizar todos.

drop policy if exists
  "service_quotes_select_participants"
on public.service_quotes;

create policy
  "service_quotes_select_participants"
on public.service_quotes
for select
to authenticated
using (
  auth.uid() = customer_id
  or auth.uid() = provider_id
  or public.is_admin()
);

-- =========================================================
-- Sem INSERT / UPDATE / DELETE direto.
--
-- Todas as mudanças passam pelas funções controladas.
-- =========================================================

revoke insert, update, delete
  on public.service_quotes
  from authenticated;

grant select
  on public.service_quotes
  to authenticated;

-- =========================================================
-- PERMISSÕES DAS FUNÇÕES
-- =========================================================

revoke all
  on function public.create_service_quote(
    uuid,
    bigint,
    text,
    integer,
    timestamptz
  )
  from public;

revoke all
  on function public.accept_service_quote(uuid)
  from public;

revoke all
  on function public.reject_service_quote(uuid, text)
  from public;

revoke all
  on function public.withdraw_service_quote(uuid)
  from public;

grant execute
  on function public.create_service_quote(
    uuid,
    bigint,
    text,
    integer,
    timestamptz
  )
  to authenticated;

grant execute
  on function public.accept_service_quote(uuid)
  to authenticated;

grant execute
  on function public.reject_service_quote(uuid, text)
  to authenticated;

grant execute
  on function public.withdraw_service_quote(uuid)
  to authenticated;