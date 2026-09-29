"use client";

import { Minus, Plus, ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";

import { adjustPartnerCredits } from "../actions";

export default function CreditAdjustmentForm({
  providerUserId,
  currentBalance,
}: {
  providerUserId: string;
  currentBalance: number;
}) {
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const parsed = Number(quantity);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      setMessage({ ok: false, text: "Informe uma quantidade inteira maior que zero." });
      return;
    }

    const amount = mode === "add" ? parsed : -parsed;
    startTransition(async () => {
      const result = await adjustPartnerCredits(providerUserId, amount, reason);
      setMessage({ ok: result.success, text: result.message });
      if (result.success) {
        setQuantity("");
        setReason("");
      }
    });
  }

  return (
    <form onSubmit={submit} className="rounded-[28px] border border-[#dfe8e1] bg-white p-5 shadow-[0_12px_40px_rgba(25,42,31,0.04)] sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf7ef] text-[#176d4c]">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#859087]">Controle financeiro</p>
          <h2 className="mt-1 text-lg font-black tracking-[-0.03em]">Ajustar créditos</h2>
          <p className="mt-1 text-xs leading-5 text-[#78827b]">Saldo atual: <strong className="text-[#25382c]">{currentBalance.toLocaleString("pt-BR")} créditos</strong>. Toda alteração gera ledger e auditoria.</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-[#f3f7f4] p-1.5">
        <button type="button" onClick={() => setMode("add")} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black transition ${mode === "add" ? "bg-white text-emerald-700 shadow-sm" : "text-[#748078]"}`}>
          <Plus className="h-4 w-4" /> Adicionar
        </button>
        <button type="button" onClick={() => setMode("remove")} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black transition ${mode === "remove" ? "bg-white text-rose-700 shadow-sm" : "text-[#748078]"}`}>
          <Minus className="h-4 w-4" /> Remover
        </button>
      </div>

      <label className="mt-5 block text-[10px] font-black uppercase tracking-[0.14em] text-[#7d8880]">
        Quantidade
        <input value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="numeric" min="1" step="1" type="number" placeholder="Ex.: 20" className="mt-2 w-full rounded-2xl border border-[#dfe6e0] bg-white px-4 py-3.5 text-sm font-bold outline-none focus:border-[#6f9b80] focus:ring-4 focus:ring-[#1c6b48]/5" />
      </label>

      <label className="mt-4 block text-[10px] font-black uppercase tracking-[0.14em] text-[#7d8880]">
        Motivo obrigatório
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} minLength={5} maxLength={500} rows={3} placeholder="Descreva o motivo do ajuste..." className="mt-2 w-full resize-none rounded-2xl border border-[#dfe6e0] bg-white px-4 py-3.5 text-sm outline-none focus:border-[#6f9b80] focus:ring-4 focus:ring-[#1c6b48]/5" />
      </label>

      {message ? (
        <div className={`mt-4 rounded-2xl px-4 py-3 text-xs font-bold ${message.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{message.text}</div>
      ) : null}

      <button disabled={isPending} type="submit" className={`mt-5 flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${mode === "add" ? "bg-[#123c2a] hover:bg-[#0d3021]" : "bg-[#7d2d35] hover:bg-[#68242b]"}`}>
        {isPending ? "Processando..." : mode === "add" ? "Confirmar adição de créditos" : "Confirmar remoção de créditos"}
      </button>
    </form>
  );
}
