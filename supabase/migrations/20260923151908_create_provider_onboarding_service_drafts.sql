-- =========================================================
-- Porto Serviços
-- Rascunhos de serviços durante onboarding do prestador
-- =========================================================

create table if not exists public.provider_onboarding_service_drafts (
  id uuid primary key default gen_random_uuid(),

  provider_id uuid not null
    references public.provider_profiles(user_id)
    on delete cascade,

  category_id uuid not null
    references public.service_categories(id)
    on delete restrict,

  name text not null,

  description text,

  pricing_type public.service_pricing_type
    not null
    default 'quote',

  price_cents bigint,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint provider_onboarding_service_drafts_name_length
    check (
      char_length(btrim(name)) >= 2
      and char_length(btrim(name)) <= 120
    ),

  constraint provider_onboarding_service_drafts_description_length
    check (
      description is null
      or char_length(description) <= 2000
    ),

  constraint provider_onboarding_service_drafts_price_non_negative
    check (
      price_cents is null
      or price_cents >= 0
    ),

  constraint provider_onboarding_service_drafts_pricing_consistency
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
    )
);


-- =========================================================
-- ÍNDICES
-- =========================================================

create index if not exists
  idx_provider_onboarding_service_drafts_provider
on public.provider_onboarding_service_drafts(provider_id);

create index if not exists
  idx_provider_onboarding_service_drafts_category
on public.provider_onboarding_service_drafts(category_id);


-- Um prestador terá apenas um primeiro serviço pendente
-- durante este fluxo inicial de onboarding.
create unique index if not exists
  idx_provider_onboarding_service_drafts_provider_unique
on public.provider_onboarding_service_drafts(provider_id);


-- =========================================================
-- UPDATED_AT
-- =========================================================

drop trigger if exists
  provider_onboarding_service_drafts_set_updated_at
on public.provider_onboarding_service_drafts;

create trigger
  provider_onboarding_service_drafts_set_updated_at
before update
on public.provider_onboarding_service_drafts
for each row
execute function public.set_updated_at();


-- =========================================================
-- RLS
-- =========================================================

alter table public.provider_onboarding_service_drafts
enable row level security;


-- O prestador pode visualizar somente o próprio rascunho.
drop policy if exists
  "provider_onboarding_drafts_select_own"
on public.provider_onboarding_service_drafts;

create policy
  "provider_onboarding_drafts_select_own"
on public.provider_onboarding_service_drafts
for select
to authenticated
using (
  auth.uid() = provider_id
);


-- Administradores podem visualizar todos os rascunhos.
drop policy if exists
  "provider_onboarding_drafts_admin_select"
on public.provider_onboarding_service_drafts;

create policy
  "provider_onboarding_drafts_admin_select"
on public.provider_onboarding_service_drafts
for select
to authenticated
using (
  public.is_admin()
);


-- Não criamos policy pública de INSERT/UPDATE/DELETE.
-- A escrita será feita exclusivamente por funções
-- SECURITY DEFINER controladas pelo backend.


-- =========================================================
-- FUNÇÃO:
-- SALVAR SOLICITAÇÃO PROFISSIONAL + PRIMEIRO SERVIÇO
-- =========================================================

create or replace function public.submit_provider_onboarding(
  target_phone text,
  target_business_name text,
  target_description text,
  target_category_id uuid,
  target_service_name text,
  target_service_description text,
  target_pricing_type public.service_pricing_type default 'quote',
  target_price_cents bigint default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_phone text;
  v_business_name text;
  v_provider_description text;
  v_service_name text;
  v_service_description text;
begin

  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;


  -- =======================================================
  -- NORMALIZAÇÃO
  -- =======================================================

  v_phone := regexp_replace(
    coalesce(target_phone, ''),
    '[^0-9]',
    '',
    'g'
  );

  v_business_name := btrim(
    coalesce(target_business_name, '')
  );

  v_provider_description := nullif(
    btrim(coalesce(target_description, '')),
    ''
  );

  v_service_name := btrim(
    coalesce(target_service_name, '')
  );

  v_service_description := nullif(
    btrim(coalesce(target_service_description, '')),
    ''
  );


  -- =======================================================
  -- VALIDAÇÕES
  -- =======================================================

  if length(v_phone) not between 10 and 11 then
    raise exception 'Telefone inválido.';
  end if;

  if char_length(v_business_name) < 3
     or char_length(v_business_name) > 120 then
    raise exception 'Nome profissional inválido.';
  end if;

  if v_provider_description is not null
     and char_length(v_provider_description) > 2000 then
    raise exception 'Descrição profissional muito longa.';
  end if;

  if char_length(v_service_name) < 2
     or char_length(v_service_name) > 120 then
    raise exception 'Nome do serviço inválido.';
  end if;

  if v_service_description is not null
     and char_length(v_service_description) > 2000 then
    raise exception 'Descrição do serviço muito longa.';
  end if;

  if not exists (
    select 1
    from public.service_categories
    where id = target_category_id
      and is_active = true
  ) then
    raise exception 'Categoria inválida ou indisponível.';
  end if;

  if target_price_cents is not null
     and target_price_cents < 0 then
    raise exception 'Preço inválido.';
  end if;

  if target_pricing_type = 'quote'
     and target_price_cents is not null then
    raise exception
      'Serviços sob orçamento não devem possuir preço fixo.';
  end if;

  if target_pricing_type <> 'quote'
     and target_price_cents is null then
    raise exception
      'Informe o preço do serviço.';
  end if;


  -- =======================================================
  -- GARANTE QUE O PERFIL BASE EXISTE
  -- =======================================================

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
  ) then
    raise exception 'Perfil do usuário não encontrado.';
  end if;


  -- =======================================================
  -- PERFIL DO PRESTADOR
  -- =======================================================

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


  -- =======================================================
  -- RASCUNHO DO PRIMEIRO SERVIÇO
  -- =======================================================

  insert into public.provider_onboarding_service_drafts (
    provider_id,
    category_id,
    name,
    description,
    pricing_type,
    price_cents
  )
  values (
    v_user_id,
    target_category_id,
    v_service_name,
    v_service_description,
    target_pricing_type,
    target_price_cents
  )
  on conflict (provider_id)
  do update
  set
    category_id = excluded.category_id,
    name = excluded.name,
    description = excluded.description,
    pricing_type = excluded.pricing_type,
    price_cents = excluded.price_cents;

end;
$$;


-- =========================================================
-- PERMISSÕES DA FUNÇÃO DE ONBOARDING
-- =========================================================

revoke all
on function public.submit_provider_onboarding(
  text,
  text,
  text,
  uuid,
  text,
  text,
  public.service_pricing_type,
  bigint
)
from public;

revoke all
on function public.submit_provider_onboarding(
  text,
  text,
  text,
  uuid,
  text,
  text,
  public.service_pricing_type,
  bigint
)
from anon;

grant execute
on function public.submit_provider_onboarding(
  text,
  text,
  text,
  uuid,
  text,
  text,
  public.service_pricing_type,
  bigint
)
to authenticated;


-- =========================================================
-- APROVAÇÃO DO PRESTADOR
--
-- Substitui a implementação anterior mantendo a mesma
-- assinatura approve_provider(uuid).
--
-- Ao aprovar:
-- 1. aprova provider_profiles
-- 2. vincula o prestador à categoria
-- 3. transforma o rascunho em provider_services
-- 4. remove o rascunho
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
  v_draft public.provider_onboarding_service_drafts%rowtype;
begin

  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not public.is_admin() then
    raise exception 'Acesso negado.';
  end if;


  -- Bloqueia o perfil durante a aprovação para evitar
  -- duas aprovações simultâneas.
  perform 1
  from public.provider_profiles
  where user_id = target_provider_id
    and status = 'pending'
  for update;

  if not found then
    raise exception
      'Prestador pendente não encontrado.';
  end if;


  -- O rascunho é opcional para manter compatibilidade
  -- com prestadores antigos criados antes desta migration.
  select *
  into v_draft
  from public.provider_onboarding_service_drafts
  where provider_id = target_provider_id
  for update;


  update public.provider_profiles
  set
    status = 'approved',
    approved_at = now(),
    approved_by = auth.uid(),
    rejection_reason = null
  where user_id = target_provider_id;


  if v_draft.id is not null then

    -- Vincula o prestador à categoria selecionada.
    insert into public.provider_service_categories (
      provider_id,
      category_id
    )
    values (
      target_provider_id,
      v_draft.category_id
    )
    on conflict do nothing;


    -- Publica o primeiro serviço.
    insert into public.provider_services (
      provider_id,
      category_id,
      name,
      description,
      pricing_type,
      price_cents,
      is_active
    )
    values (
      target_provider_id,
      v_draft.category_id,
      v_draft.name,
      v_draft.description,
      v_draft.pricing_type,
      v_draft.price_cents,
      true
    );


    -- O rascunho deixa de ser necessário depois
    -- que o serviço real foi criado.
    delete from public.provider_onboarding_service_drafts
    where id = v_draft.id;

  end if;

end;
$$;


-- =========================================================
-- PERMISSÕES DA APROVAÇÃO
-- =========================================================

revoke all
on function public.approve_provider(uuid)
from public;

revoke all
on function public.approve_provider(uuid)
from anon;

grant execute
on function public.approve_provider(uuid)
to authenticated;


-- =========================================================
-- COMENTÁRIOS
-- =========================================================

comment on table public.provider_onboarding_service_drafts is
'Serviços informados pelo prestador durante o onboarding e ainda não publicados.';

comment on function public.submit_provider_onboarding(
  text,
  text,
  text,
  uuid,
  text,
  text,
  public.service_pricing_type,
  bigint
) is
'Cria ou atualiza a solicitação de onboarding do prestador e armazena seu primeiro serviço como rascunho pendente.';

comment on function public.approve_provider(uuid) is
'Aprova um prestador e, quando houver rascunho de onboarding, cria o vínculo com a categoria e publica seu primeiro serviço.';