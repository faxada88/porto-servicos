"use client";

import {
  CreditCard,
  LoaderCircle,
} from "lucide-react";
import { useState } from "react";

type CheckoutType =
  | "subscription"
  | "credit_package";

type CheckoutButtonProps = {
  type: CheckoutType;
  itemId: string;
  label: string;
  disabled?: boolean;
  variant?: "primary" | "secondary";
};

type CheckoutResponse = {
  url?: string;
  message?: string;
  error?: string;
};

export default function CheckoutButton({
  type,
  itemId,
  label,
  disabled = false,
  variant = "primary",
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  async function handleCheckout() {
    if (isLoading || disabled) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        "/api/stripe/checkout",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type,
            itemId,
          }),
        },
      );

      let data: CheckoutResponse = {};

      try {
        data =
          (await response.json()) as CheckoutResponse;
      } catch {
        throw new Error(
          "A resposta do servidor de pagamento é inválida.",
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Não foi possível iniciar o pagamento.",
        );
      }

      if (
        !data.url ||
        typeof data.url !== "string"
      ) {
        throw new Error(
          "O Stripe não retornou a página de pagamento.",
        );
      }

      /*
       * O redirecionamento é feito somente para a URL
       * retornada pelo nosso backend.
       *
       * Preço, quantidade de créditos e Price ID nunca são
       * enviados pelo navegador.
       */
      window.location.assign(data.url);
    } catch (error) {
      console.error(
        "Erro ao iniciar Stripe Checkout:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar o pagamento.",
      );

      setIsLoading(false);
    }
  }

  const buttonClasses =
    variant === "primary"
      ? "bg-[#173f2c] text-white hover:bg-[#123523] disabled:bg-[#9ba99f]"
      : "border border-[#dce4dd] bg-white text-[#26362b] hover:bg-[#f5f8f5] disabled:bg-[#f3f4f3] disabled:text-[#9aa19a]";

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={disabled || isLoading}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-[#173f2c]/25 focus:ring-offset-2 disabled:cursor-not-allowed ${buttonClasses}`}
      >
        {isLoading ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />

            <span>
              Abrindo pagamento...
            </span>
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" />

            <span>{label}</span>
          </>
        )}
      </button>

      {errorMessage ? (
        <div
          role="alert"
          className="mt-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2"
        >
          <p className="text-center text-[11px] font-bold leading-4 text-red-800">
            {errorMessage}
          </p>
        </div>
      ) : null}
    </div>
  );
}