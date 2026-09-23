-- =========================================================
-- Porto Serviços
-- Fix: service request quote pricing consistency
-- =========================================================
--
-- Regra correta:
--
-- fixed / starting_at / hourly
--   -> devem possuir price_cents
--
-- quote + pending
--   -> price_cents deve ser NULL enquanto o orçamento
--      ainda não foi aceito
--
-- quote + accepted/in_progress/completed
--   -> price_cents deve estar preenchido com o valor
--      do orçamento aceito
--
-- quote + rejected/cancelled
--   -> pode permanecer NULL ou possuir valor caso o
--      cancelamento ocorra após aceite.
-- =========================================================


-- Remove a regra antiga, que impedia um serviço "quote"
-- de receber preço após o cliente aceitar o orçamento.

ALTER TABLE public.service_requests
DROP CONSTRAINT IF EXISTS service_requests_pricing_consistency;


-- Cria a regra corrigida.

ALTER TABLE public.service_requests
ADD CONSTRAINT service_requests_pricing_consistency
CHECK (

  -- =======================================================
  -- Serviços com preço definido previamente
  -- =======================================================

  (
    pricing_type IN (
      'fixed',
      'starting_at',
      'hourly'
    )
    AND price_cents IS NOT NULL
    AND price_cents >= 0
  )

  OR

  -- =======================================================
  -- Serviço sob orçamento ainda pendente
  -- =======================================================

  (
    pricing_type = 'quote'
    AND status = 'pending'
    AND price_cents IS NULL
  )

  OR

  -- =======================================================
  -- Orçamento aceito / serviço em execução / concluído
  -- =======================================================

  (
    pricing_type = 'quote'
    AND status IN (
      'accepted',
      'in_progress',
      'completed'
    )
    AND price_cents IS NOT NULL
    AND price_cents > 0
  )

  OR

  -- =======================================================
  -- Pedido sob orçamento rejeitado ou cancelado
  --
  -- Pode não ter preço caso tenha sido cancelado/rejeitado
  -- antes do aceite.
  --
  -- Também pode possuir preço caso tenha sido cancelado
  -- depois de um orçamento já aceito.
  -- =======================================================

  (
    pricing_type = 'quote'
    AND status IN (
      'rejected',
      'cancelled'
    )
    AND (
      price_cents IS NULL
      OR price_cents > 0
    )
  )

);