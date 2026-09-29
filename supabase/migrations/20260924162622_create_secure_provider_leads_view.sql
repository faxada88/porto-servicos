-- ============================================================
-- PORTO SERVIÇOS
-- Central segura de oportunidades do parceiro
-- ============================================================

-- Remove a política antiga que permitia ao parceiro consultar
-- diretamente a linha completa da lead, incluindo dados privados.
drop policy if exists partner_leads_provider_select_own
on public.partner_leads;


-- ============================================================
-- RPC SEGURA: LISTAR OPORTUNIDADES DO PARCEIRO
--
-- Regras:
-- - somente o próprio parceiro autenticado;
-- - dados de contato NÃO são retornados enquanto a lead
--   não estiver desbloqueada;
-- - após desbloqueio, nome e telefone passam a ser retornados;
-- - dados da experiência são retornados para montar a interface;
-- - nenhuma informação privada de outro parceiro é exposta.
-- ============================================================

create or replace function public.get_provider_leads()
returns table (
  id uuid,
  service_id uuid,
  service_name text,
  status text,
  credit_cost integer,
  desired_date date,
  people_count integer,
  notes text,
  created_at timestamptz,
  unlocked_at timestamptz,
  customer_name text,
  customer_phone text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pl.id,
    pl.service_id,
    ps.name as service_name,
    pl.status,
    pl.credit_cost,
    pl.desired_date,
    pl.people_count,
    pl.notes,
    pl.created_at,
    pl.unlocked_at,

    case
      when pl.status = 'unlocked'
        and pl.unlocked_at is not null
      then pl.customer_name
      else null
    end as customer_name,

    case
      when pl.status = 'unlocked'
        and pl.unlocked_at is not null
      then pl.customer_phone
      else null
    end as customer_phone

  from public.partner_leads pl

  inner join public.provider_services ps
    on ps.id = pl.service_id
    and ps.provider_id = pl.provider_user_id

  where pl.provider_user_id = auth.uid()

  order by
    case
      when pl.status in ('pending', 'insufficient_credits') then 0
      when pl.status = 'unlocked' then 1
      else 2
    end,
    pl.created_at desc;
$$;


-- ============================================================
-- PERMISSÕES DA RPC
-- ============================================================

revoke all
on function public.get_provider_leads()
from public;

grant execute
on function public.get_provider_leads()
to authenticated;


-- ============================================================
-- SEGURANÇA DA TABELA
--
-- O parceiro não deve consultar partner_leads diretamente.
-- A leitura dele passa obrigatoriamente pela RPC acima.
--
-- A política do turista continua independente e permite que
-- o próprio turista consulte as solicitações que criou.
-- ============================================================

revoke select
on public.partner_leads
from authenticated;

grant select
on public.partner_leads
to authenticated;


-- A combinação acima mantém o SELECT disponível para o papel
-- authenticated, porém o RLS decide quais linhas podem ser lidas.
-- Como removemos a política de SELECT do parceiro, ele não consegue
-- mais acessar suas leads diretamente.
--
-- O turista continua acessando somente suas próprias linhas pela
-- política customer existente.
--
-- A função SECURITY DEFINER consegue montar a visão segura para
-- o parceiro sem revelar os campos protegidos antes do desbloqueio.