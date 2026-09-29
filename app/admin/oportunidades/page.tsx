import {
  BadgeCheck,
  CalendarDays,
  Coins,
  Handshake,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import OpportunitiesDashboard, { type AdminOpportunity } from "./opportunities-dashboard";
import { createClient } from "@/lib/supabase/server";

function Loading() {
  return (
    <main className="min-h-screen bg-[#f5f8f5] p-5 sm:p-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="h-64 animate-pulse rounded-[36px] bg-white" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-32 animate-pulse rounded-[28px] bg-white" />)}
        </div>
      </div>
    </main>
  );
}

async function OpportunitiesContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (role?.role !== "admin") redirect("/protected");

  const [leadsResult, partnersResult, servicesResult] = await Promise.all([
    supabase
      .from("partner_leads")
      .select("id, provider_user_id, service_id, customer_name, customer_phone, desired_date, people_count, notes, status, credit_cost, unlocked_at, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("provider_profiles")
      .select("user_id, business_name, status"),
    supabase
      .from("provider_services")
      .select("id, name, provider_id"),
  ]);

  const leads = leadsResult.data ?? [];
  const partners = partnersResult.data ?? [];
  const services = servicesResult.data ?? [];

  const partnerMap = new Map(partners.map((partner) => [partner.user_id, partner]));
  const serviceMap = new Map(services.map((service) => [service.id, service]));

  const opportunities: AdminOpportunity[] = leads.map((lead) => {
    const partner = partnerMap.get(lead.provider_user_id);
    const service = serviceMap.get(lead.service_id);

    return {
      id: lead.id,
      providerUserId: lead.provider_user_id,
      partnerName: partner?.business_name || "Parceiro sem nome",
      partnerStatus: partner?.status || "desconhecido",
      serviceName: service?.name || "Experiência indisponível",
      customerName: lead.customer_name,
      customerPhone: lead.customer_phone,
      desiredDate: lead.desired_date,
      peopleCount: lead.people_count,
      notes: lead.notes,
      status: lead.status,
      creditCost: lead.credit_cost,
      unlockedAt: lead.unlocked_at,
      createdAt: lead.created_at,
    };
  });

  const unlocked = opportunities.filter((item) => item.status === "unlocked");
  const pending = opportunities.filter((item) => item.status === "pending" || item.status === "insufficient_credits");
  const creditsConsumed = unlocked.reduce((total, item) => total + item.creditCost, 0);
  const conversion = opportunities.length ? Math.round((unlocked.length / opportunities.length) * 100) : 0;

  return (
    <div className="px-4 py-6 sm:px-7 sm:py-8 xl:px-9">
      <div className="mx-auto max-w-[1480px]">
        <section className="relative overflow-hidden rounded-[30px] border border-[#dce8df] bg-[#123c2a] px-6 py-8 text-white shadow-[0_28px_80px_-48px_rgba(18,60,42,0.85)] sm:px-9 sm:py-10">
          <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-[#2dd491]/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-[#f3c86a]/10 blur-3xl" />
          <div className="relative max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#bff4dc]">
              <Sparkles className="h-4 w-4" /> Radar comercial
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-[-0.055em] sm:text-5xl sm:leading-[1.02]">
              Cada oportunidade da plataforma, em uma única visão.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65 sm:text-base">
              Acompanhe a jornada entre viajante e parceiro, o custo em créditos e o desbloqueio de contatos sem interferir no fluxo financeiro seguro da plataforma.
            </p>
          </div>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<Handshake className="h-5 w-5" />} label="Oportunidades" value={opportunities.length} helper="geradas na plataforma" />
          <Metric icon={<BadgeCheck className="h-5 w-5" />} label="Desbloqueadas" value={unlocked.length} helper={`${conversion}% do total registrado`} />
          <Metric icon={<UsersRound className="h-5 w-5" />} label="Em aberto" value={pending.length} helper="aguardando decisão ou saldo" />
          <Metric icon={<Coins className="h-5 w-5" />} label="Créditos consumidos" value={creditsConsumed} helper="em contatos desbloqueados" />
        </section>

        {leadsResult.error ? (
          <div className="mt-6 rounded-[28px] border border-rose-100 bg-rose-50 p-6 text-sm font-bold text-rose-800">
            Não foi possível carregar as oportunidades. Atualize a página e tente novamente.
          </div>
        ) : (
          <OpportunitiesDashboard opportunities={opportunities} />
        )}
      </div>
    </div>
  );
}

function Metric({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: number; helper: string }) {
  return (
    <article className="group rounded-[28px] border border-black/[0.045] bg-white p-5 shadow-[0_14px_40px_rgba(24,45,32,0.035)]">
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#edf8f2] text-[#17704d]">{icon}</div>
        <TrendingUp className="h-4 w-4 text-[#c4cec7]" />
      </div>
      <p className="mt-4 text-xs font-extrabold text-[#77847c]">{label}</p>
      <p className="mt-1 text-3xl font-black tracking-[-0.04em]">{value.toLocaleString("pt-BR")}</p>
      <p className="mt-1 text-[11px] font-semibold text-[#9aa39d]">{helper}</p>
    </article>
  );
}

export default function AdminOpportunitiesPage() {
  return <Suspense fallback={<Loading />}><OpportunitiesContent /></Suspense>;
}
