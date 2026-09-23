BEGIN;

SELECT plan(5);

-- =========================================================
-- Porto Serviços
-- Quote Direct Accept Security Test
-- =========================================================
--
-- Objetivo:
-- impedir que um prestador aceite diretamente uma
-- solicitação cujo serviço exige orçamento.
-- =========================================================


-- =========================================================
-- CRIAR USUÁRIOS
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
  '00000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'direct-quote-customer@porto-servicos.local',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Direct Quote Customer"}'::jsonb,
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000402',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'direct-quote-provider@porto-servicos.local',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Direct Quote Provider"}'::jsonb,
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000403',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'direct-quote-admin@porto-servicos.local',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Direct Quote Admin"}'::jsonb,
  now(),
  now()
);


-- =========================================================
-- CONFIGURAR ROLES
-- =========================================================

UPDATE public.user_roles
SET role = 'provider'
WHERE user_id =
  '00000000-0000-0000-0000-000000000402';

UPDATE public.user_roles
SET role = 'admin'
WHERE user_id =
  '00000000-0000-0000-0000-000000000403';


-- =========================================================
-- CUSTOMER PROFILE
-- =========================================================

INSERT INTO public.customer_profiles (
  user_id,
  phone
)
VALUES (
  '00000000-0000-0000-0000-000000000401',
  '73999999401'
);


-- =========================================================
-- PROVIDER PROFILE APROVADO
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
VALUES (
  '00000000-0000-0000-0000-000000000402',
  '73999999402',
  'Prestador Quote Security',
  'Prestador usado no teste de segurança',
  'approved',
  now(),
  '00000000-0000-0000-0000-000000000403'
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
  '12000000-0000-0000-0000-000000000001',
  'Reforma Teste',
  'reforma-direct-quote-test',
  'Categoria para teste de orçamento',
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
  '22000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000402',
  '12000000-0000-0000-0000-000000000001'
);


-- =========================================================
-- SERVIÇO QUE EXIGE ORÇAMENTO
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
  '32000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000402',
  '12000000-0000-0000-0000-000000000001',
  'Reforma residencial',
  'Serviço obrigatoriamente sob orçamento',
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
  '42000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000401',
  'Casa',
  '45810000',
  'Rua Segurança',
  '400',
  'Centro',
  'Porto Seguro',
  'BA',
  'BR',
  true
);


-- =========================================================
-- AUTENTICAR COMO CLIENTE
-- =========================================================

SET LOCAL ROLE authenticated;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000401',
  true
);

SELECT set_config(
  'request.jwt.claim.role',
  'authenticated',
  true
);


-- =========================================================
-- TESTE 1
-- Cliente cria solicitação normalmente
-- =========================================================

SELECT lives_ok(
  $$
    SELECT public.create_service_request(
      '32000000-0000-0000-0000-000000000001',
      '42000000-0000-0000-0000-000000000001',
      NULL,
      'Preciso de orçamento para reforma'
    )
  $$,
  'Customer can create quote request'
);


-- =========================================================
-- GUARDAR REQUEST ID
-- =========================================================

SELECT set_config(
  'porto_test.direct_quote_request_id',
  (
    SELECT id::text
    FROM public.service_requests
    WHERE customer_id =
      '00000000-0000-0000-0000-000000000401'
    ORDER BY created_at DESC
    LIMIT 1
  ),
  true
);


-- =========================================================
-- TESTE 2
-- Confirmar pricing_type
-- =========================================================

SELECT is(
  (
    SELECT pricing_type::text
    FROM public.service_requests
    WHERE id =
      current_setting(
        'porto_test.direct_quote_request_id'
      )::uuid
  ),
  'quote',
  'Request pricing type is quote'
);


-- =========================================================
-- TESTE 3
-- Request quote nasce sem preço
-- =========================================================

SELECT is(
  (
    SELECT price_cents
    FROM public.service_requests
    WHERE id =
      current_setting(
        'porto_test.direct_quote_request_id'
      )::uuid
  ),
  NULL::bigint,
  'Quote request starts without price'
);


-- =========================================================
-- AUTENTICAR COMO PRESTADOR
-- =========================================================

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000402',
  true
);


-- =========================================================
-- TESTE 4
-- SEGURANÇA CRÍTICA
--
-- O prestador não pode aceitar diretamente uma
-- solicitação que exige orçamento.
-- =========================================================

SELECT throws_ok(
  format(
    'SELECT public.accept_service_request(%L::uuid)',
    current_setting(
      'porto_test.direct_quote_request_id'
    )
  ),
  'P0001',
  'QUOTE_REQUIRED',
  'Provider cannot directly accept quote-based request'
);


-- =========================================================
-- TESTE 5
-- A tentativa não pode alterar o status
-- =========================================================

SELECT is(
  (
    SELECT status::text
    FROM public.service_requests
    WHERE id =
      current_setting(
        'porto_test.direct_quote_request_id'
      )::uuid
  ),
  'pending',
  'Quote request remains pending after direct accept attempt'
);


-- =========================================================
-- FINALIZAR
-- =========================================================

SELECT * FROM finish();

ROLLBACK;
