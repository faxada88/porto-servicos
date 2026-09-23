-- =========================================================
-- Porto Servicos
-- Fix Dual Role Provider Permissions
-- =========================================================

-- =========================================================
-- PROVIDER SERVICE CATEGORIES
-- Somente prestador aprovado pode gerenciar categorias.
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
  and public.is_approved_provider()
);


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
  and public.is_approved_provider()
);


-- =========================================================
-- PROVIDER SERVICES
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
  and public.is_approved_provider()
  and public.provider_has_category(
    provider_id,
    category_id
  )
);


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
  and public.is_approved_provider()
)
with check (
  auth.uid() = provider_id
  and public.is_approved_provider()
  and public.provider_has_category(
    provider_id,
    category_id
  )
);


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
  and public.is_approved_provider()
);


-- =========================================================
-- PROVIDER SERVICE AREAS
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
  and public.is_approved_provider()
);


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
  and public.is_approved_provider()
)
with check (
  auth.uid() = provider_id
  and public.is_approved_provider()
);


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
  and public.is_approved_provider()
);


-- =========================================================
-- ACCEPT SERVICE REQUEST
-- =========================================================

create or replace function public.accept_service_request(
  target_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.service_requests%rowtype;
begin

  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
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

  if not public.is_approved_provider() then
    raise exception 'PROVIDER_NOT_APPROVED';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'INVALID_STATUS_TRANSITION';
  end if;

  if v_request.pricing_type = 'quote' then
    raise exception 'QUOTE_REQUIRED';
  end if;

  update public.service_requests
  set
    status = 'accepted',
    accepted_at = now()
  where id = target_request_id;

end;
$$;


-- =========================================================
-- REJECT SERVICE REQUEST
-- =========================================================

create or replace function public.reject_service_request(
  target_request_id uuid,
  target_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.service_requests%rowtype;
begin

  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if target_reason is not null
     and char_length(target_reason) > 1000 then
    raise exception 'REASON_TOO_LONG';
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

  if not public.is_approved_provider() then
    raise exception 'PROVIDER_NOT_APPROVED';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'INVALID_STATUS_TRANSITION';
  end if;

  update public.service_requests
  set
    status = 'rejected',
    rejection_reason = nullif(btrim(target_reason), ''),
    rejected_at = now()
  where id = target_request_id;

end;
$$;


-- =========================================================
-- START SERVICE REQUEST
-- =========================================================

create or replace function public.start_service_request(
  target_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.service_requests%rowtype;
begin

  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
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

  if not public.is_approved_provider() then
    raise exception 'PROVIDER_NOT_APPROVED';
  end if;

  if v_request.status <> 'accepted' then
    raise exception 'INVALID_STATUS_TRANSITION';
  end if;

  update public.service_requests
  set
    status = 'in_progress',
    started_at = now()
  where id = target_request_id;

end;
$$;


-- =========================================================
-- COMPLETE SERVICE REQUEST
-- =========================================================

create or replace function public.complete_service_request(
  target_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.service_requests%rowtype;
begin

  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
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

  if not public.is_approved_provider() then
    raise exception 'PROVIDER_NOT_APPROVED';
  end if;

  if v_request.status <> 'in_progress' then
    raise exception 'INVALID_STATUS_TRANSITION';
  end if;

  update public.service_requests
  set
    status = 'completed',
    completed_at = now()
  where id = target_request_id;

end;
$$;


-- =========================================================
-- CREATE SERVICE QUOTE
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

  if v_request.status <> 'pending' then
    raise exception 'INVALID_REQUEST_STATUS';
  end if;

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
-- WITHDRAW SERVICE QUOTE
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

  if not public.is_approved_provider() then
    raise exception 'PROVIDER_NOT_APPROVED';
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
-- PERMISSIONS
-- =========================================================

revoke all
on function public.accept_service_request(uuid)
from public;

revoke all
on function public.reject_service_request(uuid, text)
from public;

revoke all
on function public.start_service_request(uuid)
from public;

revoke all
on function public.complete_service_request(uuid)
from public;

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
on function public.withdraw_service_quote(uuid)
from public;


grant execute
on function public.accept_service_request(uuid)
to authenticated;

grant execute
on function public.reject_service_request(uuid, text)
to authenticated;

grant execute
on function public.start_service_request(uuid)
to authenticated;

grant execute
on function public.complete_service_request(uuid)
to authenticated;

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
on function public.withdraw_service_quote(uuid)
to authenticated;