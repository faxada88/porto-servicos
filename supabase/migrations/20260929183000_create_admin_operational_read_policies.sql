-- ============================================================
-- PORTO SERVICOS
-- Leitura administrativa da operacao de creditos e oportunidades
-- ============================================================
--
-- Permite que um administrador autenticado consulte todas as
-- carteiras, transacoes e oportunidades para o backoffice.
-- Escritas diretas continuam proibidas. Ajustes financeiros
-- continuam exclusivamente pela RPC admin_adjust_partner_credits.
-- ============================================================

drop policy if exists
  partner_credit_wallets_select_admin
on public.partner_credit_wallets;

create policy partner_credit_wallets_select_admin
on public.partner_credit_wallets
for select
to authenticated
using (public.is_admin());


drop policy if exists
  partner_credit_transactions_select_admin
on public.partner_credit_transactions;

create policy partner_credit_transactions_select_admin
on public.partner_credit_transactions
for select
to authenticated
using (public.is_admin());


drop policy if exists
  partner_leads_select_admin
on public.partner_leads;

create policy partner_leads_select_admin
on public.partner_leads
for select
to authenticated
using (public.is_admin());


-- Reforca que nenhuma escrita direta fica disponivel.
revoke insert, update, delete
on public.partner_credit_wallets
from authenticated;

revoke insert, update, delete
on public.partner_credit_transactions
from authenticated;

revoke insert, update, delete
on public.partner_leads
from authenticated;

comment on policy partner_credit_wallets_select_admin
on public.partner_credit_wallets is
'Administradores autenticados podem consultar todas as carteiras de creditos.';

comment on policy partner_credit_transactions_select_admin
on public.partner_credit_transactions is
'Administradores autenticados podem consultar o ledger completo de creditos.';

comment on policy partner_leads_select_admin
on public.partner_leads is
'Administradores autenticados podem consultar todas as oportunidades da plataforma.';
