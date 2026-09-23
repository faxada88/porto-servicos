-- =========================================================
-- Service Request Transitions
-- Porto Serviços
-- =========================================================

-- =========================================================
-- ACCEPT
--
-- pending -> accepted
-- Somente o prestador responsável.
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

  if public.current_user_role() <> 'provider' then
    raise exception 'PROVIDER_ROLE_REQUIRED';
  end if;

  if not public.is_approved_provider() then
    raise exception 'PROVIDER_NOT_APPROVED';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'INVALID_STATUS_TRANSITION';
  end if;

  update public.service_requests
  set
    status = 'accepted',
    accepted_at = now()
  where id = target_request_id;

end;
$$;

-- =========================================================
-- REJECT
--
-- pending -> rejected
-- Somente o prestador responsável.
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

  if public.current_user_role() <> 'provider' then
    raise exception 'PROVIDER_ROLE_REQUIRED';
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
-- CANCEL
--
-- Cliente:
-- pending / accepted -> cancelled
--
-- Prestador:
-- accepted -> cancelled
--
-- Admin:
-- pending / accepted -> cancelled
-- =========================================================

create or replace function public.cancel_service_request(
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
  v_user_id uuid;
  v_is_admin boolean;
begin

  v_user_id := auth.uid();

  if v_user_id is null then
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

  v_is_admin := public.is_admin();

  if v_user_id = v_request.customer_id then

    if v_request.status not in ('pending', 'accepted') then
      raise exception 'INVALID_STATUS_TRANSITION';
    end if;

  elsif v_user_id = v_request.provider_id then

    if v_request.status <> 'accepted' then
      raise exception 'INVALID_STATUS_TRANSITION';
    end if;

  elsif v_is_admin then

    if v_request.status not in ('pending', 'accepted') then
      raise exception 'INVALID_STATUS_TRANSITION';
    end if;

  else
    raise exception 'NOT_AUTHORIZED';
  end if;

  update public.service_requests
  set
    status = 'cancelled',
    cancellation_reason = nullif(btrim(target_reason), ''),
    cancelled_by = v_user_id,
    cancelled_at = now()
  where id = target_request_id;

end;
$$;

-- =========================================================
-- START
--
-- accepted -> in_progress
-- Somente o prestador responsável.
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

  if public.current_user_role() <> 'provider' then
    raise exception 'PROVIDER_ROLE_REQUIRED';
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
-- COMPLETE
--
-- in_progress -> completed
-- Somente o prestador responsável.
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

  if public.current_user_role() <> 'provider' then
    raise exception 'PROVIDER_ROLE_REQUIRED';
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
-- PERMISSÕES
-- =========================================================

revoke all
  on function public.accept_service_request(uuid)
  from public;

revoke all
  on function public.reject_service_request(uuid, text)
  from public;

revoke all
  on function public.cancel_service_request(uuid, text)
  from public;

revoke all
  on function public.start_service_request(uuid)
  from public;

revoke all
  on function public.complete_service_request(uuid)
  from public;

grant execute
  on function public.accept_service_request(uuid)
  to authenticated;

grant execute
  on function public.reject_service_request(uuid, text)
  to authenticated;

grant execute
  on function public.cancel_service_request(uuid, text)
  to authenticated;

grant execute
  on function public.start_service_request(uuid)
  to authenticated;

grant execute
  on function public.complete_service_request(uuid)
  to authenticated;