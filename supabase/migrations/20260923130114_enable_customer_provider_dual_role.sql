-- =========================================================
-- Porto Servicos
-- Customer + Provider Dual Role
-- =========================================================
--
-- Nova regra:
--
-- Todo usuario comum continua sendo customer.
-- Ter provider_profile adiciona a capacidade de prestador.
-- O onboarding NAO troca mais customer -> provider.
--
-- Admin continua separado.
-- =========================================================


-- =========================================================
-- MIGRAR PROVIDERS EXISTENTES
--
-- Providers existentes voltam a ter role base customer.
-- A capacidade provider passa a ser determinada pela
-- existencia/status de provider_profiles.
-- =========================================================

update public.user_roles
set role = 'customer'
where role = 'provider';


-- =========================================================
-- IS APPROVED PROVIDER
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
      select pp.status = 'approved'
      from public.provider_profiles pp
      where pp.user_id = auth.uid()
    ),
    false
  );
$$;


-- =========================================================
-- REQUEST PROVIDER ONBOARDING
--
-- Usuario permanece customer.
-- Apenas ganha provider_profile = pending.
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


  if target_phone is null
     or char_length(btrim(target_phone)) < 8
     or char_length(btrim(target_phone)) > 30 then
    raise exception 'INVALID_PHONE';
  end if;


  if target_business_name is null
     or char_length(btrim(target_business_name)) < 2
     or char_length(btrim(target_business_name)) > 120 then
    raise exception 'INVALID_BUSINESS_NAME';
  end if;


  if target_description is not null
     and char_length(target_description) > 2000 then
    raise exception 'DESCRIPTION_TOO_LONG';
  end if;


  select role
  into v_role
  from public.user_roles
  where user_id = v_user_id
  for update;


  if not found then
    raise exception 'USER_ROLE_NOT_FOUND';
  end if;


  if v_role = 'admin' then
    raise exception 'ADMIN_NOT_ALLOWED';
  end if;


  if exists (
    select 1
    from public.provider_profiles pp
    where pp.user_id = v_user_id
  ) then
    raise exception 'PROVIDER_PROFILE_ALREADY_EXISTS';
  end if;


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
-- UPDATE PROVIDER PROFILE
--
-- Nao depende mais de role = provider.
-- Depende da existencia do provider_profile.
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


  if target_phone is null
     or char_length(btrim(target_phone)) < 8
     or char_length(btrim(target_phone)) > 30 then
    raise exception 'INVALID_PHONE';
  end if;


  if target_business_name is null
     or char_length(btrim(target_business_name)) < 2
     or char_length(btrim(target_business_name)) > 120 then
    raise exception 'INVALID_BUSINESS_NAME';
  end if;


  if target_description is not null
     and char_length(target_description) > 2000 then
    raise exception 'DESCRIPTION_TOO_LONG';
  end if;


  update public.provider_profiles
  set
    phone = btrim(target_phone),
    business_name = btrim(target_business_name),
    description = nullif(
      btrim(target_description),
      ''
    )
  where user_id = v_user_id;


  if not found then
    raise exception 'PROVIDER_PROFILE_NOT_FOUND';
  end if;

end;
$$;


-- =========================================================
-- PROVIDER PROFILE INSERT POLICY
--
-- Cadastro normal deve passar pela RPC de onboarding.
-- Removemos INSERT direto pelo cliente.
-- =========================================================

drop policy if exists "provider_profiles_insert_own"
on public.provider_profiles;


revoke insert
on public.provider_profiles
from authenticated;


-- =========================================================
-- CUSTOMER PROFILE
--
-- Como o usuario continua customer mesmo possuindo perfil
-- de prestador, ele continua podendo manter seu perfil
-- de cliente normalmente.
-- =========================================================

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


-- =========================================================
-- PERMISSOES RPC
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