"use client";

import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

type SyncItem = {
  id: string;
  name: string;
  type: "subscription" | "credit_package";
  stripeProductId: string;
  stripePriceId: string;
  reusedProduct: boolean;
  reusedPrice: boolean;
};

type SyncResponse = {
  success: boolean;
  message: string;
  environment?: string;
  totals?: {
    plans: number;
    creditPackages: number;
    items: number;
  };
  results?: SyncItem[];
};

export default function StripeCatalogSync() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResponse | null>(
    null,
  );

  async function handleSync() {
    if (loading) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        "/api/stripe/sync-products",
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        },
      );

      let data: SyncResponse;

      try {
        data = (await response.json()) as SyncResponse;
      } catch {
        throw new Error(
          "O servidor retornou uma resposta inválida.",
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Não foi possível sincronizar o catálogo Stripe.",
        );
      }

      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível sincronizar o catálogo Stripe.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-[30px] border border-black/5 bg-white">
      <div className="p-6 sm:p-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#edf7ef] text-[#24613d]">
              <CreditCard className="h-6 w-6" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#858d85]">
                  Stripe
                </p>

                <span className="rounded-full bg-[#fff5d9] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-[#806300]">
                  Test mode
                </span>
              </div>

              <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">
                Catálogo comercial
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#707970]">
                Sincronize os planos mensais e os pacotes de
                créditos da Porto Serviços com o Stripe.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSync}
            disabled={loading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#173f2c] px-5 py-3 text-sm font-black text-white transition hover:bg-[#20553b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Sincronizar Stripe
              </>
            )}
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <InfoItem
            label="Planos mensais"
            value={
              result?.success && result.totals
                ? String(result.totals.plans)
                : "3"
            }
          />

          <InfoItem
            label="Pacotes de créditos"
            value={
              result?.success && result.totals
                ? String(result.totals.creditPackages)
                : "5"
            }
          />

          <InfoItem
            label="Ambiente"
            value={
              result?.environment === "live"
                ? "Produção"
                : "Teste"
            }
          />
        </div>
      </div>

      {result ? (
        <div
          className={`border-t px-6 py-5 sm:px-7 ${
            result.success
              ? "border-[#dce9df] bg-[#f4faf5]"
              : "border-red-100 bg-red-50"
          }`}
        >
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#237044]" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
            )}

            <div className="min-w-0">
              <p
                className={`text-sm font-black ${
                  result.success
                    ? "text-[#225d38]"
                    : "text-red-900"
                }`}
              >
                {result.message}
              </p>

              {result.success && result.totals ? (
                <p className="mt-1 text-xs font-semibold leading-5 text-[#687368]">
                  {result.totals.items} itens sincronizados:
                  {" "}
                  {result.totals.plans} planos e{" "}
                  {result.totals.creditPackages} pacotes de
                  créditos.
                </p>
              ) : null}
            </div>
          </div>

          {result.success &&
          result.results &&
          result.results.length > 0 ? (
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {result.results.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[#dfe9e1] bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-[#27342b]">
                      {item.name}
                    </p>

                    <p className="mt-1 text-[10px] font-semibold text-[#8a928a]">
                      {item.type === "subscription"
                        ? "Assinatura mensal"
                        : "Pacote de créditos"}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#237044]" />

                    <span className="text-[10px] font-black text-[#237044]">
                      Sincronizado
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {result.success ? (
            <div className="mt-4 flex items-start gap-2 text-[11px] font-semibold leading-5 text-[#758075]">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />

              <p>
                Os identificadores de produto e preço ficam
                armazenados no servidor e serão utilizados pelo
                Checkout. Nenhuma chave secreta é enviada ao
                navegador.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[#f7f9f6] px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#919891]">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-[#26342a]">
        {value}
      </p>
    </div>
  );
}