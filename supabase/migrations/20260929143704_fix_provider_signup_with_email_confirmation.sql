-- =========================================================
-- Porto Serviços
-- Correção do cadastro de parceiros com confirmação de e-mail
-- =========================================================
--
-- Objetivo:
--
-- 1. Todo usuário continua nascendo com role base "customer".
-- 2. Cliente continua com o fluxo atual.
-- 3. Quando account_type = "provider":
--      -> cria provider_profiles com status pending
--      -> cria o rascunho inicial do serviço
-- 4. Nenhum parceiro é aprovado automaticamente.
-- 5. A confirmação de e-mail pode permanecer ativada.
--
-- Os dados utilizados são exclusivamente os enviados durante
-- a criação inicial do usuário no Supabase Auth.
-- =========================================================


create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_phone text;
  v_account_type text;

  v_business_name text;
  v_provider_description text;

  v_category_id uuid;

  v_service_name text;
  v_service_description text;

  v_pricing_type public.service_pricing_type;
  v_price_cents bigint;

begin

  -- =======================================================
  -- DADOS BASE
  -- =======================================================

  v_full_name := nullif(
    btrim(
      coalesce(
        new.raw_user_meta_data->>'full_name',
        ''
      )
    ),
    ''
  );

  v_phone := regexp_replace(
    coalesce(
      new.raw_user_meta_data->>'phone',
      ''
    ),
    '[^0-9]',
    '',
    'g'
  );

  v_account_type := lower(
    btrim(
      coalesce(
        new.raw_user_meta_data->>'account_type',
        'customer'
      )
    )
  );


  -- =======================================================
  -- PERFIL BASE
  -- =======================================================

  insert into public.profiles (
    id,
    email,
    full_name
  )
  values (
    new.id,
    new.email,
    coalesce(v_full_name, '')
  )
  on conflict (id)
  do update
  set
    email = excluded.email,
    full_name = case
      when excluded.full_name <> ''
        then excluded.full_name
      else public.profiles.full_name
    end;


  -- =======================================================
  -- ROLE BASE
  --
  -- A arquitetura dual-role permanece.
  -- Todo usuário nasce como customer.
  -- Ser parceiro é uma capacidade adicional.
  -- =======================================================

  insert into public.user_roles (
    user_id,
    role
  )
  values (
    new.id,
    'customer'
  )
  on conflict (user_id)
  do nothing;


  -- =======================================================
  -- PERFIL DE CLIENTE
  -- =======================================================

  if length(v_phone) between 10 and 11 then

    insert into public.customer_profiles (
      user_id,
      phone
    )
    values (
      new.id,
      v_phone
    )
    on conflict (user_id)
    do update
    set
      phone = excluded.phone;

  end if;


  -- =======================================================
  -- CADASTRO DE PARCEIRO
  -- =======================================================

  if v_account_type = 'provider' then

    -- -----------------------------------------------------
    -- Dados do estabelecimento/parceiro
    -- -----------------------------------------------------

    v_business_name := nullif(
      btrim(
        coalesce(
          new.raw_user_meta_data->>'business_name',
          ''
        )
      ),
      ''
    );

    v_provider_description := nullif(
      btrim(
        coalesce(
          new.raw_user_meta_data->>'provider_description',
          ''
        )
      ),
      ''
    );


    -- -----------------------------------------------------
    -- Dados do serviço inicial
    -- -----------------------------------------------------

    v_service_name := nullif(
      btrim(
        coalesce(
          new.raw_user_meta_data->>'service_name',
          ''
        )
      ),
      ''
    );

    v_service_description := nullif(
      btrim(
        coalesce(
          new.raw_user_meta_data->>'service_description',
          ''
        )
      ),
      ''
    );


    -- -----------------------------------------------------
    -- Categoria
    -- -----------------------------------------------------

    begin

      v_category_id :=
        nullif(
          new.raw_user_meta_data->>'category_id',
          ''
        )::uuid;

    exception
      when invalid_text_representation then
        v_category_id := null;

    end;


    -- -----------------------------------------------------
    -- Tipo de preço
    -- -----------------------------------------------------

    begin

      v_pricing_type :=
        nullif(
          new.raw_user_meta_data->>'pricing_type',
          ''
        )::public.service_pricing_type;

    exception
      when invalid_text_representation then
        v_pricing_type := null;

    end;


    -- -----------------------------------------------------
    -- Preço
    -- -----------------------------------------------------

    begin

      v_price_cents :=
        nullif(
          new.raw_user_meta_data->>'price_cents',
          ''
        )::bigint;

    exception
      when invalid_text_representation then
        v_price_cents := null;

    end;


    -- =====================================================
    -- VALIDAÇÕES DO PARCEIRO
    -- =====================================================

    if length(v_phone) not between 10 and 11 then
      raise exception 'Telefone inválido para cadastro de parceiro.';
    end if;

    if v_business_name is null
       or char_length(v_business_name) < 2 then
      raise exception 'Nome do estabelecimento é obrigatório.';
    end if;

    if char_length(v_business_name) > 160 then
      raise exception 'Nome do estabelecimento excede o limite permitido.';
    end if;

    if v_provider_description is not null
       and char_length(v_provider_description) > 2000 then
      raise exception 'Descrição do parceiro excede o limite permitido.';
    end if;

    if v_category_id is null then
      raise exception 'Categoria do serviço é obrigatória.';
    end if;

    if not exists (
      select 1
      from public.service_categories sc
      where sc.id = v_category_id
        and sc.is_active = true
    ) then
      raise exception 'Categoria de serviço inválida ou inativa.';
    end if;

    if v_service_name is null
       or char_length(v_service_name) < 2 then
      raise exception 'Nome do serviço é obrigatório.';
    end if;

    if char_length(v_service_name) > 160 then
      raise exception 'Nome do serviço excede o limite permitido.';
    end if;

    if v_service_description is not null
       and char_length(v_service_description) > 2000 then
      raise exception 'Descrição do serviço excede o limite permitido.';
    end if;

    if v_pricing_type is null then
      raise exception 'Tipo de preço inválido.';
    end if;

    if v_price_cents is not null
       and v_price_cents < 0 then
      raise exception 'Preço inválido.';
    end if;


    -- =====================================================
    -- PROVIDER PROFILE
    --
    -- Sempre nasce como pending.
    -- Dados vindos do usuário nunca controlam aprovação.
    -- =====================================================

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
      new.id,
      v_phone,
      v_business_name,
      v_provider_description,
      'pending',
      null,
      null,
      null
    )
    on conflict (user_id)
    do update
    set
      phone = excluded.phone,
      business_name = excluded.business_name,
      description = excluded.description,
      status = 'pending',
      approved_at = null,
      approved_by = null,
      rejection_reason = null;


    -- =====================================================
    -- RASCUNHO DO SERVIÇO
    -- =====================================================

    insert into public.provider_onboarding_service_drafts (
      provider_id,
      category_id,
      name,
      description,
      pricing_type,
      price_cents
    )
    values (
      new.id,
      v_category_id,
      v_service_name,
      v_service_description,
      v_pricing_type,
      v_price_cents
    )
    on conflict (provider_id)
    do update
    set
      category_id = excluded.category_id,
      name = excluded.name,
      description = excluded.description,
      pricing_type = excluded.pricing_type,
      price_cents = excluded.price_cents,
      updated_at = now();

  end if;


  return new;

end;
$$;


-- =========================================================
-- GARANTIR TRIGGER PRINCIPAL
-- =========================================================

drop trigger if exists on_auth_user_created
on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();


-- =========================================================
-- SEGURANÇA
-- =========================================================

revoke all
on function public.handle_new_user()
from public;

revoke all
on function public.handle_new_user()
from anon;

revoke all
on function public.handle_new_user()
from authenticated;