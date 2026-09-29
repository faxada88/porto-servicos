import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  Clock3,
  Compass,
  MapPin,
  Palmtree,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function LoadingCategory() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="h-5 w-32 animate-pulse rounded-lg bg-slate-200" />

        <div className="mt-6 h-12 w-72 max-w-full animate-pulse rounded-xl bg-slate-200" />

        <div className="mt-4 h-6 w-96 max-w-full animate-pulse rounded-lg bg-slate-200" />

        <div className="mt-8 h-16 max-w-3xl animate-pulse rounded-2xl bg-slate-200" />

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-72 animate-pulse rounded-3xl bg-slate-200"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function formatPrice(
  pricingType: string,
  priceCents: number | null,
) {
  if (pricingType === "quote") {
    return "Consulte o parceiro";
  }

  if (priceCents === null) {
    return "Consultar valor";
  }

  const value = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(priceCents / 100);

  if (pricingType === "starting_at") {
    return `A partir de ${value}`;
  }

  if (pricingType === "hourly") {
    return `${value} / hora`;
  }

  return value;
}

async function CategoryContent({
  slug,
}: {
  slug: string;
}) {
  const supabase = await createClient();

  const { data: authData, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !authData?.claims) {
    redirect("/auth/login");
  }

  const { data: category, error: categoryError } =
    await supabase
      .from("service_categories")
      .select("id, name, slug, description")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

  if (categoryError) {
    console.error("Erro ao carregar categoria:", {
      message: categoryError.message,
      code: categoryError.code,
      details: categoryError.details,
      hint: categoryError.hint,
    });
  }

  if (!category) {
    notFound();
  }

  const { data: services, error: servicesError } =
    await supabase
      .from("provider_services")
      .select(`
        id,
        name,
        description,
        pricing_type,
        price_cents,
        provider_id,
        category_id
      `)
      .eq("category_id", category.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

  if (servicesError) {
    console.error("Erro ao carregar ofertas:", {
      message: servicesError.message,
      code: servicesError.code,
      details: servicesError.details,
      hint: servicesError.hint,
    });
  }

  const totalOffers = services?.length ?? 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 text-[#101828]">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
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

          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-600 shadow-sm md:flex">
            <MapPin
              size={16}
              className="text-emerald-500"
            />
            Porto Seguro, Bahia
          </div>

          <Link
            href="/protected"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
            aria-label="Minha conta"
          >
            <UserRound size={18} />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
        {/* VOLTAR */}
        <Link
          href="/protected"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={17} />
          Voltar para explorar
        </Link>

        {/* HERO DA CATEGORIA */}
        <section className="relative mt-7 overflow-hidden rounded-[32px] bg-[#101828] px-6 py-8 text-white shadow-[0_30px_80px_-35px_rgba(15,23,42,0.55)] sm:px-8 sm:py-10 lg:px-10">
          <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3.5 py-2 text-xs font-extrabold text-emerald-300">
              <Compass size={14} />
              Explore Porto Seguro
            </div>

            <h1 className="mt-5 max-w-3xl text-3xl font-black tracking-[-0.045em] sm:text-4xl lg:text-[44px]">
              {category.name}
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              {category.description ||
                `Descubra experiências, lugares e opções de ${category.name.toLowerCase()} para aproveitar Porto Seguro.`}
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2 text-xs font-bold text-slate-200">
                <MapPin
                  size={14}
                  className="text-emerald-400"
                />
                Porto Seguro
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2 text-xs font-bold text-slate-200">
                <BadgeCheck
                  size={14}
                  className="text-emerald-400"
                />
                Parceiros locais
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2 text-xs font-bold text-slate-200">
                <Sparkles
                  size={14}
                  className="text-emerald-400"
                />
                Experiências selecionadas
              </span>
            </div>
          </div>
        </section>

        {/* BUSCA */}
        <section className="relative z-10 mx-auto -mt-5 max-w-4xl px-3 sm:px-6">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_45px_-20px_rgba(15,23,42,0.3)]">
            <div className="flex min-h-14 flex-1 items-center gap-3 px-3 sm:px-4">
              <Search
                size={20}
                className="shrink-0 text-slate-400"
              />

              <input
                type="search"
                aria-label={`Buscar em ${category.name}`}
                placeholder={`O que você procura em ${category.name}?`}
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 sm:text-base"
              />
            </div>

            <button
              type="button"
              className="hidden h-12 rounded-xl bg-emerald-500 px-7 text-sm font-extrabold text-white transition hover:bg-emerald-600 sm:block"
            >
              Buscar
            </button>
          </div>
        </section>

        {/* OFERTAS */}
        <section className="mt-14">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-600">
                <Sparkles size={16} />
                Descubra
              </div>

              <h2 className="mt-1.5 text-2xl font-black tracking-[-0.035em] text-[#101828] sm:text-[28px]">
                Opções para viver essa experiência
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Conheça opções de parceiros locais e
                encontre o que combina com seus planos
                em Porto Seguro.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-600 shadow-sm">
              <Compass
                size={14}
                className="text-emerald-600"
              />

              {totalOffers}{" "}
              {totalOffers === 1
                ? "opção encontrada"
                : "opções encontradas"}
            </div>
          </div>

          {services && services.length > 0 ? (
            <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <article
                  key={service.id}
                  className="group flex overflow-hidden rounded-[28px] border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)]"
                >
                  <div className="flex w-full flex-col p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-500 group-hover:text-white">
                        <Compass size={23} />
                      </div>

                      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold text-emerald-700">
                        <BadgeCheck size={13} />
                        Parceiro local
                      </div>
                    </div>

                    <div className="mt-5">
                      <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-emerald-600">
                        {category.name}
                      </p>

                      <h3 className="mt-2 text-lg font-black leading-snug tracking-[-0.02em] text-[#101828]">
                        {service.name}
                      </h3>

                      <p className="mt-2 line-clamp-3 min-h-[72px] text-sm leading-6 text-slate-500">
                        {service.description ||
                          "Conheça esta opção e descubra mais detalhes para aproveitar sua experiência em Porto Seguro."}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-3 text-xs font-semibold text-slate-500">
                      <Clock3
                        size={15}
                        className="shrink-0 text-emerald-600"
                      />
                      Consulte detalhes e disponibilidade
                    </div>

                    <div className="mt-auto pt-5">
                      <div className="border-t border-slate-100 pt-5">
                        <p className="text-xs font-semibold text-slate-400">
                          Valor
                        </p>

                        <p className="mt-1 text-lg font-black text-[#101828]">
                          {formatPrice(
                            service.pricing_type,
                            service.price_cents,
                          )}
                        </p>
                      </div>

                      <Link
                        href={`/protected/servicos/${service.id}`}
                        className="mt-5 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#101828] px-5 text-sm font-extrabold text-white transition hover:bg-emerald-600"
                      >
                        Ver experiência
                        <ChevronRight size={17} />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-7 overflow-hidden rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Compass size={27} />
              </div>

              <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-emerald-600">
                Novidades em breve
              </p>

              <h3 className="mt-2 text-xl font-black tracking-[-0.025em] text-[#101828]">
                Estamos preparando novas opções
              </h3>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
                Ainda não existem ofertas publicadas
                nesta categoria. Explore outras
                experiências disponíveis em Porto
                Seguro.
              </p>

              <Link
                href="/protected"
                className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#101828] px-6 text-sm font-extrabold text-white transition hover:bg-emerald-600"
              >
                <Compass size={17} />
                Explorar Porto Seguro
              </Link>
            </div>
          )}
        </section>

        {/* RODAPÉ LOCAL */}
        <section className="mt-14 rounded-[28px] border border-emerald-100 bg-emerald-50/60 px-6 py-7 sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100">
                <Palmtree size={22} />
              </div>

              <div>
                <p className="text-sm font-black text-emerald-950">
                  Viva Porto Seguro do seu jeito
                </p>

                <p className="mt-1 max-w-xl text-sm leading-6 text-emerald-900/70">
                  Continue explorando categorias e
                  descubra novas possibilidades para
                  sua viagem.
                </p>
              </div>
            </div>

            <Link
              href="/protected"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-5 text-sm font-extrabold text-emerald-800 transition hover:bg-emerald-100"
            >
              Ver outras categorias
              <ChevronRight size={16} />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

async function CategoryPageContent({
  params,
}: CategoryPageProps) {
  const { slug } = await params;

  return (
    <CategoryContent
      slug={decodeURIComponent(slug).toLowerCase()}
    />
  );
}

export default function CategoryPage(
  props: CategoryPageProps,
) {
  return (
    <Suspense fallback={<LoadingCategory />}>
      <CategoryPageContent {...props} />
    </Suspense>
  );
}