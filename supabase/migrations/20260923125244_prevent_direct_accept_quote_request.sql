-- =========================================================
-- Porto Servicos
-- Prevent Direct Accept of Quote Requests
-- =========================================================
--
-- Servicos com pricing_type = 'quote' nao podem ser
-- aceitos diretamente pelo prestador.
--
-- Fluxo obrigatorio:
--
-- request pending
--      ->
-- provider cria quote
--      ->
-- customer aceita quote
--      ->
-- accept_service_quote() define:
--   status = accepted
--   price_cents = valor do orcamento
--
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

  -- =======================================================
  -- AUTENTICACAO
  -- =======================================================

  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;


  -- =======================================================
  -- CARREGAR E BLOQUEAR REQUEST
  -- =======================================================

  select *
  into v_request
  from public.service_requests
  where id = target_request_id
  for update;

  if not found then
    raise exception 'REQUEST_NOT_FOUND';
  end if;


  -- =======================================================
  -- AUTORIZACAO
  -- =======================================================

  if v_request.provider_id <> auth.uid() then
    raise exception 'NOT_AUTHORIZED';
  end if;


  if public.current_user_role() <> 'provider' then
    raise exception 'PROVIDER_ROLE_REQUIRED';
  end if;


  if not public.is_approved_provider() then
    raise exception 'PROVIDER_NOT_APPROVED';
  end if;


  -- =======================================================
  -- STATUS
  -- =======================================================

  if v_request.status <> 'pending' then
    raise exception 'INVALID_STATUS_TRANSITION';
  end if;


  -- =======================================================
  -- PROTECAO DE ORCAMENTO
  --
  -- Requests do tipo quote NUNCA podem ser aceitos por
  -- accept_service_request().
  --
  -- Somente accept_service_quote() pode transformar um
  -- request quote em accepted, pois ela tambem grava o
  -- valor negociado em price_cents.
  -- =======================================================

  if v_request.pricing_type = 'quote' then
    raise exception 'QUOTE_REQUIRED';
  end if;


  -- =======================================================
  -- ACEITAR SERVICO COM PRECO DEFINIDO
  -- =======================================================

  update public.service_requests
  set
    status = 'accepted',
    accepted_at = now()
  where id = target_request_id;

end;
$$;


-- =========================================================
-- PERMISSOES
-- =========================================================

revoke all
  on function public.accept_service_request(uuid)
  from public;

grant execute
  on function public.accept_service_request(uuid)
  to authenticated;