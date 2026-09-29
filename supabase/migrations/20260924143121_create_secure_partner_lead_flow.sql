 -- ============================================================
-- PORTO SERVIÇOS
-- Fluxo seguro de oportunidades / leads
--
-- Turista:
--   cria uma solicitação para um serviço
--
-- Parceiro:
--   vê a oportunidade sem os dados de contato
--   pode recusar sem gastar créditos
--   pode aceitar/desbloquear pagando créditos
--
-- Segurança:
--   - custo definido pelo servidor
--   - débito atômico
--   - carteira bloqueada durante a operação
--   - não permite cobrança duplicada
--   - contato só é retornado após desbloqueio
-- ============================================================


-- ============================================================
-- 1. STATUS "DECLINED"
-- ============================================================

alter table public.partner_leads
  drop constraint if exists partner_leads_status_check;

alter table public.partner_leads
  add constraint partner_leads_status_check
  check (
    status in (
      'pending',
      'unlocked',
      'declined',
      'insufficient_credits',
      'canceled',
      'invalid'
    )
  );


-- ============================================================
-- 2. ÍNDICE PARA EVITAR DUPLICAÇÃO DE COBRANÇA
-- ============================================================

create unique index if not exists
  idx_partner_credit_transactions_unique_lead_charge
on public.partner_credit_transactions (provider_user_id, reference_id)
where
  transaction_type = 'lead_charge'
  and reference_type = 'partner_lead'
  and reference_id is not null;


-- ============================================================
-- 3. TURISTA CRIA UMA SOLICITAÇÃO
-- ============================================================

create or replace function public.create_partner_lead(
  target_service_id uuid,
  target_customer_name text,
  target_customer_phone text,
  target_desired_date date default null,
  target_people_count integer default null,
  target_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_customer_id uuid;
  target_provider_id uuid;
  new_lead_id uuid;

  clean_customer_name text;
  clean_customer_phone text;
  clean_notes text;

  configured_credit_cost integer := 5;
begin
  current_customer_id := auth.uid();

  if current_customer_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  clean_customer_name :=
    nullif(trim(target_customer_name), '');

  clean_customer_phone :=
    nullif(trim(target_customer_phone), '');

  clean_notes :=
    nullif(trim(target_notes), '');

  if clean_customer_name is null then
    raise exception 'CUSTOMER_NAME_REQUIRED';
  end if;

  if length(clean_customer_name) > 120 then
    raise exception 'CUSTOMER_NAME_TOO_LONG';
  end if;

  if clean_customer_phone is null then
    raise exception 'CUSTOMER_PHONE_REQUIRED';
  end if;

  if length(clean_customer_phone) > 30 then
    raise exception 'CUSTOMER_PHONE_TOO_LONG';
  end if;

  if target_people_count is not null
     and target_people_count <= 0 then
    raise exception 'INVALID_PEOPLE_COUNT';
  end if;

  if target_people_count is not null
     and target_people_count > 1000 then
    raise exception 'INVALID_PEOPLE_COUNT';
  end if;

  if target_desired_date is not null
     and target_desired_date < current_date then
    raise exception 'INVALID_DESIRED_DATE';
  end if;

  if clean_notes is not null
     and length(clean_notes) > 2000 then
    raise exception 'NOTES_TOO_LONG';
  end if;

  /*
   * Descobre o parceiro exclusivamente pelo serviço.
   *
   * O cliente não informa provider_user_id,
   * impedindo manipulação pelo navegador.
   */
  select ps.provider_id
  into target_provider_id
  from public.provider_services ps
  inner join public.provider_profiles pp
    on pp.user_id = ps.provider_id
  where
    ps.id = target_service_id
    and ps.is_active = true
    and pp.status = 'approved'
  limit 1;

  if target_provider_id is null then
    raise exception 'SERVICE_NOT_AVAILABLE';
  end if;

  /*
   * Um parceiro não deve gerar uma oportunidade
   * para o próprio serviço.
   */
  if target_provider_id = current_customer_id then
    raise exception 'OWN_SERVICE_NOT_ALLOWED';
  end if;

  /*
   * O custo NÃO vem do navegador.
   *
   * Inicialmente usamos 5 créditos por contato.
   * Posteriormente podemos transformar isso em
   * preço configurável por categoria/oportunidade.
   */
  insert into public.partner_leads (
    provider_user_id,
    service_id,
    customer_user_id,
    customer_name,
    customer_phone,
    desired_date,
    people_count,
    notes,
    status,
    credit_cost
  )
  values (
    target_provider_id,
    target_service_id,
    current_customer_id,
    clean_customer_name,
    clean_customer_phone,
    target_desired_date,
    target_people_count,
    clean_notes,
    'pending',
    configured_credit_cost
  )
  returning id into new_lead_id;

  return new_lead_id;
end;
$$;


-- ============================================================
-- 4. PARCEIRO RECUSA UMA OPORTUNIDADE
-- ============================================================

create or replace function public.decline_partner_lead(
  target_lead_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_provider_id uuid;
  affected_rows integer;
begin
  current_provider_id := auth.uid();

  if current_provider_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  /*
   * Só o parceiro dono da oportunidade
   * pode recusá-la.
   *
   * Só pending pode virar declined.
   *
   * Nenhum crédito é movimentado.
   */
  update public.partner_leads
  set
    status = 'declined',
    updated_at = now()
  where
    id = target_lead_id
    and provider_user_id = current_provider_id
    and status = 'pending';

  get diagnostics affected_rows = row_count;

  if affected_rows = 0 then
    if not exists (
      select 1
      from public.partner_leads
      where
        id = target_lead_id
        and provider_user_id = current_provider_id
    ) then
      raise exception 'LEAD_NOT_FOUND';
    end if;

    raise exception 'LEAD_CANNOT_BE_DECLINED';
  end if;

  return true;
end;
$$;


-- ============================================================
-- 5. PARCEIRO ACEITA E DESBLOQUEIA O CONTATO
-- ============================================================

create or replace function public.unlock_partner_lead(
  target_lead_id uuid
)
returns table (
  lead_id uuid,
  lead_status text,
  customer_name text,
  customer_phone text,
  credits_charged integer,
  remaining_balance integer,
  unlocked_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_provider_id uuid;

  selected_lead public.partner_leads%rowtype;

  current_balance integer;
  resulting_balance integer;

  existing_charge_balance integer;
begin
  current_provider_id := auth.uid();

  if current_provider_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  /*
   * Bloqueia a oportunidade durante toda a operação.
   *
   * Isso impede duas requisições simultâneas de
   * cobrarem o mesmo contato duas vezes.
   */
  select *
  into selected_lead
  from public.partner_leads
  where
    id = target_lead_id
    and provider_user_id = current_provider_id
  for update;

  if not found then
    raise exception 'LEAD_NOT_FOUND';
  end if;

  /*
   * IDEMPOTÊNCIA:
   *
   * Se já estiver desbloqueado, não cobra novamente.
   * Apenas devolve os dados já liberados.
   */
  if selected_lead.status = 'unlocked' then

    select pct.balance_after
    into existing_charge_balance
    from public.partner_credit_transactions pct
    where
      pct.provider_user_id = current_provider_id
      and pct.transaction_type = 'lead_charge'
      and pct.reference_type = 'partner_lead'
      and pct.reference_id = selected_lead.id
    order by pct.created_at desc
    limit 1;

    return query
    select
      selected_lead.id,
      selected_lead.status,
      selected_lead.customer_name,
      selected_lead.customer_phone,
      0,
      coalesce(
        existing_charge_balance,
        (
          select pcw.balance
          from public.partner_credit_wallets pcw
          where
            pcw.provider_user_id = current_provider_id
        ),
        0
      ),
      selected_lead.unlocked_at;

    return;
  end if;

  /*
   * Leads recusados, cancelados ou inválidos
   * não podem ser cobrados.
   *
   * insufficient_credits pode ser tentado novamente
   * depois que o parceiro comprar créditos.
   */
  if selected_lead.status not in (
    'pending',
    'insufficient_credits'
  ) then
    raise exception 'LEAD_NOT_AVAILABLE';
  end if;

  /*
   * Bloqueia a carteira do parceiro.
   *
   * FOR UPDATE garante que duas compras/desbloqueios
   * concorrentes não gastem o mesmo saldo.
   */
  select pcw.balance
  into current_balance
  from public.partner_credit_wallets pcw
  where
    pcw.provider_user_id = current_provider_id
  for update;

  if not found then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  /*
   * Saldo insuficiente:
   * nenhum crédito é descontado.
   */
  if current_balance < selected_lead.credit_cost then

    update public.partner_leads
    set
      status = 'insufficient_credits',
      updated_at = now()
    where id = selected_lead.id;

    return query
    select
      selected_lead.id,
      'insufficient_credits'::text,
      null::text,
      null::text,
      0,
      current_balance,
      null::timestamptz;

    return;
  end if;

  resulting_balance :=
    current_balance - selected_lead.credit_cost;

  /*
   * 1. Desconta saldo.
   * 2. Incrementa lifetime_consumed.
   */
  update public.partner_credit_wallets
  set
    balance = resulting_balance,
    lifetime_consumed =
      lifetime_consumed + selected_lead.credit_cost,
    updated_at = now()
  where
    provider_user_id = current_provider_id;

  /*
   * Registra a movimentação financeira.
   *
   * O índice único criado acima também protege
   * contra cobrança duplicada.
   */
  insert into public.partner_credit_transactions (
    provider_user_id,
    transaction_type,
    amount,
    balance_after,
    description,
    reference_type,
    reference_id
  )
  values (
    current_provider_id,
    'lead_charge',
    -selected_lead.credit_cost,
    resulting_balance,
    'Contato desbloqueado',
    'partner_lead',
    selected_lead.id
  );

  /*
   * Somente depois do débito e do ledger
   * o contato é marcado como desbloqueado.
   */
  update public.partner_leads
  set
    status = 'unlocked',
    unlocked_at = now(),
    updated_at = now()
  where
    id = selected_lead.id
  returning
    partner_leads.unlocked_at
  into selected_lead.unlocked_at;

  selected_lead.status := 'unlocked';

  return query
  select
    selected_lead.id,
    selected_lead.status,
    selected_lead.customer_name,
    selected_lead.customer_phone,
    selected_lead.credit_cost,
    resulting_balance,
    selected_lead.unlocked_at;
end;
$$;


-- ============================================================
-- 6. PERMISSÕES DAS RPCs
-- ============================================================

revoke all
on function public.create_partner_lead(
  uuid,
  text,
  text,
  date,
  integer,
  text
)
from public;

revoke all
on function public.decline_partner_lead(uuid)
from public;

revoke all
on function public.unlock_partner_lead(uuid)
from public;


grant execute
on function public.create_partner_lead(
  uuid,
  text,
  text,
  date,
  integer,
  text
)
to authenticated;

grant execute
on function public.decline_partner_lead(uuid)
to authenticated;

grant execute
on function public.unlock_partner_lead(uuid)
to authenticated;


-- ============================================================
-- 7. BLOQUEIA ALTERAÇÕES FINANCEIRAS DIRETAS PELO CLIENTE
-- ============================================================

revoke insert, update, delete
on public.partner_credit_wallets
from authenticated;

revoke insert, update, delete
on public.partner_credit_transactions
from authenticated;

revoke insert, update, delete
on public.partner_leads
from authenticated;