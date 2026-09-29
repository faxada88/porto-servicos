-- Administrative moderation for provider services / tourism experiences.
-- A moderated service is forced offline and cannot be republished by the provider
-- until an administrator restores it.

create table if not exists public.provider_service_moderations (
  service_id uuid primary key references public.provider_services(id) on delete cascade,
  is_blocked boolean not null default false,
  reason text,
  blocked_by uuid references auth.users(id) on delete restrict,
  blocked_at timestamptz,
  restored_by uuid references auth.users(id) on delete restrict,
  restored_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint provider_service_moderations_reason_check
    check (reason is null or char_length(btrim(reason)) between 5 and 500),
  constraint provider_service_moderations_blocked_state_check
    check (
      (is_blocked = false)
      or
      (reason is not null and blocked_by is not null and blocked_at is not null)
    )
);

create index if not exists provider_service_moderations_blocked_idx
  on public.provider_service_moderations (is_blocked, blocked_at desc);

alter table public.provider_service_moderations enable row level security;

drop policy if exists provider_service_moderations_select_admin
  on public.provider_service_moderations;

create policy provider_service_moderations_select_admin
  on public.provider_service_moderations
  for select
  to authenticated
  using (public.is_admin());

revoke insert, update, delete on public.provider_service_moderations
  from authenticated, anon;

create or replace function public.admin_set_provider_service_moderation(
  target_service_id uuid,
  block_service boolean,
  moderation_reason text default null
)
returns table (
  service_id uuid,
  is_blocked boolean,
  is_active boolean,
  reason text,
  changed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_reason text := nullif(btrim(moderation_reason), '');
  v_active boolean;
  v_changed_at timestamptz := now();
begin
  if v_actor is null or not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if target_service_id is null then
    raise exception 'SERVICE_ID_REQUIRED';
  end if;

  perform 1
  from public.provider_services ps
  where ps.id = target_service_id
  for update;

  if not found then
    raise exception 'SERVICE_NOT_FOUND';
  end if;

  if block_service then
    if v_reason is null or char_length(v_reason) < 5 or char_length(v_reason) > 500 then
      raise exception 'MODERATION_REASON_LENGTH';
    end if;

    update public.provider_services ps
    set is_active = false
    where ps.id = target_service_id
    returning ps.is_active into v_active;

    insert into public.provider_service_moderations (
      service_id,
      is_blocked,
      reason,
      blocked_by,
      blocked_at,
      restored_by,
      restored_at,
      updated_at
    )
    values (
      target_service_id,
      true,
      v_reason,
      v_actor,
      v_changed_at,
      null,
      null,
      v_changed_at
    )
    on conflict on constraint provider_service_moderations_pkey
    do update set
      is_blocked = true,
      reason = excluded.reason,
      blocked_by = excluded.blocked_by,
      blocked_at = excluded.blocked_at,
      restored_by = null,
      restored_at = null,
      updated_at = excluded.updated_at;
  else
    insert into public.provider_service_moderations (
      service_id,
      is_blocked,
      reason,
      blocked_by,
      blocked_at,
      restored_by,
      restored_at,
      updated_at
    )
    values (
      target_service_id,
      false,
      null,
      null,
      null,
      v_actor,
      v_changed_at,
      v_changed_at
    )
    on conflict on constraint provider_service_moderations_pkey
    do update set
      is_blocked = false,
      restored_by = excluded.restored_by,
      restored_at = excluded.restored_at,
      updated_at = excluded.updated_at;

    select ps.is_active
      into v_active
    from public.provider_services ps
    where ps.id = target_service_id;
  end if;

  return query
  select
    target_service_id,
    m.is_blocked,
    v_active,
    m.reason,
    v_changed_at
  from public.provider_service_moderations m
  where m.service_id = target_service_id;
end;
$$;

revoke all on function public.admin_set_provider_service_moderation(uuid, boolean, text)
  from public, anon;
grant execute on function public.admin_set_provider_service_moderation(uuid, boolean, text)
  to authenticated;

create or replace function public.prevent_blocked_provider_service_activation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_active = true
     and old.is_active is distinct from true
     and exists (
       select 1
       from public.provider_service_moderations m
       where m.service_id = new.id
         and m.is_blocked = true
     )
     and not public.is_admin()
  then
    raise exception 'SERVICE_BLOCKED_BY_ADMIN';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_blocked_provider_service_activation
  on public.provider_services;

create trigger prevent_blocked_provider_service_activation
before update of is_active on public.provider_services
for each row
execute function public.prevent_blocked_provider_service_activation();

revoke all on function public.prevent_blocked_provider_service_activation()
  from public, anon, authenticated;
