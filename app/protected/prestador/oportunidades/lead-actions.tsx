"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type UnlockResult = {
  lead_id: string;
  lead_status: string;
  customer_name: string | null;
  customer_phone: string | null;
  credits_charged: number;
  remaining_balance: number;
  unlocked_at: string | null;
};

type LeadActionsProps = {
  leadId: string;
  creditCost: number;
  currentBalance: number;
  status: string;
};

type ModalKind = "unlock" | "decline" | null;

export default function LeadActions({
  leadId,
  creditCost,
  currentBalance,
  status,
}: LeadActionsProps) {
  const router = useRouter();

  const [loadingAction, setLoadingAction] = useState<
    "unlock" | "decline" | null
  >(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);

  const hasEnoughCredits = currentBalance >= creditCost;
  const isLoading = loadingAction !== null;

  const projectedBalance = Math.max(
    currentBalance - creditCost,
    0,
  );

  useEffect(() => {
    if (!modal) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isLoading) {
        setModal(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
      document.body.style.overflow = previousOverflow;
    };
  }, [modal, isLoading]);

  function openDeclineModal() {
    if (isLoading) {
      return;
    }

    setError(null);
    setSuccess(null);
    setModal("decline");
  }

  function openUnlockModal() {
    if (isLoading) {
      return;
    }

    if (!hasEnoughCredits) {
      setError(
        `Você precisa de ${creditCost} créditos para desbloquear este contato.`,
      );
      return;
    }

    setError(null);
    setSuccess(null);
    setModal("unlock");
  }

  function closeModal() {
    if (isLoading) {
      return;
    }

    setModal(null);
  }

  async function handleDecline() {
    if (isLoading) {
      return;
    }

    setLoadingAction("decline");
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClient();

      const { data, error: declineError } = await supabase.rpc(
        "decline_partner_lead",
        {
          target_lead_id: leadId,
        },
      );

      if (declineError) {
        throw declineError;
      }

      if (data !== true) {
        throw new Error(
          "Não foi possível confirmar a recusa da oportunidade.",
        );
      }

      setModal(null);
      setSuccess(
        "Oportunidade recusada. Nenhum crédito foi utilizado.",
      );

      router.refresh();
    } catch (caughtError) {
      console.error(
        "Erro ao recusar oportunidade:",
        caughtError,
      );

      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "";

      if (message.includes("LEAD_NOT_FOUND")) {
        setError(
          "Esta oportunidade não foi encontrada ou não pertence à sua conta.",
        );
      } else if (
        message.includes("LEAD_CANNOT_BE_DECLINED")
      ) {
        setError(
          "Esta oportunidade não pode mais ser recusada.",
        );
      } else if (message.includes("AUTH_REQUIRED")) {
        setError(
          "Sua sessão expirou. Entre novamente para continuar.",
        );
      } else {
        setError(
          "Não foi possível recusar esta oportunidade. Tente novamente.",
        );
      }

      setModal(null);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleUnlock() {
    if (isLoading) {
      return;
    }

    if (!hasEnoughCredits) {
      setError(
        `Você precisa de ${creditCost} créditos para desbloquear este contato.`,
      );
      return;
    }

    setLoadingAction("unlock");
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClient();

      const { data, error: unlockError } = await supabase.rpc(
        "unlock_partner_lead",
        {
          target_lead_id: leadId,
        },
      );

      if (unlockError) {
        throw unlockError;
      }

      const result = Array.isArray(data)
        ? (data[0] as UnlockResult | undefined)
        : undefined;

      if (!result) {
        throw new Error(
          "Nenhuma resposta foi recebida ao desbloquear a oportunidade.",
        );
      }

      if (
        result.lead_status === "insufficient_credits"
      ) {
        setModal(null);
        setError(
          `Saldo insuficiente. Seu saldo atual é de ${result.remaining_balance} créditos.`,
        );

        router.refresh();
        return;
      }

      if (result.lead_status !== "unlocked") {
        throw new Error(
          "A oportunidade não pôde ser desbloqueada.",
        );
      }

      if (
        !result.customer_name ||
        !result.customer_phone
      ) {
        throw new Error(
          "O contato foi desbloqueado, mas os dados não foram retornados corretamente.",
        );
      }

      setModal(null);

      if (result.credits_charged > 0) {
        setSuccess(
          `Contato desbloqueado com sucesso. ${result.credits_charged} créditos utilizados. Saldo restante: ${result.remaining_balance}.`,
        );
      } else {
        setSuccess(
          "Este contato já estava desbloqueado. Nenhum crédito adicional foi utilizado.",
        );
      }

      router.refresh();
    } catch (caughtError) {
      console.error(
        "Erro ao desbloquear oportunidade:",
        caughtError,
      );

      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "";

      if (message.includes("LEAD_NOT_FOUND")) {
        setError(
          "Esta oportunidade não foi encontrada ou não pertence à sua conta.",
        );
      } else if (
        message.includes("LEAD_NOT_AVAILABLE")
      ) {
        setError(
          "Esta oportunidade não está mais disponível para desbloqueio.",
        );
      } else if (message.includes("WALLET_NOT_FOUND")) {
        setError(
          "Sua carteira de créditos não foi encontrada.",
        );
      } else if (message.includes("AUTH_REQUIRED")) {
        setError(
          "Sua sessão expirou. Entre novamente para continuar.",
        );
      } else if (
        message.includes(
          "duplicate key value violates unique constraint",
        )
      ) {
        setError(
          "Esta oportunidade já possui uma cobrança registrada. Atualize a página para visualizar o contato.",
        );

        router.refresh();
      } else {
        setError(
          "Não foi possível desbloquear esta oportunidade. Tente novamente.",
        );
      }

      setModal(null);
    } finally {
      setLoadingAction(null);
    }
  }

  if (
    status !== "pending" &&
    status !== "insufficient_credits"
  ) {
    return null;
  }

  return (
    <>
      <div className="w-full">
        {error ? (
          <div className="mb-3 flex items-start gap-2.5 rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-white px-4 py-3.5 text-xs font-bold leading-5 text-red-800 shadow-sm">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-3 w-3 text-red-600" />
            </div>
            <span>{error}</span>
          </div>
        ) : null}

        {success ? (
          <div className="mb-3 flex items-start gap-2.5 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white px-4 py-3.5 text-xs font-bold leading-5 text-emerald-800 shadow-sm">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            </div>
            <span>{success}</span>
          </div>
        ) : null}

        <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={openDeclineModal}
            disabled={isLoading}
            className="group inline-flex h-11 items-center justify-center rounded-xl border border-[#dfe5df] bg-white px-5 text-xs font-black tracking-wide text-[#536159] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c8d2c9] hover:bg-[#f7f9f7] hover:text-[#2f3d35] hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            {loadingAction === "decline" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recusando...
              </>
            ) : (
              "Recusar"
            )}
          </button>

          {hasEnoughCredits ? (
            <button
              type="button"
              onClick={openUnlockModal}
              disabled={isLoading}
              className="group relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-[#174c36] to-[#0f3425] px-5 text-xs font-black tracking-wide text-white shadow-[0_8px_24px_-8px_rgba(23,76,54,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-8px_rgba(23,76,54,0.75)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

              {loadingAction === "unlock" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Desbloqueando...
                </>
              ) : (
                <>
                  <LockKeyhole className="h-4 w-4" />
                  Desbloquear por {creditCost} créditos
                </>
              )}
            </button>
          ) : (
            <Link
              href="/protected/prestador#comprar-creditos"
              className="group relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-[#174c36] to-[#0f3425] px-5 text-xs font-black tracking-wide text-white shadow-[0_8px_24px_-8px_rgba(23,76,54,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-8px_rgba(23,76,54,0.75)] active:translate-y-0"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <Coins className="h-4 w-4" />
              Comprar créditos
            </Link>
          )}
        </div>
      </div>

      {modal ? (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lead-modal-title"
        >
          <button
            type="button"
            aria-label="Fechar"
            onClick={closeModal}
            className="absolute inset-0 cursor-default bg-[#0b1a13]/70 backdrop-blur-md animate-[fadeIn_200ms_ease-out]"
          />

          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/60 bg-white shadow-[0_30px_80px_-20px_rgba(15,52,37,0.55)] animate-[modalIn_260ms_cubic-bezier(0.16,1,0.3,1)]">
            {modal === "unlock" ? (
              <>
                <div className="relative overflow-hidden bg-gradient-to-br from-[#174c36] via-[#123d2c] to-[#0b2a1e] px-6 pt-7 pb-8 text-white">
                  <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-[#8fe0b4]/20 blur-3xl" />

                  <div className="relative flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-inset ring-white/20 backdrop-blur-sm">
                      <LockKeyhole className="h-6 w-6 text-[#a8e9c6]" />
                    </div>

                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={isLoading}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Fechar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <h2
                    id="lead-modal-title"
                    className="relative mt-5 text-xl font-black tracking-tight"
                  >
                    Desbloquear contato
                  </h2>
                  <p className="relative mt-1.5 text-sm font-medium leading-relaxed text-white/70">
                    Você terá acesso imediato ao nome e telefone
                    deste cliente para entrar em contato.
                  </p>
                </div>

                <div className="px-6 pt-6">
                  <div className="rounded-2xl border border-[#e8ede9] bg-gradient-to-br from-[#f7faf8] to-white p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#174c36]/10">
                          <Coins className="h-5 w-5 text-[#174c36]" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#7a877e]">
                            Custo do desbloqueio
                          </span>
                          <span className="text-sm font-black text-[#1e2a22]">
                            {creditCost}{" "}
                            {creditCost === 1
                              ? "crédito"
                              : "créditos"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#7a877e]">
                          Saldo atual
                        </span>
                        <span className="text-sm font-black text-[#1e2a22]">
                          {currentBalance}
                        </span>
                      </div>
                    </div>

                    <div className="my-4 h-px w-full bg-gradient-to-r from-transparent via-[#dfe5df] to-transparent" />

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-[#174c36]" />
                        <span className="text-xs font-bold text-[#536159]">
                          Saldo após desbloqueio
                        </span>
                      </div>
                      <span className="rounded-full bg-[#174c36]/10 px-3 py-1 text-sm font-black text-[#174c36]">
                        {projectedBalance}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3.5 text-[11px] font-bold leading-5 text-amber-800">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      A cobrança é imediata e não reembolsável
                      após o desbloqueio do contato.
                    </span>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-2.5 px-6 pb-6 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isLoading}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-[#dfe5df] bg-white px-5 text-xs font-black tracking-wide text-[#536159] transition hover:bg-[#f7f9f7] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleUnlock}
                    disabled={isLoading}
                    className="group relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-[#174c36] to-[#0f3425] px-5 text-xs font-black tracking-wide text-white shadow-[0_8px_24px_-8px_rgba(23,76,54,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-8px_rgba(23,76,54,0.75)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                    {loadingAction === "unlock" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Desbloqueando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Confirmar desbloqueio
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="relative overflow-hidden bg-gradient-to-br from-[#3a1a1a] via-[#2a1212] to-[#1a0b0b] px-6 pt-7 pb-8 text-white">
                  <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-red-400/20 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-orange-400/10 blur-3xl" />

                  <div className="relative flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-inset ring-white/20 backdrop-blur-sm">
                      <AlertTriangle className="h-6 w-6 text-red-200" />
                    </div>

                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={isLoading}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Fechar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <h2
                    id="lead-modal-title"
                    className="relative mt-5 text-xl font-black tracking-tight"
                  >
                    Recusar oportunidade
                  </h2>
                  <p className="relative mt-1.5 text-sm font-medium leading-relaxed text-white/70">
                    Esta ação remove a oportunidade da sua lista
                    e não consome créditos.
                  </p>
                </div>

                <div className="px-6 pt-6">
                  <div className="rounded-2xl border border-[#ece4e4] bg-gradient-to-br from-[#fbf7f7] to-white p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
                        <X className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-black text-[#2a1a1a]">
                          Tem certeza que deseja recusar?
                        </span>
                        <span className="text-xs font-medium leading-relaxed text-[#6b5656]">
                          Você não poderá desfazer esta ação nem
                          recuperar esta oportunidade depois.
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3.5 text-[11px] font-bold leading-5 text-emerald-800">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      Nenhum crédito será debitado da sua
                      carteira ao recusar.
                    </span>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-2.5 px-6 pb-6 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isLoading}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-[#dfe5df] bg-white px-5 text-xs font-black tracking-wide text-[#536159] transition hover:bg-[#f7f9f7] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Manter oportunidade
                  </button>

                  <button
                    type="button"
                    onClick={handleDecline}
                    disabled={isLoading}
                    className="group relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-[#b42318] to-[#8a1a12] px-5 text-xs font-black tracking-wide text-white shadow-[0_8px_24px_-8px_rgba(180,35,24,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-8px_rgba(180,35,24,0.7)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                    {loadingAction === "decline" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Recusando...
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4" />
                        Confirmar recusa
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

          <style jsx global>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }

            @keyframes modalIn {
              from {
                opacity: 0;
                transform: translateY(16px) scale(0.96);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
          `}</style>
        </div>
      ) : null}
    </>
  );
}