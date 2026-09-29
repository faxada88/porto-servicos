import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  Clock3,
  Compass,
  MapPin,
  Palmtree,
  ShieldCheck,
  Sparkles,
  Store,
  WalletCards,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import LeadRequestForm from "./lead-request-form";

type ServiceData = {
  id: string;
  provider_id: string;
  category_id: string;
  name: string;
  description: string | null;
  pricing_type: string;
  price_cents: number | null;
  is_active: boolean;
};

type CategoryData = {
  id: string;
  name: string;
  slug: string;
};

type PublicProviderData = {
  user_id: string;
  business_name: string | null;
  description: string | null;
  status: string;
};

function formatPrice(priceCents: number | null, pricingType: string) {
  if (priceCents === null) {
    return "Consulte disponibilidade";
  }

  const formatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(priceCents / 100);

  switch (pricingType) {
    case "starting_at":
      return `A partir de ${formatted}`;

    case "per_person":
      return `${formatted} por pessoa`;

    case "hourly":
      return `${formatted} por hora`;

    case "fixed":
    default:
      return formatted;
  }
}

async function ExperienceContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: serviceData, error: serviceError } = await supabase
    .from("provider_services")
    .select(
      "id, provider_id, category_id, name, description, pricing_type, price_cents, is_active",
    )
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (serviceError) {
    console.error("Erro ao carregar experiência:", serviceError);
    notFound();
  }

  if (!serviceData) {
    notFound();
  }

  const service = serviceData as ServiceData;

  const [categoryResult, providerResult] = await Promise.all([
    supabase
      .from("service_categories")
      .select("id, name, slug")
      .eq("id", service.category_id)
      .eq("is_active", true)
      .maybeSingle(),

    supabase.rpc("get_public_provider_profile", {
      target_provider_id: service.provider_id,
    }),
  ]);

  if (categoryResult.error) {
    console.error(
      "Erro ao carregar categoria da experiência:",
      categoryResult.error,
    );
  }

  if (providerResult.error) {
    console.error(
      "Erro ao carregar perfil público do parceiro:",
      providerResult.error,
    );
  }

  const category = categoryResult.data as CategoryData | null;

  const providerRows = Array.isArray(providerResult.data)
    ? (providerResult.data as PublicProviderData[])
    : [];

  const provider = providerRows[0] ?? null;

  if (!provider) {
    notFound();
  }

  const isOwnService = user.id === service.provider_id;

  const displayPrice = formatPrice(
    service.price_cents,
    service.pricing_type,
  );

  const partnerName =
    provider.business_name?.trim() || "Parceiro Porto Serviços";

  const partnerDescription =
    provider.description?.trim() ||
    "Parceiro aprovado para oferecer experiências e serviços turísticos em Porto Seguro.";

  return (
    <main className="min-h-screen bg-[#f7f9f8] text-slate-950">
      <div className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
          <Link
            href={
              category
                ? `/protected/categorias/${category.slug}`
                : "/protected/categorias"
            }
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>

          <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex">
            <Palmtree className="h-4 w-4" />
            Porto Seguro, Bahia
          </div>
        </div>
      </div>

      <section className="relative overflow-hidden bg-white">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-cyan-100/50 blur-3xl" />

        <div className="relative mx-auto w-full max-w-7xl px-5 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
            <div>
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {category && (
                  <Link
                    href={`/protected/categorias/${category.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
                  >
                    <Compass className="h-3.5 w-3.5" />
                    {category.name}
                  </Link>
                )}

                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700">
                  <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Parceiro aprovado
                </span>
              </div>

              <h1 className="max-w-4xl text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl lg:text-5xl">
                {service.name}
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-medium text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  Porto Seguro, Bahia
                </span>

                <span className="inline-flex items-center gap-2">
                  <Store className="h-4 w-4 text-emerald-600" />
                  {partnerName}
                </span>
              </div>

              <div className="mt-8 overflow-hidden rounded-[30px] border border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-6 shadow-sm sm:p-8">
                <div className="flex h-56 items-center justify-center rounded-[24px] border border-white/80 bg-white/70 sm:h-72">
                  <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                      <Palmtree className="h-8 w-8" />
                    </div>

                    <p className="mt-4 text-sm font-bold text-slate-700">
                      Experiência em Porto Seguro
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Descubra, solicite contato e combine diretamente com o
                      parceiro.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <h2 className="text-xl font-black tracking-tight text-slate-950">
                  Sobre esta experiência
                </h2>

                <p className="mt-4 max-w-3xl whitespace-pre-line text-[15px] leading-7 text-slate-600">
                  {service.description?.trim() ||
                    "Entre em contato com o parceiro para conhecer todos os detalhes desta experiência."}
                </p>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>

                  <p className="mt-4 text-sm font-extrabold text-slate-900">
                    Parceiro aprovado
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Perfil validado dentro da Porto Serviços.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                    <CalendarDays className="h-5 w-5" />
                  </div>

                  <p className="mt-4 text-sm font-extrabold text-slate-900">
                    Combine a data
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Informe sua preferência ao solicitar contato.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    <Clock3 className="h-5 w-5" />
                  </div>

                  <p className="mt-4 text-sm font-extrabold text-slate-900">
                    Contato direto
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Negocie os detalhes diretamente com o parceiro.
                  </p>
                </div>
              </div>

              <div className="mt-10 rounded-[26px] border border-slate-200 bg-white p-6 sm:p-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <Store className="h-6 w-6" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black text-slate-950">
                        {partnerName}
                      </h2>

                      <BadgeCheck className="h-5 w-5 text-emerald-600" />
                    </div>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                      {partnerDescription}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <aside className="lg:sticky lg:top-6">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] sm:p-7">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                  <Sparkles className="h-4 w-4" />
                  Solicite informações
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-500">
                    Valor informado pelo parceiro
                  </p>

                  <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                    {displayPrice}
                  </p>
                </div>

                <div className="my-6 h-px bg-slate-100" />

                {isOwnService ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-extrabold text-slate-900">
                      Esta experiência é sua
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Turistas poderão visualizar esta página e enviar
                      solicitações de contato para você.
                    </p>

                    <Link
                      href="/protected/prestador"
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-slate-800"
                    >
                      Central do Parceiro
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                ) : (
                  <LeadRequestForm
                    serviceId={service.id}
                    serviceName={service.name}
                  />
                )}

                <div className="mt-5 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />

                  <p className="text-xs leading-5 text-emerald-950">
                    Seus dados de contato ficam protegidos. O parceiro recebe
                    primeiro os detalhes da solicitação e decide se deseja
                    desbloquear seu contato.
                  </p>
                </div>

                <div className="mt-4 flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                  <WalletCards className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" />

                  <p className="text-xs leading-5 text-slate-600">
                    A Porto Serviços conecta turistas e parceiros. O pagamento
                    da experiência e demais condições são combinados
                    diretamente entre vocês.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

function ExperienceFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f9f8] px-5">
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />

        <p className="mt-4 text-sm font-semibold text-slate-600">
          Carregando experiência...
        </p>
      </div>
    </main>
  );
}

export default function ExperiencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<ExperienceFallback />}>
      <ExperienceContent params={params} />
    </Suspense>
  );
}