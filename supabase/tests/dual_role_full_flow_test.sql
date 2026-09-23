BEGIN;

SELECT plan(8);

-- =========================================================
-- Porto Servicos
-- Dual Role Full Flow Test
-- =========================================================

-- Usuario que sera cliente + prestador
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
VALUES (
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'dual-full-test@porto-servicos.local',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Dual Full Test"}'::jsonb,
  now(),
  now()
);

-- Categoria para o teste
INSERT INTO public.service_categories (
  id,
  name,
  slug,
  is_active
)
VALUES (
  '00000000-0000-0000-0000-000000000401',
  'Categoria Dual Test',
  'categoria-dual-test',
  true
);

-- =========================================================
-- AUTENTICAR USUARIO
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
-- Continua sendo customer
-- =========================================================

SELECT is(
  public.current_user_role()::text,
  'customer',
  'User starts as customer'
);

-- =========================================================
-- TESTE 2
-- Solicita onboarding de prestador
-- =========================================================

SELECT lives_ok(
  $$
    SELECT public.request_provider_onboarding(
      '73999999999',
      'Prestador Dual Full',
      'Teste completo cliente e prestador'
    )
  $$,
  'Customer can request provider onboarding'
);

-- =========================================================
-- TESTE 3
-- Continua customer apos onboarding
-- =========================================================

SELECT is(
  public.current_user_role()::text,
  'customer',
  'Onboarding preserves customer role'
);

-- =========================================================
-- APROVAR PRESTADOR
-- =========================================================

RESET ROLE;

UPDATE public.provider_profiles
SET
  status = 'approved',
  approved_at = now()
WHERE user_id =
  '00000000-0000-0000-0000-000000000301';

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
-- TESTE 4
-- Prestador aprovado reconhecido
-- =========================================================

SELECT is(
  public.is_approved_provider(),
  true,
  'User is recognized as approved provider'
);

-- =========================================================
-- TESTE 5
-- Prestador consegue adicionar categoria
-- =========================================================

SELECT lives_ok(
  $$
    INSERT INTO public.provider_service_categories (
      provider_id,
      category_id
    )
    VALUES (
      '00000000-0000-0000-0000-000000000301',
      '00000000-0000-0000-0000-000000000401'
    )
  $$,
  'Approved provider can add service category'
);

-- =========================================================
-- TESTE 6
-- Prestador consegue criar servico
-- =========================================================

SELECT lives_ok(
  $$
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
      '00000000-0000-0000-0000-000000000501',
      '00000000-0000-0000-0000-000000000301',
      '00000000-0000-0000-0000-000000000401',
      'Servico Dual Test',
      'Servico criado por usuario cliente e prestador',
      'fixed',
      15000,
      true
    )
  $$,
  'Approved provider can create service'
);

-- =========================================================
-- TESTE 7
-- Mesmo como prestador aprovado continua customer
-- =========================================================

SELECT is(
  public.current_user_role()::text,
  'customer',
  'Approved provider still has customer role'
);

-- =========================================================
-- TESTE 8
-- Possui simultaneamente capacidade customer + provider
-- =========================================================

SELECT ok(
  public.current_user_role() = 'customer'
  and public.is_approved_provider(),
  'User has customer and provider capabilities simultaneously'
);

SELECT * FROM finish();

ROLLBACK;