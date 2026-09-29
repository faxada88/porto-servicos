import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coins,
  CreditCard,
  ExternalLink,
  Handshake,
  LayoutGrid,
  LogOut,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Store,
  Tags,
  Users,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  approveProvider,
  rejectProvider,
  signOutAdmin,
} from "./actions";
import StripeCatalogSync from "./stripe-catalog-sync";
import { createClient } from "@/lib/supabase/server";

type PendingPartner = {
  user_id: string;
  phone: string | null;
  business_name: string | null;
  description: string | null;
  status: string;
  created_at: string;
};

type AdminMetricProps = {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  helper: string;
};

type AdminShortcutProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  status?: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function AdminLoading() {
  return (
    <main className="min-h-screen bg-[#f5f7f3]">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8">
          <div>
            <div className="h-6 w-40 animate-pulse rounded-lg bg-black/5" />
            <div className="mt-2 h-3 w-24 animate-pulse rounded bg-black/5" />
          </div>

          <div className="h-10 w-36 animate-pulse rounded-full bg-black/5" />
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8">
        <div className="h-64 animate-pulse rounded-[36px] bg-[#e7ebe5]" />

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-40 animate-pulse rounded-[28px] bg-white"
            />
          ))}
        </div>
      </div>
    </main>
  );
}

async function AdminDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleData?.role !== "admin") {
    redirect("/protected");
  }

  const [
    pendingResult,
    totalPartnersResult,
    approvedPartnersResult,
    rejectedPartnersResult,
    totalServicesResult,
    activeServicesResult,
    categoriesResult,
    leadsResult,
    subscriptionsResult,
    creditPackagesResult,
  ] = await Promise.all([
    supabase
      .from("provider_profiles")
      .select(
        "user_id, phone, business_name, description, status, created_at",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true }),

    supabase
      .from("provider_profiles")
      .select("user_id", { count: "exact", head: true }),

    supabase
      .from("provider_profiles")
      .select("user_id", { count: "exact", head: true })
      .eq("status", "approved"),

    supabase
      .from("provider_profiles")
      .select("user_id", { count: "exact", head: true })
      .eq("status", "rejected"),

    supabase
      .from("provider_services")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("provider_services")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),

    supabase
      .from("service_categories")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),

    supabase
      .from("partner_leads")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("partner_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),

    supabase
      .from("partner_credit_packages")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  const pendingPartners =
    (pendingResult.data as PendingPartner[] | null) ?? [];

  const totalPartners = totalPartnersResult.count ?? 0;
  const approvedPartners = approvedPartnersResult.count ?? 0;
  const rejectedPartners = rejectedPartnersResult.count ?? 0;
  const pendingPartnersCount = pendingPartners.length;

  const totalServices = totalServicesResult.count ?? 0;
  const activeServices = activeServicesResult.count ?? 0;
  const activeCategories = categoriesResult.count ?? 0;
  const totalLeads = leadsResult.count ?? 0;
  const activeSubscriptions = subscriptionsResult.count ?? 0;
  const creditPackages = creditPackagesResult.count ?? 0;

  return (
    <main className="min-h-screen bg-[#f5f7f3] text-[#172019]">
      <header className="sticky top-0 z-40 border-b border-black/[0.05] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-5 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#173f2c] text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="text-lg font-black tracking-[-0.04em] sm:text-xl">
                Porto Serviços
              </p>

              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#899189]">
                Administração
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/protected"
              className="hidden items-center gap-2 rounded-full border border-[#e0e5de] bg-white px-4 py-2.5 text-xs font-black transition hover:bg-[#f5f7f3] sm:inline-flex"
            >
              <ExternalLink className="h-4 w-4" />
              Ver plataforma
            </Link>

            <div className="flex items-center gap-2 rounded-full border border-[#dfe4dc] bg-[#f7f8f5] px-3 py-2 sm:px-4">
              <ShieldCheck className="h-4 w-4 text-[#1e6540]" />

              <div className="hidden sm:block">
                <p className="text-xs font-black leading-none">
                  Administrador
                </p>

                <p className="mt-1 max-w-40 truncate text-[10px] font-semibold text-[#858d85]">
                  {user.email}
                </p>
              </div>
            </div>

            <form action={signOutAdmin}>
              <button
                type="submit"
                title="Sair da administração"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e0e5de] bg-white text-[#5d655e] transition hover:border-red-100 hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-10">
        <section className="overflow-hidden rounded-[34px] bg-[#173f2c] px-6 py-8 text-white shadow-[0_25px_80px_rgba(23,63,44,0.16)] sm:px-9 sm:py-9">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em]">
                <Sparkles className="h-4 w-4" />
                Central administrativa
              </div>

              <h1 className="mt-5 max-w-3xl text-3xl font-black tracking-[-0.055em] sm:text-4xl lg:text-[46px] lg:leading-[1.02]">
                Operação da Porto Serviços em um só lugar.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                Gerencie parceiros, experiências, oportunidades comerciais e
                a operação da plataforma de turismo de Porto Seguro.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black">
              <MapPin className="h-4 w-4" />
              Porto Seguro, Bahia
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<Building2 className="h-5 w-5" />}
            label="Parceiros"
            value={totalPartners}
            helper={`${approvedPartners} aprovados`}
          />

          <MetricCard
            icon={<Clock3 className="h-5 w-5" />}
            label="Aguardando análise"
            value={pendingPartnersCount}
            helper="Cadastros que exigem ação"
          />

          <MetricCard
            icon={<PackageCheck className="h-5 w-5" />}
            label="Experiências ativas"
            value={activeServices}
            helper={`${totalServices} cadastradas no total`}
          />

          <MetricCard
            icon={<Handshake className="h-5 w-5" />}
            label="Oportunidades"
            value={totalLeads}
            helper="Leads registrados na plataforma"
          />
        </section>

        <section className="mt-10">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c857d]">
                Operação
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">
                Gestão da plataforma
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#727b73]">
                Visão direta das áreas administrativas que sustentam a
                operação da Porto Serviços.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AdminShortcut
              icon={<Store className="h-5 w-5" />}
              title="Parceiros"
              description={`${totalPartners} cadastrados · ${pendingPartnersCount} aguardando análise`}
              status={`${approvedPartners} aprovados`}
            />

            <AdminShortcut
              icon={<LayoutGrid className="h-5 w-5" />}
              title="Experiências"
              description={`${totalServices} experiências cadastradas`}
              status={`${activeServices} ativas`}
            />

            <AdminShortcut
              icon={<Tags className="h-5 w-5" />}
              title="Categorias"
              description="Organização da vitrine turística"
              status={`${activeCategories} ativas`}
            />

            <AdminShortcut
              icon={<Handshake className="h-5 w-5" />}
              title="Leads"
              description="Oportunidades enviadas pelos viajantes"
              status={`${totalLeads} registrados`}
            />

            <AdminShortcut
              icon={<CreditCard className="h-5 w-5" />}
              title="Assinaturas"
              description="Planos comerciais dos parceiros"
              status={`${activeSubscriptions} ativas`}
            />

            <AdminShortcut
              icon={<Coins className="h-5 w-5" />}
              title="Créditos"
              description="Pacotes usados para oportunidades comerciais"
              status={`${creditPackages} pacotes ativos`}
            />
          </div>
        </section>

        <section className="mt-10">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c857d]">
              Monetização
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] sm:text-3xl">
              Stripe e catálogo comercial
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#707970]">
              Controle a integração dos planos e pacotes de créditos que serão
              disponibilizados aos parceiros no Checkout da Porto Serviços.
            </p>
          </div>

          <div className="mt-6">
            <StripeCatalogSync />
          </div>
        </section>

        <section className="mt-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c857d]">
                Pendências
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] sm:text-3xl">
                Parceiros aguardando análise
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#707970]">
                Aprove ou recuse os cadastros antes da publicação na
                plataforma.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-black/5 bg-white px-4 py-2 text-sm font-black shadow-sm">
              <Users className="h-4 w-4" />

              {pendingPartnersCount} pendente
              {pendingPartnersCount === 1 ? "" : "s"}
            </div>
          </div>

          {pendingResult.error ? (
            <div className="mt-6 rounded-[28px] border border-red-100 bg-red-50 p-6">
              <p className="font-black text-red-900">
                Não foi possível carregar os parceiros.
              </p>

              <p className="mt-2 text-sm text-red-700">
                Atualize a página e tente novamente.
              </p>
            </div>
          ) : pendingPartners.length === 0 ? (
            <div className="mt-6 rounded-[30px] border border-black/5 bg-white px-6 py-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf7ef] text-[#1f6a3c]">
                <CheckCircle2 className="h-7 w-7" />
              </div>

              <h3 className="mt-5 text-xl font-black tracking-[-0.03em]">
                Nenhuma análise pendente
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#747c74]">
                Todos os cadastros de parceiros recebidos até agora já foram
                analisados.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 xl:grid-cols-2">
              {pendingPartners.map((partner) => {
                async function approvePartnerAction() {
                  "use server";

                  await approveProvider(partner.user_id);
                }

                async function rejectPartnerAction(formData: FormData) {
                  "use server";

                  const reason = String(
                    formData.get("reason") ?? "",
                  );

                  await rejectProvider(
                    partner.user_id,
                    reason,
                  );
                }

                return (
                  <article
                    key={partner.user_id}
                    className="overflow-hidden rounded-[30px] border border-black/5 bg-white shadow-[0_16px_50px_rgba(27,43,32,0.055)]"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#edf7ef] text-[#23633d]">
                            <Building2 className="h-6 w-6" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-lg font-black tracking-[-0.03em]">
                              {partner.business_name ||
                                "Parceiro sem nome"}
                            </p>

                            <p className="mt-1 text-xs font-bold text-[#899089]">
                              Enviado em{" "}
                              {formatDate(partner.created_at)}
                            </p>
                          </div>
                        </div>

                        <span className="shrink-0 rounded-full bg-[#fff6d8] px-3 py-1.5 text-[11px] font-black text-[#806300]">
                          Em análise
                        </span>
                      </div>

                      <div className="mt-6 grid gap-5 sm:grid-cols-2">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#919891]">
                            Telefone
                          </p>

                          <p className="mt-1.5 text-sm font-black">
                            {partner.phone || "Não informado"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#919891]">
                            Situação
                          </p>

                          <p className="mt-1.5 text-sm font-black">
                            Aguardando revisão
                          </p>
                        </div>
                      </div>

                      <div className="mt-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#919891]">
                          Sobre o negócio
                        </p>

                        <p className="mt-2 text-sm leading-6 text-[#626b62]">
                          {partner.description ||
                            "O parceiro ainda não adicionou uma descrição."}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-black/5 bg-[#fafbf9] p-5">
                      <form action={rejectPartnerAction}>
                        <label
                          htmlFor={`reason-${partner.user_id}`}
                          className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a918a]"
                        >
                          Motivo caso seja recusado
                        </label>

                        <textarea
                          id={`reason-${partner.user_id}`}
                          name="reason"
                          rows={2}
                          placeholder="Ex.: informações incompletas, dados não conferem..."
                          className="mt-2 w-full resize-none rounded-2xl border border-[#dfe4dc] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-[#a5aba5] focus:border-[#72927d] focus:ring-4 focus:ring-[#173f2c]/5"
                        />

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <button
                            type="submit"
                            className="rounded-2xl border border-[#eadede] bg-white px-5 py-3 text-sm font-black text-[#8d3737] transition hover:bg-[#fff5f5]"
                          >
                            Recusar cadastro
                          </button>

                          <button
                            type="submit"
                            form={`approve-${partner.user_id}`}
                            className="rounded-2xl bg-[#173f2c] px-5 py-3 text-sm font-black text-white transition hover:bg-[#20553b]"
                          >
                            Aprovar parceiro
                          </button>
                        </div>
                      </form>

                      <form
                        id={`approve-${partner.user_id}`}
                        action={approvePartnerAction}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-2">
          <article className="rounded-[30px] border border-black/5 bg-white p-6 sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#edf7ef] text-[#24613d]">
                <ShieldCheck className="h-6 w-6" />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#858d85]">
                  Qualidade
                </p>

                <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">
                  Controle dos parceiros
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#707970]">
                  {approvedPartners} aprovados, {pendingPartnersCount} em
                  análise e {rejectedPartners} recusados.
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-[30px] border border-black/5 bg-white p-6 sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#edf7ef] text-[#24613d]">
                <WalletCards className="h-6 w-6" />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#858d85]">
                  Monetização
                </p>

                <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">
                  Stripe + créditos
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#707970]">
                  A estrutura de planos, assinaturas, carteira e pacotes de
                  créditos está conectada à base comercial da plataforma.
                </p>
              </div>
            </div>
          </article>
        </section>

        <footer className="mt-10 flex flex-col justify-between gap-4 border-t border-black/5 py-7 text-xs font-semibold text-[#8a928a] sm:flex-row sm:items-center">
          <p>Porto Serviços · Administração</p>

          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Acesso administrativo
            </span>

            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Porto Seguro, Bahia
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
}: AdminMetricProps) {
  return (
    <article className="rounded-[27px] border border-black/[0.045] bg-white p-5 shadow-[0_8px_30px_rgba(25,42,31,0.035)] sm:p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf7ef] text-[#23633d]">
        {icon}
      </div>

      <p className="mt-5 text-sm font-extrabold text-[#687168]">
        {label}
      </p>

      <p className="mt-1 text-3xl font-black tracking-[-0.055em]">
        {value}
      </p>

      <p className="mt-2 text-xs font-semibold leading-5 text-[#939993]">
        {helper}
      </p>
    </article>
  );
}

function AdminShortcut({
  icon,
  title,
  description,
  status,
}: AdminShortcutProps) {
  return (
    <article className="group rounded-[26px] border border-black/[0.05] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#ccd9cf] hover:shadow-[0_14px_40px_rgba(25,42,31,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf7ef] text-[#23633d]">
          {icon}
        </div>

        <ChevronRight className="h-5 w-5 text-[#b1b7b1] transition group-hover:translate-x-0.5 group-hover:text-[#23633d]" />
      </div>

      <h3 className="mt-5 text-base font-black tracking-[-0.025em]">
        {title}
      </h3>

      <p className="mt-1.5 text-xs font-semibold leading-5 text-[#858d85]">
        {description}
      </p>

      {status ? (
        <div className="mt-4 inline-flex rounded-full bg-[#f3f6f2] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#657066]">
          {status}
        </div>
      ) : null}
    </article>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminDashboard />
    </Suspense>
  );
}