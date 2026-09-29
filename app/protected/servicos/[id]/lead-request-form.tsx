"use client";

import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Phone,
  Send,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

type LeadRequestFormProps = {
  serviceId: string;
  serviceName: string;
};

type FormState = {
  customerName: string;
  customerPhone: string;
  desiredDate: string;
  peopleCount: string;
  notes: string;
};

const initialFormState: FormState = {
  customerName: "",
  customerPhone: "",
  desiredDate: "",
  peopleCount: "",
  notes: "",
};

function getToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatPhone(value: string) {
  const numbers = value.replace(/\D/g, "").slice(0, 11);

  if (numbers.length <= 2) {
    return numbers;
  }

  if (numbers.length <= 6) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  }

  if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(
      2,
      6,
    )}-${numbers.slice(6)}`;
  }

  return `(${numbers.slice(0, 2)}) ${numbers.slice(
    2,
    7,
  )}-${numbers.slice(7)}`;
}

function translateLeadError(message: string) {
  if (message.includes("AUTH_REQUIRED")) {
    return "Sua sessão expirou. Entre novamente para continuar.";
  }

  if (message.includes("CUSTOMER_NAME_REQUIRED")) {
    return "Informe seu nome.";
  }

  if (message.includes("CUSTOMER_NAME_TOO_LONG")) {
    return "O nome informado é muito longo.";
  }

  if (message.includes("CUSTOMER_PHONE_REQUIRED")) {
    return "Informe um telefone ou WhatsApp para contato.";
  }

  if (message.includes("CUSTOMER_PHONE_TOO_LONG")) {
    return "O telefone informado é inválido.";
  }

  if (message.includes("INVALID_PEOPLE_COUNT")) {
    return "Informe uma quantidade válida de pessoas.";
  }

  if (message.includes("INVALID_DESIRED_DATE")) {
    return "Escolha uma data válida a partir de hoje.";
  }

  if (message.includes("NOTES_TOO_LONG")) {
    return "A mensagem deve ter no máximo 2.000 caracteres.";
  }

  if (message.includes("SERVICE_NOT_AVAILABLE")) {
    return "Esta experiência não está disponível para novas solicitações.";
  }

  if (message.includes("OWN_SERVICE_NOT_ALLOWED")) {
    return "Você não pode solicitar contato para o seu próprio serviço.";
  }

  return "Não foi possível enviar sua solicitação. Tente novamente.";
}

export default function LeadRequestForm({
  serviceId,
  serviceName,
}: LeadRequestFormProps) {
  const [form, setForm] =
    useState<FormState>(initialFormState);

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] = useState<string | null>(
    null,
  );

  const [createdLeadId, setCreatedLeadId] = useState<
    string | null
  >(null);

  const today = getToday();

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (error) {
      setError(null);
    }
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const customerName = form.customerName.trim();
    const customerPhone = form.customerPhone.trim();
    const phoneNumbers = customerPhone.replace(/\D/g, "");
    const notes = form.notes.trim();

    if (!customerName) {
      setError("Informe seu nome.");
      return;
    }

    if (customerName.length > 120) {
      setError("O nome informado é muito longo.");
      return;
    }

    if (!customerPhone) {
      setError(
        "Informe um telefone ou WhatsApp para contato.",
      );
      return;
    }

    if (
      phoneNumbers.length < 10 ||
      phoneNumbers.length > 11
    ) {
      setError(
        "Informe um telefone ou WhatsApp válido com DDD.",
      );
      return;
    }

    if (
      form.desiredDate &&
      form.desiredDate < today
    ) {
      setError(
        "Escolha uma data válida a partir de hoje.",
      );
      return;
    }

    let peopleCount: number | null = null;

    if (form.peopleCount) {
      peopleCount = Number(form.peopleCount);

      if (
        !Number.isInteger(peopleCount) ||
        peopleCount <= 0 ||
        peopleCount > 1000
      ) {
        setError(
          "Informe uma quantidade válida de pessoas.",
        );
        return;
      }
    }

    if (notes.length > 2000) {
      setError(
        "A mensagem deve ter no máximo 2.000 caracteres.",
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data, error: rpcError } =
        await supabase.rpc("create_partner_lead", {
          target_service_id: serviceId,
          target_customer_name: customerName,
          target_customer_phone: customerPhone,
          target_desired_date:
            form.desiredDate || null,
          target_people_count: peopleCount,
          target_notes: notes || null,
        });

      if (rpcError) {
        console.error(
          "Erro ao criar oportunidade:",
          rpcError,
        );

        setError(
          translateLeadError(rpcError.message),
        );

        return;
      }

      if (
        typeof data !== "string" ||
        data.length === 0
      ) {
        setError(
          "A solicitação foi enviada, mas não foi possível confirmar seu identificador.",
        );

        return;
      }

      setCreatedLeadId(data);
      setForm(initialFormState);
    } catch (submitError) {
      console.error(
        "Erro inesperado ao enviar solicitação:",
        submitError,
      );

      setError(
        "Não foi possível enviar sua solicitação. Verifique sua conexão e tente novamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (createdLeadId) {
    return (
      <div className="mt-6 overflow-hidden rounded-[22px] border border-emerald-200 bg-emerald-50">
        <div className="p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
            <CheckCircle2 size={21} />
          </div>

          <p className="mt-4 text-base font-black text-emerald-950">
            Solicitação enviada
          </p>

          <p className="mt-2 text-xs font-semibold leading-5 text-emerald-900/70">
            Sua solicitação para{" "}
            <strong>{serviceName}</strong> foi enviada ao
            parceiro. Ele poderá analisar os detalhes antes
            de decidir liberar seus dados de contato.
          </p>

          <div className="mt-4 rounded-xl border border-emerald-200/80 bg-white/70 px-4 py-3">
            <p className="text-[11px] font-bold leading-5 text-emerald-900/70">
              Seus dados de contato permanecem protegidos até
              o parceiro aceitar a oportunidade.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setError(null);
          }}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#101828] px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-emerald-600"
        >
          <MessageCircle size={18} />
          Solicitar contato
        </button>

        <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">
          Enviar a solicitação não confirma uma reserva e não
          gera cobrança para você.
        </p>
      </>
    );
  }

  return (
    <div className="mt-6">
      <div className="rounded-[22px] border border-emerald-100 bg-[#f8fcfa] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">
              Solicitar contato
            </p>

            <p className="mt-1 text-sm font-black text-slate-900">
              Conte ao parceiro o que você precisa
            </p>
          </div>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <MessageCircle size={17} />
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-5 space-y-4"
        >
          <div>
            <label
              htmlFor={`lead-name-${serviceId}`}
              className="mb-1.5 block text-[11px] font-black text-slate-600"
            >
              Seu nome
            </label>

            <div className="relative">
              <UserRound
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id={`lead-name-${serviceId}`}
                type="text"
                autoComplete="name"
                maxLength={120}
                value={form.customerName}
                onChange={(event) =>
                  updateField(
                    "customerName",
                    event.target.value,
                  )
                }
                placeholder="Como o parceiro pode chamar você?"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-[16px] font-semibold text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor={`lead-phone-${serviceId}`}
              className="mb-1.5 block text-[11px] font-black text-slate-600"
            >
              WhatsApp ou telefone
            </label>

            <div className="relative">
              <Phone
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id={`lead-phone-${serviceId}`}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={16}
                value={form.customerPhone}
                onChange={(event) =>
                  updateField(
                    "customerPhone",
                    formatPhone(event.target.value),
                  )
                }
                placeholder="(73) 99999-9999"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-[16px] font-semibold text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>

            <p className="mt-1.5 text-[10px] font-semibold leading-4 text-slate-400">
              O parceiro não verá este contato enquanto a
              oportunidade estiver pendente.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`lead-date-${serviceId}`}
                className="mb-1.5 block text-[11px] font-black text-slate-600"
              >
                Data desejada
              </label>

              <div className="relative">
                <CalendarDays
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id={`lead-date-${serviceId}`}
                  type="date"
                  min={today}
                  value={form.desiredDate}
                  onChange={(event) =>
                    updateField(
                      "desiredDate",
                      event.target.value,
                    )
                  }
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-[16px] font-semibold text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor={`lead-people-${serviceId}`}
                className="mb-1.5 block text-[11px] font-black text-slate-600"
              >
                Pessoas
              </label>

              <div className="relative">
                <UsersRound
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id={`lead-people-${serviceId}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1000}
                  step={1}
                  value={form.peopleCount}
                  onChange={(event) =>
                    updateField(
                      "peopleCount",
                      event.target.value,
                    )
                  }
                  placeholder="Ex.: 2"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-[16px] font-semibold text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor={`lead-notes-${serviceId}`}
              className="mb-1.5 block text-[11px] font-black text-slate-600"
            >
              Detalhes da solicitação
            </label>

            <textarea
              id={`lead-notes-${serviceId}`}
              rows={4}
              maxLength={2000}
              value={form.notes}
              onChange={(event) =>
                updateField("notes", event.target.value)
              }
              placeholder="Ex.: Gostaria de saber os horários disponíveis, duração e condições para esta experiência."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[16px] font-semibold leading-6 text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
            />

            <div className="mt-1 flex justify-end">
              <span className="text-[10px] font-bold text-slate-400">
                {form.notes.length}/2000
              </span>
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold leading-5 text-red-700"
            >
              {error}
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#101828] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                  Enviando...
                </>
              ) : (
                <>
                  <Send size={17} />
                  Enviar solicitação
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setIsOpen(false);
                setError(null);
              }}
              className="min-h-12 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>

          <p className="text-center text-[10px] font-semibold leading-4 text-slate-400">
            Ao enviar, o parceiro recebe os detalhes da
            solicitação. Seus dados de contato só são
            liberados caso ele aceite a oportunidade.
          </p>
        </form>
      </div>
    </div>
  );
}