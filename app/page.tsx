import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  Camera,
  Car,
  CheckCircle2,
  Compass,
  Headphones,
  Heart,
  MapPin,
  Martini,
  Music2,
  Palmtree,
  Search,
  ShieldCheck,
  Ship,
  Sparkles,
  Star,
  Ticket,
  UtensilsCrossed,
  Waves,
} from "lucide-react";

const categories = [
  {
    icon: Compass,
    name: "Passeios",
    description: "Experiências",
  },
  {
    icon: Palmtree,
    name: "Praias",
    description: "Barracas & lazer",
  },
  {
    icon: UtensilsCrossed,
    name: "Gastronomia",
    description: "Onde comer",
  },
  {
    icon: Martini,
    name: "Bares",
    description: "Vida noturna",
  },
  {
    icon: Music2,
    name: "Música",
    description: "Ao vivo & eventos",
  },
  {
    icon: Car,
    name: "Transfers",
    description: "Transporte",
  },
  {
    icon: Ship,
    name: "Barcos",
    description: "Mar & escunas",
  },
  {
    icon: Waves,
    name: "Aventura",
    description: "Mergulho & mais",
  },
];

const experiences = [
  {
    icon: Palmtree,
    eyebrow: "PRAIA & LAZER",
    title: "Barracas de praia",
    description:
      "Descubra lugares para aproveitar o dia, comer bem e curtir o melhor do litoral.",
  },
  {
    icon: Ship,
    eyebrow: "MAR & EXPERIÊNCIAS",
    title: "Passeios de barco",
    description:
      "Encontre experiências náuticas e opções para conhecer a região por outro ângulo.",
  },
  {
    icon: Music2,
    eyebrow: "NOITE & ENTRETENIMENTO",
    title: "Música ao vivo",
    description:
      "Descubra bares, eventos e lugares para aproveitar a noite em Porto Seguro.",
  },
];

const benefits = [
  {
    icon: Compass,
    title: "Descubra",
    description:
      "Encontre experiências, lugares e serviços turísticos em poucos segundos.",
  },
  {
    icon: ShieldCheck,
    title: "Escolha com confiança",
    description:
      "Conheça as opções disponíveis e encontre parceiros para sua viagem.",
  },
  {
    icon: CalendarCheck2,
    title: "Organize sua experiência",
    description:
      "Centralize suas escolhas e aproveite Porto Seguro com mais praticidade.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8fafc] text-[#101828]">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[74px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link
            href="/"
            className="text-[22px] font-black tracking-[-0.045em]"
          >
            Porto
            <span className="text-emerald-500">
              Serviços
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-bold text-slate-600 md:flex">
            <Link
              href="#explorar"
              className="transition hover:text-slate-950"
            >
              Explorar
            </Link>

            <Link
              href="#experiencias"
              className="transition hover:text-slate-950"
            >
              Experiências
            </Link>

            <Link
              href="#como-funciona"
              className="transition hover:text-slate-950"
            >
              Como funciona
            </Link>

            <Link
              href="#parceiros"
              className="transition hover:text-slate-950"
            >
              Para parceiros
            </Link>

            <div className="h-5 w-px bg-slate-200" />

            <Link
              href="/auth/login"
              className="transition hover:text-slate-950"
            >
              Entrar
            </Link>

            <Link
              href="/auth/sign-up"
              className="rounded-full bg-[#101828] px-5 py-2.5 text-white transition hover:bg-slate-800"
            >
              Criar conta
            </Link>
          </nav>

          <Link
            href="/auth/login"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold transition hover:bg-slate-50 md:hidden"
          >
            Entrar
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-white">
        <div className="pointer-events-none absolute -left-48 -top-56 h-[620px] w-[620px] rounded-full bg-emerald-100/70 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-52 -right-44 h-[580px] w-[580px] rounded-full bg-sky-100/60 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-14 md:py-20 lg:min-h-[720px] lg:grid-cols-[1.04fr_.96fr] lg:px-8">
          {/* HERO COPY */}
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
              <MapPin
                size={14}
                strokeWidth={2.5}
              />
              Seu guia para viver Porto Seguro
            </div>

            <h1 className="mt-6 text-[43px] font-black leading-[1.01] tracking-[-0.055em] sm:text-[54px] lg:text-[68px]">
              Porto Seguro
              <span className="block text-emerald-500">
                na palma da sua mão.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Descubra passeios, praias,
              gastronomia, festas, transporte e
              experiências para aproveitar cada
              momento da sua viagem.
            </p>

            {/* BUSCA */}
            <div className="mt-8 max-w-3xl rounded-[22px] border border-slate-200 bg-white p-2 shadow-[0_22px_65px_-25px_rgba(15,23,42,0.3)]">
              <div className="flex items-center">
                <div className="flex min-h-[60px] flex-1 items-center gap-3 px-3 sm:px-5">
                  <Search
                    size={21}
                    className="shrink-0 text-emerald-600"
                  />

                  <input
                    type="search"
                    aria-label="Buscar em Porto Seguro"
                    placeholder="O que você quer fazer em Porto Seguro?"
                    className="w-full min-w-0 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400 sm:text-base"
                  />
                </div>

                <Link
                  href="/auth/sign-up"
                  className="hidden h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#101828] px-7 text-sm font-black text-white transition hover:bg-slate-800 sm:flex"
                >
                  Explorar
                  <ArrowRight size={17} />
                </Link>
              </div>
            </div>

            {/* QUICK SEARCH */}
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                "Praia hoje",
                "Passeio de barco",
                "Música ao vivo",
                "Onde comer",
                "O que fazer à noite",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600"
                >
                  {item}
                </span>
              ))}
            </div>

            {/* TRUST */}
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-500">
              <span className="flex items-center gap-2">
                <BadgeCheck
                  size={17}
                  className="text-emerald-500"
                />
                Parceiros locais
              </span>

              <span className="flex items-center gap-2">
                <ShieldCheck
                  size={17}
                  className="text-emerald-500"
                />
                Mais confiança
              </span>

              <span className="flex items-center gap-2">
                <Sparkles
                  size={17}
                  className="text-emerald-500"
                />
                Tudo em um só lugar
              </span>
            </div>
          </div>

          {/* EXPERIENCE PREVIEW */}
          <div className="relative hidden lg:block">
            <div className="absolute left-12 top-10 h-[410px] w-[410px] rounded-full bg-emerald-100 blur-3xl" />

            <div className="relative ml-auto max-w-[475px] rounded-[38px] border border-slate-200/80 bg-slate-50/80 p-5 shadow-[0_35px_90px_-35px_rgba(15,23,42,0.32)] backdrop-blur">
              <div className="overflow-hidden rounded-[30px] bg-[#101828] text-white">
                <div className="relative min-h-[245px] overflow-hidden p-7">
                  <div className="absolute -right-14 -top-16 h-56 w-56 rounded-full bg-emerald-500/30 blur-3xl" />

                  <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-sky-500/20 blur-3xl" />

                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-black text-emerald-300">
                        <Sparkles size={13} />
                        Descubra Porto Seguro
                      </span>

                      <Heart
                        size={20}
                        className="text-white/80"
                      />
                    </div>

                    <div className="mt-12 flex h-16 w-16 items-center justify-center rounded-[22px] bg-white/10 backdrop-blur">
                      <Palmtree
                        size={30}
                        className="text-emerald-300"
                      />
                    </div>

                    <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
                      Experiência em destaque
                    </p>

                    <h2 className="mt-2 text-2xl font-black tracking-[-0.035em]">
                      Um dia perfeito na praia
                    </h2>
                  </div>
                </div>

                <div className="bg-white p-6 text-slate-900">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-black">
                        Explore o melhor da cidade
                      </p>

                      <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <MapPin size={13} />
                        Porto Seguro, Bahia
                      </p>
                    </div>

                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <Compass size={21} />
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <Palmtree
                        size={17}
                        className="text-emerald-600"
                      />

                      <p className="mt-2 text-[10px] font-bold text-slate-400">
                        PRAIAS
                      </p>

                      <p className="mt-0.5 text-xs font-black">
                        Descobrir
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <UtensilsCrossed
                        size={17}
                        className="text-emerald-600"
                      />

                      <p className="mt-2 text-[10px] font-bold text-slate-400">
                        SABORES
                      </p>

                      <p className="mt-0.5 text-xs font-black">
                        Explorar
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <Music2
                        size={17}
                        className="text-emerald-600"
                      />

                      <p className="mt-2 text-[10px] font-bold text-slate-400">
                        NOITE
                      </p>

                      <p className="mt-0.5 text-xs font-black">
                        Curtir
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/auth/sign-up"
                    className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-4 text-sm font-black text-white transition hover:bg-emerald-600"
                  >
                    Começar a explorar
                    <ArrowRight size={17} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIAS */}
      <section
        id="explorar"
        className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20"
      >
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="text-sm font-black text-emerald-600">
              Explore Porto Seguro
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] sm:text-3xl">
              Tudo o que sua viagem precisa.
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
              Encontre opções para aproveitar a
              cidade do café da manhã até a última
              música da noite.
            </p>
          </div>

          <Link
            href="/auth/sign-up"
            className="hidden items-center gap-1.5 text-sm font-black text-slate-500 transition hover:text-slate-900 sm:flex"
          >
            Explorar tudo
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {categories.map((category) => {
            const Icon = category.icon;

            return (
              <Link
                href="/auth/sign-up"
                key={category.name}
                className="group min-w-0 rounded-[24px] border border-slate-200 bg-white px-2 py-6 text-center transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_18px_40px_-22px_rgba(15,23,42,0.35)]"
              >
                <div className="mx-auto flex h-13 w-13 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 transition group-hover:bg-emerald-50 group-hover:text-emerald-600">
                  <Icon
                    size={23}
                    strokeWidth={2}
                  />
                </div>

                <p className="mt-4 truncate text-xs font-black sm:text-sm">
                  {category.name}
                </p>

                <p className="mt-1 hidden truncate text-[10px] font-semibold text-slate-400 lg:block">
                  {category.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* MOMENTO */}
      <section className="px-5 pb-16 lg:px-8 lg:pb-20">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[34px] bg-[#101828] px-6 py-10 text-white sm:px-10 lg:px-14 lg:py-14">
          <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-emerald-500/25 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />

          <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs font-black text-emerald-300">
                <Sparkles size={14} />
                Sua viagem começa aqui
              </div>

              <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                Chegou em Porto Seguro?
                <span className="block text-emerald-400">
                  Descubra o que fazer agora.
                </span>
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                Praia, almoço, passeio, pôr do sol
                ou vida noturna. Encontre opções
                para cada momento da sua viagem em
                um único lugar.
              </p>
            </div>

            <Link
              href="/auth/sign-up"
              className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-7 py-4 text-sm font-black text-white transition hover:bg-emerald-400"
            >
              Explorar Porto Seguro
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      {/* EXPERIÊNCIAS */}
      <section
        id="experiencias"
        className="bg-white py-16 lg:py-20"
      >
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div>
            <p className="text-sm font-black text-emerald-600">
              Inspire sua viagem
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] sm:text-3xl">
              Experiências para aproveitar mais.
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
              Do dia na praia à noite na cidade,
              encontre ideias para montar momentos
              inesquecíveis em Porto Seguro.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {experiences.map((experience) => {
              const Icon = experience.icon;

              return (
                <article
                  key={experience.title}
                  className="group rounded-[28px] border border-slate-200 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(15,23,42,0.35)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-emerald-50 text-emerald-600">
                      <Icon
                        size={25}
                        strokeWidth={2}
                      />
                    </div>

                    <Heart
                      size={19}
                      className="text-slate-300"
                    />
                  </div>

                  <p className="mt-6 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-600">
                    {experience.eyebrow}
                  </p>

                  <h3 className="mt-2 text-xl font-black tracking-[-0.025em]">
                    {experience.title}
                  </h3>

                  <p className="mt-3 min-h-[72px] text-sm leading-6 text-slate-500">
                    {experience.description}
                  </p>

                  <Link
                    href="/auth/sign-up"
                    className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5 text-sm font-black text-slate-700 transition group-hover:text-emerald-700"
                  >
                    Descobrir opções

                    <ArrowRight
                      size={18}
                      className="transition group-hover:translate-x-1"
                    />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* CONFIANÇA */}
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
        <div className="grid gap-8 rounded-[34px] border border-slate-200 bg-white p-6 sm:p-9 lg:grid-cols-[.85fr_1.15fr] lg:p-12">
          <div className="flex flex-col justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ShieldCheck size={24} />
            </div>

            <p className="mt-6 text-sm font-black text-emerald-600">
              Viaje com mais tranquilidade
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
              Menos procura.
              <span className="block">
                Mais Porto Seguro.
              </span>
            </h2>

            <p className="mt-4 max-w-md text-sm leading-7 text-slate-500">
              A proposta é simples: facilitar o
              encontro entre quem visita a cidade e
              quem oferece experiências e serviços
              para tornar a viagem melhor.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] bg-slate-50 p-5">
              <BadgeCheck
                size={21}
                className="text-emerald-600"
              />

              <h3 className="mt-4 text-sm font-black">
                Parceiros locais
              </h3>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Negócios e profissionais da região
                reunidos em uma experiência mais
                organizada.
              </p>
            </div>

            <div className="rounded-[24px] bg-slate-50 p-5">
              <MapPin
                size={21}
                className="text-emerald-600"
              />

              <h3 className="mt-4 text-sm font-black">
                Feito para Porto Seguro
              </h3>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Uma plataforma pensada para as
                necessidades de quem está visitando
                a cidade.
              </p>
            </div>

            <div className="rounded-[24px] bg-slate-50 p-5">
              <Compass
                size={21}
                className="text-emerald-600"
              />

              <h3 className="mt-4 text-sm font-black">
                Tudo em um só lugar
              </h3>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Do transporte ao entretenimento,
                encontre diferentes opções para sua
                viagem.
              </p>
            </div>

            <div className="rounded-[24px] bg-slate-50 p-5">
              <Headphones
                size={21}
                className="text-emerald-600"
              />

              <h3 className="mt-4 text-sm font-black">
                Experiência simples
              </h3>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Menos tempo pesquisando e mais tempo
                aproveitando seu destino.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section
        id="como-funciona"
        className="bg-white py-16 lg:py-20"
      >
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-black text-emerald-600">
              Simples do início ao fim
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
              Sua viagem, sem complicação.
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Descubra, escolha e organize o que
              deseja aproveitar em Porto Seguro.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;

              return (
                <div
                  key={benefit.title}
                  className="rounded-[28px] border border-slate-200 bg-white p-7"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <Icon size={22} />
                    </div>

                    <span className="text-3xl font-black text-slate-100">
                      0{index + 1}
                    </span>
                  </div>

                  <h3 className="mt-6 text-lg font-black">
                    {benefit.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PARCEIROS */}
      <section
        id="parceiros"
        className="px-5 py-16 lg:px-8 lg:py-20"
      >
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[36px] bg-[#101828] px-6 py-10 text-white sm:px-10 lg:px-14 lg:py-14">
          <div className="pointer-events-none absolute -right-28 -top-32 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />

          <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-sm font-black text-emerald-400">
                <Star size={18} />
                Para negócios e profissionais locais
              </div>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                Faça parte da experiência
                <span className="block text-emerald-400">
                  de quem visita Porto Seguro.
                </span>
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                Passeios, barracas, bares,
                restaurantes, transfers, fotógrafos,
                experiências e outros negócios
                turísticos podem encontrar novos
                clientes através da plataforma.
              </p>

              <div className="mt-6 flex flex-wrap gap-3 text-xs font-bold text-slate-300">
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2">
                  Mais visibilidade
                </span>

                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2">
                  Novos clientes
                </span>

                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2">
                  Presença digital
                </span>
              </div>
            </div>

            <Link
              href="/auth/sign-up/prestador"
              className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-7 py-4 text-sm font-black text-white transition hover:bg-emerald-400"
            >
              Quero ser parceiro
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link
                href="/"
                className="text-xl font-black tracking-[-0.04em]"
              >
                Porto
                <span className="text-emerald-500">
                  Serviços
                </span>
              </Link>

              <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">
                Descubra experiências e serviços
                para aproveitar Porto Seguro de um
                jeito mais simples.
              </p>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-3 text-xs font-bold text-slate-500">
              <Link
                href="#explorar"
                className="transition hover:text-slate-900"
              >
                Explorar
              </Link>

              <Link
                href="#como-funciona"
                className="transition hover:text-slate-900"
              >
                Como funciona
              </Link>

              <Link
                href="#parceiros"
                className="transition hover:text-slate-900"
              >
                Parceiros
              </Link>

              <Link
                href="/auth/login"
                className="transition hover:text-slate-900"
              >
                Entrar
              </Link>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © 2026 Porto Serviços. Todos os
              direitos reservados.
            </p>

            <div className="flex items-center gap-2">
              <MapPin size={13} />
              Porto Seguro, Bahia
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}