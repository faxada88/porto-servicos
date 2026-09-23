BEGIN;

SELECT plan(15);

-- =========================================================
-- Porto Serviços
-- Quote + Review Authorization Tests
-- =========================================================
--
-- Tudo ocorre dentro desta transação.
-- O ROLLBACK final remove todos os dados fictícios.
--
-- Cliente correto:
-- 00000000-0000-0000-0000-000000000301
--
-- Cliente invasor:
-- 00000000-0000-0000-0000-000000000302
--
-- Prestador correto:
-- 00000000-0000-0000-0000-000000000303
--
-- Prestador invasor:
-- 00000000-0000-0000-0000-000000000304
--
-- Admin:
-- 00000000-0000-0000-0000-000000000305
-- =========================================================


-- =========================================================
-- CRIAR USUÁRIOS FICTÍCIOS
-- =========================================================

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
(
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'quote-customer@porto-servicos.local',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Quote Customer"}'::jsonb,
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000302',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'quote-attacker-customer@porto-servicos.local',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Attacker Customer"}'::jsonb,
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000303',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'quote-provider@porto-servicos.local',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Quote Provider"}'::jsonb,
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000304',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'quote-attacker-provider@porto-servicos.local',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Attacker Provider"}'::jsonb,
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000305',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'quote-admin@porto-servicos.local',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Quote Admin"}'::jsonb,
  now(),
  now()
);


-- =========================================================
-- PREPARAR ROLES
-- =========================================================

UPDATE public.user_roles
SET role = 'provider'
WHERE user_id IN (
  '00000000-0000-0000-0000-000000000303',
  '00000000-0000-0000-0000-000000000304'
);

UPDATE public.user_roles
SET role = 'admin'
WHERE user_id =
  '00000000-0000-0000-0000-000000000305';


-- =========================================================
-- CUSTOMER PROFILES
-- =========================================================

INSERT INTO public.customer_profiles (
  user_id,
  phone
)
VALUES
(
  '00000000-0000-0000-0000-000000000301',
  '73999999301'
),
(
  '00000000-0000-0000-0000-000000000302',
  '73999999302'
);


-- =========================================================
-- PROVIDER PROFILES
-- =========================================================

INSERT INTO public.provider_profiles (
  user_id,
  phone,
  business_name,
  description,
  status,
  approved_at,
  approved_by
)
VALUES
(
  '00000000-0000-0000-0000-000000000303',
  '73999999303',
  'Prestador Orçamento',
  'Prestador correto do teste',
  'approved',
  now(),
  '00000000-0000-0000-0000-000000000305'
),
(
  '00000000-0000-0000-0000-000000000304',
  '73999999304',
  'Prestador Invasor',
  'Prestador invasor do teste',
  'approved',
  now(),
  '00000000-0000-0000-0000-000000000305'
);


-- =========================================================
-- CATEGORIA
-- =========================================================

INSERT INTO public.service_categories (
  id,
  name,
  slug,
  description,
  sort_order,
  is_active
)
VALUES (
  '11000000-0000-0000-0000-000000000001',
  'Pintura Teste',
  'pintura-orcamento-teste',
  'Categoria para testes de orçamento',
  1,
  true
);


-- =========================================================
-- VINCULAR CATEGORIA AO PRESTADOR
-- =========================================================

INSERT INTO public.provider_service_categories (
  id,
  provider_id,
  category_id
)
VALUES (
  '21000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000303',
  '11000000-0000-0000-0000-000000000001'
);


-- =========================================================
-- SERVIÇO SOB ORÇAMENTO
-- =========================================================

INSERT INTO public.provider_services (
  id,
  provider_id,
  category_id,
  name,
  description,
  pricing_type,
  price_cents,
  is_active
)
VALUES (
  '31000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000303',
  '11000000-0000-0000-0000-000000000001',
  'Pintura residencial',
  'Serviço sob orçamento para teste',
  'quote',
  NULL,
  true
);


-- =========================================================
-- ENDEREÇO DO CLIENTE
-- =========================================================

INSERT INTO public.user_addresses (
  id,
  user_id,
  label,
  postal_code,
  street,
  number,
  neighborhood,
  city,
  state,
  country_code,
  is_default
)
VALUES (
  '41000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000301',
  'Casa',
  '45810000',
  'Rua Orçamento',
  '200',
  'Centro',
  'Porto Seguro',
  'BA',
  'BR',
  true
);


-- =========================================================
-- SIMULAR CLIENTE CORRETO
-- =========================================================

SET LOCAL ROLE authenticated;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000301',
  true
);

SELECT set_config(
  'request.jwt.claim.role',
  'authenticated',
  true
);


-- =========================================================
-- TESTE 1
-- Cliente consegue criar pedido sob orçamento
-- =========================================================

SELECT lives_ok(
  $$
    SELECT public.create_service_request(
      '31000000-0000-0000-0000-000000000001',
      '41000000-0000-0000-0000-000000000001',
      NULL,
      'Gostaria de orçamento para pintura'
    )
  $$,
  'Customer can create quote-based request'
);


-- =========================================================
-- GUARDAR REQUEST ID
-- =========================================================

SELECT set_config(
  'porto_test.quote_request_id',
  (
    SELECT id::text
    FROM public.service_requests
    WHERE customer_id =
      '00000000-0000-0000-0000-000000000301'
    ORDER BY created_at DESC
    LIMIT 1
  ),
  true
);


-- =========================================================
-- TESTE 2
-- Pedido sob orçamento nasce sem preço final
-- =========================================================

SELECT is(
  (
    SELECT price_cents
    FROM public.service_requests
    WHERE id =
      current_setting(
        'porto_test.quote_request_id'
      )::uuid
  ),
  NULL::bigint,
  'Quote request starts without final price'
);


-- =========================================================
-- TESTE 3
-- Cliente não pode avaliar antes da conclusão
-- =========================================================

SELECT throws_ok(
  format(
    'SELECT public.create_service_review(%L::uuid, 5::smallint, %L)',
    current_setting('porto_test.quote_request_id'),
    'Tentativa antecipada'
  ),
  'P0001',
  'SERVICE_NOT_COMPLETED',
  'Customer cannot review service before completion'
);


-- =========================================================
-- SIMULAR PRESTADOR INVASOR
-- =========================================================

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000304',
  true
);


-- =========================================================
-- TESTE 4
-- Prestador invasor não envia orçamento
-- =========================================================

SELECT throws_ok(
  format(
    'SELECT public.create_service_quote(%L::uuid, 90000::bigint, %L, 120::integer, NULL::timestamptz)',
    current_setting('porto_test.quote_request_id'),
    'Orçamento invasor'
  ),
  'P0001',
  'NOT_AUTHORIZED',
  'Another provider cannot quote request belonging to provider'
);


-- =========================================================
-- SIMULAR PRESTADOR CORRETO
-- =========================================================

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000303',
  true
);


-- =========================================================
-- TESTE 5
-- Prestador correto envia orçamento
-- =========================================================

SELECT lives_ok(
  format(
    'SELECT public.create_service_quote(%L::uuid, 85000::bigint, %L, 180::integer, NULL::timestamptz)',
    current_setting('porto_test.quote_request_id'),
    'Pintura completa conforme solicitado'
  ),
  'Correct provider can create quote'
);


-- =========================================================
-- GUARDAR QUOTE ID
-- =========================================================

SELECT set_config(
  'porto_test.quote_id',
  (
    SELECT id::text
    FROM public.service_quotes
    WHERE service_request_id =
      current_setting(
        'porto_test.quote_request_id'
      )::uuid
    ORDER BY created_at DESC
    LIMIT 1
  ),
  true
);


-- =========================================================
-- TESTE 6
-- Orçamento criado com R$ 850,00
-- =========================================================

SELECT is(
  (
    SELECT amount_cents
    FROM public.service_quotes
    WHERE id =
      current_setting('porto_test.quote_id')::uuid
  ),
  85000::bigint,
  'Quote stores provider proposed amount'
);


-- =========================================================
-- TESTE 7
-- Só existe um orçamento pending por solicitação
-- =========================================================

SELECT throws_ok(
  format(
    'SELECT public.create_service_quote(%L::uuid, 80000::bigint, %L, NULL::integer, NULL::timestamptz)',
    current_setting('porto_test.quote_request_id'),
    'Segundo orçamento pendente'
  ),
  'P0001',
  'PENDING_QUOTE_ALREADY_EXISTS',
  'Provider cannot create second pending quote'
);


-- =========================================================
-- SIMULAR CLIENTE INVASOR
-- =========================================================

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000302',
  true
);


-- =========================================================
-- TESTE 8
-- Outro cliente não aceita orçamento alheio
-- =========================================================

SELECT throws_ok(
  format(
    'SELECT public.accept_service_quote(%L::uuid)',
    current_setting('porto_test.quote_id')
  ),
  'P0001',
  'NOT_AUTHORIZED',
  'Another customer cannot accept someone else quote'
);


-- =========================================================
-- SIMULAR CLIENTE CORRETO
-- =========================================================

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000301',
  true
);


-- =========================================================
-- TESTE 9
-- Cliente correto aceita orçamento
-- =========================================================

SELECT lives_ok(
  format(
    'SELECT public.accept_service_quote(%L::uuid)',
    current_setting('porto_test.quote_id')
  ),
  'Correct customer can accept quote'
);


-- =========================================================
-- TESTE 10
-- Valor acordado vira preço final da solicitação
-- =========================================================

SELECT is(
  (
    SELECT price_cents
    FROM public.service_requests
    WHERE id =
      current_setting(
        'porto_test.quote_request_id'
      )::uuid
  ),
  85000::bigint,
  'Accepted quote becomes request final price'
);


-- =========================================================
-- TESTE 11
-- Solicitação fica accepted
-- =========================================================

SELECT is(
  (
    SELECT status::text
    FROM public.service_requests
    WHERE id =
      current_setting(
        'porto_test.quote_request_id'
      )::uuid
  ),
  'accepted',
  'Accepting quote accepts service request'
);


-- =========================================================
-- SIMULAR PRESTADOR CORRETO
-- =========================================================

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000303',
  true
);


-- =========================================================
-- TESTE 12
-- Prestador inicia o serviço
-- =========================================================

SELECT lives_ok(
  format(
    'SELECT public.start_service_request(%L::uuid)',
    current_setting('porto_test.quote_request_id')
  ),
  'Provider can start accepted service'
);


-- =========================================================
-- TESTE 13
-- Prestador conclui o serviço
-- =========================================================

SELECT lives_ok(
  format(
    'SELECT public.complete_service_request(%L::uuid)',
    current_setting('porto_test.quote_request_id')
  ),
  'Provider can complete service in progress'
);


-- =========================================================
-- SIMULAR CLIENTE CORRETO
-- =========================================================

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000301',
  true
);


-- =========================================================
-- TESTE 14
-- Cliente avalia serviço concluído
-- =========================================================

SELECT lives_ok(
  format(
    'SELECT public.create_service_review(%L::uuid, 5::smallint, %L)',
    current_setting('porto_test.quote_request_id'),
    'Excelente serviço'
  ),
  'Customer can review completed service'
);


-- =========================================================
-- TESTE 15
-- Não pode avaliar duas vezes
-- =========================================================

SELECT throws_ok(
  format(
    'SELECT public.create_service_review(%L::uuid, 4::smallint, %L)',
    current_setting('porto_test.quote_request_id'),
    'Segunda avaliação'
  ),
  'P0001',
  'REVIEW_ALREADY_EXISTS',
  'Customer cannot review same request twice'
);


-- =========================================================
-- FINALIZAÇÃO
-- =========================================================

SELECT * FROM finish();

ROLLBACK;
