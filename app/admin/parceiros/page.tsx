import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Clock3,
  Coins,
  Handshake,
  Search,
  ShieldAlert,
  Store,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";

type ProviderStatus = "pending" | "approved" | "rejected" | "suspended";

type Partner = {
  user_id: string;
  phone: string | null;
  business_name: string | null;
  description: string | null;
  status: ProviderStatus;
  created_at: string;
  approved_at: string | null;
};

type Wallet = {
  provider_user_id: string;
  balance: number;
  lifetime_purchased: number;
  lifetime_consumed: number;
};

type ProviderService = {
  provider_id: string;
  is_active: boolean;
};

type PartnerLead = {
  provider_user_id: string;
  status: string;
};

const statusMeta: Record<
  ProviderStatus,
  { label: string; classes: string; icon: React.ReactNode }
> = {
  approved: {
    label: "Aprovado",
    classes: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    icon: <BadgeCheck className="h-3.5 w-3.5" />,
  },
  pending: {
    label: "Em análise",
    classes: "bg-amber-50 text-amber-700 ring-amber-600/10",
    icon: <Clock3 className="h-3.5 w-3.5" />,
  },
  rejected: {
    label: "Recusado",
    classes: "bg-rose-50 text-rose-700 ring-rose-600/10",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  suspended: {
    label: "Suspenso",
    classes: "bg-orange-50 text-orange-700 ring-orange-600/10",
    icon: <ShieldAlert className="h-3.5 w-3.5" />,
  },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function PartnersLoading() {
  return (
    <main className="min-h-screen bg-[#f4f7f4] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="h-48 animate-pulse rounded-[34px] bg-white" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-[26px] bg-white" />
          ))}
        </div>
        <div className="mt-6 h-96 animate-pulse rounded-[30px] bg-white" />
      </div>
    </main>
  );
}

async function PartnersContent() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (role?.role !== "admin") redirect("/protected");

  const [partnersResult, walletsResult, servicesResult, leadsResult] =
    await Promise.all([
      supabase
        .from("provider_profiles")
        .select(
          "user_id, phone, business_name, description, status, created_at, approved_at",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("partner_credit_wallets")
        .select(
          "provider_user_id, balance, lifetime_purchased, lifetime_consumed",
        ),
      supabase
        .from("provider_services")
        .select("provider_id, is_active"),
      supabase
        .from("partner_leads")
        .select("provider_user_id, status"),
    ]);

  const loadError =
    partnersResult.error ||
    walletsResult.error ||
    servicesResult.error ||
    leadsResult.error;

  const partners = (partnersResult.data ?? []) as Partner[];
  const wallets = (walletsResult.data ?? []) as Wallet[];
  const services = (servicesResult.data ?? []) as ProviderService[];
  const leads = (leadsResult.data ?? []) as PartnerLead[];

  const walletByProvider = new Map(
    wallets.map((wallet) => [wallet.provider_user_id, wallet]),
  );

  const serviceStats = new Map<string, { total: number; active: number }>();
  for (const service of services) {
    const current = serviceStats.get(service.provider_id) ?? {
      total: 0,
      active: 0,
    };
    current.total += 1;
    if (service.is_active) current.active += 1;
    serviceStats.set(service.provider_id, current);
  }

  const leadStats = new Map<string, { total: number; unlocked: number }>();
  for (const lead of leads) {
    const current = leadStats.get(lead.provider_user_id) ?? {
      total: 0,
      unlocked: 0,
    };
    current.total += 1;
    if (lead.status === "unlocked") current.unlocked += 1;
    leadStats.set(lead.provider_user_id, current);
  }

  const approved = partners.filter((partner) => partner.status === "approved").length;
  const pending = partners.filter((partner) => partner.status === "pending").length;
  const suspended = partners.filter((partner) => partner.status === "suspended").length;
  const totalCredits = wallets.reduce((total, wallet) => total + wallet.balance, 0);

  return (
    <div className="px-4 py-6 sm:px-7 sm:py-8 xl:px-9">
      <div className="mx-auto max-w-[1480px]">
        <div className="mb-5 flex items-center gap-2 text-xs font-extrabold text-[#718078]">
          <Link href="/admin" className="transition hover:text-[#137b55]">
            Administração
          </Link>
          <span>/</span>
          <span className="text-[#263b2f]">Parceiros</span>
        </div>

        <section className="relative overflow-hidden rounded-[34px] border border-[#dce7df] bg-white p-6 shadow-[0_24px_70px_-52px_rgba(18,60,42,0.45)] sm:p-8">
          <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#dff6ea] blur-3xl" />
          <div className="absolute -bottom-24 right-32 h-48 w-48 rounded-full bg-[#fff0c7] blur-3xl" />

          <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dcebe1] bg-[#f1f9f4] px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#137b55]">
                <Store className="h-4 w-4" />
                Rede de parceiros
              </div>
              <h1 className="mt-5 text-3xl font-black tracking-[-0.055em] sm:text-4xl lg:text-[46px] lg:leading-none">
                Parceiros de Porto Seguro.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#718077] sm:text-base">
                Acompanhe aprovação, operação, experiências, oportunidades e
                créditos de cada parceiro em uma única central.
              </p>
            </div>

            <Link
              href="/admin"
              className="inline-flex w-fit items-center gap-2 rounded-2xl border border-[#dce8df] bg-[#f7faf8] px-4 py-3 text-xs font-black text-[#28513b] transition hover:bg-white"
            >
              Voltar à visão geral
            </Link>
          </div>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<Building2 className="h-5 w-5" />} label="Parceiros" value={partners.length} helper="Cadastros na plataforma" />
          <Metric icon={<BadgeCheck className="h-5 w-5" />} label="Aprovados" value={approved} helper="Operando na plataforma" />
          <Metric icon={<Clock3 className="h-5 w-5" />} label="Aguardando análise" value={pending} helper={suspended > 0 ? `${suspended} suspenso(s)` : "Nenhum bloqueio ativo"} />
          <Metric icon={<Coins className="h-5 w-5" />} label="Créditos em carteira" value={totalCredits.toLocaleString("pt-BR")} helper="Saldo somado dos parceiros" />
        </section>

        <section className="mt-6 overflow-hidden rounded-[30px] border border-black/[0.05] bg-white shadow-[0_12px_42px_rgba(25,42,31,0.04)]">
          <div className="flex flex-col gap-4 border-b border-black/5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a958d]">
                Operação
              </p>
              <h2 className="mt-1.5 text-xl font-black tracking-[-0.035em]">
                Todos os parceiros
              </h2>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#f3f7f4] px-4 py-2 text-xs font-black text-[#526057]">
              <Search className="h-3.5 w-3.5" />
              {partners.length} registro{partners.length === 1 ? "" : "s"}
            </div>
          </div>

          {loadError ? (
            <div className="p-8 text-center">
              <ShieldAlert className="mx-auto h-8 w-8 text-rose-500" />
              <p className="mt-3 font-black">Não foi possível carregar toda a operação.</p>
              <p className="mt-1 text-sm text-[#7a847d]">Atualize a página e tente novamente.</p>
            </div>
          ) : partners.length === 0 ? (
            <div className="p-10 text-center">
              <Store className="mx-auto h-9 w-9 text-[#9aa59d]" />
              <p className="mt-4 font-black">Nenhum parceiro cadastrado.</p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.045]">
              {partners.map((partner) => {
                const wallet = walletByProvider.get(partner.user_id);
                const partnerServices = serviceStats.get(partner.user_id) ?? {
                  total: 0,
                  active: 0,
                };
                const partnerLeads = leadStats.get(partner.user_id) ?? {
                  total: 0,
                  unlocked: 0,
                };
                const status = statusMeta[partner.status];

                return (
                  <article
                    key={partner.user_id}
                    className="group p-5 transition hover:bg-[#fbfdfb] sm:p-6"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
                      <div className="flex min-w-0 flex-1 items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[17px] bg-[#eaf7ef] text-[#176d4c]">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-black tracking-[-0.025em]">
                              {partner.business_name || "Parceiro sem nome"}
                            </h3>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black ring-1 ring-inset ${status.classes}`}>
                              {status.icon}
                              {status.label}
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-[#8a948d]">
                            Desde {formatDate(partner.created_at)}
                            {partner.phone ? ` · ${partner.phone}` : ""}
                          </p>
                          <p className="mt-2 line-clamp-1 max-w-xl text-xs leading-5 text-[#707b73]">
                            {partner.description || "Sem descrição comercial cadastrada."}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:min-w-[410px]">
                        <MiniStat label="Créditos" value={(wallet?.balance ?? 0).toLocaleString("pt-BR")} icon={<Coins className="h-3.5 w-3.5" />} />
                        <MiniStat label="Experiências" value={`${partnerServices.active}/${partnerServices.total}`} icon={<Store className="h-3.5 w-3.5" />} />
                        <MiniStat label="Oportunidades" value={partnerLeads.total.toLocaleString("pt-BR")} icon={<Handshake className="h-3.5 w-3.5" />} />
                      </div>

                      <Link
                        href={`/admin/parceiros/${partner.user_id}`}
                        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[15px] bg-[#123c2a] px-4 text-xs font-black text-white shadow-[0_10px_24px_-16px_rgba(18,60,42,0.9)] transition hover:bg-[#0d3021]"
                      >
                        Abrir gestão
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <article className="rounded-[26px] border border-black/[0.045] bg-white p-5 shadow-[0_8px_30px_rgba(25,42,31,0.035)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-[#edf7ef] text-[#23633d]">
        {icon}
      </div>
      <p className="mt-4 text-xs font-extrabold text-[#748078]">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-[-0.05em]">{value}</p>
      <p className="mt-1.5 text-[11px] font-semibold text-[#9aa29c]">{helper}</p>
    </article>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[15px] border border-[#edf0ed] bg-[#f9fbf9] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[#7d8981]">
        {icon}
        <span className="truncate text-[8px] font-black uppercase tracking-[0.1em]">{label}</span>
      </div>
      <p className="mt-1 text-sm font-black text-[#25372c]">{value}</p>
    </div>
  );
}

export default function AdminPartnersPage() {
  return (
    <Suspense fallback={<PartnersLoading />}>
      <PartnersContent />
    </Suspense>
  );
}
