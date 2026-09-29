create or replace function public.apply_partner_credit_purchase(
  target_provider_user_id uuid,
  target_credit_package_id uuid,
  target_external_reference text
)
returns table (
  new_balance integer,
  credited_amount integer
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  package_credits integer;
  current_balance integer;
  resulting_balance integer;
  existing_amount integer;
  existing_balance integer;
begin
  /*
   * ----------------------------------------------------------
   * 1. Validação dos argumentos.
   * ----------------------------------------------------------
   */

  if target_provider_user_id is null then
    raise exception 'provider_user_id obrigatório';
  end if;

  if target_credit_package_id is null then
    raise exception 'credit_package_id obrigatório';
  end if;

  if target_external_reference is null
     or length(trim(target_external_reference)) = 0 then
    raise exception 'external_reference obrigatória';
  end if;

  /*
   * ----------------------------------------------------------
   * 2. Primeira proteção de idempotência.
   *
   * Se esse pagamento já foi processado anteriormente,
   * simplesmente devolvemos o resultado existente.
   * Nenhum crédito adicional é criado.
   * ----------------------------------------------------------
   */

  select
    pct.amount,
    pct.balance_after
  into
    existing_amount,
    existing_balance
  from public.partner_credit_transactions pct
  where pct.external_reference = target_external_reference
  limit 1;

  if found then
    return query
    select
      existing_balance,
      existing_amount;

    return;
  end if;

  /*
   * ----------------------------------------------------------
   * 3. Busca a quantidade oficial de créditos no banco.
   *
   * A quantidade NÃO é aceita do navegador e NÃO depende
   * do metadata enviado pelo cliente.
   * ----------------------------------------------------------
   */

  select pcp.credits
  into package_credits
  from public.partner_credit_packages pcp
  where pcp.id = target_credit_package_id
    and pcp.is_active = true;

  if not found then
    raise exception 'Pacote de créditos inválido ou inativo';
  end if;

  if package_credits is null
     or package_credits <= 0 then
    raise exception 'Quantidade de créditos inválida';
  end if;

  /*
   * ----------------------------------------------------------
   * 4. Garante a existência da carteira.
   * ----------------------------------------------------------
   */

  insert into public.partner_credit_wallets (
    provider_user_id,
    balance,
    lifetime_purchased,
    lifetime_consumed
  )
  values (
    target_provider_user_id,
    0,
    0,
    0
  )
  on conflict (provider_user_id)
  do nothing;

  /*
   * ----------------------------------------------------------
   * 5. Bloqueia a carteira durante a operação.
   *
   * Isso serializa alterações concorrentes de saldo para
   * o mesmo parceiro.
   * ----------------------------------------------------------
   */

  select pcw.balance
  into current_balance
  from public.partner_credit_wallets pcw
  where pcw.provider_user_id = target_provider_user_id
  for update;

  if not found then
    raise exception 'Carteira do parceiro não encontrada';
  end if;

  /*
   * ----------------------------------------------------------
   * 6. Segunda verificação de idempotência.
   *
   * Ela acontece DEPOIS do lock da carteira para proteger
   * também contra dois webhooks concorrentes referentes
   * ao mesmo pagamento.
   * ----------------------------------------------------------
   */

  select
    pct.amount,
    pct.balance_after
  into
    existing_amount,
    existing_balance
  from public.partner_credit_transactions pct
  where pct.external_reference = target_external_reference
  limit 1;

  if found then
    return query
    select
      existing_balance,
      existing_amount;

    return;
  end if;

  /*
   * ----------------------------------------------------------
   * 7. Calcula e atualiza o saldo.
   * ----------------------------------------------------------
   */

  resulting_balance :=
    current_balance + package_credits;

  update public.partner_credit_wallets
  set
    balance = resulting_balance,
    lifetime_purchased =
      lifetime_purchased + package_credits,
    updated_at = now()
  where provider_user_id = target_provider_user_id;

  /*
   * ----------------------------------------------------------
   * 8. Registra o lançamento no ledger.
   *
   * CORREÇÃO PRINCIPAL:
   *
   * A tabela possui a coluna:
   *
   *   transaction_type
   *
   * e NÃO:
   *
   *   type
   *
   * ----------------------------------------------------------
   */

  insert into public.partner_credit_transactions (
    provider_user_id,
    transaction_type,
    amount,
    balance_after,
    description,
    reference_type,
    reference_id,
    external_reference
  )
  values (
    target_provider_user_id,
    'purchase',
    package_credits,
    resulting_balance,
    'Compra de pacote de créditos via Stripe',
    'credit_package',
    target_credit_package_id,
    target_external_reference
  );

  /*
   * ----------------------------------------------------------
   * 9. Retorna o novo saldo e os créditos adicionados.
   * ----------------------------------------------------------
   */

  return query
  select
    resulting_balance,
    package_credits;
end;
$function$;


/*
 * ------------------------------------------------------------
 * Segurança
 *
 * A função financeira não pode ser executada diretamente
 * por usuários comuns.
 * ------------------------------------------------------------
 */

revoke all
on function public.apply_partner_credit_purchase(
  uuid,
  uuid,
  text
)
from public;

revoke all
on function public.apply_partner_credit_purchase(
  uuid,
  uuid,
  text
)
from anon;

revoke all
on function public.apply_partner_credit_purchase(
  uuid,
  uuid,
  text
)
from authenticated;

grant execute
on function public.apply_partner_credit_purchase(
  uuid,
  uuid,
  text
)
to service_role;