import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Compass,
  MapPin,
  Palmtree,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { ProviderSignUpForm } from "@/components/provider-sign-up-form";

export default function ProviderSignUpPage() {
  return (
    <main className="min-h-screen bg-[#f7f9fb] text-[#101828]">
      {/* HEADER */}
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex min-h-[76px] w-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link
            href="/"
            className="group flex items-center gap-2"
            aria-label="Porto Serviços"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#101828] text-white shadow-sm transition-transform group-hover:scale-105">
              <Palmtree size={18} strokeWidth={2.5} />
            </div>

            <span className="text-[21px] font-black tracking-[-0.045em] text-[#101828]">
              Porto
              <span className="text-emerald-500">Serviços</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-medium text-slate-500 sm:block">
              Já possui uma conta?
            </span>

            <Link
              href="/auth/login"
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <section className="mx-auto grid w-full max-w-[1440px] grid-cols-1 lg:min-h-[calc(100vh-77px)] lg:grid-cols-[0.88fr_1.12fr]">
        {/* LADO ESQUERDO */}
        <aside className="relative overflow-hidden border-b border-slate-200 bg-[#101828] px-6 py-12 text-white sm:px-10 lg:border-b-0 lg:border-r lg:border-slate-800 lg:px-12 lg:py-16 xl:px-16">
          <div className="pointer-events-none absolute -left-28 top-[-100px] h-[360px] w-[360px] rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-36 -right-28 h-[420px] w-[420px] rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative mx-auto flex h-full max-w-[560px] flex-col">
            <Link
              href="/auth/sign-up"
              className="mb-12 inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-white"
            >
              <ArrowLeft size={17} />
              Voltar para escolher o tipo de conta
            </Link>

            <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10">
              <BriefcaseBusiness
                size={27}
                className="text-emerald-400"
                strokeWidth={2}
              />
            </div>

            <div className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.18em] text-emerald-400">
              <MapPin size={15} />
              Parceiros de Porto Seguro
            </div>

            <h1 className="max-w-[520px] text-4xl font-black leading-[1.08] tracking-[-1.8px] sm:text-5xl">
              Faça parte da experiência de quem visita Porto Seguro.
            </h1>

            <p className="mt-6 max-w-[520px] text-base leading-7 text-slate-300 sm:text-lg">
              Cadastre seu negócio, atividade ou experiência e conecte-se com
              viajantes que estão procurando o que fazer, onde ir e o que
              conhecer na região.
            </p>

            <div className="mt-10 grid gap-4">
              {/* BENEFÍCIO 1 */}
              <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10">
                  <Users size={20} className="text-emerald-400" />
                </div>

                <div>
                  <h2 className="font-bold text-white">
                    Alcance novos clientes
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Apresente seu negócio para viajantes interessados em
                    experiências e opções disponíveis em Porto Seguro.
                  </p>
                </div>
              </div>

              {/* BENEFÍCIO 2 */}
              <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10">
                  <Compass size={20} className="text-emerald-400" />
                </div>

                <div>
                  <h2 className="font-bold text-white">
                    Apareça onde o turista procura
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Seu negócio poderá aparecer na categoria correspondente
                    dentro da experiência de descoberta da plataforma.
                  </p>
                </div>
              </div>

              {/* BENEFÍCIO 3 */}
              <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10">
                  <BadgeCheck size={20} className="text-emerald-400" />
                </div>

                <div>
                  <h2 className="font-bold text-white">
                    Mais confiança para quem escolhe
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Os cadastros passam por análise antes da publicação,
                    ajudando a construir uma plataforma mais confiável.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 pt-7 text-xs font-semibold text-slate-400">
              <span className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" />
                Cadastro protegido
              </span>

              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                Análise administrativa
              </span>

              <span className="flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-400" />
                Presença na plataforma
              </span>
            </div>
          </div>
        </aside>

        {/* LADO DIREITO */}
        <div className="flex items-start justify-center px-5 py-10 sm:px-8 lg:px-12 lg:py-14 xl:px-16">
          <div className="w-full max-w-[720px]">
            {/* PROGRESSO */}
            <div className="mb-8">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-extrabold text-emerald-600">
                    Cadastro de parceiro
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Conte um pouco sobre você e o que deseja apresentar na
                    plataforma.
                  </p>
                </div>

                <div className="hidden rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700 sm:block">
                  Parceiro
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="h-1.5 rounded-full bg-emerald-500" />

                  <p className="mt-2 text-xs font-bold text-slate-800">
                    Sua conta
                  </p>
                </div>

                <div>
                  <div className="h-1.5 rounded-full bg-slate-200" />

                  <p className="mt-2 text-xs font-semibold text-slate-400">
                    Seu negócio
                  </p>
                </div>

                <div>
                  <div className="h-1.5 rounded-full bg-slate-200" />

                  <p className="mt-2 text-xs font-semibold text-slate-400">
                    Sua oferta
                  </p>
                </div>
              </div>
            </div>

            {/* CARD DO FORMULÁRIO */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-8 lg:p-10">
              <div className="mb-8">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700">
                  <Sparkles size={14} />
                  Seja parceiro Porto Serviços
                </div>

                <h2 className="text-3xl font-black tracking-[-1.2px] text-[#101828]">
                  Apresente seu negócio
                </h2>

                <p className="mt-3 max-w-[600px] text-sm leading-6 text-slate-500">
                  Começaremos pelos seus dados. Depois você poderá informar
                  seu negócio, escolher uma categoria e cadastrar sua primeira
                  experiência ou oferta.
                </p>
              </div>

              <ProviderSignUpForm />
            </div>

            <div className="mx-auto mt-6 flex max-w-[600px] items-start justify-center gap-2 text-center text-xs leading-5 text-slate-400">
              <ShieldCheck size={15} className="mt-0.5 shrink-0" />

              <p>
                Seus dados serão utilizados para criar e analisar seu cadastro
                de parceiro antes da publicação na Porto Serviços.
              </p>
            </div>

            <p className="mt-3 text-center text-xs text-slate-400">
              © 2026 Porto Serviços
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}