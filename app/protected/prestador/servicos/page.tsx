import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  EyeOff,
  MapPin,
  PackageSearch,
  Plus,
  ShieldCheck,
  Sparkles,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";

type ProviderService = {
  id: string;
  name: string;
  description: string | null;
  pricing_type: string;
  price_cents: number | null;
  is_active: boolean;
  created_at: string;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getPricingLabel(
  pricingType: string,
  priceCents: number | null,
) {
  if (pricingType === "quote" || priceCents === null) {
    return "Sob consulta";
  }

  if (pricingType === "fixed") {
    return formatMoney(priceCents);
  }

  if (pricingType === "starting_at") {
    return `A partir de ${formatMoney(priceCents)}`;
  }

  if (pricingType === "per_person") {
    return `${formatMoney(priceCents)} por pessoa`;
  }

  if (pricingType === "per_hour") {
    return `${formatMoney(priceCents)} por hora`;
  }

  return formatMoney(priceCents);
}

function ServicesLoading() {
  return (
    <main className="min-h-screen bg-[#f7f9f6]">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="h-16 animate-pulse rounded-2xl bg-black/5" />

        <div className="mt-10 h-40 animate-pulse rounded-[32px] bg-white" />

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-[26px] bg-white"
            />
          ))}
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="h-72 animate-pulse rounded-[30px] bg-white"
            />
          ))}
        </div>
      </div>
    </main>
  );
}

async function ServicesContent() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: provider, error: providerError } =
    await supabase
      .from("provider_profiles")
      .select("user_id, business_name, status")
      .eq("user_id", user.id)
      .maybeSingle();

  if (providerError) {
    console.error(
      "Erro ao carregar perfil do parceiro:",
      providerError,
    );
  }

  if (!provider) {
    redirect("/protected/prestador/cadastro");
  }

  if (provider.status !== "approved") {
    redirect("/protected/prestador/status");
  }

  const { data, error } = await supabase
    .from("provider_services")
    .select(`
      id,
      name,
      description,
      pricing_type,
      price_cents,
      is_active,
      created_at,
      category:service_categories (
        id,
        name,
        slug
      )
    `)
    .eq("provider_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      "Erro ao carregar serviços do parceiro:",
      error,
    );
  }

  const services =
    (data as ProviderService[] | null) ?? [];

  const activeServices = services.filter(
    (service) => service.is_active,
  );

  const inactiveServices = services.filter(
    (service) => !service.is_active,
  );

  const categories = new Set(
    services
      .map((service) => service.category?.id)
      .filter(Boolean),
  ).size;

  const businessName =
    provider.business_name?.trim() || "Seu negócio";

  return (
    <main className="min-h-screen bg-[#f7f9f6] text-[#101c15]">
      <header className="sticky top-0 z-40 border-b border-black/[0.05] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[74px] max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/protected/prestador"
              className="text-[21px] font-black tracking-[-0.045em]"
            >
              Porto
              <span className="text-emerald-500">
                Serviços
              </span>
            </Link>

            <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 sm:inline-flex">
              Parceiro
            </span>
          </div>

          <div className="hidden items-center gap-2 rounded-full bg-[#f3f7f3] px-4 py-2 text-xs font-black text-[#496052] sm:flex">
            <MapPin className="h-4 w-4 text-emerald-600" />
            Porto Seguro
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 pb-20 pt-8 sm:px-8 sm:pt-10">
        <Link
          href="/protected/prestador"
          className="inline-flex items-center gap-2 text-xs font-black text-[#627067] transition hover:text-[#174c36]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a central
        </Link>

        <section className="mt-7 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">
              <BriefcaseBusiness className="h-4 w-4" />
              Catálogo do parceiro
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] sm:text-[42px]">
              Meus serviços
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#737d75]">
              Acompanhe as experiências publicadas por{" "}
              <span className="font-black text-[#34483b]">
                {businessName}
              </span>{" "}
              e veja exatamente o que os viajantes podem
              encontrar na plataforma.
            </p>
          </div>

          <div className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#dfe6e0] bg-white px-5 text-sm font-black text-[#879088]">
            <Plus className="h-4 w-4" />
            Novo serviço em breve
          </div>
        </section>

        <section className="mt-8 rounded-[32px] border border-[#dfe7e1] bg-white p-6 shadow-[0_20px_55px_-42px_rgba(15,40,25,0.45)] sm:p-7">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf8f1] text-[#13815a]">
                <Sparkles className="h-5 w-5" />
              </div>

              <h2 className="mt-4 text-xl font-black tracking-[-0.035em]">
                Seu catálogo na Porto Serviços
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-[#778179]">
                Serviços ativos podem ser encontrados pelos
                turistas nas categorias da plataforma.
                Mantenha nomes, descrições e valores claros
                para facilitar a decisão do viajante.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-[22px] bg-[#f5f8f5] px-5 py-4">
              <ShieldCheck className="h-5 w-5 shrink-0 text-[#14835c]" />

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#7a867d]">
                  Conta
                </p>

                <p className="mt-0.5 text-sm font-black text-[#174c36]">
                  Parceiro aprovado
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <MetricCard
            icon={<Eye className="h-5 w-5" />}
            label="Publicados"
            value={String(activeServices.length)}
            helper="visíveis para os viajantes"
          />

          <MetricCard
            icon={<EyeOff className="h-5 w-5" />}
            label="Inativos"
            value={String(inactiveServices.length)}
            helper="fora da vitrine no momento"
          />

          <MetricCard
            icon={<Tag className="h-5 w-5" />}
            label="Categorias"
            value={String(categories)}
            helper="com serviços cadastrados"
          />
        </section>

        <section className="mt-12">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.17em] text-[#14835c]">
              Experiências cadastradas
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-[-0.045em] sm:text-[30px]">
              Seu catálogo
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#727d75]">
              {services.length > 0
                ? `${services.length} ${
                    services.length === 1
                      ? "serviço cadastrado"
                      : "serviços cadastrados"
                  } na sua conta.`
                : "Você ainda não possui serviços cadastrados."}
            </p>
          </div>

          {error ? (
            <div className="mt-6 rounded-[26px] border border-red-100 bg-red-50 p-6">
              <p className="text-sm font-black text-red-900">
                Não foi possível carregar seus serviços.
              </p>

              <p className="mt-1 text-xs font-semibold text-red-700/70">
                Atualize a página e tente novamente.
              </p>
            </div>
          ) : services.length === 0 ? (
            <EmptyServices />
          ) : (
            <div className="mt-7 grid gap-5 lg:grid-cols-2">
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-12">
          <div className="rounded-[30px] bg-[#174c36] p-6 text-white sm:p-8">
            <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" />

                  <p className="text-[10px] font-black uppercase tracking-[0.17em]">
                    Catálogo conectado às oportunidades
                  </p>
                </div>

                <h2 className="mt-3 text-xl font-black tracking-[-0.035em] sm:text-2xl">
                  Seus serviços são a porta de entrada para
                  novos viajantes.
                </h2>

                <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-white/65">
                  Quando o fluxo de oportunidades estiver
                  completo, solicitações feitas pelos turistas
                  serão associadas aos seus serviços e
                  aparecerão diretamente na Central do
                  Parceiro.
                </p>
              </div>

              <Link
                href="/protected/prestador"
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl bg-white px-5 text-sm font-black text-[#174c36] transition hover:bg-[#edf7f1]"
              >
                Voltar para a central
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <article className="rounded-[27px] border border-[#e1e7e2] bg-white p-5 shadow-[0_10px_35px_-30px_rgba(15,40,25,0.45)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf8f1] text-[#13815a]">
        {icon}
      </div>

      <p className="mt-4 text-[11px] font-black uppercase tracking-[0.07em] text-[#7c867e]">
        {label}
      </p>

      <p className="mt-1 text-[24px] font-black tracking-[-0.04em]">
        {value}
      </p>

      <p className="mt-1 text-[11px] font-semibold text-[#969e97]">
        {helper}
      </p>
    </article>
  );
}

function ServiceCard({
  service,
}: {
  service: ProviderService;
}) {
  return (
    <article className="group overflow-hidden rounded-[30px] border border-[#e0e6e1] bg-white transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_20px_50px_-32px_rgba(16,50,31,0.35)]">
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eaf8f1] text-[#13815a]">
            <BriefcaseBusiness className="h-5 w-5" />
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] ${
              service.is_active
                ? "bg-emerald-50 text-emerald-700"
                : "bg-[#f1f3f1] text-[#7c867e]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                service.is_active
                  ? "bg-emerald-500"
                  : "bg-[#9ba39c]"
              }`}
            />

            {service.is_active
              ? "Publicado"
              : "Inativo"}
          </span>
        </div>

        <div className="mt-5">
          {service.category ? (
            <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#14835c]">
              {service.category.name}
            </p>
          ) : (
            <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#9aa29b]">
              Sem categoria
            </p>
          )}

          <h3 className="mt-2 text-xl font-black tracking-[-0.035em]">
            {service.name}
          </h3>

          <p className="mt-3 min-h-12 text-sm font-medium leading-6 text-[#778179]">
            {service.description?.trim() ||
              "Nenhuma descrição foi adicionada a este serviço."}
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[20px] bg-[#f5f8f5] p-4">
            <div className="flex items-center gap-2 text-[#758078]">
              <CircleDollarSign className="h-4 w-4" />

              <p className="text-[9px] font-black uppercase tracking-[0.12em]">
                Valor
              </p>
            </div>

            <p className="mt-2 text-sm font-black text-[#263c2e]">
              {getPricingLabel(
                service.pricing_type,
                service.price_cents,
              )}
            </p>
          </div>

          <div className="rounded-[20px] bg-[#f5f8f5] p-4">
            <div className="flex items-center gap-2 text-[#758078]">
              <PackageSearch className="h-4 w-4" />

              <p className="text-[9px] font-black uppercase tracking-[0.12em]">
                Cadastrado
              </p>
            </div>

            <p className="mt-2 text-sm font-black text-[#263c2e]">
              {formatDate(service.created_at)}
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-[#edf0ed] pt-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[11px] font-semibold leading-5 text-[#8c958d]">
              {service.is_active
                ? "Este serviço está disponível na vitrine."
                : "Este serviço não está visível para turistas."}
            </p>

            {service.is_active ? (
              <Link
                href={`/protected/servicos/${service.id}`}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#eef8f2] px-3 py-2 text-[10px] font-black text-[#14734f] transition hover:bg-[#e1f3e8]"
              >
                <Eye className="h-3.5 w-3.5" />
                Ver anúncio
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function EmptyServices() {
  return (
    <div className="mt-7 rounded-[30px] border border-dashed border-[#ccd8cf] bg-white px-6 py-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#eaf8f1] text-[#13815a]">
        <BriefcaseBusiness className="h-6 w-6" />
      </div>

      <h3 className="mt-5 text-lg font-black tracking-[-0.03em]">
        Nenhum serviço cadastrado
      </h3>

      <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-6 text-[#7b857d]">
        Seu catálogo ainda está vazio. A criação e edição de
        serviços será conectada aqui na próxima etapa, sem
        utilizar dados fictícios.
      </p>
    </div>
  );
}

export default function ProviderServicesPage() {
  return (
    <Suspense fallback={<ServicesLoading />}>
      <ServicesContent />
    </Suspense>
  );
}