BEGIN;

SELECT plan(11);

-- =========================================================
-- Porto Serviços
-- Authorization Tests
-- =========================================================
-- Usuários fictícios usados somente dentro desta transação.
-- Tudo será desfeito pelo ROLLBACK final.
-- =========================================================

-- UUIDs fixos dos usuários de teste:
--
-- customer:
-- 00000000-0000-0000-0000-000000000101
--
-- provider:
-- 00000000-0000-0000-0000-000000000102
--
-- admin:
-- 00000000-0000-0000-0000-000000000103

-- =========================================================
-- CRIAR USUÁRIOS FICTÍCIOS NO AUTH
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
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'customer-test@porto-servicos.local',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Customer Test"}'::jsonb,
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'provider-test@porto-servicos.local',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Provider Test"}'::jsonb,
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000103',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin-test@porto-servicos.local',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Admin Test"}'::jsonb,
  now(),
  now()
);

-- =========================================================
-- TESTE 1
-- Todo novo usuário nasce como customer
-- =========================================================

SELECT is(
  (
    SELECT role::text
    FROM public.user_roles
    WHERE user_id =
      '00000000-0000-0000-0000-000000000101'
  ),
  'customer',
  'New user receives customer role'
);

-- =========================================================
-- SIMULAR CUSTOMER AUTENTICADO
-- =========================================================

SET LOCAL ROLE authenticated;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000101',
  true
);

SELECT set_config(
  'request.jwt.claim.role',
  'authenticated',
  true
);

-- =========================================================
-- TESTE 2
-- auth.uid() reconhece o customer
-- =========================================================

SELECT is(
  auth.uid(),
  '00000000-0000-0000-0000-000000000101'::uuid,
  'auth.uid identifies simulated customer'
);

-- =========================================================
-- TESTE 3
-- Customer não é admin
-- =========================================================

SELECT is(
  public.is_admin(),
  false,
  'Customer is not admin'
);

-- =========================================================
-- TESTE 4
-- Customer não consegue virar admin diretamente
-- =========================================================

SELECT throws_ok(
  $$
    UPDATE public.user_roles
    SET role = 'admin'
    WHERE user_id =
      '00000000-0000-0000-0000-000000000101'
  $$,
  '42501',
  NULL,
  'Customer cannot promote itself directly to admin'
);

-- =========================================================
-- TESTE 5
-- Customer consegue solicitar onboarding
-- =========================================================

SELECT lives_ok(
  $$
    SELECT public.request_provider_onboarding(
      '73999999999',
      'Prestador Teste',
      'Prestador criado pelo teste automatizado'
    )
  $$,
  'Customer can request provider onboarding'
);

-- =========================================================
-- =========================================================
-- TESTE 6
-- Usuario continua customer apos solicitar onboarding
-- =========================================================

SELECT is(
  public.current_user_role()::text,
  'customer',
  'Provider onboarding preserves customer role'
);

-- =========================================================
-- TESTE 7
-- Provider profile nasce pending
-- =========================================================

SELECT is(
  (
    SELECT status::text
    FROM public.provider_profiles
    WHERE user_id =
      '00000000-0000-0000-0000-000000000101'
  ),
  'pending',
  'Provider profile starts as pending'
);

-- =========================================================
-- TESTE 8
-- Provider pending não é aprovado
-- =========================================================

SELECT is(
  public.is_approved_provider(),
  false,
  'Pending provider is not approved'
);

-- =========================================================
-- TESTE 9
-- Provider não consegue se autoaprovar
-- =========================================================

SELECT throws_ok(
  $$
    SELECT public.approve_provider(
      '00000000-0000-0000-0000-000000000101'
    )
  $$,
  'P0001',
  'ADMIN_REQUIRED',
  'Provider cannot approve itself'
);

-- =========================================================
-- VOLTAR AO CONTEXTO PRIVILEGIADO DO TESTE
-- =========================================================

RESET ROLE;

-- Somente o ambiente privilegiado do teste transforma
-- este usuário fictício em admin.
--
-- Isso NÃO representa uma operação permitida ao frontend.

UPDATE public.user_roles
SET role = 'admin'
WHERE user_id =
  '00000000-0000-0000-0000-000000000103';

-- =========================================================
-- SIMULAR ADMIN AUTENTICADO
-- =========================================================

SET LOCAL ROLE authenticated;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000103',
  true
);

SELECT set_config(
  'request.jwt.claim.role',
  'authenticated',
  true
);

-- =========================================================
-- TESTE 10
-- is_admin reconhece o admin
-- =========================================================

SELECT is(
  public.is_admin(),
  true,
  'Admin role is recognized by is_admin'
);

-- =========================================================
-- TESTE 11
-- Admin consegue aprovar provider pending
-- =========================================================

SELECT lives_ok(
  $$
    SELECT public.approve_provider(
      '00000000-0000-0000-0000-000000000101'
    )
  $$,
  'Admin can approve pending provider'
);

-- =========================================================
-- FINALIZAÇÃO
-- =========================================================

SELECT * FROM finish();

ROLLBACK;