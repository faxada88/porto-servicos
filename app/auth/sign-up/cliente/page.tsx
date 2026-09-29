import { CustomerSignUpForm } from "@/components/customer-sign-up-form";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Compass,
  LockKeyhole,
  MapPin,
  Palmtree,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function CustomerSignUpPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f9fc] text-[#101828]">
      {/* FUNDO */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-emerald-200/20 blur-3xl" />
        <div className="absolute -right-40 top-32 h-[420px] w-[420px] rounded-full bg-sky-200/20 blur-3xl" />
        <div className="absolute bottom-[-240px] left-1/2 h-[480px] w-[760px] -translate-x-1/2 rounded-full bg-emerald-100/20 blur-3xl" />
      </div>

      {/* HEADER */}
      <header className="relative z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="group flex items-center gap-2"
            aria-label="Porto Serviços"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#101828] text-white shadow-sm transition-transform group-hover:scale-105">
              <Palmtree size={18} strokeWidth={2.5} />
            </div>

            <span className="text-[21px] font-black tracking-[-0.045em]">
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
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm transition hover:bg-slate-50"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <div className="relative z-10 mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8 lg:py-12">
        <Link
          href="/auth/sign-up"
          className="group inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-[#101828]"
        >
          <ArrowLeft
            size={17}
            className="transition-transform group-hover:-translate-x-0.5"
          />
          Escolher outro perfil
        </Link>

        <div className="mt-8 grid items-start gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16">
          {/* LADO ESQUERDO */}
          <section className="lg:sticky lg:top-28 lg:pt-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-extrabold text-emerald-700 shadow-sm">
              <MapPin size={15} />
              Sua experiência em Porto Seguro
            </div>

            <h1 className="mt-5 max-w-xl text-[38px] font-black leading-[1.05] tracking-[-0.05em] sm:text-5xl lg:text-[54px]">
              Sua viagem começa{" "}
              <span className="text-emerald-500">aqui.</span>
            </h1>

            <p className="mt-5 max-w-lg text-[15px] leading-7 text-slate-500 sm:text-base">
              Crie sua conta para descobrir experiências, lugares e opções
              para aproveitar Porto Seguro de um jeito mais simples.
            </p>

            <div className="mt-9 space-y-5">
              {/* BENEFÍCIO 1 */}
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Compass size={20} />
                </div>

                <div>
                  <p className="font-extrabold">
                    Descubra o que fazer
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Explore passeios, praias, gastronomia, vida noturna,
                    transporte e experiências locais.
                  </p>
                </div>
              </div>

              {/* BENEFÍCIO 2 */}
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <BadgeCheck size={20} />
                </div>

                <div>
                  <p className="font-extrabold">
                    Encontre parceiros locais
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Descubra negócios e profissionais da região reunidos em
                    uma plataforma pensada para quem visita Porto Seguro.
                  </p>
                </div>
              </div>

              {/* BENEFÍCIO 3 */}
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Sparkles size={20} />
                </div>

                <div>
                  <p className="font-extrabold">
                    Aproveite mais sua viagem
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Menos tempo procurando e mais tempo descobrindo tudo o
                    que Porto Seguro tem para oferecer.
                  </p>
                </div>
              </div>
            </div>

            {/* SEGURANÇA */}
            <div className="mt-9 hidden max-w-lg rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur sm:block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#101828] text-white">
                  <LockKeyhole size={18} />
                </div>

                <div>
                  <p className="text-sm font-extrabold">
                    Seus dados protegidos
                  </p>

                  <p className="mt-0.5 text-xs leading-5 text-slate-500">
                    Sua conta utiliza a autenticação segura da plataforma.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CARD DO CADASTRO */}
          <section>
            <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_70px_-38px_rgba(15,23,42,0.35)]">
              {/* CABEÇALHO */}
              <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-emerald-600">
                      Sua conta
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Comece sua experiência
                    </p>
                  </div>

                  <div
                    className="flex items-center gap-2"
                    aria-label="Etapa 1 de 2"
                  >
                    <div className="h-2 w-10 rounded-full bg-emerald-500" />
                    <div className="h-2 w-10 rounded-full bg-slate-100" />
                  </div>
                </div>
              </div>

              {/* FORMULÁRIO */}
              <div className="p-6 sm:p-8 lg:p-9">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Compass size={22} />
                </div>

                <p className="mt-6 text-sm font-bold text-emerald-600">
                  Passo 1 de 2
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-[-0.035em] sm:text-[30px]">
                  Crie sua conta de viajante
                </h2>

                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
                  Informe seus dados para acessar a Porto Serviços e começar
                  a explorar Porto Seguro.
                </p>

                <CustomerSignUpForm />
              </div>
            </div>

            {/* SEGURANÇA */}
            <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
              <ShieldCheck size={15} />
              Ambiente protegido para criação da sua conta
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}