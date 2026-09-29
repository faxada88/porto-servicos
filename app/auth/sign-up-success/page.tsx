import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock3,
  Compass,
  Home,
  MailCheck,
  MapPin,
  Palmtree,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type SignUpSuccessPageProps = {
  searchParams: Promise<{
    tipo?: string;
    status?: string;
  }>;
};

function SuccessPageLoading() {
  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="flex flex-col items-center">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />

          <p className="mt-4 text-sm font-bold text-slate-500">
            Preparando sua experiência...
          </p>
        </div>
      </div>
    </main>
  );
}

async function SignUpSuccessContent({
  searchParams,
}: SignUpSuccessPageProps) {
  const params = await searchParams;

  const isProvider = params.tipo === "prestador";
  const isPending =
    isProvider && params.status === "pending";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8fafc] text-[#101828]">
      {/* FUNDO */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="absolute -right-52 top-32 h-[520px] w-[520px] rounded-full bg-sky-100/50 blur-3xl" />
        <div className="absolute bottom-[-260px] left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-emerald-50 blur-3xl" />
      </div>

      {/* HEADER */}
      <header className="relative z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link
            href="/"
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

          <div className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3.5 py-2 text-xs font-extrabold text-emerald-700 sm:flex">
            <MapPin size={15} />
            Porto Seguro, Bahia
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-72px)] max-w-7xl items-center justify-center px-5 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="w-full max-w-[1040px]">
          <div className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_30px_90px_-35px_rgba(15,23,42,0.22)]">
            <div className="grid lg:grid-cols-[0.88fr_1.12fr]">
              {/* LADO ESQUERDO */}
              <div className="relative overflow-hidden bg-[#101828] px-7 py-9 text-white sm:px-10 sm:py-11 lg:px-11 lg:py-12">
                <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-32 -left-28 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

                <div className="relative">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3.5 py-2 text-xs font-extrabold text-emerald-300">
                    {isProvider ? (
                      <BadgeCheck size={14} />
                    ) : (
                      <Compass size={14} />
                    )}

                    {isProvider
                      ? "Parceiros Porto Serviços"
                      : "Explore Porto Seguro"}
                  </div>

                  <div className="mt-9 flex h-[76px] w-[76px] items-center justify-center rounded-[24px] border border-emerald-400/20 bg-emerald-400/10 shadow-[0_20px_50px_-20px_rgba(16,185,129,0.7)]">
                    {isPending ? (
                      <Clock3
                        size={36}
                        strokeWidth={2.2}
                        className="text-emerald-400"
                      />
                    ) : (
                      <CheckCircle2
                        size={38}
                        strokeWidth={2.2}
                        className="text-emerald-400"
                      />
                    )}
                  </div>

                  <p className="mt-8 text-sm font-extrabold uppercase tracking-[0.16em] text-emerald-400">
                    {isPending
                      ? "Cadastro recebido"
                      : "Tudo pronto"}
                  </p>

                  <h1 className="mt-3 max-w-sm text-[34px] font-black leading-[1.08] tracking-[-0.045em] sm:text-[40px]">
                    {isPending
                      ? "Seu negócio está a caminho da Porto Serviços."
                      : isProvider
                        ? "Sua conta de parceiro foi criada."
                        : "Sua viagem começa por aqui."}
                  </h1>

                  <p className="mt-5 max-w-sm text-[15px] leading-7 text-slate-300">
                    {isPending
                      ? "Recebemos as informações do seu negócio e da sua primeira oferta. Agora elas seguirão para análise antes de aparecerem para os viajantes."
                      : isProvider
                        ? "Seu acesso foi criado. Acompanhe as próximas etapas para começar a apresentar seu negócio aos viajantes."
                        : "Sua conta está pronta para descobrir experiências, lugares e opções para aproveitar Porto Seguro."}
                  </p>

                  {isPending && (
                    <div className="mt-9 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                      <div className="flex items-start gap-3">
                        <ShieldCheck
                          size={20}
                          className="mt-0.5 shrink-0 text-emerald-400"
                        />

                        <div>
                          <p className="text-sm font-extrabold text-white">
                            Parceiros passam por análise
                          </p>

                          <p className="mt-1.5 text-xs leading-5 text-slate-400">
                            Seu negócio e sua oferta só poderão
                            aparecer para os viajantes depois
                            da aprovação do cadastro.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* LADO DIREITO */}
              <div className="px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
                {isPending ? (
                  <>
                    <div>
                      <span className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600">
                        Próximos passos
                      </span>

                      <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-[#101828] sm:text-[28px]">
                        Agora é com a gente.
                      </h2>

                      <p className="mt-3 max-w-lg text-sm leading-6 text-slate-500">
                        Você concluiu seu cadastro. Seu negócio
                        e sua primeira oferta estão aguardando
                        análise antes da publicação.
                      </p>
                    </div>

                    {/* TIMELINE */}
                    <div className="mt-8">
                      <TimelineItem
                        icon={
                          <Check
                            size={17}
                            strokeWidth={3}
                          />
                        }
                        title="Cadastro enviado"
                        description="Recebemos seus dados e as informações do seu negócio."
                        completed
                        showLine
                      />

                      <TimelineItem
                        icon={<Clock3 size={18} />}
                        title="Análise do parceiro"
                        description="A Porto Serviços verifica as informações enviadas."
                        active
                        showLine
                      />

                      <TimelineItem
                        icon={<BadgeCheck size={18} />}
                        title="Parceiro aprovado"
                        description="Após a aprovação, seu negócio fica apto a aparecer na plataforma."
                        showLine
                      />

                      <TimelineItem
                        icon={<Sparkles size={18} />}
                        title="Oferta publicada"
                        description="Sua experiência, atividade ou oferta poderá aparecer aos viajantes na categoria escolhida."
                      />
                    </div>

                    <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                      <div className="flex items-start gap-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200">
                          <MailCheck size={19} />
                        </div>

                        <div>
                          <p className="text-sm font-extrabold text-slate-800">
                            Acompanhe seu cadastro
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            O status será atualizado assim que
                            a análise do seu cadastro de
                            parceiro for concluída.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-7 grid gap-3 sm:grid-cols-2">
                      <Link
                        href="/protected"
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#101828] px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-slate-800"
                      >
                        Acompanhar cadastro
                        <ArrowRight size={17} />
                      </Link>

                      <Link
                        href="/"
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Home size={17} />
                        Página inicial
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                      {isProvider ? (
                        <BadgeCheck size={27} />
                      ) : (
                        <Compass size={27} />
                      )}
                    </div>

                    <span className="mt-7 block text-xs font-black uppercase tracking-[0.14em] text-emerald-600">
                      Cadastro concluído
                    </span>

                    <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-[#101828] sm:text-[28px]">
                      {isProvider
                        ? "Bem-vindo à Porto Serviços."
                        : "Porto Seguro está esperando por você."}
                    </h2>

                    <p className="mt-4 max-w-lg text-sm leading-7 text-slate-500">
                      {isProvider
                        ? "Sua conta foi criada. Acompanhe seu cadastro para saber quando seu negócio estiver pronto para aparecer aos viajantes."
                        : "Sua conta está pronta. Explore passeios, praias, gastronomia, bares, experiências e muito mais em Porto Seguro."}
                    </p>

                    <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
                      <div className="flex items-start gap-3">
                        {isProvider ? (
                          <ShieldCheck
                            size={20}
                            className="mt-0.5 shrink-0 text-emerald-600"
                          />
                        ) : (
                          <Palmtree
                            size={20}
                            className="mt-0.5 shrink-0 text-emerald-600"
                          />
                        )}

                        <div>
                          <p className="text-sm font-extrabold text-emerald-900">
                            {isProvider
                              ? "Seu acesso foi criado com segurança"
                              : "Tudo em um só lugar"}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-emerald-800/75">
                            {isProvider
                              ? "Seus dados foram registrados e sua conta já faz parte da Porto Serviços."
                              : "Descubra opções para aproveitar melhor sua estadia e encontrar experiências locais."}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                      <Link
                        href="/protected"
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#101828] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800"
                      >
                        {isProvider
                          ? "Continuar"
                          : "Explorar Porto Seguro"}
                        <ArrowRight size={17} />
                      </Link>

                      <Link
                        href="/"
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Home size={17} />
                        Página inicial
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center justify-center gap-2 text-center text-xs font-medium text-slate-400 sm:flex-row sm:gap-3">
            <span>© 2026 Porto Serviços</span>

            <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />

            <span className="inline-flex items-center gap-1.5">
              <MapPin size={12} />
              Descubra, viva e aproveite Porto Seguro.
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function SignUpSuccessPage({
  searchParams,
}: SignUpSuccessPageProps) {
  return (
    <Suspense fallback={<SuccessPageLoading />}>
      <SignUpSuccessContent
        searchParams={searchParams}
      />
    </Suspense>
  );
}

function TimelineItem({
  icon,
  title,
  description,
  completed = false,
  active = false,
  showLine = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  completed?: boolean;
  active?: boolean;
  showLine?: boolean;
}) {
  return (
    <div className="relative flex gap-4 pb-7 last:pb-0">
      {showLine && (
        <div
          className={`absolute left-[19px] top-10 h-[calc(100%-20px)] w-px ${
            completed
              ? "bg-emerald-300"
              : "bg-slate-200"
          }`}
        />
      )}

      <div
        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
          completed
            ? "border-emerald-500 bg-emerald-500 text-white shadow-[0_8px_20px_-8px_rgba(16,185,129,0.7)]"
            : active
              ? "border-emerald-200 bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50"
              : "border-slate-200 bg-white text-slate-400"
        }`}
      >
        {icon}
      </div>

      <div className="pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={`text-sm font-extrabold ${
              completed || active
                ? "text-slate-900"
                : "text-slate-600"
            }`}
          >
            {title}
          </p>

          {completed && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
              Concluído
            </span>
          )}

          {active && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-700">
              Em análise
            </span>
          )}
        </div>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}