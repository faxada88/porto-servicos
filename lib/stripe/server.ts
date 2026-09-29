import "server-only";

import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error(
    "STRIPE_SECRET_KEY não está configurada nas variáveis de ambiente.",
  );
}

export const stripe = new Stripe(stripeSecretKey);