import {
  NextRequest,
  NextResponse,
} from "next/server";

import { stripe } from "@/lib/stripe/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type CheckoutType =
  | "credit_package"
  | "custom_credit";

type CheckoutBody = {
  type?: CheckoutType;

  /*
   * Mantido temporariamente para compatibilidade
   * com os pacotes antigos enquanto migramos a UI.
   */
  itemId?: string;

  /*
   * Novo fluxo personalizado.
   */
  credits?: number;
};

type ProviderProfile = {
  user_id: string;
  business_name: string | null;
  status: string;
};

type BillingCustomer = {
  provider_user_id: string;
  stripe_customer_id: string;
};

type PricingTier = {
  id: string;
  min_credits: number;
  max_credits: number | null;
  price_per_credit_cents: number;
  label: string | null;
};

type CustomCreditOrder = {
  id: string;
  provider_user_id: string;
  credits: number;
  price_per_credit_cents: number;
  total_price_cents: number;
  pricing_tier_label: string | null;
  status: string;
};

function getBaseUrl(
  request: NextRequest,
) {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(
      /\/+$/,
      "",
    );
  }

  return request.nextUrl.origin;
}

function normalizeCredits(
  value: unknown,
) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value)
  ) {
    return null;
  }

  return value;
}

async function getOrCreateStripeCustomer({
  provider,
  email,
}: {
  provider: ProviderProfile;
  email: string;
}) {
  const {
    data: existingBillingCustomer,
    error: billingError,
  } = await supabaseAdmin
    .from("partner_billing_customers")
    .select(
      "provider_user_id, stripe_customer_id",
    )
    .eq(
      "provider_user_id",
      provider.user_id,
    )
    .maybeSingle();

  if (billingError) {
    throw new Error(
      `Não foi possível consultar o cliente Stripe: ${billingError.message}`,
    );
  }

  const billingCustomer =
    existingBillingCustomer as
      | BillingCustomer
      | null;

  /*
   * Reutiliza o Customer Stripe já vinculado
   * ao parceiro quando ele ainda existe.
   */
  if (
    billingCustomer?.stripe_customer_id
  ) {
    try {
      const customer =
        await stripe.customers.retrieve(
          billingCustomer.stripe_customer_id,
        );

      if (!customer.deleted) {
        return customer;
      }
    } catch (error) {
      console.warn(
        "Customer Stripe salvo não pôde ser recuperado. Tentando localizar ou recriar.",
        error,
      );
    }
  }

  /*
   * Evita duplicidade caso um Customer tenha
   * sido criado no Stripe, mas a gravação local
   * tenha falhado anteriormente.
   */
  const existingCustomers =
    await stripe.customers.search({
      query:
        `metadata["provider_user_id"]:` +
        `"${provider.user_id}"`,

      limit: 10,
    });

  const existingCustomer =
    existingCustomers.data.find(
      (customer) => !customer.deleted,
    ) ?? null;

  const customer =
    existingCustomer ??
    (await stripe.customers.create(
      {
        email,

        name:
          provider.business_name?.trim() ||
          email,

        metadata: {
          provider_user_id:
            provider.user_id,

          porto_servicos_role:
            "partner",
        },
      },
      {
        idempotencyKey:
          `porto-servicos-customer-${provider.user_id}`,
      },
    ));

  const { error: saveCustomerError } =
    await supabaseAdmin
      .from(
        "partner_billing_customers",
      )
      .upsert(
        {
          provider_user_id:
            provider.user_id,

          stripe_customer_id:
            customer.id,
        },
        {
          onConflict:
            "provider_user_id",
        },
      );

  if (saveCustomerError) {
    throw new Error(
      `Não foi possível salvar o cliente Stripe: ${saveCustomerError.message}`,
    );
  }

  return customer;
}

/*
 * ============================================================
 * NOVO FLUXO
 * COMPRA PERSONALIZADA DE CRÉDITOS
 * ============================================================
 */

async function getOfficialPricingTier(
  credits: number,
) {
  /*
   * A quantidade já foi validada no servidor.
   *
   * Agora encontramos a faixa oficial no banco.
   * O frontend não informa preço.
   */
  const {
    data,
    error,
  } = await supabaseAdmin
    .from(
      "partner_credit_pricing_tiers",
    )
    .select(
      "id, min_credits, max_credits, price_per_credit_cents, label",
    )
    .eq("is_active", true)
    .lte("min_credits", credits)
    .order("min_credits", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Não foi possível calcular o valor dos créditos: ${error.message}`,
    );
  }

  const tiers = Array.isArray(data)
    ? (data as PricingTier[])
    : [];

  const tier =
    tiers.find(
      (candidate) =>
        candidate.max_credits === null ||
        credits <=
          candidate.max_credits,
    ) ?? null;

  if (!tier) {
    throw new Error(
      "Não existe uma faixa de preço disponível para essa quantidade.",
    );
  }

  return tier;
}

async function createCustomCreditOrder({
  providerUserId,
  credits,
}: {
  providerUserId: string;
  credits: number;
}) {
  const pricingTier =
    await getOfficialPricingTier(
      credits,
    );

  const totalPriceCents =
    credits *
    pricingTier.price_per_credit_cents;

  if (
    !Number.isSafeInteger(
      totalPriceCents,
    ) ||
    totalPriceCents <= 0
  ) {
    throw new Error(
      "Não foi possível calcular o valor da compra.",
    );
  }

  const {
    data: order,
    error: orderError,
  } = await supabaseAdmin
    .from(
      "partner_custom_credit_orders",
    )
    .insert({
      provider_user_id:
        providerUserId,

      credits,

      price_per_credit_cents:
        pricingTier.price_per_credit_cents,

      total_price_cents:
        totalPriceCents,

      pricing_tier_label:
        pricingTier.label,

      status: "pending",
    })
    .select(
      "id, provider_user_id, credits, price_per_credit_cents, total_price_cents, pricing_tier_label, status",
    )
    .single();

  if (orderError || !order) {
    throw new Error(
      `Não foi possível criar o pedido de créditos: ${
        orderError?.message ??
        "pedido não retornado"
      }`,
    );
  }

  return order as CustomCreditOrder;
}

async function createCustomCreditCheckout({
  credits,
  provider,
  customerId,
  baseUrl,
}: {
  credits: number;
  provider: ProviderProfile;
  customerId: string;
  baseUrl: string;
}) {
  /*
   * Primeiro congelamos quantidade e preço
   * oficial em um pedido interno.
   *
   * Esse pedido será a fonte confiável usada
   * posteriormente pelo webhook.
   */
  const order =
    await createCustomCreditOrder({
      providerUserId:
        provider.user_id,

      credits,
    });

  try {
    /*
     * Não usamos preço enviado pelo navegador.
     *
     * O Stripe recebe exatamente o valor
     * armazenado no pedido criado pelo servidor.
     */
    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",

        customer: customerId,

        line_items: [
          {
            price_data: {
              currency: "brl",

              unit_amount:
                order.total_price_cents,

              product_data: {
                name:
                  `${order.credits} créditos Porto Serviços`,

                description:
                  "Créditos para desbloquear contatos de oportunidades na Porto Serviços.",

                metadata: {
                  porto_servicos_type:
                    "custom_credit",

                  custom_credit_order_id:
                    order.id,
                },
              },
            },

            quantity: 1,
          },
        ],

        success_url:
          `${baseUrl}/protected/prestador` +
          "?checkout=success" +
          `&order_id=${order.id}` +
          "&session_id={CHECKOUT_SESSION_ID}" +
          "#carteira",

        cancel_url:
          `${baseUrl}/protected/prestador` +
          "?checkout=canceled" +
          `&order_id=${order.id}` +
          "#carteira",

        allow_promotion_codes:
          false,

        billing_address_collection:
          "auto",

        client_reference_id:
          provider.user_id,

        metadata: {
          porto_servicos_type:
            "custom_credit",

          provider_user_id:
            provider.user_id,

          custom_credit_order_id:
            order.id,
        },

        payment_intent_data: {
          metadata: {
            porto_servicos_type:
              "custom_credit",

            provider_user_id:
              provider.user_id,

            custom_credit_order_id:
              order.id,
          },
        },
      });

    if (!session.url) {
      throw new Error(
        "O Stripe criou a sessão, mas não retornou a URL do Checkout.",
      );
    }

    /*
     * Vinculamos a sessão Stripe ao pedido
     * interno antes de devolver a URL.
     */
    const {
      error: updateOrderError,
    } = await supabaseAdmin
      .from(
        "partner_custom_credit_orders",
      )
      .update({
        stripe_checkout_session_id:
          session.id,

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq(
        "provider_user_id",
        provider.user_id,
      );

    if (updateOrderError) {
      /*
       * Se não conseguirmos vincular o pedido,
       * não permitimos continuar com a sessão.
       */
      try {
        await stripe.checkout.sessions.expire(
          session.id,
        );
      } catch (expireError) {
        console.error(
          "Também não foi possível expirar a sessão Stripe:",
          expireError,
        );
      }

      throw new Error(
        `Não foi possível vincular o pagamento ao pedido: ${updateOrderError.message}`,
      );
    }

    return {
      session,
      order,
    };
  } catch (error) {
    /*
     * Se o Checkout falhar antes de ser entregue
     * ao parceiro, marcamos o pedido como failed.
     */
    const {
      error: failOrderError,
    } = await supabaseAdmin
      .from(
        "partner_custom_credit_orders",
      )
      .update({
        status: "failed",

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("status", "pending");

    if (failOrderError) {
      console.error(
        "Não foi possível marcar o pedido como failed:",
        failOrderError,
      );
    }

    throw error;
  }
}

/*
 * ============================================================
 * FLUXO ANTIGO
 * PACOTES FIXOS
 *
 * Mantido TEMPORARIAMENTE para que a página atual
 * continue funcionando durante a migração visual.
 * ============================================================
 */

async function createLegacyCreditCheckout({
  itemId,
  provider,
  customerId,
  baseUrl,
}: {
  itemId: string;
  provider: ProviderProfile;
  customerId: string;
  baseUrl: string;
}) {
  const {
    data: creditPackage,
    error: packageError,
  } = await supabaseAdmin
    .from(
      "partner_credit_packages",
    )
    .select(
      "id, name, slug, credits, price_cents, stripe_price_id, is_active",
    )
    .eq("id", itemId)
    .eq("is_active", true)
    .maybeSingle();

  if (packageError) {
    throw new Error(
      `Não foi possível carregar o pacote de créditos: ${packageError.message}`,
    );
  }

  if (!creditPackage) {
    throw new Error(
      "O pacote selecionado não existe ou não está disponível.",
    );
  }

  if (!creditPackage.stripe_price_id) {
    throw new Error(
      "Este pacote ainda não foi sincronizado com o Stripe.",
    );
  }

  const session =
    await stripe.checkout.sessions.create({
      mode: "payment",

      customer: customerId,

      line_items: [
        {
          price:
            creditPackage.stripe_price_id,

          quantity: 1,
        },
      ],

      success_url:
        `${baseUrl}/protected/prestador` +
        "?checkout=success" +
        "&session_id={CHECKOUT_SESSION_ID}" +
        "#comprar-creditos",

      cancel_url:
        `${baseUrl}/protected/prestador` +
        "?checkout=canceled" +
        "#comprar-creditos",

      allow_promotion_codes:
        false,

      billing_address_collection:
        "auto",

      client_reference_id:
        provider.user_id,

      metadata: {
        porto_servicos_type:
          "credit_package",

        provider_user_id:
          provider.user_id,

        credit_package_id:
          creditPackage.id,

        credit_package_slug:
          creditPackage.slug,

        credits: String(
          creditPackage.credits,
        ),
      },

      payment_intent_data: {
        metadata: {
          porto_servicos_type:
            "credit_package",

          provider_user_id:
            provider.user_id,

          credit_package_id:
            creditPackage.id,

          credit_package_slug:
            creditPackage.slug,

          credits: String(
            creditPackage.credits,
          ),
        },
      },
    });

  if (!session.url) {
    throw new Error(
      "O Stripe criou a sessão, mas não retornou a URL do Checkout.",
    );
  }

  return session;
}

/*
 * ============================================================
 * POST
 * ============================================================
 */

export async function POST(
  request: NextRequest,
) {
  try {
    /*
     * 1. Confirma sessão autenticada.
     */
    const supabase =
      await createClient();

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Você precisa estar autenticado para continuar.",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * 2. Lê o corpo.
     */
    let body: CheckoutBody;

    try {
      body =
        (await request.json()) as CheckoutBody;
    } catch {
      return NextResponse.json(
        {
          success: false,

          message:
            "Dados do Checkout inválidos.",
        },
        {
          status: 400,
        },
      );
    }

    const type =
      body.type;

    if (
      type !== "credit_package" &&
      type !== "custom_credit"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Tipo de Checkout inválido.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * 3. Confirma parceiro aprovado.
     */
    const {
      data: providerData,
      error: providerError,
    } = await supabaseAdmin
      .from("provider_profiles")
      .select(
        "user_id, business_name, status",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (providerError) {
      throw new Error(
        `Não foi possível validar o parceiro: ${providerError.message}`,
      );
    }

    if (!providerData) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Seu cadastro de parceiro não foi encontrado.",
        },
        {
          status: 403,
        },
      );
    }

    const provider =
      providerData as ProviderProfile;

    if (
      provider.status !== "approved"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Somente parceiros aprovados podem comprar créditos.",
        },
        {
          status: 403,
        },
      );
    }

    if (!user.email) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Sua conta não possui um e-mail válido para cobrança.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * 4. Recupera ou cria o Customer Stripe.
     */
    const customer =
      await getOrCreateStripeCustomer({
        provider,
        email: user.email,
      });

    const baseUrl =
      getBaseUrl(request);

    /*
     * ========================================================
     * NOVO CHECKOUT PERSONALIZADO
     * ========================================================
     */
    if (type === "custom_credit") {
      const credits =
        normalizeCredits(
          body.credits,
        );

      if (credits === null) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Informe uma quantidade válida de créditos.",
          },
          {
            status: 400,
          },
        );
      }

      if (credits < 10) {
        return NextResponse.json(
          {
            success: false,

            message:
              "A compra mínima é de 10 créditos.",
          },
          {
            status: 400,
          },
        );
      }

      if (credits > 5000) {
        return NextResponse.json(
          {
            success: false,

            message:
              "A compra máxima é de 5.000 créditos por operação.",
          },
          {
            status: 400,
          },
        );
      }

      const {
        session,
        order,
      } =
        await createCustomCreditCheckout({
          credits,
          provider,

          customerId:
            customer.id,

          baseUrl,
        });

      return NextResponse.json(
        {
          success: true,

          url:
            session.url,

          sessionId:
            session.id,

          orderId:
            order.id,

          credits:
            order.credits,

          totalPriceCents:
            order.total_price_cents,

          pricePerCreditCents:
            order.price_per_credit_cents,

          pricingTier:
            order.pricing_tier_label,
        },
        {
          status: 200,
        },
      );
    }

    /*
     * ========================================================
     * CHECKOUT LEGADO DE PACOTE
     *
     * Será removido somente depois que o novo contador
     * estiver funcionando de ponta a ponta.
     * ========================================================
     */

    const itemId =
      typeof body.itemId === "string"
        ? body.itemId.trim()
        : "";

    if (!itemId) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Nenhum pacote de créditos foi selecionado.",
        },
        {
          status: 400,
        },
      );
    }

    const session =
      await createLegacyCreditCheckout({
        itemId,
        provider,

        customerId:
          customer.id,

        baseUrl,
      });

    return NextResponse.json(
      {
        success: true,

        url:
          session.url,

        sessionId:
          session.id,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Erro ao criar Stripe Checkout:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Não foi possível iniciar o pagamento.",
      },
      {
        status: 500,
      },
    );
  }
}