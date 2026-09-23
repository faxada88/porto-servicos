-- =========================================================
-- Provider Onboarding
-- Porto Serviços
-- =========================================================

-- =========================================================
-- SOLICITAR CADASTRO COMO PRESTADOR
--
-- Fluxo:
-- customer
--    ↓
-- request_provider_onboarding()
--    ↓
-- role = provider
-- provider_profile = pending
--
-- O usuário NÃO consegue:
-- - escolher status
-- - se aprovar
-- - escolher approved_by
-- - virar admin
-- =========================================================

create or replace function public.request_provider_onboarding(
  target_phone text,
  target_business_name text,
  target_description text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_role public.user_role;
begin

  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- Bloqueia dados inválidos.
  if target_phone is null
     or char_length(btrim(target_phone)) < 8
     or char_length(btrim(target_phone)) > 30 then
    raise exception 'INVALID_PHONE';
  end if;

  if target_business_name is null
     or char_length(btrim(target_business_name)) < 2
     or char_length(btrim(target_business_name)) > 150 then
    raise exception 'INVALID_BUSINESS_NAME';
  end if;

  if target_description is not null
     and char_length(target_description) > 3000 then
    raise exception 'DESCRIPTION_TOO_LONG';
  end if;

  -- Bloqueia a linha do role durante a operação.
  select role
  into v_role
  from public.user_roles
  where user_id = v_user_id
  for update;

  if not found then
    raise exception 'USER_ROLE_NOT_FOUND';
  end if;

  -- Admin nunca passa por onboarding de prestador.
  if v_role = 'admin' then
    raise exception 'ADMIN_NOT_ALLOWED';
  end if;

  -- Se já é provider e já possui perfil,
  -- não cria cadastro duplicado.
  if v_role = 'provider'
     and exists (
       select 1
       from public.provider_profiles pp
       where pp.user_id = v_user_id
     ) then
    raise exception 'PROVIDER_PROFILE_ALREADY_EXISTS';
  end if;

  -- Se existe perfil antigo por qualquer inconsistência,
  -- não sobrescrevemos silenciosamente.
  if exists (
    select 1
    from public.provider_profiles pp
    where pp.user_id = v_user_id
  ) then
    raise exception 'PROVIDER_PROFILE_ALREADY_EXISTS';
  end if;

  -- A mudança customer -> provider ocorre no servidor.
  update public.user_roles
  set role = 'provider'
  where user_id = v_user_id;

  -- Cria perfil sempre como pending.
  insert into public.provider_profiles (
    user_id,
    phone,
    business_name,
    description,
    status,
    approved_at,
    approved_by,
    rejection_reason
  )
  values (
    v_user_id,
    btrim(target_phone),
    btrim(target_business_name),
    nullif(btrim(target_description), ''),
    'pending',
    null,
    null,
    null
  );

end;
$$;

-- =========================================================
-- ATUALIZAR DADOS DO PERFIL DO PRESTADOR
--
-- O prestador pode alterar apenas os próprios dados
-- editáveis.
--
-- NÃO pode alterar:
-- status
-- approved_at
-- approved_by
-- rejection_reason
-- =========================================================

create or replace function public.update_provider_profile(
  target_phone text,
  target_business_name text,
  target_description text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin

  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if public.current_user_role() <> 'provider' then
    raise exception 'PROVIDER_ROLE_REQUIRED';
  end if;

  if target_phone is null
     or char_length(btrim(target_phone)) < 8
     or char_length(btrim(target_phone)) > 30 then
    raise exception 'INVALID_PHONE';
  end if;

  if target_business_name is null
     or char_length(btrim(target_business_name)) < 2
     or char_length(btrim(target_business_name)) > 150 then
    raise exception 'INVALID_BUSINESS_NAME';
  end if;

  if target_description is not null
     and char_length(target_description) > 3000 then
    raise exception 'DESCRIPTION_TOO_LONG';
  end if;

  update public.provider_profiles
  set
    phone = btrim(target_phone),
    business_name = btrim(target_business_name),
    description = nullif(btrim(target_description), '')
  where user_id = v_user_id;

  if not found then
    raise exception 'PROVIDER_PROFILE_NOT_FOUND';
  end if;

end;
$$;

-- =========================================================
-- APROVAR PRESTADOR
--
-- Exclusivo para admin.
-- =========================================================

create or replace function public.approve_provider(
  target_provider_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider public.provider_profiles%rowtype;
begin

  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select *
  into v_provider
  from public.provider_profiles
  where user_id = target_provider_id
  for update;

  if not found then
    raise exception 'PROVIDER_PROFILE_NOT_FOUND';
  end if;

  if v_provider.status <> 'pending' then
    raise exception 'INVALID_PROVIDER_STATUS';
  end if;

  update public.provider_profiles
  set
    status = 'approved',
    approved_at = now(),
    approved_by = auth.uid(),
    rejection_reason = null
  where user_id = target_provider_id;

end;
$$;

-- =========================================================
-- REJEITAR PRESTADOR
--
-- Exclusivo para admin.
-- =========================================================

create or replace function public.reject_provider(
  target_provider_id uuid,
  target_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider public.provider_profiles%rowtype;
begin

  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if target_reason is null
     or char_length(btrim(target_reason)) < 3 then
    raise exception 'REJECTION_REASON_REQUIRED';
  end if;

  if char_length(target_reason) > 1000 then
    raise exception 'REASON_TOO_LONG';
  end if;

  select *
  into v_provider
  from public.provider_profiles
  where user_id = target_provider_id
  for update;

  if not found then
    raise exception 'PROVIDER_PROFILE_NOT_FOUND';
  end if;

  if v_provider.status <> 'pending' then
    raise exception 'INVALID_PROVIDER_STATUS';
  end if;

  update public.provider_profiles
  set
    status = 'rejected',
    approved_at = null,
    approved_by = null,
    rejection_reason = btrim(target_reason)
  where user_id = target_provider_id;

end;
$$;

-- =========================================================
-- SUSPENDER PRESTADOR
--
-- Exclusivo para admin.
-- Um prestador suspenso deixa de passar em
-- is_approved_provider().
-- =========================================================

create or replace function public.suspend_provider(
  target_provider_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider public.provider_profiles%rowtype;
begin

  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select *
  into v_provider
  from public.provider_profiles
  where user_id = target_provider_id
  for update;

  if not found then
    raise exception 'PROVIDER_PROFILE_NOT_FOUND';
  end if;

  if v_provider.status <> 'approved' then
    raise exception 'INVALID_PROVIDER_STATUS';
  end if;

  update public.provider_profiles
  set status = 'suspended'
  where user_id = target_provider_id;

end;
$$;

-- =========================================================
-- REATIVAR PRESTADOR SUSPENSO
--
-- Exclusivo para admin.
-- =========================================================

create or replace function public.reactivate_provider(
  target_provider_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider public.provider_profiles%rowtype;
begin

  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select *
  into v_provider
  from public.provider_profiles
  where user_id = target_provider_id
  for update;

  if not found then
    raise exception 'PROVIDER_PROFILE_NOT_FOUND';
  end if;

  if v_provider.status <> 'suspended' then
    raise exception 'INVALID_PROVIDER_STATUS';
  end if;

  update public.provider_profiles
  set
    status = 'approved',
    approved_at = coalesce(approved_at, now()),
    approved_by = auth.uid(),
    rejection_reason = null
  where user_id = target_provider_id;

end;
$$;

-- =========================================================
-- SEGURANÇA DA TABELA user_roles
--
-- Mantemos proibidas alterações diretas pelo usuário.
-- =========================================================

revoke insert, update, delete
on public.user_roles
from authenticated;

-- =========================================================
-- SEGURANÇA DA TABELA provider_profiles
--
-- Alterações passam pelas RPCs acima.
-- =========================================================

revoke update, delete
on public.provider_profiles
from authenticated;

-- =========================================================
-- PERMISSÕES DAS FUNÇÕES
-- =========================================================

revoke all
on function public.request_provider_onboarding(
  text,
  text,
  text
)
from public;

revoke all
on function public.update_provider_profile(
  text,
  text,
  text
)
from public;

revoke all
on function public.approve_provider(uuid)
from public;

revoke all
on function public.reject_provider(uuid, text)
from public;

revoke all
on function public.suspend_provider(uuid)
from public;

revoke all
on function public.reactivate_provider(uuid)
from public;

grant execute
on function public.request_provider_onboarding(
  text,
  text,
  text
)
to authenticated;

grant execute
on function public.update_provider_profile(
  text,
  text,
  text
)
to authenticated;

grant execute
on function public.approve_provider(uuid)
to authenticated;

grant execute
on function public.reject_provider(uuid, text)
to authenticated;

grant execute
on function public.suspend_provider(uuid)
to authenticated;

grant execute
on function public.reactivate_provider(uuid)
to authenticated;