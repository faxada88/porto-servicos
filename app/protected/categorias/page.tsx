import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bike,
  Camera,
  Car,
  ChevronRight,
  Compass,
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

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
};

const categoryDetails: Record<
  string,
  {
    subtitle: string;
    highlight: string;
  }
> = {
  "passeios-experiencias": {
    subtitle:
      "Roteiros, praias, cultura e experiências para conhecer Porto Seguro.",
    highlight: "Explore a região",
  },
  "praias-barracas": {
    subtitle:
      "Barracas, beach clubs e lugares para aproveitar o litoral.",
    highlight: "Pé na areia",
  },
  "restaurantes-gastronomia": {
    subtitle:
      "Restaurantes, sabores locais e lugares especiais para comer bem.",
    highlight: "Sabores da Bahia",
  },
  "bares-vida-noturna": {
    subtitle:
      "Bares, festas e opções para aproveitar Porto Seguro depois do pôr do sol.",
    highlight: "Viva a noite",
  },
  "musica-ao-vivo": {
    subtitle:
      "Shows, apresentações e lugares com música para curtir a cidade.",
    highlight: "Som & diversão",
  },
  "transfers-transporte": {
    subtitle:
      "Opções para se deslocar com praticidade durante sua viagem.",
    highlight: "Chegue tranquilo",
  },
  "barcos-escunas": {
    subtitle:
      "Passeios pelo mar, escunas e experiências para descobrir o litoral.",
    highlight: "Viva o mar",
  },
  "mergulho-aventura": {
    subtitle:
      "Aventura, mergulho e atividades para quem quer viver algo diferente.",
    highlight: "Mais aventura",
  },
  "aluguel-carros-motos": {
    subtitle:
      "Mobilidade para explorar Porto Seguro e os destinos ao redor.",
    highlight: "Explore livremente",
  },
  "ingressos-eventos": {
    subtitle:
      "Eventos, atrações e experiências para incluir no seu roteiro.",
    highlight: "Não fique de fora",
  },
  "fotografia-ensaios": {
    subtitle:
      "Registre sua viagem com fotógrafos e experiências fotográficas locais.",
    highlight: "Guarde momentos",
  },
  "bem-estar": {
    subtitle:
      "Massagens, relaxamento e experiências para cuidar de você durante a viagem.",
    highlight: "Relaxe",
  },
};

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
  "restaurantes-gastronomia": UtensilsCrossed,
  "bares-vida-noturna": Martini,
  "musica-ao-vivo": Music2,
  "transfers-transporte": Car,
  "barcos-escunas": Ship,
  "mergulho-aventura": Waves,
  "aluguel-carros-motos": Bike,
  "ingressos-eventos": Ticket,
  "fotografia-ensaios": Camera,
  "bem-estar": Sparkles,
};

function CategoriesLoading() {
  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="h-5 w-32 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-4 h-12 w-96 max-w-full animate-pulse rounded-xl bg-slate-200" />
        <div className="mt-8 h-16 max-w-3xl animate-pulse rounded-2xl bg-slate-200" />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-56 animate-pulse rounded-[26px] bg-slate-200"
            />
          ))}
        </div>
      </div>
    </main>
  );
}

async function CategoriesContent() {
  const supabase = await createClient();

  const { data: authData, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    redirect("/auth/login");
  }

  const { data: categoriesData, error: categoriesError } =
    await supabase
      .from("service_categories")
      .select(
        "id, name, slug, description, icon, sort_order",
      )
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      });

  if (categoriesError) {
    console.error(
      "Erro ao carregar categorias turísticas:",
      {
        message: categoriesError.message,
        code: categoriesError.code,
        details: categoriesError.details,
        hint: categoriesError.hint,
      },
    );
  }

  const categories =
    (categoriesData as Category[] | null) ?? [];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#101828]">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[74px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link
            href="/protected"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
              <Palmtree size={20} />
            </div>

            <div className="text-[22px] font-black tracking-[-0.045em]">
              Porto
              <span className="text-emerald-500">
                Serviços
              </span>
            </div>
          </Link>

          <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 sm:flex">
            <MapPin
              size={16}
              className="text-emerald-600"
            />
            Porto Seguro, Bahia
          </div>

          <Link
            href="/protected"
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">
              Voltar
            </span>
          </Link>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden bg-white">
          <div className="pointer-events-none absolute -left-40 -top-52 h-[520px] w-[520px] rounded-full bg-emerald-100/60 blur-3xl" />

          <div className="pointer-events-none absolute -right-40 top-0 h-[460px] w-[460px] rounded-full bg-sky-100/50 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-5 pb-12 pt-10 lg:px-8 lg:pb-16 lg:pt-14">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-2 text-xs font-extrabold text-emerald-700">
              <Compass size={15} />
              Explore Porto Seguro
            </div>

            <h1 className="mt-5 max-w-3xl text-[38px] font-black leading-[1.04] tracking-[-0.05em] sm:text-5xl lg:text-[58px]">
              Tudo o que você quer viver
              <span className="block text-emerald-500">
                durante sua viagem.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-slate-500 sm:text-base">
              Descubra experiências, gastronomia,
              praias, passeios, entretenimento,
              transporte e muito mais em Porto Seguro.
            </p>

            {/* BUSCA */}
            <div className="mt-8 max-w-3xl rounded-[22px] border border-slate-200 bg-white p-2 shadow-[0_20px_55px_-25px_rgba(15,23,42,0.3)]">
              <div className="flex min-h-[58px] items-center gap-3 px-3 sm:px-5">
                <Search
                  size={21}
                  className="shrink-0 text-emerald-600"
                />

                <input
                  type="search"
                  aria-label="Buscar categoria"
                  placeholder="O que você quer encontrar?"
                  className="w-full bg-transparent text-base font-medium outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400">
                Explore:
              </span>

              {[
                "Praias",
                "Passeios",
                "Gastronomia",
                "Vida noturna",
                "Aventura",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* CATEGORIAS */}
        <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-extrabold text-emerald-600">
                Descubra a cidade
              </p>

              <h2 className="mt-1 text-2xl font-black tracking-[-0.035em] sm:text-[30px]">
                Explore por categoria
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Escolha o que combina com sua viagem
                e descubra opções disponíveis em
                Porto Seguro.
              </p>
            </div>

            {categories.length > 0 && (
              <span className="w-fit rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-500">
                {categories.length} categorias
              </span>
            )}
          </div>

          {categories.length > 0 ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => {
                const iconName =
                  category.icon?.toLowerCase() ?? "";

                const Icon =
                  categoryIconMap[iconName] ??
                  slugIconMap[
                    category.slug.toLowerCase()
                  ] ??
                  Compass;

                const details =
                  categoryDetails[category.slug];

                return (
                  <Link
                    key={category.id}
                    href={`/protected/categorias/${category.slug}`}
                    className="group relative overflow-hidden rounded-[26px] border border-slate-200 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_22px_50px_-28px_rgba(15,23,42,0.4)]"
                  >
                    <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-50 opacity-0 blur-2xl transition duration-300 group-hover:opacity-100" />

                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 transition duration-200 group-hover:bg-emerald-50 group-hover:text-emerald-600">
                          <Icon size={25} />
                        </div>

                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition group-hover:border-emerald-200 group-hover:bg-emerald-50 group-hover:text-emerald-600">
                          <ChevronRight size={17} />
                        </div>
                      </div>

                      <div className="mt-6">
                        {details?.highlight && (
                          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-600">
                            {details.highlight}
                          </p>
                        )}

                        <h3 className="mt-2 text-xl font-black tracking-[-0.025em] text-slate-900">
                          {category.name}
                        </h3>

                        <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-500">
                          {details?.subtitle ??
                            category.description ??
                            "Descubra opções para aproveitar ainda mais sua viagem."}
                        </p>
                      </div>

                      <div className="mt-6 flex items-center gap-2 text-sm font-extrabold text-slate-700 transition group-hover:text-emerald-700">
                        Ver opções
                        <ChevronRight size={15} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-8 rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Compass size={26} />
              </div>

              <h3 className="mt-4 text-lg font-black">
                Novas experiências chegando
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                As categorias disponíveis para
                explorar Porto Seguro aparecerão aqui.
              </p>

              <Link
                href="/protected"
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#101828] px-5 text-sm font-extrabold text-white transition hover:bg-emerald-600"
              >
                Voltar ao início
                <ChevronRight size={16} />
              </Link>
            </div>
          )}
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-5 pb-14 lg:px-8 lg:pb-20">
          <div className="relative overflow-hidden rounded-[30px] bg-[#101828] px-6 py-8 text-white sm:px-9 sm:py-10">
            <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />

            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.13em] text-emerald-400">
                  <Sparkles size={15} />
                  Sua viagem, suas escolhas
                </div>

                <h2 className="mt-3 max-w-xl text-2xl font-black tracking-[-0.035em] sm:text-3xl">
                  Porto Seguro tem muito mais para
                  você descobrir.
                </h2>

                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                  Explore as categorias e encontre
                  experiências para cada momento da
                  sua viagem.
                </p>
              </div>

              <Link
                href="/protected"
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 text-sm font-extrabold text-white transition hover:bg-emerald-400"
              >
                Voltar ao início
                <ChevronRight size={17} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense fallback={<CategoriesLoading />}>
      <CategoriesContent />
    </Suspense>
  );
}