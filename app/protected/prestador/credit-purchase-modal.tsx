"use client";

import {
  Check,
  ChevronRight,
  Coins,
  CreditCard,
  Loader2,
  LockKeyhole,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";

type CreditPurchaseModalProps = {
  currentBalance: number;
};

type PricingPreview = {
  pricePerCreditCents: number;
  tierLabel: string;
  totalPriceCents: number;
  savingPercent: number;
};

type CheckoutResponse = {
  url?: string;
  error?: string;
};

const MIN_CREDITS = 10;
const MAX_CREDITS = 5000;
const STEP = 10;

const QUICK_AMOUNTS = [
  10,
  30,
  50,
  100,
  200,
  500,
];

function normalizeToStep(value: number) {
  if (!Number.isFinite(value)) {
    return MIN_CREDITS;
  }

  const rounded =
    Math.round(value / STEP) * STEP;

  return Math.min(
    MAX_CREDITS,
    Math.max(MIN_CREDITS, rounded),
  );
}

function getPricingPreview(
  credits: number,
): PricingPreview {
  let pricePerCreditCents = 299;
  let tierLabel = "Começar";

  if (credits >= 500) {
    pricePerCreditCents = 180;
    tierLabel = "Alta demanda";
  } else if (credits >= 200) {
    pricePerCreditCents = 200;
    tierLabel = "Negócios";
  } else if (credits >= 75) {
    pricePerCreditCents = 240;
    tierLabel = "Profissional";
  } else if (credits >= 30) {
    pricePerCreditCents = 267;
    tierLabel = "Essencial";
  }

  const totalPriceCents =
    credits * pricePerCreditCents;

  const savingPercent = Math.max(
    0,
    Math.round(
      ((299 - pricePerCreditCents) / 299) *
        100,
    ),
  );

  return {
    pricePerCreditCents,
    tierLabel,
    totalPriceCents,
    savingPercent,
  };
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export default function CreditPurchaseModal({
  currentBalance,
}: CreditPurchaseModalProps) {
  const [mounted, setMounted] =
    useState(false);

  const [isOpen, setIsOpen] =
    useState(false);

  const [credits, setCredits] =
    useState(50);

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const pricing = useMemo(
    () => getPricingPreview(credits),
    [credits],
  );

  const projectedBalance =
    currentBalance + credits;

  const canDecrease =
    credits > MIN_CREDITS;

  const canIncrease =
    credits < MAX_CREDITS;

  useEffect(() => {
    setMounted(true);

    return () => {
      setMounted(false);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape" &&
        !isLoading
      ) {
        setIsOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [isOpen, isLoading]);

  function openModal() {
    setCredits(50);
    setError(null);
    setIsLoading(false);
    setIsOpen(true);
  }

  function closeModal() {
    if (isLoading) {
      return;
    }

    setError(null);
    setIsOpen(false);
  }

  function updateCredits(
    value: number,
  ) {
    setCredits(
      normalizeToStep(value),
    );

    setError(null);
  }

  function handleInputChange(
    value: string,
  ) {
    const digits = value.replace(
      /\D/g,
      "",
    );

    if (!digits) {
      setCredits(MIN_CREDITS);
      return;
    }

    const parsed = Number(digits);

    setCredits(
      Math.min(
        MAX_CREDITS,
        Math.max(
          MIN_CREDITS,
          parsed,
        ),
      ),
    );

    setError(null);
  }

  function normalizeInputOnBlur() {
    setCredits((value) =>
      normalizeToStep(value),
    );
  }

  async function handleCheckout() {
    if (isLoading) {
      return;
    }

    const normalizedCredits =
      normalizeToStep(credits);

    setCredits(normalizedCredits);
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(
        "/api/stripe/checkout",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            type: "custom_credit",
            credits: normalizedCredits,
          }),
        },
      );

      const data =
        (await response.json()) as CheckoutResponse;

      if (
        !response.ok ||
        !data.url
      ) {
        throw new Error(
          data.error ||
            "Não foi possível iniciar o pagamento.",
        );
      }

      window.location.assign(data.url);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Não foi possível iniciar o pagamento.",
      );

      setIsLoading(false);
    }
  }

  const modal =
    mounted && isOpen
      ? createPortal(
          <div
            className="
              fixed
              inset-0
              z-[2147483647]
              flex
              items-center
              justify-center
              overflow-y-auto
              bg-[#061b15]/75
              p-3
              backdrop-blur-md
              sm:p-5
              lg:p-8
            "
            role="dialog"
            aria-modal="true"
            aria-labelledby="credit-modal-title"
            onMouseDown={(event) => {
              if (
                event.target ===
                  event.currentTarget &&
                !isLoading
              ) {
                closeModal();
              }
            }}
          >
            <div
              className="
                relative
                my-auto
                w-full
                max-w-[780px]
                overflow-hidden
                rounded-[24px]
                border
                border-white/70
                bg-white
                shadow-[0_40px_120px_-30px_rgba(0,25,18,0.7)]
                sm:rounded-[32px]
              "
            >
              {/* FITINHAS / BAHIA */}
              <div
                className="grid h-1.5 grid-cols-6 sm:h-2"
                aria-hidden="true"
              >
                <span className="bg-[#00a7a5]" />
                <span className="bg-[#f4c542]" />
                <span className="bg-[#f26b5b]" />
                <span className="bg-[#2d6cdf]" />
                <span className="bg-[#22a06b]" />
                <span className="bg-[#f59e0b]" />
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isLoading}
                aria-label="Fechar"
                className="
                  absolute
                  right-4
                  top-5
                  z-30
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-[#dce7e0]
                  bg-white/95
                  text-[#617067]
                  shadow-sm
                  backdrop-blur
                  transition
                  hover:bg-[#f3f8f5]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  sm:right-6
                  sm:top-6
                "
              >
                <X className="h-4 w-4" />
              </button>

              <div
                className="
                  max-h-[calc(100dvh-32px)]
                  overflow-y-auto
                  overscroll-contain
                  sm:max-h-[calc(100dvh-48px)]
                  lg:max-h-[calc(100dvh-64px)]
                "
              >
                {/* CABEÇALHO */}
                <header
                  className="
                    relative
                    overflow-hidden
                    border-b
                    border-[#e4ece7]
                    bg-[linear-gradient(135deg,#f7fcf9_0%,#edf9f4_55%,#f7fbf9_100%)]
                    px-5
                    pb-6
                    pt-7
                    sm:px-8
                    sm:pb-7
                    sm:pt-8
                  "
                >
                  <div
                    className="
                      pointer-events-none
                      absolute
                      -right-16
                      -top-24
                      h-64
                      w-64
                      rounded-full
                      bg-[#b7efd5]/45
                      blur-[75px]
                    "
                  />

                  <div className="relative pr-12">
                    <div
                      className="
                        inline-flex
                        items-center
                        gap-2
                        rounded-full
                        border
                        border-[#d7e9df]
                        bg-white/85
                        px-3
                        py-2
                        shadow-sm
                      "
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#16825a]" />

                      <span className="text-[9px] font-black uppercase tracking-[0.15em] text-[#16825a]">
                        Créditos sob medida
                      </span>
                    </div>

                    <h2
                      id="credit-modal-title"
                      className="
                        mt-4
                        max-w-[570px]
                        text-[26px]
                        font-black
                        leading-[1.02]
                        tracking-[-0.055em]
                        text-[#102219]
                        sm:text-[34px]
                      "
                    >
                      Escolha quanto quer colocar
                      na sua carteira.
                    </h2>

                    <p
                      className="
                        mt-3
                        max-w-[580px]
                        text-xs
                        font-medium
                        leading-5
                        text-[#6f7d74]
                        sm:text-sm
                        sm:leading-6
                      "
                    >
                      Sem mensalidade e sem pacotes
                      obrigatórios. Adicione
                      créditos quando precisar e
                      use somente nas oportunidades
                      que quiser desbloquear.
                    </p>
                  </div>
                </header>

                {/* CONTEÚDO */}
                <div className="px-4 py-5 sm:px-8 sm:py-7">
                  {/* CARTEIRA */}
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    <div
                      className="
                        min-w-0
                        rounded-[18px]
                        border
                        border-[#dfe8e2]
                        bg-white
                        p-4
                        sm:p-5
                      "
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="
                            flex
                            h-8
                            w-8
                            shrink-0
                            items-center
                            justify-center
                            rounded-[10px]
                            bg-[#edf7f1]
                            text-[#16825a]
                          "
                        >
                          <Coins className="h-4 w-4" />
                        </div>

                        <p className="truncate text-[8px] font-black uppercase tracking-[0.14em] text-[#849087]">
                          Saldo atual
                        </p>
                      </div>

                      <p className="mt-3 break-words text-xl font-black tracking-[-0.04em] text-[#173e30] sm:text-2xl">
                        {currentBalance}
                      </p>

                      <p className="mt-0.5 text-[9px] font-semibold text-[#8a958e]">
                        créditos disponíveis
                      </p>
                    </div>

                    <div
                      className="
                        min-w-0
                        rounded-[18px]
                        border
                        border-[#cce6d6]
                        bg-[#f1faf5]
                        p-4
                        sm:p-5
                      "
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="
                            flex
                            h-8
                            w-8
                            shrink-0
                            items-center
                            justify-center
                            rounded-[10px]
                            bg-white
                            text-[#16825a]
                          "
                        >
                          <Plus className="h-4 w-4" />
                        </div>

                        <p className="truncate text-[8px] font-black uppercase tracking-[0.14em] text-[#16825a]">
                          Após a compra
                        </p>
                      </div>

                      <p className="mt-3 break-words text-xl font-black tracking-[-0.04em] text-[#173e30] sm:text-2xl">
                        {projectedBalance}
                      </p>

                      <p className="mt-0.5 text-[9px] font-semibold text-[#718078]">
                        créditos disponíveis
                      </p>
                    </div>
                  </div>

                  {/* QUANTIDADE */}
                  <section
                    className="
                      mt-4
                      rounded-[22px]
                      border
                      border-[#dfe8e2]
                      bg-[#f8fbf9]
                      p-4
                      sm:p-5
                    "
                  >
                    <div
                      className="
                        flex
                        flex-col
                        gap-4
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                      "
                    >
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#7d8981]">
                          Quantidade
                        </p>

                        <p className="mt-1 text-[11px] font-semibold text-[#647168]">
                          Escolha entre 10 e 5.000
                          créditos
                        </p>
                      </div>

                      <div
                        className="
                          flex
                          w-full
                          items-center
                          rounded-[17px]
                          border
                          border-[#d5e3da]
                          bg-white
                          p-1.5
                          shadow-sm
                          sm:w-[300px]
                          sm:shrink-0
                        "
                      >
                        <button
                          type="button"
                          onClick={() =>
                            updateCredits(
                              credits - STEP,
                            )
                          }
                          disabled={
                            !canDecrease ||
                            isLoading
                          }
                          aria-label="Diminuir créditos"
                          className="
                            flex
                            h-11
                            w-11
                            shrink-0
                            items-center
                            justify-center
                            rounded-[12px]
                            bg-[#edf5f0]
                            text-[#174c36]
                            transition
                            hover:bg-[#e2eee6]
                            disabled:cursor-not-allowed
                            disabled:opacity-30
                          "
                        >
                          <Minus className="h-4 w-4" />
                        </button>

                        <div className="min-w-0 flex-1 px-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={credits}
                            onChange={(event) =>
                              handleInputChange(
                                event.target.value,
                              )
                            }
                            onBlur={
                              normalizeInputOnBlur
                            }
                            disabled={isLoading}
                            aria-label="Quantidade de créditos"
                            className="
                              w-full
                              min-w-0
                              bg-transparent
                              text-center
                              text-[24px]
                              font-black
                              tracking-[-0.05em]
                              text-[#143d2e]
                              outline-none
                              disabled:opacity-60
                            "
                          />

                          <p className="-mt-1 text-center text-[8px] font-black uppercase tracking-[0.12em] text-[#8c978f]">
                            créditos
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            updateCredits(
                              credits + STEP,
                            )
                          }
                          disabled={
                            !canIncrease ||
                            isLoading
                          }
                          aria-label="Aumentar créditos"
                          className="
                            flex
                            h-11
                            w-11
                            shrink-0
                            items-center
                            justify-center
                            rounded-[12px]
                            bg-[#0c4934]
                            text-white
                            transition
                            hover:bg-[#0e5a3f]
                            disabled:cursor-not-allowed
                            disabled:opacity-30
                          "
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* ATALHOS */}
                    <div className="mt-5">
                      <p className="mb-2.5 text-[8px] font-black uppercase tracking-[0.15em] text-[#89948d]">
                        Escolha rápida
                      </p>

                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                        {QUICK_AMOUNTS.map(
                          (amount) => {
                            const selected =
                              credits === amount;

                            return (
                              <button
                                key={amount}
                                type="button"
                                disabled={
                                  isLoading
                                }
                                onClick={() =>
                                  updateCredits(
                                    amount,
                                  )
                                }
                                className={[
                                  "min-h-10 rounded-[12px] border px-2 text-[10px] font-black transition",
                                  selected
                                    ? "border-[#0c4934] bg-[#0c4934] text-white shadow-sm"
                                    : "border-[#dce7df] bg-white text-[#526158] hover:border-[#91c4a7] hover:bg-[#f4faf6]",
                                  isLoading
                                    ? "cursor-not-allowed opacity-60"
                                    : "",
                                ].join(" ")}
                              >
                                {amount}
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </section>

                  {/* INFORMAÇÕES DE PREÇO */}
                  <div
                    className="
                      mt-4
                      grid
                      overflow-hidden
                      rounded-[20px]
                      border
                      border-[#dfe8e2]
                      bg-white
                      sm:grid-cols-3
                    "
                  >
                    <div className="border-b border-[#e6ece8] p-4 sm:border-b-0 sm:border-r">
                      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#89948d]">
                        Faixa atual
                      </p>

                      <div className="mt-2 flex items-center gap-2">
                        <Zap className="h-4 w-4 shrink-0 text-[#e1a51c]" />

                        <p className="text-sm font-black text-[#173e30]">
                          {pricing.tierLabel}
                        </p>
                      </div>
                    </div>

                    <div className="border-b border-[#e6ece8] p-4 sm:border-b-0 sm:border-r">
                      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#89948d]">
                        Por crédito
                      </p>

                      <p className="mt-2 text-sm font-black text-[#173e30]">
                        {formatMoney(
                          pricing.pricePerCreditCents,
                        )}
                      </p>
                    </div>

                    <div className="p-4">
                      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#89948d]">
                        Economia
                      </p>

                      <p className="mt-2 text-sm font-black text-[#16825a]">
                        {pricing.savingPercent >
                        0
                          ? `${pricing.savingPercent}% por volume`
                          : "Valor base"}
                      </p>
                    </div>
                  </div>

                  {error ? (
                    <div
                      role="alert"
                      className="
                        mt-4
                        rounded-[15px]
                        border
                        border-[#f0d1ca]
                        bg-[#fff5f2]
                        px-4
                        py-3
                        text-[11px]
                        font-bold
                        leading-5
                        text-[#9d4437]
                      "
                    >
                      {error}
                    </div>
                  ) : null}

                  {/* PAGAMENTO */}
                  <section
                    className="
                      mt-4
                      overflow-hidden
                      rounded-[22px]
                      bg-[#0b5b49]
                      text-white
                      shadow-[0_20px_45px_-30px_rgba(11,91,73,0.85)]
                    "
                  >
                    <div
                      className="
                        flex
                        flex-col
                        gap-5
                        p-4
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                        sm:p-5
                      "
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <LockKeyhole className="h-3.5 w-3.5 text-[#91e5bd]" />

                          <p className="text-[8px] font-black uppercase tracking-[0.15em] text-white/60">
                            Total estimado
                          </p>
                        </div>

                        <div className="mt-2 flex flex-wrap items-end gap-2.5">
                          <p className="text-[29px] font-black leading-none tracking-[-0.055em] sm:text-[33px]">
                            {formatMoney(
                              pricing.totalPriceCents,
                            )}
                          </p>

                          {pricing.savingPercent >
                          0 ? (
                            <span className="rounded-full bg-[#f4c542] px-2.5 py-1 text-[8px] font-black text-[#594600]">
                              -
                              {
                                pricing.savingPercent
                              }
                              %
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 text-[9px] font-semibold text-white/55">
                          Sem mensalidade e sem
                          renovação automática.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={
                          handleCheckout
                        }
                        disabled={isLoading}
                        className="
                          flex
                          min-h-12
                          w-full
                          shrink-0
                          items-center
                          justify-center
                          gap-2
                          rounded-[15px]
                          bg-white
                          px-5
                          py-3
                          text-[11px]
                          font-black
                          text-[#0b5b49]
                          shadow-[0_14px_28px_-18px_rgba(0,0,0,0.55)]
                          transition
                          hover:-translate-y-0.5
                          hover:bg-[#f2fff8]
                          disabled:cursor-not-allowed
                          disabled:opacity-65
                          sm:w-auto
                        "
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Preparando...
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4" />
                            Ir para pagamento
                            <ChevronRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </div>

                    <div
                      className="
                        grid
                        border-t
                        border-white/10
                        bg-black/10
                        sm:grid-cols-3
                      "
                    >
                      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-3 sm:border-b-0 sm:border-r">
                        <Check className="h-3.5 w-3.5 shrink-0 text-[#91e5bd]" />

                        <span className="text-[8px] font-bold text-white/70">
                          Sem mensalidade
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-3 sm:border-b-0 sm:border-r">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#91e5bd]" />

                        <span className="text-[8px] font-bold text-white/70">
                          Pagamento pelo Stripe
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 px-4 py-3">
                        <Coins className="h-3.5 w-3.5 shrink-0 text-[#91e5bd]" />

                        <span className="text-[8px] font-bold text-white/70">
                          Crédito após confirmação
                        </span>
                      </div>
                    </div>
                  </section>

                  <div className="mt-4 flex items-start justify-center gap-2 px-2 text-center">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16825a]" />

                    <p className="max-w-[540px] text-[8px] font-semibold leading-4 text-[#89948d]">
                      O preço oficial é confirmado
                      pelo servidor antes de abrir
                      o checkout. Os créditos só
                      entram na carteira após a
                      confirmação segura do
                      pagamento.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="
          group
          flex
          min-h-12
          w-full
          items-center
          justify-center
          gap-2
          rounded-2xl
          bg-[#0c4934]
          px-5
          py-3
          text-sm
          font-black
          text-white
          shadow-[0_16px_32px_-20px_rgba(12,73,52,0.75)]
          transition
          duration-200
          hover:-translate-y-0.5
          hover:bg-[#0e5a3f]
          focus:outline-none
          focus:ring-4
          focus:ring-[#0c4934]/15
          sm:w-auto
        "
      >
        <Plus className="h-4 w-4" />

        Adicionar créditos

        <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </button>

      {modal}
    </>
  );
}