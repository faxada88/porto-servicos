"use client";

import {
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Filter,
  Phone,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export type AdminOpportunity = {
  id: string;
  providerUserId: string;
  partnerName: string;
  partnerStatus: string;
  serviceName: string;
  customerName: string;
  customerPhone: string;
  desiredDate: string | null;
  peopleCount: number | null;
  notes: string | null;
  status: string;
  creditCost: number;
  unlockedAt: string | null;
  createdAt: string;
};

const statuses = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendentes" },
  { value: "unlocked", label: "Desbloqueadas" },
  { value: "declined", label: "Recusadas" },
  { value: "insufficient_credits", label: "Sem saldo" },
  { value: "canceled", label: "Canceladas" },
  { value: "invalid", label: "Inválidas" },
];

const statusMeta: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-amber-50 text-amber-700 ring-amber-100" },
  unlocked: { label: "Desbloqueada", className: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  declined: { label: "Recusada", className: "bg-slate-100 text-slate-600 ring-slate-200" },
  insufficient_credits: { label: "Saldo insuficiente", className: "bg-orange-50 text-orange-700 ring-orange-100" },
  canceled: { label: "Cancelada", className: "bg-rose-50 text-rose-700 ring-rose-100" },
  invalid: { label: "Inválida", className: "bg-red-50 text-red-700 ring-red-100" },
};

function formatDate(value: string | null) {
  if (!value) return "Sem data definida";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default function OpportunitiesDashboard({ opportunities }: { opportunities: AdminOpportunity[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return opportunities.filter((item) => {
      const statusMatches = status === "all" || item.status === status;
      const textMatches = !normalized || [item.partnerName, item.serviceName, item.customerName, item.customerPhone]
        .some((value) => value.toLocaleLowerCase("pt-BR").includes(normalized));
      return statusMatches && textMatches;
    });
  }, [opportunities, query, status]);

  return (
    <section className="mt-7">
      <div className="rounded-[30px] border border-black/[0.05] bg-white p-4 shadow-[0_18px_60px_rgba(25,45,32,0.04)] sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#95a098]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar parceiro, experiência, viajante ou telefone..."
              className="h-12 w-full rounded-[17px] border border-[#e2e8e3] bg-[#f8faf8] pl-11 pr-4 text-sm font-semibold outline-none transition placeholder:text-[#a5ada7] focus:border-[#9ccbb2] focus:bg-white focus:ring-4 focus:ring-[#dff3e8]/60"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:max-w-[760px]">
            <div className="mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#f1f6f2] text-[#708078]">
              <Filter className="h-4 w-4" />
            </div>
            {statuses.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setStatus(item.value)}
                className={`shrink-0 rounded-full px-3.5 py-2.5 text-[10px] font-black transition ${status === item.value ? "bg-[#123c2a] text-white shadow-sm" : "bg-[#f4f7f4] text-[#66736b] hover:bg-[#eaf2ed]"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#89938c]">Fluxo comercial</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Oportunidades registradas</h2>
        </div>
        <span className="rounded-full bg-white px-3.5 py-2 text-[10px] font-black text-[#647169] shadow-sm">
          {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-5 rounded-[30px] border border-dashed border-[#d9e2dc] bg-white p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eff7f2] text-[#267153]"><Search className="h-6 w-6" /></div>
          <h3 className="mt-4 text-lg font-black">Nenhuma oportunidade encontrada</h3>
          <p className="mt-2 text-sm text-[#7d8881]">Ajuste a busca ou escolha outro status.</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          {filtered.map((item) => {
            const meta = statusMeta[item.status] ?? { label: item.status, className: "bg-slate-100 text-slate-600 ring-slate-200" };
            return (
              <article key={item.id} className="group overflow-hidden rounded-[30px] border border-black/[0.05] bg-white shadow-[0_14px_45px_rgba(23,44,31,0.035)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_60px_rgba(23,44,31,0.07)]">
                <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,.75fr)_190px] xl:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1.5 text-[9px] font-black ring-1 ring-inset ${meta.className}`}>{meta.label}</span>
                      <span className="text-[9px] font-black uppercase tracking-[0.12em] text-[#a0a8a2]">#{item.id.slice(0, 8)}</span>
                    </div>
                    <h3 className="mt-3 truncate text-lg font-black tracking-[-0.03em]">{item.serviceName}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-[#718078]">
                      <span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" /> {item.customerName}</span>
                      <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {item.customerPhone}</span>
                      <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {formatDate(item.desiredDate)}</span>
                      {item.peopleCount ? <span className="inline-flex items-center gap-1.5"><UsersRound className="h-3.5 w-3.5" /> {item.peopleCount} pessoa{item.peopleCount === 1 ? "" : "s"}</span> : null}
                    </div>
                    {item.notes ? <p className="mt-3 line-clamp-2 max-w-3xl text-xs leading-5 text-[#8a948e]">{item.notes}</p> : null}
                  </div>

                  <div className="rounded-[22px] bg-[#f7faf8] p-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#96a099]">Parceiro responsável</p>
                    <p className="mt-1.5 truncate text-sm font-black">{item.partnerName}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-bold text-[#748179]">
                      <span className="inline-flex items-center gap-1"><CircleDollarSign className="h-3.5 w-3.5" /> {item.creditCost} créditos</span>
                      <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {formatDateTime(item.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 xl:flex-col xl:items-stretch">
                    <div className="xl:text-right">
                      <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#9aa39d]">{item.unlockedAt ? "Desbloqueada em" : "Contato"}</p>
                      <p className="mt-1 text-xs font-black text-[#526158]">{item.unlockedAt ? formatDateTime(item.unlockedAt) : "Aguardando parceiro"}</p>
                    </div>
                    <Link href={`/admin/parceiros/${item.providerUserId}`} className="inline-flex items-center justify-center gap-2 rounded-[15px] bg-[#123c2a] px-4 py-3 text-[10px] font-black text-white transition hover:bg-[#0e4b32]">
                      Abrir parceiro <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
