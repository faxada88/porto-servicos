"use client";

import {
  Check,
  Coins,
  Loader2,
  PartyPopper,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type CheckoutStatus =
  | "idle"
  | "checking"
  | "processing"
  | "success"
  | "error";

type StatusResponse = {
  ok?: boolean;
  status?:
    | "credited"
    | "processing"
    | "pending";
  paymentStatus?: string;
  credits?: number;
  balance?: number | null;
  creditedAt?: string;
  error?: string;
};

const MAX_ATTEMPTS = 20;
const POLL_INTERVAL_MS = 1500;

export default function CreditPurchaseSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mounted, setMounted] =
    useState(false);

  const [status, setStatus] =
    useState<CheckoutStatus>("idle");

  const [credits, setCredits] =
    useState<number | null>(null);

  const [balance, setBalance] =
    useState<number | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const timeoutRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  const attemptsRef = useRef(0);
  const requestRunningRef =
    useRef(false);

  const checkout =
    searchParams.get("checkout");

  const orderId =
    searchParams.get("order_id");

  const sessionId =
    searchParams.get("session_id");

  const isValidReturn =
    checkout === "success" &&
    Boolean(orderId) &&
    Boolean(sessionId);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const cleanUrl = useCallback(() => {
    router.replace(
      "/protected/prestador#comprar-creditos",
      {
        scroll: false,
      },
    );
  }, [router]);

  const close = useCallback(() => {
    clearTimer();
    setStatus("idle");
    cleanUrl();
  }, [cleanUrl, clearTimer]);

  useEffect(() => {
    setMounted(true);

    return () => {
      setMounted(false);
    };
  }, []);

  useEffect(() => {
    if (
      !mounted ||
      !isValidReturn ||
      !orderId ||
      !sessionId
    ) {
      return;
    }

    let disposed = false;

    attemptsRef.current = 0;
    requestRunningRef.current = false;

    setStatus("checking");
    setCredits(null);
    setBalance(null);
    setError(null);

    async function checkStatus() {
      if (
        disposed ||
        requestRunningRef.current
      ) {
        return;
      }

      if (
        attemptsRef.current >=
        MAX_ATTEMPTS
      ) {
        setError(
          "O pagamento foi recebido, mas a atualização da carteira está levando mais tempo que o esperado. Você pode tentar confirmar novamente sem realizar outro pagamento.",
        );
        setStatus("error");
        return;
      }

      attemptsRef.current += 1;
      requestRunningRef.current = true;

      try {
        const params =
          new URLSearchParams({
            order_id: orderId,
            session_id: sessionId,
          });

        const response = await fetch(
          `/api/stripe/checkout/status?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
            credentials: "same-origin",
            headers: {
              Accept: "application/json",
            },
          },
        );

        const data =
          (await response.json()) as StatusResponse;

        if (disposed) {
          return;
        }

        if (!response.ok || !data.ok) {
          throw new Error(
            data.error ||
              "Não foi possível confirmar sua compra.",
          );
        }

        if (
          data.status === "credited" &&
          typeof data.credits ===
            "number" &&
          typeof data.balance ===
            "number"
        ) {
          clearTimer();

          setCredits(data.credits);
          setBalance(data.balance);
          setError(null);
          setStatus("success");

          /*
           * Só atualizamos os Server Components
           * depois de o backend confirmar que
           * a carteira realmente foi creditada.
           */
          router.refresh();

          return;
        }

        if (
          data.status === "processing" ||
          data.status === "pending"
        ) {
          setStatus("processing");

          timeoutRef.current =
            setTimeout(() => {
              void checkStatus();
            }, POLL_INTERVAL_MS);

          return;
        }

        throw new Error(
          "O status retornado para esta compra não é válido.",
        );
      } catch (requestError) {
        if (disposed) {
          return;
        }

        /*
         * Falhas transitórias de rede/API também
         * recebem novas tentativas. Isso evita
         * transformar um pequeno atraso em erro
         * definitivo para o parceiro.
         */
        if (
          attemptsRef.current <
          MAX_ATTEMPTS
        ) {
          setStatus("processing");

          timeoutRef.current =
            setTimeout(() => {
              void checkStatus();
            }, POLL_INTERVAL_MS);

          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Não foi possível confirmar sua compra.",
        );

        setStatus("error");
      } finally {
        requestRunningRef.current =
          false;
      }
    }

    void checkStatus();

    return () => {
      disposed = true;
      requestRunningRef.current = false;
      clearTimer();
    };
  }, [
    clearTimer,
    isValidReturn,
    mounted,
    orderId,
    router,
    sessionId,
  ]);

  useEffect(() => {
    if (
      status === "idle" ||
      !mounted
    ) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [mounted, status]);

  useEffect(() => {
    if (
      status !== "success" &&
      status !== "error"
    ) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        close();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [close, status]);

  function retry() {
    /*
     * Mantemos os mesmos order_id/session_id.
     * Nenhum novo Checkout é criado.
     */
    attemptsRef.current = 0;
    requestRunningRef.current = false;
    setError(null);

    /*
     * Alterar para checking provoca uma nova
     * montagem lógica por meio da chave abaixo.
     * Para garantir uma nova consulta sem
     * duplicar compra, recarregamos a URL atual.
     */
    setStatus("checking");
    window.location.reload();
  }

  if (
    !mounted ||
    !isValidReturn ||
    status === "idle"
  ) {
    return null;
  }

  const isWaiting =
    status === "checking" ||
    status === "processing";

  const modal = (
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
      "
      role="dialog"
      aria-modal="true"
      aria-labelledby="credit-success-title"
    >
      <div
        className="
          relative
          my-auto
          w-full
          max-w-[520px]
          overflow-hidden
          rounded-[26px]
          border
          border-white/70
          bg-white
          shadow-[0_40px_120px_-30px_rgba(0,25,18,0.7)]
          sm:rounded-[34px]
        "
      >
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

        {(status === "success" ||
          status === "error") && (
          <button
            type="button"
            onClick={close}
            aria-label="Fechar"
            className="
              absolute
              right-4
              top-5
              z-20
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-full
              border
              border-[#dce7e0]
              bg-white/95
              text-[#627168]
              shadow-sm
              transition
              hover:bg-[#f4f8f5]
              sm:right-5
              sm:top-6
            "
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div
          className="
            max-h-[calc(100dvh-32px)]
            overflow-y-auto
            px-5
            pb-7
            pt-8
            sm:max-h-[calc(100dvh-48px)]
            sm:px-8
            sm:pb-8
            sm:pt-10
          "
        >
          {isWaiting ? (
            <div className="py-7 text-center">
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 animate-pulse rounded-full bg-[#e5f8ed]" />

                <div
                  className="
                    relative
                    flex
                    h-16
                    w-16
                    items-center
                    justify-center
                    rounded-full
                    bg-[#0c4934]
                    text-white
                    shadow-[0_18px_35px_-20px_rgba(12,73,52,0.8)]
                  "
                >
                  <Loader2 className="h-7 w-7 animate-spin" />
                </div>
              </div>

              <p className="mt-7 text-[9px] font-black uppercase tracking-[0.2em] text-[#16825a]">
                Pagamento aprovado
              </p>

              <h2
                id="credit-success-title"
                className="
                  mx-auto
                  mt-3
                  max-w-[390px]
                  text-[27px]
                  font-black
                  leading-[1.02]
                  tracking-[-0.055em]
                  text-[#102219]
                  sm:text-[31px]
                "
              >
                Estamos colocando seus créditos
                na carteira.
              </h2>

              <p className="mx-auto mt-4 max-w-[370px] text-xs font-medium leading-5 text-[#7d8981]">
                O pagamento já retornou para a
                Porto Serviços. Estamos aguardando
                a confirmação final da carteira.
              </p>

              <div
                className="
                  mx-auto
                  mt-7
                  flex
                  max-w-[330px]
                  items-center
                  justify-center
                  gap-2
                  rounded-[16px]
                  border
                  border-[#dfeae2]
                  bg-[#f6faf7]
                  px-4
                  py-3
                "
              >
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#16825a]" />

                <span className="text-[9px] font-bold text-[#65736a]">
                  Confirmação segura em andamento
                </span>
              </div>

              <p className="mt-4 text-[8px] font-semibold text-[#9aa49d]">
                Tentativa{" "}
                {Math.min(
                  attemptsRef.current,
                  MAX_ATTEMPTS,
                )}{" "}
                de {MAX_ATTEMPTS}
              </p>
            </div>
          ) : null}

          {status === "success" ? (
            <div className="text-center">
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[#e3f8eb]" />

                <div
                  className="
                    absolute
                    -left-1
                    top-2
                    flex
                    h-7
                    w-7
                    -rotate-12
                    items-center
                    justify-center
                    rounded-full
                    bg-[#f4c542]
                    text-[#624c00]
                    shadow-md
                  "
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </div>

                <div
                  className="
                    absolute
                    -right-1
                    bottom-3
                    flex
                    h-7
                    w-7
                    rotate-12
                    items-center
                    justify-center
                    rounded-full
                    bg-[#00a7a5]
                    text-white
                    shadow-md
                  "
                >
                  <PartyPopper className="h-3.5 w-3.5" />
                </div>

                <div
                  className="
                    relative
                    flex
                    h-[70px]
                    w-[70px]
                    items-center
                    justify-center
                    rounded-full
                    bg-[#0d744f]
                    text-white
                    shadow-[0_22px_45px_-22px_rgba(13,116,79,0.75)]
                  "
                >
                  <Check className="h-8 w-8 stroke-[3]" />
                </div>
              </div>

              <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#16825a]">
                Tudo certo
              </p>

              <h2
                id="credit-success-title"
                className="
                  mt-3
                  text-[34px]
                  font-black
                  leading-none
                  tracking-[-0.065em]
                  text-[#102219]
                  sm:text-[40px]
                "
              >
                Uhuu! 🎉
              </h2>

              <p className="mx-auto mt-4 max-w-sm text-sm font-semibold leading-6 text-[#65736a]">
                <strong className="font-black text-[#16825a]">
                  +{credits} créditos
                </strong>{" "}
                foram adicionados à sua carteira.
              </p>

              <div
                className="
                  mt-7
                  overflow-hidden
                  rounded-[24px]
                  border
                  border-[#dce9e0]
                  bg-[#f3faf6]
                "
              >
                <div className="flex items-center justify-center gap-3 px-5 py-6">
                  <div
                    className="
                      flex
                      h-11
                      w-11
                      items-center
                      justify-center
                      rounded-[15px]
                      bg-white
                      text-[#16825a]
                      shadow-sm
                    "
                  >
                    <Coins className="h-5 w-5" />
                  </div>

                  <div className="text-left">
                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#859188]">
                      Seu novo saldo
                    </p>

                    <p className="mt-1 text-[24px] font-black leading-none tracking-[-0.05em] text-[#174c36]">
                      {balance} créditos
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#dfeae2] bg-white/65 px-5 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#16825a]" />

                    <p className="text-[9px] font-bold text-[#748178]">
                      Pagamento confirmado e
                      carteira atualizada
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={close}
                className="
                  mt-6
                  flex
                  min-h-12
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-[17px]
                  bg-[#0c4934]
                  px-5
                  py-3
                  text-xs
                  font-black
                  text-white
                  shadow-[0_18px_35px_-22px_rgba(12,73,52,0.75)]
                  transition
                  hover:-translate-y-0.5
                  hover:bg-[#0e5a3f]
                "
              >
                <Sparkles className="h-4 w-4" />

                Continuar na Central
              </button>

              <p className="mt-4 text-[9px] font-semibold text-[#98a199]">
                Use seus créditos somente nas
                oportunidades que quiser
                desbloquear.
              </p>
            </div>
          ) : null}

          {status === "error" ? (
            <div className="py-3 text-center">
              <div
                className="
                  mx-auto
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-full
                  bg-[#fff4e8]
                  text-[#a66319]
                "
              >
                <RefreshCw className="h-6 w-6" />
              </div>

              <p className="mt-6 text-[9px] font-black uppercase tracking-[0.18em] text-[#a66319]">
                Confirmação demorando
              </p>

              <h2
                id="credit-success-title"
                className="
                  mx-auto
                  mt-3
                  max-w-sm
                  text-[26px]
                  font-black
                  leading-[1.03]
                  tracking-[-0.05em]
                  text-[#102219]
                "
              >
                Vamos consultar sua compra
                novamente.
              </h2>

              <p className="mx-auto mt-4 max-w-sm text-xs font-medium leading-5 text-[#7d8981]">
                {error}
              </p>

              <div
                className="
                  mt-6
                  rounded-[18px]
                  border
                  border-[#eadfce]
                  bg-[#fffaf4]
                  px-4
                  py-3
                "
              >
                <p className="text-[9px] font-bold leading-4 text-[#846c4f]">
                  Este botão não realiza uma nova
                  cobrança. Ele consulta somente o
                  pagamento que você já realizou.
                </p>
              </div>

              <button
                type="button"
                onClick={retry}
                className="
                  mt-6
                  flex
                  min-h-12
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-[16px]
                  bg-[#0c4934]
                  px-5
                  py-3
                  text-xs
                  font-black
                  text-white
                  transition
                  hover:bg-[#0e5a3f]
                "
              >
                <RefreshCw className="h-4 w-4" />

                Confirmar novamente
              </button>

              <button
                type="button"
                onClick={close}
                className="
                  mt-2
                  min-h-11
                  w-full
                  rounded-[15px]
                  px-5
                  text-[10px]
                  font-black
                  text-[#65736a]
                  transition
                  hover:bg-[#f4f7f5]
                "
              >
                Voltar para a Central
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(
    modal,
    document.body,
  );
}