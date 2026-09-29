-- Retorna somente informações públicas de parceiros aprovados.
-- Mantém provider_profiles protegida por RLS e não expõe
-- telefone, dados administrativos ou outros campos privados.

create or replace function public.get_public_provider_profile(
  target_provider_id uuid
)
returns table (
  user_id uuid,
  business_name text,
  description text,
  status public.provider_status
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pp.user_id,
    pp.business_name,
    pp.description,
    pp.status
  from public.provider_profiles pp
  where pp.user_id = target_provider_id
    and pp.status = 'approved'
  limit 1;
$$;

revoke all
on function public.get_public_provider_profile(uuid)
from public;

grant execute
on function public.get_public_provider_profile(uuid)
to authenticated;