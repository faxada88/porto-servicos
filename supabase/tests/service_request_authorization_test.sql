BEGIN;

SELECT plan(10);

-- =========================================================
-- Porto Serviços
-- Service Request Authorization Tests
-- =========================================================

-- Usuários fictícios:
--
-- Cliente:
-- 00000000-0000-0000-0000-000000000201
--
-- Prestador correto:
-- 00000000-0000-0000-0000-000000000202
--
-- Prestador invasor:
-- 00000000-0000-0000-0000-000000000203
--
-- Admin:
-- 00000000-0000-0000-0000-000000000204

-- =========================================================
-- CRIAR USUÁRIOS DE TESTE
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
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'customer-request-test@porto-servicos.local',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Customer Request Test"}'::jsonb,
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000202',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'provider-owner-test@porto-servicos.local',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Provider Owner Test"}'::jsonb,
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000203',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'provider-attacker-test@porto-servicos.local',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Provider Attacker Test"}'::jsonb,
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000204',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin-request-test@porto-servicos.local',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Admin Request Test"}'::jsonb,
  now(),
  now()
);

-- =========================================================
-- PREPARAR ROLES
-- =========================================================

UPDATE public.user_roles
SET role = 'provider'
WHERE user_id IN (
  '00000000-0000-0000-0000-000000000202',
  '00000000-0000-0000-0000-000000000203'
);

UPDATE public.user_roles
SET role = 'admin'
WHERE user_id =
  '00000000-0000-0000-0000-000000000204';

-- =========================================================
-- CRIAR CUSTOMER PROFILE
-- =========================================================

INSERT INTO public.customer_profiles (
  user_id,
  phone
)
VALUES (
  '00000000-0000-0000-0000-000000000201',
  '73999999901'
);

-- =========================================================
-- CRIAR PROVIDERS APROVADOS
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
  '00000000-0000-0000-0000-000000000202',
  '73999999902',
  'Prestador Correto',
  'Prestador responsável pelo serviço de teste',
  'approved',
  now(),
  '00000000-0000-0000-0000-000000000204'
),
(
  '00000000-0000-0000-0000-000000000203',
  '73999999903',
  'Prestador Invasor',
  'Prestador que tentará acessar serviço alheio',
  'approved',
  now(),
  '00000000-0000-0000-0000-000000000204'
);

-- =========================================================
-- CRIAR CATEGORIA
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
  '10000000-0000-0000-0000-000000000001',
  'Eletricista Teste',
  'eletricista-teste',
  'Categoria usada somente nos testes',
  1,
  true
);

-- =========================================================
-- ASSOCIAR CATEGORIA AO PRESTADOR CORRETO
-- =========================================================

INSERT INTO public.provider_service_categories (
  id,
  provider_id,
  category_id
)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000202',
  '10000000-0000-0000-0000-000000000001'
);

-- =========================================================
-- CRIAR SERVIÇO
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
  '30000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000202',
  '10000000-0000-0000-0000-000000000001',
  'Instalação de tomada',
  'Instalação elétrica para teste automatizado',
  'fixed',
  15000,
  true
);

-- =========================================================
-- CRIAR ENDEREÇO DO CLIENTE
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
  '40000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000201',
  'Casa',
  '45810000',
  'Rua de Teste',
  '100',
  'Centro',
  'Porto Seguro',
  'BA',
  'BR',
  true
);

-- =========================================================
-- TESTE 1
-- Prestador correto está aprovado
-- =========================================================

SET LOCAL ROLE authenticated;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000202',
  true
);

SELECT set_config(
  'request.jwt.claim.role',
  'authenticated',
  true
);

SELECT is(
  public.is_approved_provider(),
  true,
  'Correct provider is approved'
);

-- =========================================================
-- TESTE 2
-- Outro prestador também está aprovado
-- =========================================================

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000203',
  true
);

SELECT is(
  public.is_approved_provider(),
  true,
  'Attacker provider is also approved'
);

-- =========================================================
-- SIMULAR CLIENTE
-- =========================================================

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000201',
  true
);

-- =========================================================
-- TESTE 3
-- Cliente reconhecido corretamente
-- =========================================================

SELECT is(
  public.current_user_role()::text,
  'customer',
  'Request creator has customer role'
);

-- =========================================================
-- TESTE 4
-- Cliente consegue criar solicitação válida
-- =========================================================

SELECT lives_ok(
  $$
    SELECT public.create_service_request(
      '30000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000001',
      NULL,
      'Preciso instalar uma tomada'
    )
  $$,
  'Customer can create valid service request'
);

-- =========================================================
-- TESTE 5
-- Solicitação foi criada como pending
-- =========================================================

SELECT is(
  (
    SELECT status::text
    FROM public.service_requests
    WHERE customer_id =
      '00000000-0000-0000-0000-000000000201'
    LIMIT 1
  ),
  'pending',
  'New service request starts as pending'
);

-- =========================================================
-- TESTE 6
-- Preço foi copiado pelo servidor
-- =========================================================

SELECT is(
  (
    SELECT price_cents
    FROM public.service_requests
    WHERE customer_id =
      '00000000-0000-0000-0000-000000000201'
    LIMIT 1
  ),
  15000::bigint,
  'Service request stores server-side price snapshot'
);

-- =========================================================
-- TESTE 7
-- Provider correto foi copiado pelo servidor
-- =========================================================

SELECT is(
  (
    SELECT provider_id
    FROM public.service_requests
    WHERE customer_id =
      '00000000-0000-0000-0000-000000000201'
    LIMIT 1
  ),
  '00000000-0000-0000-0000-000000000202'::uuid,
  'Service request stores correct provider'
);

-- =========================================================
-- PEGAR ID DA SOLICITAÇÃO EM VARIÁVEL DE SESSÃO
-- =========================================================

SELECT set_config(
  'porto_test.request_id',
  (
    SELECT id::text
    FROM public.service_requests
    WHERE customer_id =
      '00000000-0000-0000-0000-000000000201'
    ORDER BY created_at DESC
    LIMIT 1
  ),
  true
);

-- =========================================================
-- SIMULAR PRESTADOR INVASOR
-- =========================================================

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000203',
  true
);

-- =========================================================
-- TESTE 8
-- Prestador invasor não consegue aceitar solicitação alheia
-- =========================================================

SELECT throws_ok(
  format(
    'SELECT public.accept_service_request(%L::uuid)',
    current_setting('porto_test.request_id')
  ),
  'P0001',
  'NOT_AUTHORIZED',
  'Another provider cannot accept request belonging to someone else'
);

-- =========================================================
-- SIMULAR PRESTADOR CORRETO
-- =========================================================

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000202',
  true
);

-- =========================================================
-- TESTE 9
-- Prestador correto consegue aceitar
-- =========================================================

SELECT lives_ok(
  format(
    'SELECT public.accept_service_request(%L::uuid)',
    current_setting('porto_test.request_id')
  ),
  'Correct provider can accept its service request'
);

-- =========================================================
-- TESTE 10
-- Solicitação realmente virou accepted
-- =========================================================

SELECT is(
  (
    SELECT status::text
    FROM public.service_requests
    WHERE id =
      current_setting('porto_test.request_id')::uuid
  ),
  'accepted',
  'Accepted request has accepted status'
);

-- =========================================================
-- FINALIZAÇÃO
-- =========================================================

SELECT * FROM finish();

ROLLBACK;
