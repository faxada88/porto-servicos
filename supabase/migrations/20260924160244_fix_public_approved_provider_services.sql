-- Permite que serviços de parceiros aprovados sejam exibidos
-- aos turistas sem expor diretamente provider_profiles.

create or replace function public.is_provider_publicly_approved(
  target_provider_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.provider_profiles
    where user_id = target_provider_id
      and status = 'approved'
  );
$$;

revoke all on function public.is_provider_publicly_approved(uuid) from public;
grant execute on function public.is_provider_publicly_approved(uuid) to authenticated;

drop policy if exists provider_services_public_select_active
on public.provider_services;

create policy provider_services_public_select_active
on public.provider_services
for select
to authenticated
using (
  is_active = true

  and public.is_provider_publicly_approved(provider_id)

  and exists (
    select 1
    from public.service_categories sc
    where sc.id = provider_services.category_id
      and sc.is_active = true
  )
);