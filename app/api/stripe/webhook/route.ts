import {
  NextRequest,
  NextResponse,
} from "next/server";

import Stripe from "stripe";

import { stripe } from "@/lib/stripe/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ProcessingResult =
  | "processed"
  | "ignored";

type CustomCreditOrder = {
  id: string;
  provider_user_id: string;
  credits: number;
  total_price_cents: number;
  status: string;
  stripe_checkout_session_id:
    | string
    | null;
  stripe_payment_intent_id:
    | string
    | null;
};

/*
 * ============================================================
 * REGISTRO E IDEMPOTÊNCIA DOS EVENTOS STRIPE
 * ============================================================
 */

async function registerEvent(
  event: Stripe.Event,
): Promise<
  "process" | "already_processed"
> {
  const {
    data: existingEvent,
    error: readError,
  } = await supabaseAdmin
    .from("stripe_webhook_events")
    .select(
      "stripe_event_id, status",
    )
    .eq(
      "stripe_event_id",
      event.id,
    )
    .maybeSingle();

  if (readError) {
    throw new Error(
      `Falha ao consultar evento Stripe: ${readError.message}`,
    );
  }

  /*
   * Eventos já finalizados nunca são
   * processados novamente.
   */
  if (
    existingEvent &&
    (
      existingEvent.status ===
        "processed" ||
      existingEvent.status ===
        "ignored"
    )
  ) {
    return "already_processed";
  }

  /*
   * Se uma tentativa anterior falhou,
   * permitimos que o Stripe reenvie
   * exatamente o mesmo evento.
   */
  if (existingEvent) {
    const {
      error: updateError,
    } = await supabaseAdmin
      .from("stripe_webhook_events")
      .update({
        event_type:
          event.type,

        status:
          "processing",

        error_message:
          null,

        processed_at:
          null,
      })
      .eq(
        "stripe_event_id",
        event.id,
      );

    if (updateError) {
      throw new Error(
        `Falha ao atualizar evento Stripe: ${updateError.message}`,
      );
    }

    return "process";
  }

  const {
    error: insertError,
  } = await supabaseAdmin
    .from("stripe_webhook_events")
    .insert({
      stripe_event_id:
        event.id,

      event_type:
        event.type,

      status:
        "processing",
    });

  /*
   * Proteção contra duas entregas
   * simultâneas do mesmo evento.
   */
  if (insertError) {
    if (
      insertError.code === "23505"
    ) {
      const {
        data: concurrentEvent,
        error: concurrentError,
      } = await supabaseAdmin
        .from(
          "stripe_webhook_events",
        )
        .select("status")
        .eq(
          "stripe_event_id",
          event.id,
        )
        .maybeSingle();

      if (concurrentError) {
        throw new Error(
          `Falha ao consultar evento concorrente: ${concurrentError.message}`,
        );
      }

      if (
        concurrentEvent?.status ===
          "processed" ||
        concurrentEvent?.status ===
          "ignored" ||
        concurrentEvent?.status ===
          "processing"
      ) {
        return "already_processed";
      }
    }

    throw new Error(
      `Falha ao registrar evento Stripe: ${insertError.message}`,
    );
  }

  return "process";
}

async function markEventProcessed(
  eventId: string,
  ignored = false,
) {
  const {
    error,
  } = await supabaseAdmin
    .from("stripe_webhook_events")
    .update({
      status:
        ignored
          ? "ignored"
          : "processed",

      processed_at:
        new Date().toISOString(),

      error_message:
        null,
    })
    .eq(
      "stripe_event_id",
      eventId,
    );

  if (error) {
    throw new Error(
      `Falha ao finalizar evento Stripe: ${error.message}`,
    );
  }
}

async function markEventFailed(
  eventId: string,
  error: unknown,
) {
  const message =
    error instanceof Error
      ? error.message
      : "Erro desconhecido ao processar webhook.";

  const {
    error: updateError,
  } = await supabaseAdmin
    .from("stripe_webhook_events")
    .update({
      status:
        "failed",

      error_message:
        message.slice(
          0,
          2000,
        ),
    })
    .eq(
      "stripe_event_id",
      eventId,
    );

  if (updateError) {
    console.error(
      `Também não foi possível marcar o evento ${eventId} como failed:`,
      updateError,
    );
  }
}

/*
 * ============================================================
 * CHECKOUT ANTIGO
 * PACOTES FIXOS DE CRÉDITOS
 *
 * Mantido temporariamente até concluirmos
 * toda a migração para o novo contador.
 * ============================================================
 */

async function processLegacyCreditCheckout(
  session: Stripe.Checkout.Session,
): Promise<ProcessingResult> {
  if (
    session.mode !== "payment"
  ) {
    return "ignored";
  }

  if (
    session.metadata
      ?.porto_servicos_type !==
    "credit_package"
  ) {
    return "ignored";
  }

  if (
    session.payment_status !==
    "paid"
  ) {
    return "ignored";
  }

  const providerUserId =
    session.metadata
      .provider_user_id;

  const creditPackageId =
    session.metadata
      .credit_package_id;

  if (
    !providerUserId ||
    !creditPackageId
  ) {
    throw new Error(
      `Checkout ${session.id} da Porto Serviços sem metadados obrigatórios.`,
    );
  }

  /*
   * Não confiamos na quantidade
   * enviada nos metadados.
   *
   * O PostgreSQL consulta o pacote
   * oficial e movimenta a carteira
   * atomicamente.
   */
  const {
    error,
  } = await supabaseAdmin.rpc(
    "apply_partner_credit_purchase",
    {
      target_provider_user_id:
        providerUserId,

      target_credit_package_id:
        creditPackageId,

      target_external_reference:
        `stripe_checkout:${session.id}`,
    },
  );

  if (error) {
    throw new Error(
      `Falha ao creditar pacote: ${error.message}`,
    );
  }

  return "processed";
}

/*
 * ============================================================
 * NOVO CHECKOUT
 * CRÉDITOS PERSONALIZADOS
 * ============================================================
 */

async function processCustomCreditCheckout(
  session: Stripe.Checkout.Session,
): Promise<ProcessingResult> {
  /*
   * Créditos são sempre compra avulsa.
   */
  if (
    session.mode !== "payment"
  ) {
    return "ignored";
  }

  if (
    session.metadata
      ?.porto_servicos_type !==
    "custom_credit"
  ) {
    return "ignored";
  }

  /*
   * Nunca liberamos créditos antes
   * do Stripe confirmar o pagamento.
   */
  if (
    session.payment_status !==
    "paid"
  ) {
    return "ignored";
  }

  const providerUserId =
    session.metadata
      .provider_user_id;

  const orderId =
    session.metadata
      .custom_credit_order_id;

  if (
    !providerUserId ||
    !orderId
  ) {
    throw new Error(
      `Checkout personalizado ${session.id} sem metadados obrigatórios.`,
    );
  }

  /*
   * Recuperamos o pedido diretamente
   * do banco.
   *
   * Quantidade e valor nunca vêm
   * do navegador nesta etapa.
   */
  const {
    data: orderData,
    error: orderError,
  } = await supabaseAdmin
    .from(
      "partner_custom_credit_orders",
    )
    .select(
      "id, provider_user_id, credits, total_price_cents, status, stripe_checkout_session_id, stripe_payment_intent_id",
    )
    .eq(
      "id",
      orderId,
    )
    .maybeSingle();

  if (orderError) {
    throw new Error(
      `Falha ao consultar pedido de créditos: ${orderError.message}`,
    );
  }

  if (!orderData) {
    throw new Error(
      `Pedido ${orderId} não encontrado.`,
    );
  }

  const order =
    orderData as CustomCreditOrder;

  /*
   * O pedido obrigatoriamente deve
   * pertencer ao mesmo parceiro que
   * aparece na sessão Stripe.
   */
  if (
    order.provider_user_id !==
    providerUserId
  ) {
    throw new Error(
      `Parceiro do pedido ${order.id} não corresponde ao Checkout Stripe.`,
    );
  }

  /*
   * O Checkout recebido precisa ser
   * exatamente aquele salvo no pedido.
   */
  if (
    order.stripe_checkout_session_id !==
    session.id
  ) {
    throw new Error(
      `Sessão Stripe não corresponde ao pedido ${order.id}.`,
    );
  }

  /*
   * Verificação financeira adicional:
   *
   * O total realmente pago no Stripe
   * deve corresponder ao total congelado
   * no pedido interno.
   */
  if (
    typeof session.amount_total !==
      "number" ||
    session.amount_total !==
      order.total_price_cents
  ) {
    throw new Error(
      `Valor do Checkout ${session.id} não corresponde ao pedido ${order.id}.`,
    );
  }

  /*
   * A moeda também precisa ser BRL.
   */
  if (
    session.currency?.toLowerCase() !==
    "brl"
  ) {
    throw new Error(
      `Moeda inválida no Checkout ${session.id}.`,
    );
  }

  /*
   * Capturamos o PaymentIntent para
   * auditoria do pedido.
   */
  const paymentIntentId =
    typeof session.payment_intent ===
      "string"
      ? session.payment_intent
      : session.payment_intent?.id ??
        null;

  /*
   * Registramos que o pagamento foi
   * confirmado antes da movimentação
   * atômica da carteira.
   */
  const {
    error: paidOrderError,
  } = await supabaseAdmin
    .from(
      "partner_custom_credit_orders",
    )
    .update({
      status:
        order.status ===
        "credited"
          ? "credited"
          : "paid",

      stripe_payment_intent_id:
        paymentIntentId,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      order.id,
    );

  if (paidOrderError) {
    throw new Error(
      `Falha ao registrar pagamento do pedido: ${paidOrderError.message}`,
    );
  }

  /*
   * Agora o PostgreSQL:
   *
   * 1. bloqueia o pedido;
   * 2. garante a carteira;
   * 3. bloqueia a carteira;
   * 4. soma os créditos;
   * 5. grava o ledger;
   * 6. marca o pedido como credited.
   *
   * A referência Stripe garante
   * idempotência financeira.
   */
  const {
    error: creditError,
  } = await supabaseAdmin.rpc(
    "apply_custom_credit_purchase",
    {
      target_order_id:
        order.id,

      target_external_reference:
        `stripe_checkout:${session.id}`,
    },
  );

  if (creditError) {
    throw new Error(
      `Falha ao creditar compra personalizada: ${creditError.message}`,
    );
  }

  return "processed";
}

/*
 * ============================================================
 * ROTEAMENTO DOS CHECKOUTS
 * ============================================================
 */

async function processCreditCheckout(
  session: Stripe.Checkout.Session,
): Promise<ProcessingResult> {
  const checkoutType =
    session.metadata
      ?.porto_servicos_type;

  if (
    checkoutType ===
    "custom_credit"
  ) {
    return await processCustomCreditCheckout(
      session,
    );
  }

  if (
    checkoutType ===
    "credit_package"
  ) {
    return await processLegacyCreditCheckout(
      session,
    );
  }

  return "ignored";
}

/*
 * ============================================================
 * EVENTOS STRIPE
 * ============================================================
 */

async function handleEvent(
  event: Stripe.Event,
): Promise<ProcessingResult> {
  switch (event.type) {
    /*
     * Cartão e demais pagamentos
     * confirmados imediatamente.
     */
    case "checkout.session.completed": {
      const session =
        event.data
          .object as Stripe.Checkout.Session;

      return await processCreditCheckout(
        session,
      );
    }

    /*
     * Pagamentos cujo resultado é
     * confirmado posteriormente.
     */
    case "checkout.session.async_payment_succeeded": {
      const session =
        event.data
          .object as Stripe.Checkout.Session;

      return await processCreditCheckout(
        session,
      );
    }

    /*
     * Os demais eventos são registrados
     * como ignorados.
     */
    default:
      return "ignored";
  }
}

/*
 * ============================================================
 * ENDPOINT DO WEBHOOK
 * ============================================================
 */

export async function POST(
  request: NextRequest,
) {
  const webhookSecret =
    process.env
      .STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error(
      "STRIPE_WEBHOOK_SECRET não está configurado.",
    );

    return NextResponse.json(
      {
        received: false,

        message:
          "Webhook Stripe não configurado.",
      },
      {
        status: 500,
      },
    );
  }

  const signature =
    request.headers.get(
      "stripe-signature",
    );

  if (!signature) {
    return NextResponse.json(
      {
        received: false,

        message:
          "Assinatura do webhook não encontrada.",
      },
      {
        status: 400,
      },
    );
  }

  /*
   * O Stripe exige o corpo RAW para
   * validar criptograficamente
   * a assinatura do webhook.
   *
   * NÃO usar request.json()
   * antes de constructEvent().
   */
  const rawBody =
    await request.text();

  let event: Stripe.Event;

  try {
    event =
      stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
  } catch (error) {
    console.error(
      "Assinatura Stripe inválida:",
      error,
    );

    return NextResponse.json(
      {
        received: false,

        message:
          "Assinatura do webhook inválida.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    /*
     * Registra o evento primeiro.
     *
     * Isso protege contra reenvios
     * do mesmo evento Stripe.
     */
    const registration =
      await registerEvent(
        event,
      );

    if (
      registration ===
      "already_processed"
    ) {
      return NextResponse.json({
        received: true,
        duplicate: true,
      });
    }

    try {
      const result =
        await handleEvent(
          event,
        );

      await markEventProcessed(
        event.id,
        result === "ignored",
      );

      return NextResponse.json({
        received: true,

        processed:
          result === "processed",

        ignored:
          result === "ignored",
      });
    } catch (error) {
      /*
       * O evento fica como failed.
       *
       * O HTTP 500 permite que o Stripe
       * realize nova tentativa.
       */
      await markEventFailed(
        event.id,
        error,
      );

      throw error;
    }
  } catch (error) {
    console.error(
      `Erro processando webhook Stripe ${event.id}:`,
      error,
    );

    return NextResponse.json(
      {
        received: false,

        message:
          "Falha ao processar evento Stripe.",
      },
      {
        status: 500,
      },
    );
  }
}