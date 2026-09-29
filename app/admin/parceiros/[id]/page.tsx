import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  Coins,
  Handshake,
  PackageCheck,
  Phone,
  ReceiptText,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import CreditAdjustmentForm from "../../credit-adjustment-form";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

const leadLabels: Record<string, string> = {
  pending: "Pendente",
  unlocked: "Desbloqueada",
  declined: "Recusada",
  insufficient_credits: "Saldo insuficiente",
  canceled: "Cancelada",
  invalid: "Inválida",
};

const transactionLabels: Record<string, string> = {
  purchase: "Compra Stripe",
  subscription_bonus: "Bônus",
  lead_charge: "Oportunidade",
  refund: "Estorno",
  admin_adjustment: "Ajuste administrativo",
};

function Loading() {
  return <main className="min-h-screen bg-[#f4f7f4] p-6"><div className="mx-auto h-96 max-w-[1500px] animate-pulse rounded-[34px] bg-white" /></main>;
}

async function PartnerDetail({ id }: { id: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (role?.role !== "admin") redirect("/protected");

  const { data: partner, error: partnerError } = await supabase
    .from("provider_profiles")
    .select("user_id, phone, business_name, description, status, rejection_reason, created_at, approved_at")
    .eq("user_id", id)
    .maybeSingle();

  if (partnerError || !partner) notFound();

  const [walletResult, servicesResult, leadsResult, transactionsResult] = await Promise.all([
    supabase.from("partner_credit_wallets").select("balance, lifetime_purchased, lifetime_consumed").eq("provider_user_id", id).maybeSingle(),
    supabase.from("provider_services").select("id, name, pricing_type, price_cents, is_active, created_at").eq("provider_id", id).order("created_at", { ascending: false }),
    supabase.from("partner_leads").select("id, service_id, customer_name, customer_phone, desired_date, people_count, status, credit_cost, unlocked_at, created_at").eq("provider_user_id", id).order("created_at", { ascending: false }),
    supabase.from("partner_credit_transactions").select("id, transaction_type, amount, balance_after, description, created_at").eq("provider_user_id", id).order("created_at", { ascending: false }).limit(50),
  ]);

  const wallet = walletResult.data ?? { balance: 0, lifetime_purchased: 0, lifetime_consumed: 0 };
  const services = servicesResult.data ?? [];
  const leads = leadsResult.data ?? [];
  const transactions = transactionsResult.data ?? [];
  const serviceNames = new Map(services.map((service) => [service.id, service.name]));
  const activeServices = services.filter((service) => service.is_active).length;
  const unlockedLeads = leads.filter((lead) => lead.status === "unlocked").length;

  return (
    <main className="min-h-screen bg-[#f4f7f4] text-[#142018]">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7 sm:py-8 xl:px-10">
        <Link href="/admin/parceiros" className="inline-flex items-center gap-2 text-xs font-black text-[#5f7066] transition hover:text-[#137b55]">
          <ArrowLeft className="h-4 w-4" /> Voltar para parceiros
        </Link>

        <section className="relative mt-5 overflow-hidden rounded-[34px] border border-[#dce7df] bg-white p-6 shadow-[0_24px_70px_-52px_rgba(18,60,42,0.45)] sm:p-8">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#dff6ea] blur-3xl" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef8f2] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#176d4c]"><ShieldCheck className="h-3.5 w-3.5" /> Gestão do parceiro</span>
                <span className="rounded-full bg-[#f3f5f3] px-3 py-1.5 text-[10px] font-black uppercase text-[#647168]">{partner.status}</span>
              </div>
              <h1 className="mt-5 text-3xl font-black tracking-[-0.055em] sm:text-4xl">{partner.business_name || "Parceiro sem nome"}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#718077]">{partner.description || "Sem descrição comercial cadastrada."}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <Info icon={<Phone className="h-4 w-4" />} label="Telefone" value={partner.phone || "Não informado"} />
              <Info icon={<CalendarDays className="h-4 w-4" />} label="Cadastro" value={formatDate(partner.created_at)} />
              <Info icon={<BadgeCheck className="h-4 w-4" />} label="Aprovação" value={formatDate(partner.approved_at)} />
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<Coins className="h-5 w-5" />} label="Saldo disponível" value={wallet.balance} helper="créditos em carteira" />
          <Metric icon={<ReceiptText className="h-5 w-5" />} label="Comprados" value={wallet.lifetime_purchased} helper="créditos confirmados" />
          <Metric icon={<PackageCheck className="h-5 w-5" />} label="Experiências" value={activeServices} helper={`${services.length} cadastradas`} />
          <Metric icon={<Handshake className="h-5 w-5" />} label="Oportunidades" value={leads.length} helper={`${unlockedLeads} desbloqueadas`} />
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-6">
            <Section title="Oportunidades do parceiro" eyebrow="Leads" count={leads.length}>
              {leads.length === 0 ? <Empty text="Nenhuma oportunidade recebida." /> : (
                <div className="divide-y divide-black/5">
                  {leads.map((lead) => (
                    <div key={lead.id} className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black">{serviceNames.get(lead.service_id) || "Experiência"}</p>
                          <span className="rounded-full bg-[#f1f5f2] px-2.5 py-1 text-[9px] font-black text-[#5e6e64]">{leadLabels[lead.status] || lead.status}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#748078]">
                          <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{lead.customer_name}</span>
                          <span>{lead.customer_phone}</span>
                          {lead.desired_date ? <span>Data: {formatDate(lead.desired_date)}</span> : null}
                          {lead.people_count ? <span>{lead.people_count} pessoa(s)</span> : null}
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-black">{lead.credit_cost} créditos</p>
                        <p className="mt-1 text-[10px] font-semibold text-[#929b95]">{formatDateTime(lead.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Experiências publicadas" eyebrow="Catálogo" count={services.length}>
              {services.length === 0 ? <Empty text="Nenhuma experiência cadastrada." /> : (
                <div className="divide-y divide-black/5">
                  {services.map((service) => (
                    <div key={service.id} className="flex items-center justify-between gap-4 p-5">
                      <div>
                        <p className="font-black">{service.name}</p>
                        <p className="mt-1 text-xs font-semibold text-[#8b958e]">{service.pricing_type === "quote" ? "Sob consulta" : service.price_cents != null ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(service.price_cents) / 100) : "—"}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${service.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{service.is_active ? "Ativa" : "Inativa"}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>

          <aside className="space-y-6">
            <CreditAdjustmentForm providerUserId={id} currentBalance={wallet.balance} />

            <Section title="Extrato de créditos" eyebrow="Ledger" count={transactions.length}>
              {transactions.length === 0 ? <Empty text="Nenhuma movimentação registrada." /> : (
                <div className="divide-y divide-black/5">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black">{transactionLabels[transaction.transaction_type] || transaction.transaction_type}</p>
                          <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#879189]">{transaction.description || "Movimentação de créditos"}</p>
                        </div>
                        <p className={`text-sm font-black ${transaction.amount > 0 ? "text-emerald-700" : "text-rose-700"}`}>{transaction.amount > 0 ? "+" : ""}{transaction.amount}</p>
                      </div>
                      <div className="mt-2 flex justify-between text-[9px] font-semibold text-[#9aa29c]">
                        <span>{formatDateTime(transaction.created_at)}</span><span>Saldo {transaction.balance_after}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </aside>
        </div>

        {partner.rejection_reason ? <div className="mt-6 rounded-[24px] border border-rose-100 bg-rose-50 p-5 text-sm text-rose-800"><strong>Motivo registrado:</strong> {partner.rejection_reason}</div> : null}
      </div>
    </main>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="min-w-[130px] rounded-2xl border border-[#e7ece8] bg-[#fafcfb] p-3"><div className="flex items-center gap-1.5 text-[#829087]">{icon}<span className="text-[8px] font-black uppercase tracking-[0.1em]">{label}</span></div><p className="mt-1.5 truncate font-black text-[#314439]">{value}</p></div>;
}

function Metric({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: number; helper: string }) {
  return <article className="rounded-[26px] border border-black/[0.045] bg-white p-5"><div className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-[#edf7ef] text-[#23633d]">{icon}</div><p className="mt-4 text-xs font-extrabold text-[#748078]">{label}</p><p className="mt-1 text-2xl font-black">{value.toLocaleString("pt-BR")}</p><p className="mt-1 text-[11px] font-semibold text-[#9aa29c]">{helper}</p></article>;
}

function Section({ title, eyebrow, count, children }: { title: string; eyebrow: string; count: number; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-[28px] border border-black/[0.05] bg-white shadow-[0_10px_35px_rgba(25,42,31,0.035)]"><div className="flex items-center justify-between border-b border-black/5 p-5"><div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#8a958d]">{eyebrow}</p><h2 className="mt-1 text-lg font-black tracking-[-0.03em]">{title}</h2></div><span className="rounded-full bg-[#f2f6f3] px-3 py-1.5 text-[10px] font-black">{count}</span></div>{children}</section>;
}

function Empty({ text }: { text: string }) {
  return <div className="p-8 text-center text-xs font-semibold text-[#8b958e]">{text}</div>;
}

export default async function AdminPartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Suspense fallback={<Loading />}><PartnerDetail id={id} /></Suspense>;
}
