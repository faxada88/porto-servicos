BEGIN;

SELECT plan(10);

-- =========================================================
-- Porto Servicos
-- Admin Management Security Tests
-- =========================================================

-- Criar usuarios de teste
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
  '00000000-0000-0000-0000-000000000601',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin-one@porto-servicos.local',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Admin One"}'::jsonb,
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000602',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin-two@porto-servicos.local',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Admin Two"}'::jsonb,
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000603',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'customer-admin-test@porto-servicos.local',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Customer Admin Test"}'::jsonb,
  now(),
  now()
);

-- Bootstrap inicial exclusivamente para o teste.
UPDATE public.user_roles
SET role = 'admin'
WHERE user_id = '00000000-0000-0000-0000-000000000601';

-- =========================================================
-- AUTENTICAR ADMIN 1
-- =========================================================

SET LOCAL ROLE authenticated;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000601',
  true
);

SELECT set_config(
  'request.jwt.claim.role',
  'authenticated',
  true
);

-- TESTE 1
SELECT is(
  public.is_admin(),
  true,
  'Bootstrap user is admin'
);

-- TESTE 2
SELECT lives_ok(
  $$
    SELECT public.grant_admin(
      '00000000-0000-0000-0000-000000000602'
    )
  $$,
  'Admin can grant admin role'
);

-- TESTE 3
SELECT is(
  (
    SELECT role::text
    FROM public.user_roles
    WHERE user_id =
      '00000000-0000-0000-0000-000000000602'
  ),
  'admin',
  'Target user becomes admin'
);

-- TESTE 4
SELECT is(
  (
    SELECT count(*)::bigint
    FROM public.admin_audit_logs
    WHERE actor_user_id =
      '00000000-0000-0000-0000-000000000601'
    AND target_user_id =
      '00000000-0000-0000-0000-000000000602'
    AND action = 'grant_admin'
  ),
  1::bigint,
  'Grant admin action is audited'
);

-- TESTE 5
SELECT lives_ok(
  $$
    SELECT public.revoke_admin(
      '00000000-0000-0000-0000-000000000602'
    )
  $$,
  'Admin can revoke another admin'
);

-- TESTE 6
SELECT is(
  (
    SELECT role::text
    FROM public.user_roles
    WHERE user_id =
      '00000000-0000-0000-0000-000000000602'
  ),
  'customer',
  'Revoked admin returns to customer'
);

-- TESTE 7
SELECT is(
  (
    SELECT count(*)::bigint
    FROM public.admin_audit_logs
    WHERE actor_user_id =
      '00000000-0000-0000-0000-000000000601'
    AND target_user_id =
      '00000000-0000-0000-0000-000000000602'
    AND action = 'revoke_admin'
  ),
  1::bigint,
  'Revoke admin action is audited'
);

-- TESTE 8
SELECT throws_ok(
  $$
    SELECT public.revoke_admin(
      '00000000-0000-0000-0000-000000000601'
    )
  $$,
  'CANNOT_REMOVE_LAST_ADMIN',
  'Last admin cannot be removed'
);

-- =========================================================
-- AUTENTICAR USUARIO COMUM
-- =========================================================

RESET ROLE;

SET LOCAL ROLE authenticated;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000603',
  true
);

SELECT set_config(
  'request.jwt.claim.role',
  'authenticated',
  true
);

-- TESTE 9
SELECT throws_ok(
  $$
    SELECT public.grant_admin(
      '00000000-0000-0000-0000-000000000603'
    )
  $$,
  'ADMIN_REQUIRED',
  'Customer cannot promote itself to admin'
);

-- TESTE 10
SELECT is(
  public.is_admin(),
  false,
  'Regular customer remains non-admin'
);

SELECT * FROM finish();

ROLLBACK;