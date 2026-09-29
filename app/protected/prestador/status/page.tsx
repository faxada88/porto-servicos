import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Check,
  Clock3,
  Compass,
  Home,
  MailCheck,
  MapPin,
  Palmtree,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type ProviderStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

type ProviderProfile = {
  status: ProviderStatus;
  business_name: string | null;
  rejection_reason: string | null;
};

function StatusLoading() {
  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="flex flex-col items-center text-center">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />

          <p className="mt-4 text-sm font-bold text-slate-500">
            Verificando seu cadastro...
          </p>
        </div>
      </div>
    </main>
  );
}

export default function ProviderStatusPage() {
  return (
    <Suspense fallback={<StatusLoading />}>
      <ProviderStatusContent />
    </Suspense>
  );
}

async function ProviderStatusContent() {
  const supabase = await createClient();

  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();

  const claims = claimsData?.claims;
  const userId = claims?.sub;

  if (claimsError || !userId) {
    redirect("/auth/login");
  }

  const {
    data: providerData,
    error: providerError,
  } = await supabase
    .from("provider_profiles")
    .select(
      "status, business_name, rejection_reason",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (providerError) {
    console.error(
      "Erro ao carregar status do parceiro:",
      providerError,
    );

    return <StatusError />;
  }

  if (!providerData) {
    redirect("/protected");
  }

  const provider =
    providerData as ProviderProfile;

  if (provider.status === "approved") {
    redirect("/protected");
  }

  return (
    <ProviderStatusView provider={provider} />
  );
}

function ProviderStatusView({
  provider,
}: {
  provider: ProviderProfile;
}) {
  const isPending =
    provider.status === "pending";

  const isRejected =
    provider.status === "rejected";

  const isSuspended =
    provider.status === "suspended";

  const businessName =
    provider.business_name?.trim() || "Parceiro Porto Serviços";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8fafc] text-[#101828]">
      {/* FUNDO */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="absolute -right-52 top-32 h-[520px] w-[520px] rounded-full bg-sky-100/50 blur-3xl" />
        <div className="absolute bottom-[-260px] left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-emerald-50 blur-3xl" />
      </div>

      {/* HEADER */}
      <header className="relative z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
              <Palmtree size={20} />
            </span>

            <span className="text-[22px] font-black tracking-[-0.045em] text-[#101828]">
              Porto
              <span className="text-emerald-500">
                Serviços
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-600 shadow-sm sm:flex">
            <BadgeCheck
              size={15}
              className="text-emerald-600"
            />
            Área do parceiro
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-72px)] max-w-7xl items-center justify-center px-5 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="w-full max-w-[1040px]">
          <div className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_30px_90px_-35px_rgba(15,23,42,0.22)]">
            <div className="grid lg:grid-cols-[0.88fr_1.12fr]">
              {/* LADO ESQUERDO */}
              <div className="relative overflow-hidden bg-[#101828] px-7 py-9 text-white sm:px-10 sm:py-11 lg:px-11 lg:py-12">
                <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />

                <div className="pointer-events-none absolute -bottom-32 -left-28 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

                <div className="relative">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3.5 py-2 text-xs font-extrabold text-emerald-300">
                    <MapPin size={14} />
                    Parceiros de Porto Seguro
                  </div>

                  <div
                    className={`mt-9 flex h-[76px] w-[76px] items-center justify-center rounded-[24px] border ${
                      isPending
                        ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                        : isRejected
                          ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
                          : "border-red-400/20 bg-red-400/10 text-red-300"
                    }`}
                  >
                    {isPending && (
                      <Clock3
                        size={36}
                        strokeWidth={2.2}
                      />
                    )}

                    {isRejected && (
                      <AlertTriangle
                        size={36}
                        strokeWidth={2.2}
                      />
                    )}

                    {isSuspended && (
                      <ShieldAlert
                        size={36}
                        strokeWidth={2.2}
                      />
                    )}
                  </div>

                  <p
                    className={`mt-8 text-sm font-extrabold uppercase tracking-[0.16em] ${
                      isPending
                        ? "text-emerald-400"
                        : isRejected
                          ? "text-amber-300"
                          : "text-red-300"
                    }`}
                  >
                    {isPending &&
                      "Cadastro em análise"}

                    {isRejected &&
                      "Cadastro precisa de atenção"}

                    {isSuspended &&
                      "Parceria suspensa"}
                  </p>

                  <h1 className="mt-3 max-w-sm text-[34px] font-black leading-[1.08] tracking-[-0.045em] sm:text-[40px]">
                    {isPending &&
                      "Estamos analisando seu negócio."}

                    {isRejected &&
                      "Precisamos revisar seu cadastro."}

                    {isSuspended &&
                      "Sua presença está temporariamente suspensa."}
                  </h1>

                  <p className="mt-5 max-w-sm text-[15px] leading-7 text-slate-300">
                    {isPending &&
                      "Recebemos as informações do seu negócio e da sua primeira oferta. Nossa equipe está verificando o cadastro antes da publicação na plataforma."}

                    {isRejected &&
                      "A análise identificou informações que precisam ser revisadas antes que seu negócio possa aparecer para os viajantes."}

                    {isSuspended &&
                      "A presença do seu negócio na plataforma está temporariamente indisponível. Consulte as orientações para saber os próximos passos."}
                  </p>

                  <div className="mt-9 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                    <div className="flex items-start gap-3">
                      {isSuspended ? (
                        <ShieldAlert
                          size={20}
                          className="mt-0.5 shrink-0 text-red-300"
                        />
                      ) : (
                        <ShieldCheck
                          size={20}
                          className="mt-0.5 shrink-0 text-emerald-400"
                        />
                      )}

                      <div>
                        <p className="text-sm font-extrabold text-white">
                          {businessName}
                        </p>

                        <p className="mt-1.5 text-xs leading-5 text-slate-400">
                          {isPending &&
                            "Seu negócio e sua oferta permanecem protegidos e ainda não aparecem publicamente para os viajantes."}

                          {isRejected &&
                            "Seu negócio permanece fora da área pública enquanto as informações do cadastro precisam de revisão."}

                          {isSuspended &&
                            "Seu negócio e suas ofertas permanecem indisponíveis aos viajantes enquanto a suspensão estiver ativa."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* LADO DIREITO */}
              <div className="px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
                {isPending && (
                  <PendingContent />
                )}

                {isRejected && (
                  <RejectedContent
                    rejectionReason={
                      provider.rejection_reason
                    }
                  />
                )}

                {isSuspended && (
                  <SuspendedContent />
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center justify-center gap-2 text-center text-xs font-medium text-slate-400 sm:flex-row sm:gap-3">
            <span>
              © 2026 Porto Serviços
            </span>

            <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />

            <span className="inline-flex items-center gap-1.5">
              <MapPin size={12} />
              Conectando viajantes a experiências locais.
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

function PendingContent() {
  return (
    <>
      <span className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600">
        Status da parceria
      </span>

      <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-[#101828] sm:text-[28px]">
        Agora é com a gente.
      </h2>

      <p className="mt-3 max-w-lg text-sm leading-6 text-slate-500">
        Você concluiu seu cadastro. Neste momento,
        nenhuma ação adicional é necessária.
      </p>

      <div className="mt-8">
        <TimelineItem
          icon={
            <Check
              size={17}
              strokeWidth={3}
            />
          }
          title="Cadastro enviado"
          description="Recebemos seus dados e as informações do seu negócio."
          completed
          showLine
        />

        <TimelineItem
          icon={<Clock3 size={18} />}
          title="Análise do parceiro"
          description="A Porto Serviços está verificando as informações enviadas."
          active
          showLine
        />

        <TimelineItem
          icon={<BadgeCheck size={18} />}
          title="Parceiro aprovado"
          description="Após a aprovação, seu negócio estará apto a aparecer na plataforma."
          showLine
        />

        <TimelineItem
          icon={<Sparkles size={18} />}
          title="Oferta publicada"
          description="Sua experiência, atividade ou oferta poderá aparecer aos viajantes na categoria escolhida."
        />
      </div>

      <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100">
            <MailCheck size={19} />
          </div>

          <div>
            <p className="text-sm font-extrabold text-emerald-950">
              Acompanhe as atualizações
            </p>

            <p className="mt-1 text-xs leading-5 text-emerald-800/75">
              Assim que a análise for concluída, o
              status da sua parceria será atualizado.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-7">
        <Link
          href="/"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
        >
          <Home size={17} />
          Voltar para a página inicial
        </Link>
      </div>
    </>
  );
}

function RejectedContent({
  rejectionReason,
}: {
  rejectionReason: string | null;
}) {
  return (
    <>
      <span className="text-xs font-black uppercase tracking-[0.14em] text-amber-600">
        Revisão necessária
      </span>

      <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-[#101828] sm:text-[28px]">
        Precisamos de algumas correções.
      </h2>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        Seu negócio ainda não pode aparecer na
        plataforma. Confira abaixo as informações
        disponíveis sobre a análise.
      </p>

      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle
            size={21}
            className="mt-0.5 shrink-0 text-amber-600"
          />

          <div>
            <p className="text-sm font-extrabold text-amber-950">
              Motivo da revisão
            </p>

            <p className="mt-2 text-sm leading-6 text-amber-900/75">
              {rejectionReason?.trim() ||
                "Entre em contato com o suporte da Porto Serviços para obter mais informações sobre a análise do seu cadastro."}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-start gap-3">
          <Compass
            size={20}
            className="mt-0.5 shrink-0 text-emerald-600"
          />

          <div>
            <p className="text-sm font-extrabold text-slate-800">
              Próximo passo
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Verifique o motivo informado e siga as
              orientações da Porto Serviços antes de
              uma nova análise.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-7">
        <Link
          href="/"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#101828] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800"
        >
          Página inicial
          <ArrowRight size={17} />
        </Link>
      </div>
    </>
  );
}

function SuspendedContent() {
  return (
    <>
      <span className="text-xs font-black uppercase tracking-[0.14em] text-red-600">
        Parceria temporariamente indisponível
      </span>

      <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-[#101828] sm:text-[28px]">
        Sua presença na plataforma está suspensa.
      </h2>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        Enquanto a suspensão estiver ativa, seu
        negócio e suas ofertas não ficarão disponíveis
        aos viajantes.
      </p>

      <div className="mt-8 rounded-2xl border border-red-100 bg-red-50 p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert
            size={21}
            className="mt-0.5 shrink-0 text-red-600"
          />

          <div>
            <p className="text-sm font-extrabold text-red-950">
              Entre em contato com o suporte
            </p>

            <p className="mt-2 text-sm leading-6 text-red-900/70">
              Para entender o motivo da suspensão e
              verificar os próximos passos, fale com
              a equipe da Porto Serviços.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck
            size={20}
            className="mt-0.5 shrink-0 text-slate-500"
          />

          <div>
            <p className="text-sm font-extrabold text-slate-800">
              Suas informações continuam protegidas
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              A suspensão impede a exibição pública
              do negócio enquanto a situação estiver
              sendo tratada.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-7">
        <Link
          href="/"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
        >
          <Home size={17} />
          Página inicial
        </Link>
      </div>
    </>
  );
}

function StatusError() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8fafc] px-5">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-sky-100/50 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/50">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <AlertTriangle size={26} />
        </div>

        <h1 className="mt-5 text-2xl font-black tracking-[-0.035em] text-slate-900">
          Não foi possível verificar seu cadastro.
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Não conseguimos consultar o status da sua
          parceria neste momento. Tente novamente em
          alguns instantes.
        </p>

        <Link
          href="/protected/prestador/status"
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#101828] px-5 text-sm font-extrabold text-white"
        >
          Tentar novamente
          <ArrowRight size={17} />
        </Link>
      </div>
    </main>
  );
}

function TimelineItem({
  icon,
  title,
  description,
  completed = false,
  active = false,
  showLine = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  completed?: boolean;
  active?: boolean;
  showLine?: boolean;
}) {
  return (
    <div className="relative flex gap-4 pb-7 last:pb-0">
      {showLine && (
        <div
          className={`absolute left-[19px] top-10 h-[calc(100%-20px)] w-px ${
            completed
              ? "bg-emerald-300"
              : "bg-slate-200"
          }`}
        />
      )}

      <div
        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
          completed
            ? "border-emerald-500 bg-emerald-500 text-white shadow-[0_8px_20px_-8px_rgba(16,185,129,0.7)]"
            : active
              ? "border-emerald-200 bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50"
              : "border-slate-200 bg-white text-slate-400"
        }`}
      >
        {icon}
      </div>

      <div className="pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={`text-sm font-extrabold ${
              completed || active
                ? "text-slate-900"
                : "text-slate-600"
            }`}
          >
            {title}
          </p>

          {completed && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
              Concluído
            </span>
          )}

          {active && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-700">
              Em análise
            </span>
          )}
        </div>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}