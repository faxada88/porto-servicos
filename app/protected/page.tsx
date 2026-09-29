import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Bike,
  Camera,
  Car,
  ChevronRight,
  Clock3,
  Compass,
  Heart,
  Home,
  MapPin,
  Martini,
  Music2,
  Palmtree,
  Search,
  Ship,
  Sparkles,
  Ticket,
  UtensilsCrossed,
  Waves,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { UserAccountMenu } from "@/components/user-account-menu";

const tourismHighlights = [
  {
    title: "Barracas de praia",
    category: "Praia & lazer",
    description:
      "Descubra beach clubs, barracas e experiências à beira-mar.",
    icon: Palmtree,
    slug: "praias-barracas",
  },
  {
    title: "Música ao vivo",
    category: "Noite & entretenimento",
    description:
      "Encontre bares, restaurantes e eventos com música ao vivo.",
    icon: Music2,
    slug: "musica-ao-vivo",
  },
  {
    title: "Passeios inesquecíveis",
    category: "Passeios & experiências",
    description:
      "Barcos, praias, roteiros e experiências para aproveitar Porto Seguro.",
    icon: Compass,
    slug: "passeios-experiencias",
  },
];

const touristShortcuts = [
  {
    title: "Passeios",
    subtitle: "Experiências",
    icon: Compass,
    slug: "passeios-experiencias",
  },
  {
    title: "Praia",
    subtitle: "Barracas & lazer",
    icon: Palmtree,
    slug: "praias-barracas",
  },
  {
    title: "Bares",
    subtitle: "Vida noturna",
    icon: Martini,
    slug: "bares-vida-noturna",
  },
  {
    title: "Música",
    subtitle: "Ao vivo",
    icon: Music2,
    slug: "musica-ao-vivo",
  },
  {
    title: "Gastronomia",
    subtitle: "Onde comer",
    icon: UtensilsCrossed,
    slug: "restaurantes-gastronomia",
  },
  {
    title: "Transfers",
    subtitle: "Transporte",
    icon: Car,
    slug: "transfers-transporte",
  },
  {
    title: "Barcos",
    subtitle: "Mar & passeios",
    icon: Ship,
    slug: "barcos-escunas",
  },
  {
    title: "Ingressos",
    subtitle: "Eventos",
    icon: Ticket,
    slug: "ingressos-eventos",
  },
];

function LoadingDashboard() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="h-5 w-32 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-3 h-10 w-80 max-w-full animate-pulse rounded-xl bg-slate-200" />
        <div className="mt-8 h-16 max-w-3xl animate-pulse rounded-2xl bg-slate-200" />

        <div className="mt-12 grid grid-cols-4 gap-3 lg:grid-cols-8">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl bg-slate-200"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

async function TouristDashboard() {
  const supabase = await createClient();

  const { data, error } =
    await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/auth/login");
  }

  const claims = data.claims;
  const userId = claims.sub;

  const {
    data: providerProfile,
    error: providerError,
  } = await supabase
    .from("provider_profiles")
    .select("status, business_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (providerError) {
    console.error(
      "Erro ao verificar perfil do parceiro:",
      providerError,
    );
  }

  /*
   * Parceiros que ainda não foram aprovados
   * são direcionados para a área de acompanhamento.
   */
  if (
    providerProfile?.status === "pending" ||
    providerProfile?.status === "rejected" ||
    providerProfile?.status === "suspended"
  ) {
    redirect("/protected/prestador/status");
  }

  const {
    data: categoriesData,
    error: categoriesError,
  } = await supabase
    .from("service_categories")
    .select("id, name, slug, icon, sort_order")
    .eq("is_active", true)
    .order("sort_order", {
      ascending: true,
    })
    .order("name", {
      ascending: true,
    });

  if (categoriesError) {
    console.error(
      "Erro ao carregar categorias:",
      categoriesError,
    );
  }

  const metadata =
    claims.user_metadata &&
    typeof claims.user_metadata === "object"
      ? (claims.user_metadata as Record<
          string,
          unknown
        >)
      : {};

  const rawName =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : "";

  const firstName =
    rawName.trim().split(" ")[0] || "Viajante";

  const email =
    typeof claims.email === "string"
      ? claims.email
      : "";

  const isProvider =
    providerProfile?.status === "approved";

  const categoryIconMap: Record<
    string,
    React.ComponentType<{
      size?: number;
      className?: string;
    }>
  > = {
    compass: Compass,
    palmtree: Palmtree,
    palm: Palmtree,
    martini: Martini,
    music: Music2,
    "music-2": Music2,
    utensils: UtensilsCrossed,
    "utensils-crossed": UtensilsCrossed,
    car: Car,
    ship: Ship,
    waves: Waves,
    camera: Camera,
    bike: Bike,
    ticket: Ticket,
    sparkles: Sparkles,
  };

  const slugIconMap: Record<
    string,
    React.ComponentType<{
      size?: number;
      className?: string;
    }>
  > = {
    "passeios-experiencias": Compass,
    "praias-barracas": Palmtree,
    "bares-vida-noturna": Martini,
    "musica-ao-vivo": Music2,
    "restaurantes-gastronomia":
      UtensilsCrossed,
    "transfers-transporte": Car,
    "barcos-escunas": Ship,
    "mergulho-aventura": Waves,
    "fotografia-ensaios": Camera,
    "aluguel-carros-motos": Bike,
    "ingressos-eventos": Ticket,
    "bem-estar": Sparkles,
  };

  const categories = (
    categoriesData ?? []
  ).map((category) => {
    const iconName =
      category.icon?.toLowerCase() ?? "";

    const slug =
      category.slug.toLowerCase();

    const Icon =
      categoryIconMap[iconName] ??
      slugIconMap[slug] ??
      Compass;

    return {
      ...category,
      iconComponent: Icon,
    };
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 text-[#101828] lg:pb-0">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[74px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link
            href="/protected"
            className="text-[22px] font-black tracking-[-0.045em]"
          >
            Porto
            <span className="text-emerald-500">
              Serviços
            </span>
          </Link>

          <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 md:flex">
            <MapPin
              size={16}
              className="text-emerald-600"
            />
            Explorando Porto Seguro
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Notificações"
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Bell size={18} />

              <span className="absolute right-[8px] top-[8px] h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            </button>

            <UserAccountMenu
              firstName={firstName}
              email={email}
              isProvider={isProvider}
            />
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden bg-white">
          <div className="pointer-events-none absolute -left-40 -top-52 h-[520px] w-[520px] rounded-full bg-emerald-100/60 blur-3xl" />

          <div className="pointer-events-none absolute -right-40 top-0 h-[460px] w-[460px] rounded-full bg-sky-100/50 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-5 pb-12 pt-9 lg:px-8 lg:pb-16 lg:pt-14">
            <div className="md:hidden">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700">
                <MapPin size={14} />
                Porto Seguro, Bahia
              </div>
            </div>

            <div className="mt-5 max-w-3xl md:mt-0">
              <p className="text-sm font-extrabold text-emerald-600">
                Olá, {firstName} 👋
              </p>

              <h1 className="mt-3 text-[36px] font-black leading-[1.05] tracking-[-0.05em] sm:text-5xl lg:text-[58px]">
                Viva Porto Seguro
                <span className="block text-emerald-500">
                  do seu jeito.
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-[15px] leading-7 text-slate-500 sm:text-base">
                Passeios, praias, gastronomia,
                festas, transporte e experiências
                locais em um só lugar.
              </p>
            </div>

            {/* BUSCA PRINCIPAL */}
            <div className="mt-8 max-w-4xl rounded-[22px] border border-slate-200 bg-white p-2 shadow-[0_20px_55px_-25px_rgba(15,23,42,0.3)]">
              <div className="flex items-center">
                <div className="flex min-h-[58px] flex-1 items-center gap-3 px-3 sm:px-5">
                  <Search
                    size={21}
                    className="shrink-0 text-emerald-600"
                  />

                  <input
                    type="search"
                    aria-label="Buscar experiências em Porto Seguro"
                    placeholder="O que você quer fazer em Porto Seguro?"
                    className="w-full bg-transparent text-base font-medium outline-none placeholder:text-slate-400"
                  />
                </div>

                <button
                  type="button"
                  className="hidden h-[52px] rounded-2xl bg-[#101828] px-8 text-sm font-extrabold text-white transition hover:bg-slate-800 sm:block"
                >
                  Explorar
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                "Praia hoje",
                "Música ao vivo",
                "Passeio de barco",
                "Onde comer",
                "O que fazer à noite",
              ].map((suggestion) => (
                <button
                  type="button"
                  key={suggestion}
                  className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
          {/* ATALHOS TURÍSTICOS */}
          <section>
            <div className="flex items-end justify-between gap-5">
              <div>
                <p className="text-sm font-extrabold text-emerald-600">
                  Explore a cidade
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-[-0.035em] sm:text-[28px]">
                  O que você procura?
                </h2>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-4 gap-3 lg:grid-cols-8">
              {touristShortcuts.map(
                (shortcut) => {
                  const Icon = shortcut.icon;

                  return (
                    <Link
                      href={`/protected/categorias/${shortcut.slug}`}
                      key={shortcut.title}
                      className="group min-w-0 rounded-[22px] border border-slate-200 bg-white px-2 py-5 text-center transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_16px_35px_-20px_rgba(15,23,42,0.35)]"
                    >
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 transition group-hover:bg-emerald-50 group-hover:text-emerald-600">
                        <Icon size={22} />
                      </div>

                      <p className="mt-3 truncate text-xs font-black text-slate-800">
                        {shortcut.title}
                      </p>

                      <p className="mt-0.5 hidden truncate text-[10px] font-semibold text-slate-400 sm:block">
                        {shortcut.subtitle}
                      </p>
                    </Link>
                  );
                },
              )}
            </div>
          </section>

          {/* DESTAQUE */}
          <section className="mt-12">
            <div className="relative overflow-hidden rounded-[30px] bg-[#101828] px-6 py-8 text-white sm:px-9 sm:py-10">
              <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-emerald-500/25 blur-3xl" />

              <div className="pointer-events-none absolute bottom-[-100px] left-1/3 h-52 w-52 rounded-full bg-sky-500/10 blur-3xl" />

              <div className="relative flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs font-extrabold text-emerald-300">
                    <Sparkles size={14} />
                    Porto Seguro agora
                  </div>

                  <h2 className="mt-4 max-w-xl text-2xl font-black tracking-[-0.035em] sm:text-3xl">
                    Não sabe o que fazer hoje?
                  </h2>

                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                    Descubra experiências,
                    entretenimento e lugares para
                    aproveitar a cidade sem perder
                    tempo procurando.
                  </p>
                </div>

                <Link
                  href="/protected/categorias/passeios-experiencias"
                  className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 text-sm font-extrabold text-white transition hover:bg-emerald-400"
                >
                  Explorar experiências
                  <ChevronRight size={17} />
                </Link>
              </div>
            </div>
          </section>

          {/* CATEGORIAS DO BANCO */}
          <section className="mt-12">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-extrabold text-emerald-600">
                  Descubra
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-[-0.035em]">
                  Experiências por categoria
                </h2>
              </div>

              <Link
                href="/protected/categorias"
                className="hidden items-center gap-1 text-sm font-extrabold text-slate-500 transition hover:text-slate-900 sm:flex"
              >
                Ver todas
                <ChevronRight size={16} />
              </Link>
            </div>

            {categories.length > 0 ? (
              <div className="mt-6 grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-6">
                {categories.map(
                  (category) => {
                    const Icon =
                      category.iconComponent;

                    return (
                      <Link
                        href={`/protected/categorias/${category.slug}`}
                        key={category.id}
                        className="group min-w-0 rounded-[22px] border border-slate-200 bg-white px-2 py-5 text-center transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg"
                      >
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 transition group-hover:bg-emerald-50 group-hover:text-emerald-600">
                          <Icon size={23} />
                        </div>

                        <p className="mt-3 truncate text-xs font-black sm:text-sm">
                          {category.name}
                        </p>
                      </Link>
                    );
                  },
                )}
              </div>
            ) : (
              <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
                <Compass
                  size={28}
                  className="mx-auto text-emerald-500"
                />

                <p className="mt-3 text-sm font-black text-slate-800">
                  Novas experiências chegando
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  As experiências disponíveis em
                  Porto Seguro aparecerão aqui.
                </p>
              </div>
            )}
          </section>

          {/* MAIS PROCURADOS */}
          <section className="mt-12">
            <div>
              <p className="text-sm font-extrabold text-emerald-600">
                Queridinhos dos turistas
              </p>

              <h2 className="mt-1 text-2xl font-black tracking-[-0.035em]">
                Aproveite Porto Seguro
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Algumas ideias para descobrir diferentes
                experiências durante sua estadia.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {tourismHighlights.map(
                (experience) => {
                  const Icon = experience.icon;

                  return (
                    <article
                      key={experience.title}
                      className="group rounded-[26px] border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-1 hover:shadow-[0_22px_45px_-25px_rgba(15,23,42,0.35)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                          <Icon size={22} />
                        </div>

                        <button
                          type="button"
                          aria-label={`Favoritar ${experience.title}`}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                        >
                          <Heart size={18} />
                        </button>
                      </div>

                      <p className="mt-5 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-600">
                        {experience.category}
                      </p>

                      <h3 className="mt-2 text-lg font-black">
                        {experience.title}
                      </h3>

                      <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-500">
                        {experience.description}
                      </p>

                      <Link
                        href={`/protected/categorias/${experience.slug}`}
                        className="mt-5 flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-extrabold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        Explorar opções
                        <ChevronRight size={17} />
                      </Link>
                    </article>
                  );
                },
              )}
            </div>
          </section>

          {/* PARCEIRO */}
          {!isProvider && (
            <section className="mt-12">
              <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/60 px-6 py-7 sm:px-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                      Negócios de Porto Seguro
                    </p>

                    <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-900 sm:text-2xl">
                      Tem uma experiência para
                      oferecer aos viajantes?
                    </h2>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                      Cadastre seu negócio, atividade
                      ou experiência e conecte-se com
                      viajantes descobrindo o que fazer
                      em Porto Seguro.
                    </p>
                  </div>

                  <Link
                    href="/protected/prestador/cadastro"
                    className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#101828] px-6 text-sm font-extrabold text-white transition hover:bg-emerald-600"
                  >
                    Quero ser parceiro
                    <ChevronRight size={17} />
                  </Link>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* MENU MOBILE */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 px-4 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
          <Link
            href="/protected"
            className="flex flex-col items-center gap-1.5 py-2 text-emerald-600"
          >
            <Home
              size={21}
              strokeWidth={2.3}
            />

            <span className="text-[11px] font-bold">
              Início
            </span>
          </Link>

          <Link
            href="/protected/categorias"
            className="flex flex-col items-center gap-1.5 py-2 text-slate-400"
          >
            <Compass size={21} />

            <span className="text-[11px] font-semibold">
              Explorar
            </span>
          </Link>

          <button
            type="button"
            className="flex flex-col items-center gap-1.5 py-2 text-slate-400"
          >
            <Heart size={21} />

            <span className="text-[11px] font-semibold">
              Favoritos
            </span>
          </button>

          <Link
            href="/protected"
            className="flex flex-col items-center gap-1.5 py-2 text-slate-400"
          >
            <Clock3 size={21} />

            <span className="text-[11px] font-semibold">
              Atividades
            </span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

export default function ProtectedPage() {
  return (
    <Suspense fallback={<LoadingDashboard />}>
      <TouristDashboard />
    </Suspense>
  );
}