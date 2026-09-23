-- =========================================================
-- Porto Servicos
-- Secure Admin Management
-- =========================================================
--
-- Objetivo:
-- 1. Impedir que usuarios comuns se promovam para admin.
-- 2. Permitir gerenciamento de administradores somente
--    por outro administrador autenticado.
-- 3. Registrar auditoria das alteracoes administrativas.
-- =========================================================


-- =========================================================
-- AUDITORIA DE ADMINISTRADORES
-- =========================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  actor_user_id uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE RESTRICT,

  target_user_id uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE RESTRICT,

  action text NOT NULL
    CHECK (
      action IN (
        'grant_admin',
        'revoke_admin'
      )
    ),

  created_at timestamptz NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS admin_audit_logs_actor_idx
  ON public.admin_audit_logs(actor_user_id);

CREATE INDEX IF NOT EXISTS admin_audit_logs_target_idx
  ON public.admin_audit_logs(target_user_id);

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx
  ON public.admin_audit_logs(created_at DESC);


-- =========================================================
-- RLS
-- =========================================================

ALTER TABLE public.admin_audit_logs
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS admin_audit_logs_select_admin
ON public.admin_audit_logs;

CREATE POLICY admin_audit_logs_select_admin
ON public.admin_audit_logs
FOR SELECT
TO authenticated
USING (
  public.is_admin()
);


-- Nenhum usuario autenticado pode inserir, atualizar
-- ou apagar logs diretamente.

REVOKE INSERT, UPDATE, DELETE
ON public.admin_audit_logs
FROM authenticated;

REVOKE ALL
ON public.admin_audit_logs
FROM anon;


-- =========================================================
-- GRANT ADMIN
-- =========================================================

CREATE OR REPLACE FUNCTION public.grant_admin(
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_target_role public.user_role;
BEGIN

  v_actor := auth.uid();

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
  END IF;


  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;


  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_REQUIRED';
  END IF;


  SELECT role
  INTO v_target_role
  FROM public.user_roles
  WHERE user_id = p_user_id
  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_ROLE_NOT_FOUND';
  END IF;


  IF v_target_role = 'admin' THEN
    RAISE EXCEPTION 'USER_ALREADY_ADMIN';
  END IF;


  UPDATE public.user_roles
  SET role = 'admin'
  WHERE user_id = p_user_id;


  INSERT INTO public.admin_audit_logs (
    actor_user_id,
    target_user_id,
    action
  )
  VALUES (
    v_actor,
    p_user_id,
    'grant_admin'
  );

END;
$$;


-- =========================================================
-- REVOKE ADMIN
-- =========================================================

CREATE OR REPLACE FUNCTION public.revoke_admin(
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_target_role public.user_role;
  v_admin_count bigint;
BEGIN

  v_actor := auth.uid();

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
  END IF;


  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;


  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_REQUIRED';
  END IF;


  SELECT role
  INTO v_target_role
  FROM public.user_roles
  WHERE user_id = p_user_id
  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_ROLE_NOT_FOUND';
  END IF;


  IF v_target_role <> 'admin' THEN
    RAISE EXCEPTION 'USER_NOT_ADMIN';
  END IF;


  -- Impede remover o ultimo administrador.
  SELECT count(*)
  INTO v_admin_count
  FROM public.user_roles
  WHERE role = 'admin';


  IF v_admin_count <= 1 THEN
    RAISE EXCEPTION 'CANNOT_REMOVE_LAST_ADMIN';
  END IF;


  UPDATE public.user_roles
  SET role = 'customer'
  WHERE user_id = p_user_id;


  INSERT INTO public.admin_audit_logs (
    actor_user_id,
    target_user_id,
    action
  )
  VALUES (
    v_actor,
    p_user_id,
    'revoke_admin'
  );

END;
$$;


-- =========================================================
-- PERMISSOES DAS RPCs
-- =========================================================

REVOKE ALL
ON FUNCTION public.grant_admin(uuid)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.revoke_admin(uuid)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.grant_admin(uuid)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.revoke_admin(uuid)
TO authenticated;


-- =========================================================
-- PROTECAO DA TABELA user_roles
-- =========================================================
--
-- A tabela continua sem permitir alteracoes diretas pelo
-- usuario autenticado.
--
-- Mudancas administrativas devem acontecer pelas RPCs.
-- =========================================================

REVOKE INSERT, UPDATE, DELETE
ON public.user_roles
FROM authenticated;

REVOKE INSERT, UPDATE, DELETE
ON public.user_roles
FROM anon;