import { NextResponse } from "next/server";
import Stripe from "stripe";

import { stripe } from "@/lib/stripe/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type PartnerPlan = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthly_price_cents: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
};

type CreditPackage = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  credits: number;
  price_cents: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
};

type SyncResult = {
  id: string;
  name: string;
  type: "subscription" | "credit_package";
  stripeProductId: string;
  stripePriceId: string;
  reusedProduct: boolean;
  reusedPrice: boolean;
};

async function verifyAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      authorized: false,
      status: 401,
    };
  }

  const { data: role, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleError || role?.role !== "admin") {
    return {
      authorized: false,
      status: 403,
    };
  }

  return {
    authorized: true,
    status: 200,
  };
}

async function findStripeProduct(
  internalId: string,
  type: "subscription" | "credit_package",
) {
  const query = [
    `metadata["internal_id"]:"${internalId}"`,
    `metadata["porto_servicos_type"]:"${type}"`,
  ].join(" AND ");

  const result = await stripe.products.search({
    query,
    limit: 10,
  });

  return result.data.find((product) => product.active) ?? null;
}

async function retrieveValidProduct(
  productId: string | null,
): Promise<Stripe.Product | null> {
  if (!productId) {
    return null;
  }

  try {
    const product = await stripe.products.retrieve(productId);

    if (product.deleted || !product.active) {
      return null;
    }

    return product;
  } catch {
    return null;
  }
}

async function retrieveValidPrice(
  priceId: string | null,
  expectedProductId: string,
): Promise<Stripe.Price | null> {
  if (!priceId) {
    return null;
  }

  try {
    const price = await stripe.prices.retrieve(priceId);

    const priceProductId =
      typeof price.product === "string"
        ? price.product
        : price.product.id;

    if (!price.active || priceProductId !== expectedProductId) {
      return null;
    }

    return price;
  } catch {
    return null;
  }
}

async function findMatchingPrice({
  productId,
  amount,
  recurring,
}: {
  productId: string;
  amount: number;
  recurring: boolean;
}) {
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  });

  return (
    prices.data.find((price) => {
      const sameAmount =
        price.unit_amount === amount &&
        price.currency.toLowerCase() === "brl";

      if (!sameAmount) {
        return false;
      }

      if (recurring) {
        return (
          price.type === "recurring" &&
          price.recurring?.interval === "month" &&
          price.recurring?.interval_count === 1
        );
      }

      return price.type === "one_time";
    }) ?? null
  );
}

async function syncPlan(plan: PartnerPlan): Promise<SyncResult> {
  let reusedProduct = false;
  let reusedPrice = false;

  let product = await retrieveValidProduct(
    plan.stripe_product_id,
  );

  if (product) {
    reusedProduct = true;
  }

  if (!product) {
    product = await findStripeProduct(
      plan.id,
      "subscription",
    );

    if (product) {
      reusedProduct = true;
    }
  }

  if (!product) {
    product = await stripe.products.create(
      {
        name: `Porto Serviços — ${plan.name}`,
        description:
          plan.description ||
          `Plano ${plan.name} da Porto Serviços.`,
        metadata: {
          porto_servicos_type: "subscription",
          internal_id: plan.id,
          slug: plan.slug,
        },
      },
      {
        idempotencyKey: `porto-servicos-product-plan-${plan.id}`,
      },
    );
  }

  let price = await retrieveValidPrice(
    plan.stripe_price_id,
    product.id,
  );

  if (
    price &&
    price.unit_amount === plan.monthly_price_cents &&
    price.currency.toLowerCase() === "brl" &&
    price.type === "recurring" &&
    price.recurring?.interval === "month" &&
    price.recurring?.interval_count === 1
  ) {
    reusedPrice = true;
  } else {
    price = null;
  }

  if (!price) {
    price = await findMatchingPrice({
      productId: product.id,
      amount: plan.monthly_price_cents,
      recurring: true,
    });

    if (price) {
      reusedPrice = true;
    }
  }

  if (!price) {
    price = await stripe.prices.create(
      {
        product: product.id,
        currency: "brl",
        unit_amount: plan.monthly_price_cents,
        recurring: {
          interval: "month",
        },
        metadata: {
          porto_servicos_type: "subscription",
          internal_id: plan.id,
          slug: plan.slug,
        },
      },
      {
        idempotencyKey:
          `porto-servicos-price-plan-${plan.id}-${plan.monthly_price_cents}`,
      },
    );
  }

  const { error } = await supabaseAdmin
    .from("partner_plans")
    .update({
      stripe_product_id: product.id,
      stripe_price_id: price.id,
    })
    .eq("id", plan.id);

  if (error) {
    throw new Error(
      `Falha ao salvar o plano ${plan.name} no Supabase: ${error.message}`,
    );
  }

  return {
    id: plan.id,
    name: plan.name,
    type: "subscription",
    stripeProductId: product.id,
    stripePriceId: price.id,
    reusedProduct,
    reusedPrice,
  };
}

async function syncCreditPackage(
  creditPackage: CreditPackage,
): Promise<SyncResult> {
  let reusedProduct = false;
  let reusedPrice = false;

  let product = await retrieveValidProduct(
    creditPackage.stripe_product_id,
  );

  if (product) {
    reusedProduct = true;
  }

  if (!product) {
    product = await findStripeProduct(
      creditPackage.id,
      "credit_package",
    );

    if (product) {
      reusedProduct = true;
    }
  }

  if (!product) {
    product = await stripe.products.create(
      {
        name: `Porto Serviços — ${creditPackage.name}`,
        description:
          creditPackage.description ||
          `${creditPackage.credits} créditos para oportunidades na Porto Serviços.`,
        metadata: {
          porto_servicos_type: "credit_package",
          internal_id: creditPackage.id,
          slug: creditPackage.slug,
          credits: String(creditPackage.credits),
        },
      },
      {
        idempotencyKey:
          `porto-servicos-product-credit-package-${creditPackage.id}`,
      },
    );
  }

  let price = await retrieveValidPrice(
    creditPackage.stripe_price_id,
    product.id,
  );

  if (
    price &&
    price.unit_amount === creditPackage.price_cents &&
    price.currency.toLowerCase() === "brl" &&
    price.type === "one_time"
  ) {
    reusedPrice = true;
  } else {
    price = null;
  }

  if (!price) {
    price = await findMatchingPrice({
      productId: product.id,
      amount: creditPackage.price_cents,
      recurring: false,
    });

    if (price) {
      reusedPrice = true;
    }
  }

  if (!price) {
    price = await stripe.prices.create(
      {
        product: product.id,
        currency: "brl",
        unit_amount: creditPackage.price_cents,
        metadata: {
          porto_servicos_type: "credit_package",
          internal_id: creditPackage.id,
          slug: creditPackage.slug,
          credits: String(creditPackage.credits),
        },
      },
      {
        idempotencyKey:
          `porto-servicos-price-credit-package-${creditPackage.id}-${creditPackage.price_cents}`,
      },
    );
  }

  const { error } = await supabaseAdmin
    .from("partner_credit_packages")
    .update({
      stripe_product_id: product.id,
      stripe_price_id: price.id,
    })
    .eq("id", creditPackage.id);

  if (error) {
    throw new Error(
      `Falha ao salvar o pacote ${creditPackage.name} no Supabase: ${error.message}`,
    );
  }

  return {
    id: creditPackage.id,
    name: creditPackage.name,
    type: "credit_package",
    stripeProductId: product.id,
    stripePriceId: price.id,
    reusedProduct,
    reusedPrice,
  };
}

export async function POST() {
  try {
    const admin = await verifyAdmin();

    if (!admin.authorized) {
      return NextResponse.json(
        {
          success: false,
          message:
            admin.status === 401
              ? "Autenticação necessária."
              : "Acesso permitido apenas para administradores.",
        },
        {
          status: admin.status,
        },
      );
    }

    const [
      { data: plans, error: plansError },
      { data: packages, error: packagesError },
    ] = await Promise.all([
      supabaseAdmin
        .from("partner_plans")
        .select(
          "id, name, slug, description, monthly_price_cents, stripe_product_id, stripe_price_id",
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),

      supabaseAdmin
        .from("partner_credit_packages")
        .select(
          "id, name, slug, description, credits, price_cents, stripe_product_id, stripe_price_id",
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

    if (plansError) {
      throw new Error(
        `Não foi possível carregar os planos: ${plansError.message}`,
      );
    }

    if (packagesError) {
      throw new Error(
        `Não foi possível carregar os pacotes: ${packagesError.message}`,
      );
    }

    const typedPlans = (plans ?? []) as PartnerPlan[];
    const typedPackages = (packages ?? []) as CreditPackage[];

    if (typedPlans.length === 0) {
      throw new Error(
        "Nenhum plano ativo foi encontrado para sincronização.",
      );
    }

    if (typedPackages.length === 0) {
      throw new Error(
        "Nenhum pacote de créditos ativo foi encontrado para sincronização.",
      );
    }

    const results: SyncResult[] = [];

    for (const plan of typedPlans) {
      results.push(await syncPlan(plan));
    }

    for (const creditPackage of typedPackages) {
      results.push(await syncCreditPackage(creditPackage));
    }

    return NextResponse.json({
      success: true,
      message: "Catálogo Stripe sincronizado com sucesso.",
      environment: "test",
      totals: {
        plans: typedPlans.length,
        creditPackages: typedPackages.length,
        items: results.length,
      },
      results,
    });
  } catch (error) {
    console.error("Erro ao sincronizar catálogo Stripe:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível sincronizar o catálogo Stripe.",
      },
      {
        status: 500,
      },
    );
  }
}