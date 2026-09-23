-- =========================================================
-- Service Reviews
-- Porto Serviços
-- =========================================================

create table if not exists public.service_reviews (
  id uuid primary key default gen_random_uuid(),

  service_request_id uuid not null
    references public.service_requests(id)
    on delete cascade,

  customer_id uuid not null
    references public.customer_profiles(user_id)
    on delete restrict,

  provider_id uuid not null
    references public.provider_profiles(user_id)
    on delete restrict,

  provider_service_id uuid not null
    references public.provider_services(id)
    on delete restrict,

  rating smallint not null,

  comment text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint service_reviews_rating_range
    check (
      rating between 1 and 5
    ),

  constraint service_reviews_comment_length
    check (
      comment is null
      or char_length(comment) <= 3000
    ),

  constraint service_reviews_one_per_request
    unique (service_request_id)
);

-- =========================================================
-- ÍNDICES
-- =========================================================

create index if not exists
  idx_service_reviews_provider
on public.service_reviews(
  provider_id,
  created_at desc
);

create index if not exists
  idx_service_reviews_customer
on public.service_reviews(
  customer_id,
  created_at desc
);

create index if not exists
  idx_service_reviews_provider_service
on public.service_reviews(
  provider_service_id,
  created_at desc
);

-- =========================================================
-- updated_at automático
-- =========================================================

drop trigger if exists
  service_reviews_set_updated_at
on public.service_reviews;

create trigger service_reviews_set_updated_at
  before update on public.service_reviews
  for each row
  execute function public.set_updated_at();

-- =========================================================
-- CRIAR AVALIAÇÃO
--
-- Regras:
-- 1. Usuário precisa estar autenticado.
-- 2. Precisa ser customer.
-- 3. A solicitação precisa pertencer ao cliente.
-- 4. Serviço precisa estar completed.
-- 5. Só pode existir uma avaliação por solicitação.
-- 6. provider_id e provider_service_id são obtidos no servidor.
-- =========================================================

create or replace function public.create_service_review(
  target_request_id uuid,
  target_rating smallint,
  target_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.service_requests%rowtype;
  v_review_id uuid;
begin

  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if public.current_user_role() <> 'customer' then
    raise exception 'CUSTOMER_ROLE_REQUIRED';
  end if;

  if target_rating is null
     or target_rating < 1
     or target_rating > 5 then
    raise exception 'INVALID_RATING';
  end if;

  if target_comment is not null
     and char_length(target_comment) > 3000 then
    raise exception 'COMMENT_TOO_LONG';
  end if;

  select *
  into v_request
  from public.service_requests
  where id = target_request_id
  for update;

  if not found then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if v_request.customer_id <> auth.uid() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_request.status <> 'completed' then
    raise exception 'SERVICE_NOT_COMPLETED';
  end if;

  if exists (
    select 1
    from public.service_reviews sr
    where sr.service_request_id = target_request_id
  ) then
    raise exception 'REVIEW_ALREADY_EXISTS';
  end if;

  insert into public.service_reviews (
    service_request_id,
    customer_id,
    provider_id,
    provider_service_id,
    rating,
    comment
  )
  values (
    v_request.id,
    v_request.customer_id,
    v_request.provider_id,
    v_request.provider_service_id,
    target_rating,
    nullif(btrim(target_comment), '')
  )
  returning id into v_review_id;

  return v_review_id;

end;
$$;

-- =========================================================
-- ESTATÍSTICAS DO PRESTADOR
--
-- Retorna:
-- average_rating
-- review_count
--
-- Não armazenamos a média diretamente no provider_profile.
-- Ela é calculada a partir das avaliações reais.
-- =========================================================

create or replace function public.get_provider_review_summary(
  target_provider_id uuid
)
returns table (
  average_rating numeric,
  review_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(
      round(avg(sr.rating)::numeric, 2),
      0::numeric
    ) as average_rating,

    count(*)::bigint as review_count

  from public.service_reviews sr
  where sr.provider_id = target_provider_id;
$$;

-- =========================================================
-- RLS
-- =========================================================

alter table public.service_reviews
  enable row level security;

-- =========================================================
-- VISUALIZAÇÃO PÚBLICA
--
-- Avaliações podem aparecer no perfil público do prestador.
-- =========================================================

drop policy if exists
  "service_reviews_public_select"
on public.service_reviews;

create policy
  "service_reviews_public_select"
on public.service_reviews
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.provider_profiles pp
    where pp.user_id = service_reviews.provider_id
      and pp.status = 'approved'
  )
);

-- =========================================================
-- ADMIN PODE VISUALIZAR TODAS
-- =========================================================

drop policy if exists
  "service_reviews_admin_select"
on public.service_reviews;

create policy
  "service_reviews_admin_select"
on public.service_reviews
for select
to authenticated
using (
  public.is_admin()
);

-- =========================================================
-- SEM INSERT / UPDATE / DELETE DIRETO
--
-- A criação acontece somente pela função segura.
-- O histórico não pode ser alterado diretamente pelo app.
-- =========================================================

revoke insert, update, delete
  on public.service_reviews
  from authenticated;

grant select
  on public.service_reviews
  to anon, authenticated;

-- =========================================================
-- PERMISSÕES: create_service_review
-- =========================================================

revoke all
  on function public.create_service_review(
    uuid,
    smallint,
    text
  )
  from public;

grant execute
  on function public.create_service_review(
    uuid,
    smallint,
    text
  )
  to authenticated;

-- =========================================================
-- PERMISSÕES: get_provider_review_summary
-- =========================================================

revoke all
  on function public.get_provider_review_summary(uuid)
  from public;

grant execute
  on function public.get_provider_review_summary(uuid)
  to anon, authenticated;