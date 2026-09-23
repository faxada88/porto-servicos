BEGIN;

SELECT plan(9);

-- =========================================================
-- Porto Serviços
-- Database Security Tests - Bloco 1
-- =========================================================

-- 1. Tabelas críticas existem
SELECT ok(
  to_regclass('public.profiles') IS NOT NULL
  AND to_regclass('public.user_roles') IS NOT NULL
  AND to_regclass('public.customer_profiles') IS NOT NULL
  AND to_regclass('public.provider_profiles') IS NOT NULL
  AND to_regclass('public.service_categories') IS NOT NULL
  AND to_regclass('public.provider_services') IS NOT NULL
  AND to_regclass('public.service_requests') IS NOT NULL
  AND to_regclass('public.service_quotes') IS NOT NULL
  AND to_regclass('public.service_reviews') IS NOT NULL,
  'Critical tables exist'
);

-- 2. RLS está ativo nas tabelas protegidas
SELECT ok(
  (
    SELECT count(*) = 12
    FROM pg_class c
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN (
        'profiles',
        'user_roles',
        'customer_profiles',
        'provider_profiles',
        'service_categories',
        'provider_service_categories',
        'provider_services',
        'user_addresses',
        'provider_service_areas',
        'service_requests',
        'service_quotes',
        'service_reviews'
      )
      AND c.relrowsecurity = true
  ),
  'RLS enabled on protected tables'
);

-- 3. authenticated não altera user_roles diretamente
SELECT ok(
  NOT has_table_privilege(
    'authenticated',
    'public.user_roles',
    'INSERT'
  )
  AND NOT has_table_privilege(
    'authenticated',
    'public.user_roles',
    'UPDATE'
  )
  AND NOT has_table_privilege(
    'authenticated',
    'public.user_roles',
    'DELETE'
  ),
  'Authenticated cannot directly modify user_roles'
);

-- 4. service_requests exige RPC para mutações
SELECT ok(
  NOT has_table_privilege(
    'authenticated',
    'public.service_requests',
    'INSERT'
  )
  AND NOT has_table_privilege(
    'authenticated',
    'public.service_requests',
    'UPDATE'
  )
  AND NOT has_table_privilege(
    'authenticated',
    'public.service_requests',
    'DELETE'
  ),
  'service_requests mutations require controlled RPCs'
);

-- 5. service_quotes exige RPC para mutações
SELECT ok(
  NOT has_table_privilege(
    'authenticated',
    'public.service_quotes',
    'INSERT'
  )
  AND NOT has_table_privilege(
    'authenticated',
    'public.service_quotes',
    'UPDATE'
  )
  AND NOT has_table_privilege(
    'authenticated',
    'public.service_quotes',
    'DELETE'
  ),
  'service_quotes mutations require controlled RPCs'
);

-- 6. service_reviews exige RPC para mutações
SELECT ok(
  NOT has_table_privilege(
    'authenticated',
    'public.service_reviews',
    'INSERT'
  )
  AND NOT has_table_privilege(
    'authenticated',
    'public.service_reviews',
    'UPDATE'
  )
  AND NOT has_table_privilege(
    'authenticated',
    'public.service_reviews',
    'DELETE'
  ),
  'service_reviews mutations require controlled RPCs'
);

-- 7. RPCs críticas existem
SELECT ok(
  to_regprocedure(
    'public.request_provider_onboarding(text,text,text)'
  ) IS NOT NULL
  AND to_regprocedure(
    'public.approve_provider(uuid)'
  ) IS NOT NULL
  AND to_regprocedure(
    'public.create_service_request(uuid,uuid,timestamp with time zone,text)'
  ) IS NOT NULL
  AND to_regprocedure(
    'public.accept_service_request(uuid)'
  ) IS NOT NULL
  AND to_regprocedure(
    'public.create_service_quote(uuid,bigint,text,integer,timestamp with time zone)'
  ) IS NOT NULL
  AND to_regprocedure(
    'public.accept_service_quote(uuid)'
  ) IS NOT NULL
  AND to_regprocedure(
    'public.create_service_review(uuid,smallint,text)'
  ) IS NOT NULL,
  'Critical RPC functions exist'
);

-- 8. Onboarding é SECURITY DEFINER
SELECT ok(
  (
    SELECT p.prosecdef
    FROM pg_proc p
    JOIN pg_namespace n
      ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.oid = to_regprocedure(
        'public.request_provider_onboarding(text,text,text)'
      )
  ),
  'Provider onboarding RPC uses SECURITY DEFINER'
);

-- 9. is_admin existe
SELECT ok(
  to_regprocedure('public.is_admin()') IS NOT NULL,
  'Admin verification function exists'
);

SELECT * FROM finish();

ROLLBACK;