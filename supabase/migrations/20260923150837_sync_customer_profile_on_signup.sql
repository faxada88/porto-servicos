-- =========================================================
-- Porto Serviços
-- Sincronização automática do perfil de cliente no cadastro
-- =========================================================
--
-- Fluxo:
-- auth.users
--   -> profiles
--   -> user_roles
--   -> customer_profiles
--
-- Todo usuário comum nasce como customer.
-- A capacidade de prestador continua sendo adicionada
-- separadamente através de provider_profiles.
-- =========================================================


-- =========================================================
-- HANDLE NEW USER
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_phone text;
begin

  -- Normaliza os dados recebidos pelo Supabase Auth.
  v_full_name := nullif(
    btrim(
      coalesce(
        new.raw_user_meta_data->>'full_name',
        ''
      )
    ),
    ''
  );

  v_phone := regexp_replace(
    coalesce(
      new.raw_user_meta_data->>'phone',
      ''
    ),
    '[^0-9]',
    '',
    'g'
  );


  -- =======================================================
  -- PERFIL BASE
  -- =======================================================

  insert into public.profiles (
    id,
    email,
    full_name
  )
  values (
    new.id,
    new.email,
    coalesce(v_full_name, '')
  )
  on conflict (id)
  do update
  set
    email = excluded.email,
    full_name = case
      when excluded.full_name <> ''
        then excluded.full_name
      else public.profiles.full_name
    end;


  -- =======================================================
  -- ROLE BASE
  --
  -- Todo usuário comum começa como customer.
  -- Admin continua sendo promovido somente pelo fluxo
  -- administrativo seguro.
  -- =======================================================

  insert into public.user_roles (
    user_id,
    role
  )
  values (
    new.id,
    'customer'
  )
  on conflict (user_id)
  do nothing;


  -- =======================================================
  -- PERFIL DE CLIENTE
  --
  -- Criamos automaticamente quando o cadastro possui
  -- telefone válido nos metadados.
  -- =======================================================

  if length(v_phone) between 10 and 11 then

    insert into public.customer_profiles (
      user_id,
      phone
    )
    values (
      new.id,
      v_phone
    )
    on conflict (user_id)
    do update
    set
      phone = excluded.phone;

  end if;


  return new;

end;
$$;


-- =========================================================
-- GARANTIR TRIGGER
-- =========================================================

drop trigger if exists on_auth_user_created
on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();


-- =========================================================
-- SEGURANÇA
--
-- A função é executada exclusivamente pelo trigger.
-- Nenhum usuário deve executá-la diretamente.
-- =========================================================

revoke all
on function public.handle_new_user()
from public;

revoke all
on function public.handle_new_user()
from anon;

revoke all
on function public.handle_new_user()
from authenticated;