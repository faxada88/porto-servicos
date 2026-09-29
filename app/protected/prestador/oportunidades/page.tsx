import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coins,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";

import LeadActions from "./lead-actions";

type ProviderLead = {
  id: string;
  service_id: string;
  service_name: string;
  status: string;
  credit_cost: number;
  desired_date: string | null;
  people_count: number | null;
  notes: string | null;
  created_at: string;
  unlocked_at: string | null;
  customer_name: string | null;
  customer_phone: string | null;
};

type CreditWallet = {
  balance: number;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Data a combinar";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function normalizeWhatsApp(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("55")) {
    return digits;
  }

  return `55${digits}`;
}

function OpportunitiesLoading() {
  return (
    <main className="min-h-screen bg-[#f7f9f6]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-[72px] animate-pulse rounded-[24px] bg-white" />

        <div className="mt-6 h-[280px] animate-pulse rounded-[36px] bg-[#e8eee9]" />

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-[26px] bg-white"
            />
          ))}
        </div>

        <div className="mt-8 space-y-4">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="h-72 animate-pulse rounded-[30px] bg-white"
            />
          ))}
        </div>
      </div>
    </main>
  );
}

async function OpportunitiesContent() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: provider, error: providerError } = await supabase
    .from("provider_profiles")
    .select("user_id, business_name, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (providerError) {
    console.error(
      "Erro ao carregar perfil do parceiro:",
      providerError,
    );
  }

  if (!provider) {
    redirect("/protected/prestador/cadastro");
  }

  if (provider.status !== "approved") {
    redirect("/protected/prestador/status");
  }

  const [leadsResult, walletResult] = await Promise.all([
    supabase.rpc("get_provider_leads"),

    supabase
      .from("partner_credit_wallets")
      .select("balance")
      .eq("provider_user_id", user.id)
      .maybeSingle(),
  ]);

  if (leadsResult.error) {
    console.error(
      "Erro ao carregar oportunidades:",
      leadsResult.error,
    );
  }

  if (walletResult.error) {
    console.error(
      "Erro ao carregar carteira:",
      walletResult.error,
    );
  }

  const leads = Array.isArray(leadsResult.data)
    ? (leadsResult.data as ProviderLead[])
    : [];

  const wallet: CreditWallet =
    (walletResult.data as CreditWallet | null) ?? {
      balance: 0,
    };

  const activeLeads = leads.filter(
    (lead) =>
      lead.status === "pending" ||
      lead.status === "insufficient_credits",
  );

  const unlockedLeads = leads.filter(
    (lead) => lead.status === "unlocked",
  );

  const declinedLeads = leads.filter(
    (lead) => lead.status === "declined",
  );

  const businessName =
    provider.business_name?.trim() || "Parceiro";

  return (
    <main className="min-h-screen bg-[#f6f8f5] text-[#122018]">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-black/[0.05] bg-white/90 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/protected/prestador"
              className="group inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#e2e8e3] bg-white text-[#284333] shadow-sm transition hover:-translate-y-0.5 hover:border-[#cfd9d1] hover:shadow-md"
              aria-label="Voltar para a Central do Parceiro"
            >
              <ArrowLeft className="h-[18px] w-[18px] transition group-hover:-translate-x-0.5" />
            </Link>

            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#17855e]">
                Porto Serviços
              </p>

              <p className="truncate text-sm font-black tracking-[-0.02em] text-[#17261d]">
                Central de oportunidades
              </p>
            </div>
          </div>

          <Link
            href="/protected/prestador#comprar-creditos"
            className="group flex shrink-0 items-center gap-2.5 rounded-2xl border border-[#dce8df] bg-[#f1f8f3] px-3.5 py-2.5 transition hover:border-[#c9ddce] hover:bg-[#eaf5ed] sm:px-4"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#16734f] shadow-sm">
              <Coins className="h-4 w-4" />
            </div>

            <div className="hidden text-left sm:block">
              <p className="text-[8px] font-black uppercase tracking-[0.12em] text-[#789083]">
                Seu saldo
              </p>

              <p className="text-xs font-black text-[#15583f]">
                {wallet.balance} créditos
              </p>
            </div>

            <span className="text-xs font-black text-[#15583f] sm:hidden">
              {wallet.balance}
            </span>

            <ChevronRight className="hidden h-3.5 w-3.5 text-[#799487] transition group-hover:translate-x-0.5 sm:block" />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-[34px] border border-[#dce7de] bg-white shadow-[0_24px_80px_-55px_rgba(20,58,38,0.5)] sm:rounded-[40px]">
          <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#dff5e8] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-36 left-[35%] h-72 w-72 rounded-full bg-[#edf8e7] blur-3xl" />

          <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_340px] lg:p-10">
            <div className="flex flex-col justify-center">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#dcecdf] bg-[#f2faf4] px-3 py-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#14815b]" />

                <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#14815b]">
                  Novos clientes para seu negócio
                </span>
              </div>

              <h1 className="mt-5 max-w-3xl text-[34px] font-black leading-[0.98] tracking-[-0.055em] text-[#14251b] sm:text-[46px] lg:text-[54px]">
                Oportunidades que você escolhe aproveitar.
              </h1>

              <p className="mt-5 max-w-2xl text-sm font-medium leading-6 text-[#6f7c73] sm:text-[15px]">
                Olá,{" "}
                <strong className="font-black text-[#334a3b]">
                  {businessName}
                </strong>
                . Analise cada solicitação gratuitamente e use seus
                créditos apenas quando decidir liberar o contato do
                viajante.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <TrustPill
                  icon={<ShieldCheck className="h-3.5 w-3.5" />}
                  text="Contato protegido"
                />

                <TrustPill
                  icon={<Coins className="h-3.5 w-3.5" />}
                  text="Só paga ao desbloquear"
                />

                <TrustPill
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  text="Você decide"
                />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[28px] bg-[#174c36] p-6 text-white shadow-[0_28px_60px_-35px_rgba(23,76,54,0.8)]">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-xl" />

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                    <WalletCards className="h-5 w-5" />
                  </div>

                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-white/80">
                    Carteira
                  </span>
                </div>

                <p className="mt-8 text-[10px] font-black uppercase tracking-[0.16em] text-white/55">
                  Saldo disponível
                </p>

                <div className="mt-1 flex items-end gap-2">
                  <span className="text-4xl font-black tracking-[-0.06em]">
                    {wallet.balance}
                  </span>

                  <span className="pb-1 text-xs font-bold text-white/60">
                    créditos
                  </span>
                </div>

                <div className="mt-6 h-px bg-white/10" />

                <Link
                  href="/protected/prestador#comprar-creditos"
                  className="mt-5 flex h-11 w-full items-center justify-between rounded-xl bg-white px-4 text-xs font-black text-[#174c36] transition hover:bg-[#f3f7f4]"
                >
                  Comprar créditos
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* METRICS */}
        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          <SummaryCard
            label="Aguardando análise"
            value={activeLeads.length}
            helper={
              activeLeads.length === 1
                ? "1 oportunidade esperando você"
                : `${activeLeads.length} oportunidades esperando você`
            }
            icon={<Clock3 className="h-5 w-5" />}
          />

          <SummaryCard
            label="Contatos liberados"
            value={unlockedLeads.length}
            helper="oportunidades desbloqueadas"
            icon={<CheckCircle2 className="h-5 w-5" />}
          />

          <SummaryCard
            label="Créditos disponíveis"
            value={wallet.balance}
            helper="saldo atual da sua carteira"
            icon={<TrendingUp className="h-5 w-5" />}
          />
        </section>

        {/* ACTIVE LEADS */}
        <section className="mt-12">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#20a46f]" />

                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#14815b]">
                  Aguardando sua decisão
                </p>
              </div>

              <h2 className="mt-2 text-2xl font-black tracking-[-0.045em] text-[#17251d] sm:text-[30px]">
                Novas oportunidades
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-[#7a857d]">
                Veja os detalhes antes de decidir se o contato vale
                a pena para o seu negócio.
              </p>
            </div>

            {activeLeads.length > 0 ? (
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#d8eadf] bg-[#eff9f3] px-3.5 py-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#1a9a69]" />

                <span className="text-[10px] font-black uppercase tracking-[0.09em] text-[#17704f]">
                  {activeLeads.length}{" "}
                  {activeLeads.length === 1
                    ? "nova oportunidade"
                    : "novas oportunidades"}
                </span>
              </div>
            ) : null}
          </div>

          {leadsResult.error ? (
            <div className="mt-6 rounded-[28px] border border-red-100 bg-red-50 p-6">
              <p className="text-sm font-black text-red-900">
                Não foi possível carregar suas oportunidades.
              </p>

              <p className="mt-1 text-xs font-medium text-red-700">
                Atualize a página e tente novamente.
              </p>
            </div>
          ) : activeLeads.length === 0 ? (
            <div className="mt-6 overflow-hidden rounded-[32px] border border-dashed border-[#ced9d1] bg-white">
              <div className="px-6 py-14 text-center sm:py-16">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#edf8f1] text-[#14815b]">
                  <Sparkles className="h-7 w-7" />
                </div>

                <h3 className="mt-5 text-lg font-black tracking-[-0.025em]">
                  Tudo analisado por aqui
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#7d887f]">
                  Quando um viajante demonstrar interesse por uma
                  das suas experiências, a oportunidade aparecerá
                  automaticamente aqui.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {activeLeads.map((lead, index) => (
                <article
                  key={lead.id}
                  className="group overflow-hidden rounded-[30px] border border-[#dfe6e0] bg-white shadow-[0_22px_65px_-50px_rgba(19,58,36,0.65)] transition duration-300 hover:-translate-y-0.5 hover:border-[#d0ddd3] hover:shadow-[0_28px_70px_-48px_rgba(19,58,36,0.72)]"
                >
                  <div className="h-1 w-full bg-gradient-to-r from-[#1a9568] via-[#57b88e] to-[#d7eee0]" />

                  <div className="p-5 sm:p-7">
                    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf8f0] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-[#137650]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#1ca36d]" />
                            Nova oportunidade
                          </span>

                          {lead.status ===
                          "insufficient_credits" ? (
                            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.09em] text-amber-800">
                              Saldo insuficiente
                            </span>
                          ) : null}

                          <span className="text-[10px] font-bold text-[#9aa29c]">
                            #{String(index + 1).padStart(2, "0")}
                          </span>
                        </div>

                        <h3 className="mt-4 text-xl font-black tracking-[-0.04em] text-[#18271e] sm:text-[25px]">
                          {lead.service_name}
                        </h3>

                        <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-[#919b93]">
                          <Clock3 className="h-3.5 w-3.5" />
                          Recebida em{" "}
                          {formatCreatedAt(lead.created_at)}
                        </div>
                      </div>

                      <div className="flex w-fit items-center gap-3 rounded-[20px] border border-[#e3eae4] bg-[#f7faf7] px-4 py-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#167650] shadow-sm">
                          <LockKeyhole className="h-4 w-4" />
                        </div>

                        <div>
                          <p className="text-[8px] font-black uppercase tracking-[0.13em] text-[#89958c]">
                            Desbloqueio
                          </p>

                          <p className="mt-0.5 text-sm font-black text-[#174c36]">
                            {lead.credit_cost} créditos
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <LeadDetail
                        icon={
                          <CalendarDays className="h-4 w-4" />
                        }
                        label="Data desejada"
                        value={formatDate(lead.desired_date)}
                      />

                      <LeadDetail
                        icon={<Users className="h-4 w-4" />}
                        label="Número de pessoas"
                        value={
                          lead.people_count
                            ? `${lead.people_count} ${
                                lead.people_count === 1
                                  ? "pessoa"
                                  : "pessoas"
                              }`
                            : "Não informado"
                        }
                      />
                    </div>

                    {lead.notes?.trim() ? (
                      <div className="mt-3 rounded-[20px] border border-[#e7ece8] bg-[#fafcfa] p-4 sm:p-5">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#859087]">
                          Mensagem do viajante
                        </p>

                        <p className="mt-2 whitespace-pre-line text-sm font-medium leading-6 text-[#526159]">
                          {lead.notes}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-4 flex items-start gap-3 rounded-[20px] border border-[#e0eee5] bg-[#f2f9f4] p-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#14815b] shadow-sm">
                        <ShieldCheck className="h-4 w-4" />
                      </div>

                      <div>
                        <p className="text-xs font-black text-[#264b38]">
                          Dados pessoais protegidos
                        </p>

                        <p className="mt-1 max-w-2xl text-xs leading-5 text-[#718078]">
                          Nome e telefone permanecem ocultos.
                          Você só utiliza créditos se decidir
                          desbloquear esta oportunidade.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-4 border-t border-[#edf1ed] pt-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-xs font-bold text-[#65736a]">
                          Você está no controle.
                        </p>

                        <p className="mt-1 text-[11px] leading-5 text-[#929a94]">
                          Recusar é gratuito. Desbloquear libera
                          permanentemente o contato.
                        </p>
                      </div>

                      <LeadActions
                        leadId={lead.id}
                        creditCost={lead.credit_cost}
                        currentBalance={wallet.balance}
                        status={lead.status}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* UNLOCKED */}
        {unlockedLeads.length > 0 ? (
          <section className="mt-16">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#16825a]" />

                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#14815b]">
                  Seus contatos
                </p>
              </div>

              <h2 className="mt-2 text-2xl font-black tracking-[-0.045em] sm:text-[30px]">
                Oportunidades desbloqueadas
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-[#7a857d]">
                Contatos já adquiridos continuam disponíveis para
                você retornar quando precisar.
              </p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {unlockedLeads.map((lead) => (
                <article
                  key={lead.id}
                  className="overflow-hidden rounded-[28px] border border-[#dfe7e1] bg-white shadow-[0_20px_60px_-50px_rgba(20,58,38,0.55)]"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf8f0] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.09em] text-[#137650]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Contato liberado
                        </span>

                        <h3 className="mt-3 truncate text-lg font-black tracking-[-0.025em]">
                          {lead.service_name}
                        </h3>
                      </div>

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#eff8f2] text-[#16825a]">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="mt-5 rounded-[20px] border border-[#e4ebe5] bg-[#f7faf7] p-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#849087]">
                        Viajante
                      </p>

                      <p className="mt-2 text-sm font-black text-[#24382c]">
                        {lead.customer_name ||
                          "Contato liberado"}
                      </p>

                      {lead.customer_phone ? (
                        <p className="mt-1 text-sm font-semibold text-[#5b6960]">
                          {lead.customer_phone}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <LeadDetail
                        icon={
                          <CalendarDays className="h-4 w-4" />
                        }
                        label="Data"
                        value={formatDate(lead.desired_date)}
                      />

                      <LeadDetail
                        icon={<Users className="h-4 w-4" />}
                        label="Pessoas"
                        value={
                          lead.people_count
                            ? String(lead.people_count)
                            : "Não informado"
                        }
                      />
                    </div>

                    {lead.customer_phone ? (
                      <a
                        href={`https://wa.me/${normalizeWhatsApp(
                          lead.customer_phone,
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="group mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#174c36] px-5 text-xs font-black text-white shadow-[0_12px_30px_-18px_rgba(23,76,54,0.9)] transition hover:-translate-y-0.5 hover:bg-[#205b42]"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Conversar pelo WhatsApp
                        <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {/* DECLINED */}
        {declinedLeads.length > 0 ? (
          <section className="mt-12">
            <details className="group overflow-hidden rounded-[24px] border border-[#e1e7e2] bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="text-xs font-black text-[#5f6e64]">
                    Oportunidades recusadas
                  </p>

                  <p className="mt-1 text-[10px] font-semibold text-[#9aa29c]">
                    {declinedLeads.length}{" "}
                    {declinedLeads.length === 1
                      ? "oportunidade"
                      : "oportunidades"}
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 text-[#8b978f] transition group-open:rotate-90" />
              </summary>

              <div className="border-t border-[#edf0ed] px-5 py-4">
                <div className="space-y-2">
                  {declinedLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between gap-4 rounded-2xl bg-[#f7f9f7] px-4 py-3.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black text-[#4d5d52]">
                          {lead.service_name}
                        </p>

                        <p className="mt-1 text-[10px] font-semibold text-[#949d96]">
                          {formatCreatedAt(lead.created_at)}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-[#f5f0ed] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] text-[#916f62]">
                        Recusada
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function TrustPill({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-[#e1e8e2] bg-white px-3 py-2 text-[10px] font-black text-[#65736a] shadow-sm">
      <span className="text-[#16825a]">{icon}</span>
      {text}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: number;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="group rounded-[26px] border border-[#e0e7e1] bg-white p-5 transition duration-300 hover:-translate-y-0.5 hover:border-[#d2ddd4] hover:shadow-[0_18px_45px_-38px_rgba(20,58,38,0.55)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf8f1] text-[#14815b] transition group-hover:bg-[#e5f5eb]">
          {icon}
        </div>

        <ArrowUpRight className="h-4 w-4 text-[#c3ccc5]" />
      </div>

      <p className="mt-5 text-[9px] font-black uppercase tracking-[0.12em] text-[#7c887f]">
        {label}
      </p>

      <p className="mt-1 text-[28px] font-black tracking-[-0.055em] text-[#1b2d22]">
        {value}
      </p>

      <p className="mt-1 text-[11px] font-semibold text-[#959e97]">
        {helper}
      </p>
    </article>
  );
}

function LeadDetail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-[#e7ece8] bg-white p-4">
      <div className="flex items-center gap-2 text-[#14815b]">
        {icon}

        <p className="text-[9px] font-black uppercase tracking-[0.1em]">
          {label}
        </p>
      </div>

      <p className="mt-2 text-sm font-black text-[#2a3e32]">
        {value}
      </p>
    </div>
  );
}

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<OpportunitiesLoading />}>
      <OpportunitiesContent />
    </Suspense>
  );
}