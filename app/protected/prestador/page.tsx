import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  CircleDollarSign,
  Coins,
  CreditCard,
  History,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  WalletCards,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";

import CreditPurchaseModal from "./credit-purchase-modal";
import CreditPurchaseSuccess from "./credit-purchase-success";

type ProviderProfile = {
  user_id: string;
  business_name: string | null;
  status: string;
};

type ProviderService = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

type ProviderLead = {
  id: string;
  status: string;
  credit_cost: number;
  created_at: string;
};

type CreditWallet = {
  balance: number;
  lifetime_purchased: number;
  lifetime_consumed: number;
};

type CreditTransaction = {
  id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function transactionLabel(
  transaction: CreditTransaction,
) {
  if (
    transaction.transaction_type ===
    "purchase"
  ) {
    return "Compra de créditos";
  }

  if (
    transaction.transaction_type ===
    "lead_charge"
  ) {
    return "Contato desbloqueado";
  }

  if (
    transaction.transaction_type ===
    "adjustment"
  ) {
    return "Ajuste de créditos";
  }

  if (transaction.description?.trim()) {
    return transaction.description;
  }

  return "Movimentação de créditos";
}

function PartnerDashboardLoading() {
  return (
    <main className="min-h-screen bg-[#f4f7f4]">
      <div className="mx-auto max-w-[1420px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="h-[68px] animate-pulse rounded-[22px] bg-white" />

        <div className="mt-5 h-[420px] animate-pulse rounded-[42px] bg-[#e5ebe6]" />

        <div className="relative z-10 -mt-5 mx-5 grid gap-3 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-[24px] bg-white"
            />
          ))}
        </div>

        <div className="mt-16 h-[420px] animate-pulse rounded-[40px] bg-white" />
      </div>
    </main>
  );
}

async function PartnerDashboardContent() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const {
    data: provider,
    error: providerError,
  } = await supabase
    .from("provider_profiles")
    .select(
      "user_id, business_name, status",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (providerError) {
    console.error(
      "Erro ao carregar perfil do parceiro:",
      providerError,
    );
  }

  if (!provider) {
    redirect(
      "/protected/prestador/cadastro",
    );
  }

  if (provider.status !== "approved") {
    redirect(
      "/protected/prestador/status",
    );
  }

  const [
    walletResult,
    servicesResult,
    leadsResult,
    transactionsResult,
  ] = await Promise.all([
    supabase
      .from("partner_credit_wallets")
      .select(
        "balance, lifetime_purchased, lifetime_consumed",
      )
      .eq(
        "provider_user_id",
        user.id,
      )
      .maybeSingle(),

    supabase
      .from("provider_services")
      .select(
        "id, name, is_active, created_at",
      )
      .eq("provider_id", user.id)
      .order("created_at", {
        ascending: false,
      }),

    supabase.rpc(
      "get_provider_leads",
    ),

    supabase
      .from(
        "partner_credit_transactions",
      )
      .select(
        "id, transaction_type, amount, balance_after, description, created_at",
      )
      .eq(
        "provider_user_id",
        user.id,
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(8),
  ]);

  if (walletResult.error) {
    console.error(
      "Erro ao carregar carteira:",
      walletResult.error,
    );
  }

  if (servicesResult.error) {
    console.error(
      "Erro ao carregar serviços:",
      servicesResult.error,
    );
  }

  if (leadsResult.error) {
    console.error(
      "Erro ao carregar oportunidades:",
      leadsResult.error,
    );
  }

  if (transactionsResult.error) {
    console.error(
      "Erro ao carregar histórico:",
      transactionsResult.error,
    );
  }

  const typedProvider =
    provider as ProviderProfile;

  const wallet: CreditWallet =
    (walletResult.data as
      | CreditWallet
      | null) ?? {
      balance: 0,
      lifetime_purchased: 0,
      lifetime_consumed: 0,
    };

  const services = Array.isArray(
    servicesResult.data,
  )
    ? (servicesResult.data as ProviderService[])
    : [];

  const leads = Array.isArray(
    leadsResult.data,
  )
    ? (leadsResult.data as ProviderLead[])
    : [];

  const transactions = Array.isArray(
    transactionsResult.data,
  )
    ? (transactionsResult.data as CreditTransaction[])
    : [];

  const activeServices =
    services.filter(
      (service) =>
        service.is_active,
    );

  const pendingLeads =
    leads.filter(
      (lead) =>
        lead.status === "pending" ||
        lead.status ===
          "insufficient_credits",
    );

  const unlockedLeads =
    leads.filter(
      (lead) =>
        lead.status === "unlocked",
    );

  const businessName =
    typedProvider.business_name?.trim() ||
    "Parceiro";

  return (
    <>
    <Suspense fallback={null}>
      <CreditPurchaseSuccess />
    </Suspense>
    <main className="min-h-screen overflow-x-hidden bg-[#f4f7f4] text-[#102219]">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-[#e5ebe6]/80 bg-[#f8faf8]/90 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-[68px] max-w-[1420px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/protected/prestador"
            className="group flex min-w-0 items-center gap-3"
          >
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[15px] bg-[#0c3b29] text-white shadow-[0_12px_30px_-18px_rgba(12,59,41,0.9)] transition-all duration-500 group-hover:-translate-y-0.5">
              <Store className="h-[18px] w-[18px]" />

              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#57e095] shadow-[0_0_0_3px_rgba(87,224,149,0.12)]" />
            </div>

            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#13845b]">
                Porto Serviços
              </p>

              <p className="truncate text-sm font-black tracking-[-0.025em]">
                Central do Parceiro
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {pendingLeads.length > 0 ? (
              <Link
                href="/protected/prestador/oportunidades"
                className="group hidden h-10 items-center gap-2 rounded-[14px] border border-[#dce7df] bg-white px-3.5 text-[10px] font-black text-[#405148] shadow-[0_6px_18px_-14px_rgba(15,60,41,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#bfd6c7] sm:flex"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
                </span>

                {pendingLeads.length}{" "}
                {pendingLeads.length === 1
                  ? "nova oportunidade"
                  : "novas oportunidades"}
              </Link>
            ) : null}

            <a
              href="#comprar-creditos"
              className="group flex h-10 items-center gap-2 rounded-[14px] border border-[#d9e6dd] bg-white px-3.5 text-[10px] font-black text-[#174c36] shadow-[0_6px_18px_-14px_rgba(15,60,41,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#bcd5c5]"
            >
              <Coins className="h-4 w-4 text-[#16825a]" />

              {wallet.balance}

              <span className="hidden text-[#8a958e] sm:inline">
                créditos
              </span>
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1420px] px-4 pb-24 pt-5 sm:px-6 lg:px-8">
        {/* HERO */}
        <section className="relative isolate overflow-hidden rounded-[36px] bg-[#0c3827] text-white shadow-[0_45px_110px_-70px_rgba(7,48,31,0.95)] sm:rounded-[44px]">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -right-24 -top-36 h-[520px] w-[520px] rounded-full bg-[#247552]/55 blur-[120px]" />

            <div className="absolute -bottom-56 left-[20%] h-[460px] w-[460px] rounded-full bg-[#70d29c]/20 blur-[110px]" />

            <div className="absolute left-[52%] top-0 h-full w-px bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />

            <div
              className="absolute inset-0 opacity-[0.055]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                backgroundSize:
                  "27px 27px",
              }}
            />
          </div>

          <div className="grid min-h-[420px] gap-10 p-6 sm:p-9 lg:grid-cols-[minmax(0,1fr)_420px] lg:p-12 xl:p-14">
            <div className="flex flex-col justify-center">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.11] bg-white/[0.07] px-3 py-1.5 backdrop-blur-xl">
                  <BadgeCheck className="h-3.5 w-3.5 text-[#77e1a7]" />

                  <span className="text-[9px] font-black uppercase tracking-[0.16em] text-white/70">
                    Parceiro aprovado
                  </span>
                </span>

                {pendingLeads.length > 0 ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#7ce3aa]/15 bg-[#7ce3aa]/10 px-3 py-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7ce3aa] opacity-50" />
                      <span className="relative h-1.5 w-1.5 rounded-full bg-[#7ce3aa]" />
                    </span>

                    <span className="text-[9px] font-black uppercase tracking-[0.13em] text-[#a7edc5]">
                      {pendingLeads.length}{" "}
                      {pendingLeads.length === 1
                        ? "oportunidade esperando"
                        : "oportunidades esperando"}
                    </span>
                  </span>
                ) : null}
              </div>

              <p className="mt-8 text-[10px] font-black uppercase tracking-[0.19em] text-white/40">
                {businessName}
              </p>

              <h1 className="mt-3 max-w-[760px] text-[40px] font-black leading-[0.94] tracking-[-0.065em] sm:text-[54px] lg:text-[64px]">
                Um painel.
                <br />
                <span className="text-[#87dfad]">
                  Decisões melhores.
                </span>
              </h1>

              <p className="mt-6 max-w-[590px] text-sm font-medium leading-6 text-white/58 sm:text-[15px]">
                Acompanhe novos interessados,
                mantenha suas experiências
                ativas e invista somente nos
                contatos que fizerem sentido
                para o seu negócio.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/protected/prestador/oportunidades"
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-[17px] bg-white px-5 text-xs font-black text-[#0c3827] shadow-[0_18px_35px_-22px_rgba(0,0,0,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#f1faf5]"
                >
                  Ver oportunidades

                  {pendingLeads.length > 0 ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e4f7ec] px-1.5 text-[9px] text-[#16734f]">
                      {pendingLeads.length}
                    </span>
                  ) : null}

                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>

                <Link
                  href="/protected/prestador/servicos"
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-[17px] border border-white/[0.13] bg-white/[0.06] px-5 text-xs font-black text-white backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.1]"
                >
                  <BriefcaseBusiness className="h-4 w-4" />
                  Meus serviços
                </Link>
              </div>
            </div>

            {/* CARTEIRA */}
            <div className="flex items-center">
              <div className="relative w-full overflow-hidden rounded-[31px] border border-white/[0.1] bg-white/[0.07] p-6 backdrop-blur-2xl">
                <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/[0.08] blur-3xl" />

                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/[0.09] bg-white/[0.08] text-[#91e4b5]">
                      <WalletCards className="h-5 w-5" />
                    </div>

                    <span className="rounded-full border border-white/[0.09] bg-black/[0.08] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.15em] text-white/45">
                      Sua carteira
                    </span>
                  </div>

                  <p className="mt-9 text-[9px] font-black uppercase tracking-[0.18em] text-white/40">
                    Disponível agora
                  </p>

                  <div className="mt-2 flex items-end gap-2.5">
                    <span className="text-[50px] font-black leading-none tracking-[-0.075em]">
                      {wallet.balance}
                    </span>

                    <span className="pb-1 text-xs font-bold text-white/40">
                      créditos
                    </span>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-2.5">
                    <div className="rounded-[19px] border border-white/[0.07] bg-black/[0.09] p-3.5">
                      <div className="flex items-center gap-1.5 text-[#8ee2b3]">
                        <TrendingUp className="h-3 w-3" />

                        <span className="text-[8px] font-black uppercase tracking-[0.11em]">
                          Adquiridos
                        </span>
                      </div>

                      <p className="mt-2 text-base font-black">
                        {wallet.lifetime_purchased}
                      </p>
                    </div>

                    <div className="rounded-[19px] border border-white/[0.07] bg-black/[0.09] p-3.5">
                      <div className="flex items-center gap-1.5 text-[#8ee2b3]">
                        <Sparkles className="h-3 w-3" />

                        <span className="text-[8px] font-black uppercase tracking-[0.11em]">
                          Utilizados
                        </span>
                      </div>

                      <p className="mt-2 text-base font-black">
                        {wallet.lifetime_consumed}
                      </p>
                    </div>
                  </div>

                  <a
                    href="#comprar-creditos"
                    className="group mt-3.5 flex h-12 items-center justify-between rounded-[17px] bg-[#88e0ae] px-4 text-xs font-black text-[#0c3827] transition-all duration-300 hover:bg-[#a2eac0]"
                  >
                    Adicionar créditos

                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PULSO DO NEGÓCIO */}
        <section className="relative z-10 -mt-4 px-3 sm:px-7">
          <div className="grid overflow-hidden rounded-[27px] border border-[#dfe7e1] bg-white shadow-[0_30px_75px_-55px_rgba(12,56,39,0.65)] md:grid-cols-3">
            <Link
              href="/protected/prestador/oportunidades"
              className="group flex min-h-[105px] items-center gap-4 border-b border-[#edf1ee] p-5 transition-all duration-300 hover:bg-[#f8fbf9] md:border-b-0 md:border-r"
            >
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[#e9f7ef] text-[#16825a]">
                <BellRing className="h-[18px] w-[18px]" />

                {pendingLeads.length > 0 ? (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#45cf84]" />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[8px] font-black uppercase tracking-[0.15em] text-[#8a968e]">
                  Para analisar
                </p>

                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[27px] font-black leading-none tracking-[-0.055em]">
                    {pendingLeads.length}
                  </span>

                  <span className="text-[10px] font-semibold text-[#9ba49e]">
                    oportunidades
                  </span>
                </div>
              </div>

              <ArrowRight className="h-4 w-4 text-[#bdc7c0] transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#16825a]" />
            </Link>

            <Link
              href="/protected/prestador/oportunidades"
              className="group flex min-h-[105px] items-center gap-4 border-b border-[#edf1ee] p-5 transition-all duration-300 hover:bg-[#f8fbf9] md:border-b-0 md:border-r"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[#edf7e8] text-[#4d7c37]">
                <Check className="h-[18px] w-[18px]" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[8px] font-black uppercase tracking-[0.15em] text-[#8a968e]">
                  Já desbloqueados
                </p>

                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[27px] font-black leading-none tracking-[-0.055em]">
                    {unlockedLeads.length}
                  </span>

                  <span className="text-[10px] font-semibold text-[#9ba49e]">
                    contatos
                  </span>
                </div>
              </div>

              <ArrowRight className="h-4 w-4 text-[#bdc7c0] transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#16825a]" />
            </Link>

            <Link
              href="/protected/prestador/servicos"
              className="group flex min-h-[105px] items-center gap-4 p-5 transition-all duration-300 hover:bg-[#f8fbf9]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[#e8f5f4] text-[#147a74]">
                <BriefcaseBusiness className="h-[18px] w-[18px]" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[8px] font-black uppercase tracking-[0.15em] text-[#8a968e]">
                  Sua vitrine
                </p>

                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[27px] font-black leading-none tracking-[-0.055em]">
                    {activeServices.length}
                  </span>

                  <span className="text-[10px] font-semibold text-[#9ba49e]">
                    serviços ativos
                  </span>
                </div>
              </div>

              <ArrowRight className="h-4 w-4 text-[#bdc7c0] transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#16825a]" />
            </Link>
          </div>
        </section>

        {/* CRÉDITOS PERSONALIZADOS */}
        <section
          id="comprar-creditos"
          className="scroll-mt-24 pt-20"
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dce8df] bg-white px-3 py-1.5 shadow-[0_7px_20px_-16px_rgba(12,56,39,0.6)]">
                <Zap className="h-3.5 w-3.5 text-[#16825a]" />

                <span className="text-[9px] font-black uppercase tracking-[0.17em] text-[#16825a]">
                  Créditos sob medida
                </span>
              </div>

              <h2 className="mt-5 max-w-[790px] text-[36px] font-black leading-[0.98] tracking-[-0.065em] text-[#102219] sm:text-[46px] lg:text-[52px]">
                Você escolhe quanto
                <br className="hidden sm:block" />{" "}
                <span className="text-[#16825a]">
                  quer colocar na carteira.
                </span>
              </h2>

              <p className="mt-5 max-w-[650px] text-sm font-medium leading-6 text-[#758179]">
                Sem mensalidade e sem pacotes
                obrigatórios. Adicione créditos
                quando precisar e utilize somente
                nas oportunidades que decidir
                desbloquear.
              </p>
            </div>

            <div className="rounded-[25px] border border-[#dce6df] bg-white p-5 shadow-[0_20px_50px_-42px_rgba(12,56,39,0.5)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#edf8f1] text-[#16825a]">
                  <WalletCards className="h-[18px] w-[18px]" />
                </div>

                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.15em] text-[#8d9890]">
                    Saldo disponível
                  </p>

                  <p className="mt-0.5 text-lg font-black tracking-[-0.035em] text-[#174c36]">
                    {wallet.balance} créditos
                  </p>
                </div>
              </div>

              <div className="mt-4 h-px bg-[#edf1ee]" />

              <p className="mt-4 text-[10px] font-semibold leading-5 text-[#859087]">
                Seu saldo continua disponível
                para futuras oportunidades.
              </p>
            </div>
          </div>

          {/* COMPRA PERSONALIZADA */}
          <div className="relative mt-10 overflow-hidden rounded-[38px] bg-gradient-to-br from-[#073b4c] via-[#087f7d] to-[#00a7a5] p-6 text-white shadow-[0_35px_85px_-55px_rgba(7,59,76,0.9)] sm:p-8 lg:p-10">
            <div
              className="absolute inset-x-0 top-0 grid h-1.5 grid-cols-6"
              aria-hidden="true"
            >
              <span className="bg-[#00a7a5]" />
              <span className="bg-[#f4c542]" />
              <span className="bg-[#f26b5b]" />
              <span className="bg-[#2d6cdf]" />
              <span className="bg-[#22a06b]" />
              <span className="bg-[#f59e0b]" />
            </div>

            <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#f4c542]/15 blur-[90px]" />

            <div className="pointer-events-none absolute -bottom-32 left-[25%] h-72 w-72 rounded-full bg-white/10 blur-[100px]" />

            <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-white/85 backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5 text-[#f4c542]" />
                  Liberdade para escolher
                </div>

                <h3 className="mt-5 max-w-2xl text-[30px] font-black leading-[1] tracking-[-0.055em] sm:text-[38px]">
                  Adicione exatamente os créditos
                  que fazem sentido para você.
                </h3>

                <p className="mt-4 max-w-xl text-sm font-medium leading-6 text-white/65">
                  Escolha a quantidade antes de
                  pagar. Quanto maior o volume,
                  melhor pode ser o valor por
                  crédito.
                </p>

                <div className="mt-7 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/10 px-3 py-2 text-[9px] font-black text-white/70">
                    <Check className="h-3.5 w-3.5 text-[#8ce4b4]" />
                    Sem mensalidade
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/10 px-3 py-2 text-[9px] font-black text-white/70">
                    <Check className="h-3.5 w-3.5 text-[#8ce4b4]" />
                    De 10 a 5.000 créditos
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/10 px-3 py-2 text-[9px] font-black text-white/70">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#8ce4b4]" />
                    Checkout seguro
                  </span>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur-xl sm:p-6">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/50">
                  Sua carteira
                </p>

                <div className="mt-2 flex items-end gap-2">
                  <span className="text-[42px] font-black leading-none tracking-[-0.07em]">
                    {wallet.balance}
                  </span>

                  <span className="pb-1 text-[10px] font-bold text-white/50">
                    créditos
                  </span>
                </div>

                <div className="my-5 h-px bg-white/10" />

                <p className="text-[11px] font-medium leading-5 text-white/60">
                  Abra o seletor, escolha a
                  quantidade e confira o valor
                  antes de seguir para o pagamento.
                </p>

                <div className="mt-5">
                  <CreditPurchaseModal
                    currentBalance={
                      wallet.balance
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* EXPLICAÇÃO DO MODELO */}
          <div className="mt-5 grid overflow-hidden rounded-[26px] border border-[#dfe7e1] bg-white md:grid-cols-3">
            <TrustItem
              icon={
                <BellRing className="h-4 w-4" />
              }
              title="Receba gratuitamente"
              description="Novas oportunidades chegam sem cobrança."
            />

            <TrustItem
              icon={
                <LockKeyhole className="h-4 w-4" />
              }
              title="Escolha o contato"
              description="Analise antes de utilizar qualquer crédito."
              bordered
            />

            <TrustItem
              icon={
                <WalletCards className="h-4 w-4" />
              }
              title="Pague só ao desbloquear"
              description="Se não interessar, seus créditos continuam na carteira."
            />
          </div>
        </section>

        {/* HISTÓRICO */}
        <section className="mt-16">
          <details className="group overflow-hidden rounded-[32px] border border-[#dce5de] bg-white shadow-[0_24px_65px_-55px_rgba(12,56,39,0.55)]">
            <summary className="list-none cursor-pointer select-none [&::-webkit-details-marker]:hidden">
              <div className="relative overflow-hidden p-5 sm:p-7">
                <div className="pointer-events-none absolute -right-20 -top-24 h-60 w-60 rounded-full bg-[#e5f5eb] opacity-65 blur-3xl transition-transform duration-700 group-open:scale-125" />

                <div className="relative flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[17px] bg-[#edf8f1] text-[#16825a] ring-1 ring-inset ring-[#d8eade]">
                    <History className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-black tracking-[-0.03em] sm:text-lg">
                        Movimentações da carteira
                      </h2>

                      {transactions.length > 0 ? (
                        <span className="rounded-full bg-[#f0f5f1] px-2 py-1 text-[7px] font-black uppercase tracking-[0.11em] text-[#748178]">
                          últimas{" "}
                          {transactions.length}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1 text-[10px] font-medium text-[#8c968f] sm:text-[11px]">
                      Compras e créditos utilizados
                      em um único histórico.
                    </p>
                  </div>

                  <div className="hidden text-right sm:block">
                    <p className="text-[8px] font-black uppercase tracking-[0.13em] text-[#929c95]">
                      Saldo
                    </p>

                    <p className="mt-0.5 text-sm font-black text-[#174c36]">
                      {wallet.balance} créditos
                    </p>
                  </div>

                  <div className="ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-[#e0e8e2] bg-[#fafcfa] text-[#647269] transition-all duration-500 group-open:rotate-180 group-open:border-[#174c36] group-open:bg-[#174c36] group-open:text-white">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </summary>

            <div className="border-t border-[#edf1ee]">
              {transactionsResult.error ? (
                <div className="p-6">
                  <p className="text-sm font-black text-red-800">
                    Não foi possível carregar seu
                    histórico.
                  </p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#f1f7f3] text-[#718278]">
                    <ReceiptText className="h-6 w-6" />
                  </div>

                  <p className="mt-4 text-sm font-black">
                    Nenhuma movimentação ainda
                  </p>

                  <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#8b958e]">
                    Compras e utilizações de
                    créditos aparecerão aqui
                    automaticamente.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#edf1ee]">
                  {transactions.map(
                    (transaction) => {
                      const isPositive =
                        transaction.amount > 0;

                      return (
                        <div
                          key={transaction.id}
                          className="group/transaction flex flex-col justify-between gap-4 px-5 py-4 transition-all duration-300 hover:bg-[#fafcfa] sm:flex-row sm:items-center sm:px-7"
                        >
                          <div className="flex min-w-0 items-center gap-3.5">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] transition-transform duration-300 group-hover/transaction:scale-105 ${
                                isPositive
                                  ? "bg-[#eaf8f0] text-[#16825a]"
                                  : "bg-[#f5f2e9] text-[#7d6a3b]"
                              }`}
                            >
                              {isPositive ? (
                                <CreditCard className="h-4 w-4" />
                              ) : (
                                <LockKeyhole className="h-4 w-4" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-xs font-black text-[#35473c]">
                                {transactionLabel(
                                  transaction,
                                )}
                              </p>

                              <p className="mt-1 text-[9px] font-semibold text-[#949d96]">
                                {formatDateTime(
                                  transaction.created_at,
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-6 pl-[54px] sm:pl-0">
                            <div className="text-right">
                              <p
                                className={`text-sm font-black ${
                                  isPositive
                                    ? "text-[#16825a]"
                                    : "text-[#705f39]"
                                }`}
                              >
                                {isPositive
                                  ? "+"
                                  : ""}
                                {transaction.amount}{" "}
                                créditos
                              </p>

                              <p className="mt-1 text-[8px] font-bold text-[#9ba39d]">
                                Saldo após:{" "}
                                {
                                  transaction.balance_after
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 border-t border-[#edf1ee] bg-[#fafcfa] px-5 py-4 sm:px-7">
                <CircleDollarSign className="h-4 w-4 text-[#16825a]" />

                <p className="text-[10px] font-bold text-[#7d8981]">
                  Saldo disponível:{" "}
                  <strong className="font-black text-[#174c36]">
                    {wallet.balance} créditos
                  </strong>
                </p>
              </div>
            </div>
          </details>
        </section>

        {/* SEGURANÇA */}
        <section className="mt-6">
          <div className="relative overflow-hidden rounded-[27px] border border-[#dbe8df] bg-[#edf8f1] p-5 sm:p-6">
            <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-white/80 blur-3xl" />

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-white text-[#16825a] shadow-[0_8px_25px_-18px_rgba(12,56,39,0.5)]">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div className="flex-1">
                <p className="text-xs font-black text-[#294638]">
                  Você está sempre no controle.
                </p>

                <p className="mt-1 max-w-4xl text-[11px] font-medium leading-5 text-[#718078]">
                  Receber uma oportunidade é
                  gratuito. Os dados do viajante
                  continuam protegidos até você
                  decidir desbloqueá-los.
                </p>
              </div>

              <div className="hidden items-center gap-2 rounded-full border border-[#d7e9dd] bg-white/70 px-3 py-2 text-[8px] font-black uppercase tracking-[0.1em] text-[#16825a] lg:flex">
                <ShieldCheck className="h-3.5 w-3.5" />
                Privacidade protegida
              </div>
            </div>
          </div>
        </section>
      </div>
     </main>
    </>
  );
}

function TrustItem({
  icon,
  title,
  description,
  bordered = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  bordered?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-5 ${
        bordered
          ? "border-y border-[#edf1ee] md:border-x md:border-y-0"
          : ""
      }`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-[#edf8f1] text-[#16825a]">
        {icon}
      </div>

      <div>
        <p className="text-[10px] font-black text-[#3b4e42]">
          {title}
        </p>

        <p className="mt-1 text-[9px] font-medium leading-4 text-[#8a958d]">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function PartnerDashboardPage() {
  return (
    <Suspense
      fallback={
        <PartnerDashboardLoading />
      }
    >
      <PartnerDashboardContent />
    </Suspense>
  );
}