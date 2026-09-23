BEGIN;

SELECT plan(8);

-- =========================================================
-- Porto Servicos
-- Dual Role Authorization Tests
-- =========================================================

-- =========================================================
-- CRIAR USUARIO
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
VALUES (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'dual-role-test@porto-servicos.local',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Dual Role Test"}'::jsonb,
  now(),
  now()
);

-- =========================================================
-- TESTE 1
-- Novo usuario nasce customer
-- =========================================================

SELECT is(
  (
    SELECT role::text
    FROM public.user_roles
    WHERE user_id =
      '00000000-0000-0000-0000-000000000201'
  ),
  'customer',
  'New dual-role user starts as customer'
);

-- =========================================================
-- AUTENTICAR USUARIO
-- =========================================================

SET LOCAL ROLE authenticated;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000201',
  true
);

SELECT set_config(
  'request.jwt.claim.role',
  'authenticated',
  true
);

-- =========================================================
-- TESTE 2
-- Solicita cadastro de prestador
-- =========================================================

SELECT lives_ok(
  $$
    SELECT public.request_provider_onboarding(
      '73999999999',
      'Dual Role Provider',
      'Prestador com acesso simultaneo ao modo cliente'
    )
  $$,
  'Customer can request provider onboarding'
);

-- =========================================================
-- TESTE 3
-- Continua customer
-- =========================================================

SELECT is(
  public.current_user_role()::text,
  'customer',
  'Provider onboarding preserves customer role'
);

-- =========================================================
-- TESTE 4
-- Perfil provider existe
-- =========================================================

SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.provider_profiles
    WHERE user_id =
      '00000000-0000-0000-0000-000000000201'
  ),
  'Provider profile exists after onboarding'
);

-- =========================================================
-- TESTE 5
-- Perfil provider inicia pending
-- =========================================================

SELECT is(
  (
    SELECT status::text
    FROM public.provider_profiles
    WHERE user_id =
      '00000000-0000-0000-0000-000000000201'
  ),
  'pending',
  'Provider profile starts pending'
);

-- =========================================================
-- TESTE 6
-- Pending ainda nao possui capacidade provider aprovada
-- =========================================================

SELECT is(
  public.is_approved_provider(),
  false,
  'Pending provider is not approved'
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
  '00000000-0000-0000-0000-000000000201';

SET LOCAL ROLE authenticated;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000201',
  true
);

SELECT set_config(
  'request.jwt.claim.role',
  'authenticated',
  true
);

-- =========================================================
-- TESTE 7
-- Agora possui capacidade provider
-- =========================================================

SELECT is(
  public.is_approved_provider(),
  true,
  'Approved provider capability is recognized'
);

-- =========================================================
-- TESTE 8
-- Mesmo aprovado como provider continua customer
-- =========================================================

SELECT is(
  public.current_user_role()::text,
  'customer',
  'Approved provider remains customer'
);

SELECT * FROM finish();

ROLLBACK;