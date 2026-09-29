import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coins,
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
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  approveProvider,
  rejectProvider,
  signOutAdmin,
} from "./actions";
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

type AdminNavItemProps = {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
  href?: string;
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
      .select("id", { count: "exact", head: true })
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

  return (
    <main className="min-h-screen bg-[#f4f7f4] text-[#142018]">
      <div className="mx-auto flex min-h-screen max-w-[1800px]">
        <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col border-r border-[#e5eae5] bg-white px-5 py-6 lg:flex">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#123c2a] text-white shadow-[0_10px_28px_-14px_rgba(18,60,42,0.8)]">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[18px] font-black tracking-[-0.045em]">
                Porto<span className="text-[#16a36f]">Serviços</span>
              </p>
              <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-[#9aa39c]">
                Command Center
              </p>
            </div>
          </div>

          <div className="mt-8 px-2">
            <p className="mb-3 text-[9px] font-black uppercase tracking-[0.18em] text-[#a0a8a1]">
              Operação
            </p>

            <nav className="space-y-1">
              <AdminNavItem icon={<LayoutGrid className="h-[18px] w-[18px]" />} label="Visão geral" active />
              <AdminNavItem icon={<Store className="h-[18px] w-[18px]" />} label="Parceiros" badge={pendingPartnersCount} href="/admin/parceiros" />
              <AdminNavItem icon={<PackageCheck className="h-[18px] w-[18px]" />} label="Experiências" />
              <AdminNavItem icon={<Handshake className="h-[18px] w-[18px]" />} label="Oportunidades" />
              <AdminNavItem icon={<Tags className="h-[18px] w-[18px]" />} label="Categorias" />
              <AdminNavItem icon={<Coins className="h-[18px] w-[18px]" />} label="Financeiro & créditos" />
            </nav>
          </div>

          <div className="mt-7 px-2">
            <p className="mb-3 text-[9px] font-black uppercase tracking-[0.18em] text-[#a0a8a1]">
              Sistema
            </p>
            <AdminNavItem icon={<ShieldCheck className="h-[18px] w-[18px]" />} label="Administração" />
          </div>

          <div className="mt-auto">
            <Link
              href="/protected"
              className="flex items-center justify-between rounded-[18px] border border-[#e4e9e4] bg-[#f8faf8] px-4 py-3.5 text-xs font-black text-[#405047] transition hover:border-[#cfdacf] hover:bg-white"
            >
              <span className="flex items-center gap-2.5">
                <ExternalLink className="h-4 w-4 text-[#16815a]" />
                Ver plataforma
              </span>
              <ChevronRight className="h-4 w-4 text-[#a2aaa4]" />
            </Link>

            <div className="mt-3 flex items-center gap-3 rounded-[20px] bg-[#123c2a] p-3.5 text-white">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xs font-black">
                A
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black">Administrador</p>
                <p className="mt-0.5 truncate text-[9px] font-semibold text-white/55">{user.email}</p>
              </div>
              <form action={signOutAdmin}>
                <button type="submit" title="Sair" className="flex h-8 w-8 items-center justify-center rounded-xl text-white/60 transition hover:bg-white/10 hover:text-white">
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-[#e5eae5] bg-white/90 backdrop-blur-xl lg:hidden">
            <div className="flex h-[70px] items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#123c2a] text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black tracking-[-0.03em]">Porto Serviços</p>
                  <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#9aa39c]">Administração</p>
                </div>
              </div>
              <Link href="/protected" className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-[#e1e7e2] bg-white text-[#526057]" aria-label="Ver plataforma">
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>

            <div className="flex gap-2 overflow-x-auto px-4 pb-3 sm:px-6">
              <MobileNav label="Visão geral" active />
              <MobileNav label="Parceiros" href="/admin/parceiros" />
              <MobileNav label="Experiências" />
              <MobileNav label="Oportunidades" />
              <MobileNav label="Categorias" />
              <MobileNav label="Créditos" />
            </div>
          </header>

          <div className="px-4 py-6 sm:px-7 sm:py-8 xl:px-10">
        <section className="relative overflow-hidden rounded-[32px] border border-[#dfe8e1] bg-white px-6 py-7 shadow-[0_22px_70px_-52px_rgba(20,55,37,0.45)] sm:px-8 sm:py-8">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dcebe1] bg-[#f1f9f4] px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#137b55]">
                <Sparkles className="h-4 w-4" />
                Central administrativa
              </div>

              <h1 className="mt-5 max-w-3xl text-3xl font-black tracking-[-0.055em] text-[#13231a] sm:text-4xl lg:text-[44px] lg:leading-[1.02]">
                Operação da Porto Serviços em um só lugar.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#718077] sm:text-base">
                Gerencie parceiros, experiências, oportunidades comerciais e
                a operação da plataforma de turismo de Porto Seguro.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-[#dce8df] bg-[#f4f9f5] px-4 py-3 text-sm font-black text-[#28513b]">
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
              icon={<Coins className="h-5 w-5" />}
              title="Créditos"
              description="Carteiras, compras e consumo por oportunidades"
              status="Modelo por créditos"
            />
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

        <section className="mt-10">
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
        </div>
      </div>
    </main>
  );
}

function AdminNavItem({
  icon,
  label,
  active = false,
  badge,
  href,
}: AdminNavItemProps) {
  const item = (
    <div
      className={`flex min-h-11 items-center gap-3 rounded-[14px] px-3.5 text-[12px] font-extrabold ${
        active
          ? "bg-[#eaf7ef] text-[#146b4b]"
          : "text-[#667269]"
      }`}
    >
      <span className={active ? "text-[#15825a]" : "text-[#8b958e]"}>{icon}</span>
      <span className="flex-1">{label}</span>
      {typeof badge === "number" && badge > 0 ? (
        <span className="min-w-6 rounded-full bg-[#123c2a] px-2 py-1 text-center text-[9px] font-black text-white">
          {badge}
        </span>
      ) : null}
    </div>
  );

  return href ? <Link href={href}>{item}</Link> : item;
}

function MobileNav({ label, active = false, href }: { label: string; active?: boolean; href?: string }) {
  const item = (
    <div
      className={`shrink-0 rounded-full px-3.5 py-2 text-[10px] font-black ${
        active
          ? "bg-[#123c2a] text-white"
          : "border border-[#e2e7e2] bg-white text-[#748078]"
      }`}
    >
      {label}
    </div>
  );

  return href ? <Link href={href}>{item}</Link> : item;
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
    <article className="rounded-[26px] border border-black/[0.05] bg-white p-5 shadow-[0_10px_35px_-30px_rgba(20,45,30,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf7ef] text-[#23633d]">
          {icon}
        </div>

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