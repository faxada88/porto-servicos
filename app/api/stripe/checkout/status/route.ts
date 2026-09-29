import { connection } from "next/server";
import { NextRequest, NextResponse } from "next/server";

import { stripe } from "@/lib/stripe/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type CustomCreditOrder = {
  id: string;
  provider_user_id: string;
  credits: number;
  total_price_cents: number;
  status: string;
  stripe_checkout_session_id: string | null;
  credited_at: string | null;
};

type CreditWallet = {
  balance: number;
};

function errorResponse(
  message: string,
  status: number,
) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    {
      status,
    },
  );
}

export async function GET(
  request: NextRequest,
) {
  /*
   * Esta rota depende da requisição real:
   * cookies de autenticação + query params.
   *
   * Com Cache Components habilitado,
   * connection() impede que o Next tente
   * executar essa lógica durante prerender.
   */
  await connection();

  /*
   * Autenticação fica fora do try/catch
   * principal para não transformar sinais
   * internos do Next.js em erro HTTP 500.
   */
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return errorResponse(
      "Sessão não autenticada.",
      401,
    );
  }

  try {
    /*
     * 1. Lê os identificadores retornados
     * depois do Checkout.
     */
    const searchParams =
      request.nextUrl.searchParams;

    const orderId =
      searchParams.get("order_id")?.trim();

    const sessionId =
      searchParams.get("session_id")?.trim();

    if (!orderId || !sessionId) {
      return errorResponse(
        "Dados da compra incompletos.",
        400,
      );
    }

    /*
     * 2. Busca o pedido usando o cliente
     * administrativo.
     *
     * A autorização real é validada logo
     * abaixo comparando o pedido com o
     * usuário autenticado.
     */
    const {
      data: orderData,
      error: orderError,
    } = await supabaseAdmin
      .from(
        "partner_custom_credit_orders",
      )
      .select(
        "id, provider_user_id, credits, total_price_cents, status, stripe_checkout_session_id, credited_at",
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error(
        "Erro ao consultar pedido de créditos:",
        orderError,
      );

      return errorResponse(
        "Não foi possível consultar a compra.",
        500,
      );
    }

    if (!orderData) {
      return errorResponse(
        "Compra não encontrada.",
        404,
      );
    }

    const order =
      orderData as CustomCreditOrder;

    /*
     * 3. Impede um parceiro de consultar
     * o pedido de outro parceiro.
     */
    if (
      order.provider_user_id !== user.id
    ) {
      return errorResponse(
        "Compra não encontrada.",
        404,
      );
    }

    /*
     * 4. O session_id recebido na URL precisa
     * ser exatamente o mesmo salvo quando
     * o Checkout foi criado.
     */
    if (
      !order.stripe_checkout_session_id ||
      order.stripe_checkout_session_id !==
        sessionId
    ) {
      return errorResponse(
        "Sessão de pagamento inválida.",
        400,
      );
    }

    /*
     * 5. Confirma diretamente no Stripe que
     * a Checkout Session existe.
     *
     * Esta rota NÃO credita saldo.
     * O webhook continua sendo a autoridade
     * responsável pela liberação dos créditos.
     */
    let checkoutSession;

    try {
      checkoutSession =
        await stripe.checkout.sessions.retrieve(
          sessionId,
        );
    } catch (stripeError) {
      console.error(
        "Erro ao consultar sessão no Stripe:",
        stripeError,
      );

      return errorResponse(
        "Não foi possível confirmar o pagamento.",
        502,
      );
    }

    if (
      checkoutSession.id !== sessionId
    ) {
      return errorResponse(
        "Sessão de pagamento inválida.",
        400,
      );
    }

    if (
      checkoutSession.mode !== "payment"
    ) {
      return errorResponse(
        "Tipo de pagamento inválido.",
        400,
      );
    }

    const metadata =
      checkoutSession.metadata ?? {};

    if (
      metadata.porto_servicos_type !==
      "custom_credit"
    ) {
      return errorResponse(
        "Tipo de compra inválido.",
        400,
      );
    }

    if (
      metadata.provider_user_id !==
      user.id
    ) {
      return errorResponse(
        "Compra não encontrada.",
        404,
      );
    }

    if (
      metadata.custom_credit_order_id !==
      order.id
    ) {
      return errorResponse(
        "Pedido de pagamento inválido.",
        400,
      );
    }

    if (
      checkoutSession.currency?.toLowerCase() !==
      "brl"
    ) {
      return errorResponse(
        "Moeda do pagamento inválida.",
        400,
      );
    }

    if (
      checkoutSession.amount_total !==
      order.total_price_cents
    ) {
      return errorResponse(
        "Valor do pagamento não corresponde ao pedido.",
        400,
      );
    }

    /*
     * 6. Consulta a carteira real do parceiro.
     */
    const {
      data: walletData,
      error: walletError,
    } = await supabaseAdmin
      .from(
        "partner_credit_wallets",
      )
      .select("balance")
      .eq(
        "provider_user_id",
        user.id,
      )
      .maybeSingle();

    if (walletError) {
      console.error(
        "Erro ao consultar carteira:",
        walletError,
      );

      return errorResponse(
        "Não foi possível consultar sua carteira.",
        500,
      );
    }

    const wallet =
      walletData as CreditWallet | null;

    /*
     * 7. Estado final:
     * o webhook já confirmou e creditou.
     */
    if (
      order.status === "credited" &&
      order.credited_at
    ) {
      if (!wallet) {
        return errorResponse(
          "Carteira não encontrada após a confirmação da compra.",
          500,
        );
      }

      return NextResponse.json({
        ok: true,
        status: "credited",
        paymentStatus:
          checkoutSession.payment_status,
        credits: order.credits,
        balance: wallet.balance,
        creditedAt: order.credited_at,
      });
    }

    /*
     * 8. O pagamento já foi aprovado pelo
     * Stripe, mas o webhook ainda pode estar
     * terminando a atualização da carteira.
     *
     * O frontend poderá consultar novamente.
     */
    if (
      checkoutSession.payment_status ===
      "paid"
    ) {
      return NextResponse.json({
        ok: true,
        status: "processing",
        paymentStatus: "paid",
        credits: order.credits,
        balance: wallet?.balance ?? null,
      });
    }

    /*
     * 9. Checkout válido, mas pagamento
     * ainda não confirmado.
     */
    return NextResponse.json({
      ok: true,
      status: "pending",
      paymentStatus:
        checkoutSession.payment_status,
      credits: order.credits,
      balance: wallet?.balance ?? null,
    });
  } catch (error) {
    console.error(
      "Erro ao consultar status da compra:",
      error,
    );

    return errorResponse(
      "Não foi possível consultar o status da compra.",
      500,
    );
  }
}