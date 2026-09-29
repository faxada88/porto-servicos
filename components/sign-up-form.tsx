"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Compass,
  MapPin,
  Palmtree,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";

type AccountType = "customer" | "provider";

type AccountOption = {
  id: AccountType;
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ElementType;
  benefits: string[];
};

const accountOptions: AccountOption[] = [
  {
    id: "customer",
    eyebrow: "Para quem visita",
    title: "Quero explorar Porto Seguro",
    description:
      "Crie sua conta para descobrir passeios, praias, gastronomia, transporte, eventos e experiências durante sua viagem.",
    icon: Compass,
    benefits: [
      "Descubra experiências e lugares",
      "Encontre opções para cada momento da viagem",
      "Organize tudo em um só lugar",
    ],
  },
  {
    id: "provider",
    eyebrow: "Para negócios locais",
    title: "Quero ser parceiro",
    description:
      "Apresente seu negócio ou experiência para pessoas que estão procurando o que fazer em Porto Seguro.",
    icon: BriefcaseBusiness,
    benefits: [
      "Tenha presença dentro da plataforma",
      "Apareça na categoria do seu negócio",
      "Conecte-se com novos clientes",
    ],
  },
];

export function SignUpForm() {
  const router = useRouter();

  function handleSelect(type: AccountType) {
    if (type === "customer") {
      router.push("/auth/sign-up/cliente");
      return;
    }

    router.push("/auth/sign-up/prestador");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f9fc] text-[#101828]">
      {/* DECORAÇÃO */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-32 top-[-180px] h-[420px] w-[420px] rounded-full bg-emerald-200/25 blur-3xl" />

        <div className="absolute -right-32 top-[120px] h-[420px] w-[420px] rounded-full bg-sky-200/20 blur-3xl" />

        <div className="absolute bottom-[-220px] left-1/2 h-[440px] w-[700px] -translate-x-1/2 rounded-full bg-emerald-100/25 blur-3xl" />
      </div>

      {/* HEADER */}
      <header className="relative z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="group flex items-center gap-2"
            aria-label="Voltar para Porto Serviços"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#101828] text-white shadow-sm transition-transform duration-300 group-hover:scale-105">
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
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#101828] shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <section className="relative z-10">
        <div className="mx-auto max-w-7xl px-5 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-12 lg:px-8 lg:pb-20 lg:pt-16">
          {/* VOLTAR */}
          <div className="mx-auto max-w-5xl">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-[#101828]"
            >
              <ArrowLeft
                size={17}
                className="transition-transform group-hover:-translate-x-0.5"
              />
              Voltar
            </Link>
          </div>

          {/* HERO */}
          <div className="mx-auto mt-8 max-w-3xl text-center sm:mt-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3.5 py-2 text-xs font-extrabold text-emerald-700 shadow-sm backdrop-blur">
              <MapPin size={15} />
              Porto Seguro, Bahia
            </div>

            <h1 className="mx-auto mt-5 max-w-3xl text-[34px] font-black leading-[1.08] tracking-[-0.05em] text-[#101828] sm:text-5xl lg:text-[54px]">
              Como você quer viver a{" "}
              <span className="relative whitespace-nowrap">
                Porto
                <span className="text-emerald-500">Serviços</span>?
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-7 text-slate-500 sm:text-base">
              Escolha como deseja usar a plataforma. Você pode explorar Porto
              Seguro como viajante ou apresentar seu negócio como parceiro
              local.
            </p>
          </div>

          {/* OPÇÕES */}
          <div className="mx-auto mt-9 grid max-w-5xl gap-5 md:grid-cols-2 lg:mt-12 lg:gap-6">
            {accountOptions.map((option) => {
              const Icon = option.icon;
              const isProvider = option.id === "provider";

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-1 text-left shadow-[0_18px_55px_-35px_rgba(15,23,42,0.35)] outline-none transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-[0_24px_65px_-30px_rgba(16,185,129,0.22)] focus-visible:ring-4 focus-visible:ring-emerald-500/20"
                >
                  <div className="relative h-full overflow-hidden rounded-[24px] p-6 sm:p-7 lg:p-8">
                    <div
                      aria-hidden="true"
                      className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-emerald-100/0 blur-3xl transition-all duration-500 group-hover:bg-emerald-100/70"
                    />

                    {/* ÍCONE */}
                    <div className="relative flex items-start justify-between gap-4">
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-105 ${
                          isProvider
                            ? "bg-[#101828] text-white group-hover:bg-emerald-500"
                            : "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white"
                        }`}
                      >
                        <Icon size={25} strokeWidth={2.2} />
                      </div>

                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-all duration-300 group-hover:border-emerald-200 group-hover:bg-emerald-50 group-hover:text-emerald-600">
                        <ChevronRight
                          size={19}
                          className="transition-transform duration-300 group-hover:translate-x-0.5"
                        />
                      </div>
                    </div>

                    {/* DESCRIÇÃO */}
                    <div className="relative mt-7">
                      <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-emerald-600">
                        {option.eyebrow}
                      </p>

                      <h2 className="mt-2 text-[23px] font-black tracking-[-0.035em] text-[#101828] sm:text-2xl">
                        {option.title}
                      </h2>

                      <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
                        {option.description}
                      </p>
                    </div>

                    {/* BENEFÍCIOS */}
                    <div className="relative mt-7 space-y-3">
                      {option.benefits.map((benefit) => (
                        <div
                          key={benefit}
                          className="flex items-center gap-3"
                        >
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                            <Check size={14} strokeWidth={3} />
                          </div>

                          <span className="text-sm font-semibold text-slate-600">
                            {benefit}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <div className="relative mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
                      <span className="text-sm font-extrabold text-[#101828] transition-colors group-hover:text-emerald-600">
                        {isProvider
                          ? "Cadastrar como parceiro"
                          : "Criar conta de viajante"}
                      </span>

                      <ArrowRight
                        size={18}
                        className="text-slate-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-emerald-600"
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* CONFIANÇA */}
          <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-x-7 gap-y-3 text-xs font-semibold text-slate-500 sm:mt-10 sm:text-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck size={17} className="text-emerald-500" />
              Cadastro seguro
            </div>

            <div className="flex items-center gap-2">
              <BadgeCheck size={17} className="text-emerald-500" />
              Parceiros passam por análise
            </div>

            <div className="flex items-center gap-2">
              <UsersRound size={17} className="text-emerald-500" />
              Experiência personalizada
            </div>
          </div>

          {/* INFORMAÇÃO MOBILE */}
          <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-slate-200/80 bg-white/70 p-4 backdrop-blur md:hidden">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <UserRound size={18} />
              </div>

              <p className="text-xs leading-5 text-slate-500">
                Viajantes têm acesso à plataforma após o cadastro. Parceiros
                locais passam por análise antes de terem seu perfil publicado.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* RODAPÉ */}
      <footer className="relative z-10 border-t border-slate-200/70 bg-white/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-5 text-xs font-medium text-slate-400 sm:flex-row sm:px-6 lg:px-8">
          <span>© 2026 Porto Serviços</span>

          <span className="flex items-center gap-1.5">
            <Sparkles size={14} />
            Sua experiência em Porto Seguro começa aqui
          </span>
        </div>
      </footer>
    </main>
  );
}