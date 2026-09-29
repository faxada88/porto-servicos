"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Compass,
  Loader2,
  MapPin,
  Palmtree,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type SupabaseRpcError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

function getErrorText(error: SupabaseRpcError | null) {
  if (!error) {
    return "";
  }

  return [
    error.message,
    error.code,
    error.details,
    error.hint,
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
}

export default function ProviderRegistrationPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] =
    useState("");
  const [description, setDescription] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  function formatPhone(value: string) {
    const numbers = value
      .replace(/\D/g, "")
      .slice(0, 11);

    if (numbers.length <= 2) {
      return numbers;
    }

    if (numbers.length <= 6) {
      return `(${numbers.slice(
        0,
        2,
      )}) ${numbers.slice(2)}`;
    }

    if (numbers.length <= 10) {
      return `(${numbers.slice(
        0,
        2,
      )}) ${numbers.slice(
        2,
        6,
      )}-${numbers.slice(6)}`;
    }

    return `(${numbers.slice(
      0,
      2,
    )}) ${numbers.slice(
      2,
      7,
    )}-${numbers.slice(7)}`;
  }

  function handlePhoneChange(value: string) {
    setPhone(formatPhone(value));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setErrorMessage("");

    const cleanPhone = phone
      .replace(/\D/g, "")
      .trim();

    const cleanBusinessName =
      businessName.trim();

    const cleanDescription =
      description.trim();

    if (
      cleanPhone.length < 10 ||
      cleanPhone.length > 11
    ) {
      setErrorMessage(
        "Informe um telefone válido com DDD.",
      );
      return;
    }

    if (cleanBusinessName.length < 2) {
      setErrorMessage(
        "Informe o nome do seu negócio ou atividade.",
      );
      return;
    }

    if (cleanBusinessName.length > 120) {
      setErrorMessage(
        "O nome do negócio deve ter no máximo 120 caracteres.",
      );
      return;
    }

    if (cleanDescription.length < 10) {
      setErrorMessage(
        "Conte um pouco mais sobre seu negócio, atividade ou experiência.",
      );
      return;
    }

    if (cleanDescription.length > 1000) {
      setErrorMessage(
        "A descrição deve ter no máximo 1000 caracteres.",
      );
      return;
    }

    setLoading(true);

    try {
      /*
       * Neste primeiro cadastro usamos o RPC já existente
       * responsável por criar o provider_profile.
       *
       * O fluxo comercial completo e as experiências do
       * parceiro continuam separados deste cadastro inicial.
       */
      const { error } = await supabase.rpc(
        "request_provider_onboarding",
        {
          target_phone: cleanPhone,
          target_business_name:
            cleanBusinessName,
          target_description:
            cleanDescription,
        },
      );

      if (error) {
        const errorText =
          getErrorText(error);

        console.error(
          "Erro no cadastro de parceiro:",
          error.message,
          error.code,
          error.details,
          error.hint,
        );

        if (
          errorText.includes(
            "PROVIDER_PROFILE_ALREADY_EXISTS",
          )
        ) {
          /*
           * Se o cadastro já existe, não devemos tentar
           * recriá-lo. O usuário deve seguir para o status
           * da parceria.
           */
          router.replace(
            "/protected/prestador/status",
          );
          router.refresh();
          return;
        }

        if (
          errorText.includes(
            "UNAUTHENTICATED",
          ) ||
          errorText.includes(
            "JWT",
          ) ||
          errorText.includes(
            "AUTH",
          )
        ) {
          router.replace("/auth/login");
          router.refresh();
          return;
        }

        if (
          errorText.includes(
            "FUNCTION",
          ) &&
          errorText.includes(
            "NOT",
          )
        ) {
          setErrorMessage(
            "O cadastro de parceiros ainda não está disponível. Atualize a página e tente novamente.",
          );
          return;
        }

        if (
          errorText.includes(
            "PERMISSION",
          ) ||
          errorText.includes(
            "DENIED",
          )
        ) {
          setErrorMessage(
            "Sua conta não possui permissão para concluir este cadastro.",
          );
          return;
        }

        setErrorMessage(
          error.message ||
            "Não foi possível enviar seu cadastro. Tente novamente.",
        );

        return;
      }

      setSuccess(true);

      router.refresh();
    } catch (error) {
      console.error(
        "Falha inesperada no cadastro de parceiro:",
        error,
      );

      setErrorMessage(
        "Ocorreu uma falha inesperada ao enviar seu cadastro. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#f8fafc] px-5 py-10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-emerald-100/60 blur-3xl" />
          <div className="absolute -right-52 top-32 h-[520px] w-[520px] rounded-full bg-sky-100/50 blur-3xl" />
        </div>

        <div className="relative mx-auto flex min-h-[80vh] max-w-xl items-center justify-center">
          <div className="w-full overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_90px_-35px_rgba(15,23,42,0.25)]">
            <div className="bg-[#101828] px-7 py-8 text-center text-white sm:px-10 sm:py-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
                <CheckCircle2 size={32} />
              </div>

              <p className="mt-6 text-sm font-extrabold uppercase tracking-[0.14em] text-emerald-400">
                Cadastro enviado
              </p>

              <h1 className="mt-2 text-2xl font-black tracking-[-0.035em] sm:text-3xl">
                Recebemos sua solicitação de
                parceria.
              </h1>

              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-300 sm:text-base">
                Seu negócio foi cadastrado e
                agora seguirá para análise antes
                de aparecer aos viajantes na
                Porto Serviços.
              </p>
            </div>

            <div className="p-7 sm:p-9">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    size={20}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />

                  <div>
                    <p className="text-sm font-extrabold text-amber-950">
                      Aprovação pendente
                    </p>

                    <p className="mt-1 text-sm leading-6 text-amber-800/80">
                      A presença do seu negócio
                      como parceiro será liberada
                      depois da aprovação do
                      cadastro.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 text-left">
                <div className="flex items-start gap-3">
                  <Compass
                    size={20}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />

                  <div>
                    <p className="text-sm font-extrabold text-emerald-950">
                      Continue explorando Porto
                      Seguro
                    </p>

                    <p className="mt-1 text-sm leading-6 text-emerald-800/75">
                      Enquanto seu cadastro é
                      analisado, sua conta continua
                      disponível para explorar a
                      plataforma normalmente.
                    </p>
                  </div>
                </div>
              </div>

              <Link
                href="/protected/prestador/status"
                className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#101828] px-5 text-sm font-extrabold text-white transition hover:bg-emerald-600"
              >
                Acompanhar análise
                <ArrowRight size={17} />
              </Link>

              <Link
                href="/protected"
                className="mt-3 flex h-11 w-full items-center justify-center text-sm font-bold text-slate-500 transition hover:text-slate-900"
              >
                Voltar para explorar
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8fafc] text-[#101828]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-[520px] w-[520px] rounded-full bg-emerald-100/50 blur-3xl" />
        <div className="absolute -right-52 top-80 h-[520px] w-[520px] rounded-full bg-sky-100/40 blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link
            href="/protected"
            className="flex items-center gap-2.5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
              <Palmtree size={20} />
            </span>

            <span className="text-[22px] font-black tracking-[-0.045em] text-[#101828]">
              Porto
              <span className="text-emerald-500">
                Serviços
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3.5 py-2 text-xs font-extrabold text-emerald-700">
            <ShieldCheck size={15} />

            <span className="hidden sm:inline">
              Cadastro protegido
            </span>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
        <Link
          href="/protected"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={17} />
          Voltar
        </Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <section className="lg:pt-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-extrabold text-emerald-700">
              <BadgeCheck size={15} />
              Seja parceiro Porto Serviços
            </div>

            <h1 className="mt-5 max-w-xl text-3xl font-black leading-[1.08] tracking-[-0.045em] text-[#101828] sm:text-4xl lg:text-5xl">
              Seu negócio pode fazer parte da
              viagem.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-500">
              Apresente seu negócio, atividade ou
              experiência para viajantes que estão
              descobrindo o que fazer em Porto
              Seguro.
            </p>

            <div className="mt-8 space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Users size={20} />
                </div>

                <div>
                  <p className="font-extrabold text-[#101828]">
                    Alcance novos viajantes
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Apresente seu negócio para
                    pessoas procurando experiências
                    e opções durante a viagem.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <MapPin size={20} />
                </div>

                <div>
                  <p className="font-extrabold text-[#101828]">
                    Presença em Porto Seguro
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Faça parte de uma plataforma
                    focada em conectar viajantes a
                    opções locais.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <BadgeCheck size={20} />
                </div>

                <div>
                  <p className="font-extrabold text-[#101828]">
                    Parceria analisada
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    O cadastro passa por análise
                    antes que o negócio seja
                    disponibilizado aos viajantes.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-9 rounded-[24px] border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="flex items-start gap-3">
                <Sparkles
                  size={20}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />

                <div>
                  <p className="text-sm font-extrabold text-slate-900">
                    Sua conta continua a mesma
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Você pode continuar explorando
                    a Porto Serviços normalmente
                    enquanto solicita a ativação
                    como parceiro.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.3)] sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <BriefcaseBusiness size={22} />
              </div>

              <div className="mt-5">
                <p className="text-sm font-extrabold text-emerald-600">
                  Cadastro de parceiro
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] text-[#101828]">
                  Apresente seu negócio
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Conte um pouco sobre sua
                  atividade. Essas informações
                  iniciarão a análise da sua
                  parceria.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="mt-8 space-y-6"
              >
                <div>
                  <label
                    htmlFor="phone"
                    className="text-sm font-extrabold text-slate-700"
                  >
                    Telefone com DDD
                  </label>

                  <div className="mt-2 flex h-14 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10">
                    <Phone
                      size={19}
                      className="shrink-0 text-slate-400"
                    />

                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      value={phone}
                      onChange={(event) =>
                        handlePhoneChange(
                          event.target.value,
                        )
                      }
                      placeholder="(73) 99999-9999"
                      className="h-full w-full bg-transparent text-base outline-none placeholder:text-slate-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="businessName"
                    className="text-sm font-extrabold text-slate-700"
                  >
                    Nome do negócio ou atividade
                  </label>

                  <div className="mt-2 flex h-14 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10">
                    <BriefcaseBusiness
                      size={19}
                      className="shrink-0 text-slate-400"
                    />

                    <input
                      id="businessName"
                      type="text"
                      autoComplete="organization"
                      value={businessName}
                      onChange={(event) =>
                        setBusinessName(
                          event.target.value,
                        )
                      }
                      placeholder="Ex.: Passeios Porto Azul"
                      maxLength={120}
                      className="h-full w-full bg-transparent text-base outline-none placeholder:text-slate-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-4">
                    <label
                      htmlFor="description"
                      className="text-sm font-extrabold text-slate-700"
                    >
                      Sobre seu negócio
                    </label>

                    <span className="text-xs font-semibold text-slate-400">
                      {description.length}/1000
                    </span>
                  </div>

                  <textarea
                    id="description"
                    value={description}
                    onChange={(event) =>
                      setDescription(
                        event.target.value,
                      )
                    }
                    placeholder="Conte o que seu negócio oferece, quais experiências ou atividades realiza e o que o viajante pode esperar."
                    maxLength={1000}
                    rows={6}
                    className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-base leading-6 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    required
                  />
                </div>

                {errorMessage ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700"
                  >
                    {errorMessage}
                  </div>
                ) : null}

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      size={20}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />

                    <p className="text-sm leading-6 text-emerald-900/80">
                      Ao enviar, sua parceria
                      ficará{" "}
                      <strong className="text-emerald-950">
                        pendente de análise
                      </strong>
                      . Seu negócio só aparecerá
                      para os viajantes depois da
                      aprovação.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#101828] px-6 text-sm font-extrabold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Enviando cadastro...
                    </>
                  ) : (
                    <>
                      Enviar para análise
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-center text-xs font-semibold text-slate-400">
              <MapPin size={13} />
              Porto Seguro, Bahia
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}