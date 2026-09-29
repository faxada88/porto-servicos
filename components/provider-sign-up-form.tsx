"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Compass,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Sparkles,
  UserRound,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Step = 1 | 2 | 3;
type PricingType = "fixed" | "starting_at" | "hourly" | "quote";

type ServiceCategory = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
};

type ProviderFormData = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  repeatPassword: string;
  businessName: string;
  description: string;
  categoryId: string;
  serviceName: string;
  serviceDescription: string;
  pricingType: PricingType;
  price: string;
};

const initialForm: ProviderFormData = {
  fullName: "",
  phone: "",
  email: "",
  password: "",
  repeatPassword: "",
  businessName: "",
  description: "",
  categoryId: "",
  serviceName: "",
  serviceDescription: "",
  pricingType: "quote",
  price: "",
};

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) return digits;

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatPrice(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) return "";

  return (Number(digits) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function priceToCents(value: string) {
  if (!value) return null;

  const normalized = value
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");

  const amount = Number(normalized);

  if (!Number.isFinite(amount)) return null;

  return Math.round(amount * 100);
}

function translateAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("already registered") ||
    normalized.includes("already been registered") ||
    normalized.includes("user already registered")
  ) {
    return "Este e-mail já possui uma conta na Porto Serviços.";
  }

  if (normalized.includes("invalid email")) {
    return "Informe um endereço de e-mail válido.";
  }

  if (normalized.includes("password")) {
    return "A senha informada não atende aos requisitos de segurança.";
  }

  if (
    normalized.includes("rate limit") ||
    normalized.includes("too many requests")
  ) {
    return "Muitas tentativas foram realizadas. Aguarde um momento e tente novamente.";
  }

  return "Não foi possível criar sua conta agora. Tente novamente.";
}

function translateOnboardingError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("telefone")) {
    return "O telefone informado não é válido.";
  }

  if (normalized.includes("categoria")) {
    return "A categoria selecionada não está mais disponível.";
  }

  if (normalized.includes("preço") || normalized.includes("preco")) {
    return "Verifique o valor informado para sua oferta.";
  }

  if (normalized.includes("não autenticado")) {
    return "Sua sessão não pôde ser iniciada. Faça o cadastro novamente.";
  }

  return "Sua conta foi criada, mas não foi possível enviar seu cadastro de parceiro para análise.";
}

export function ProviderSignUpForm() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<ProviderFormData>(initialForm);

  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordRules = useMemo(
    () => ({
      length: form.password.length >= 8,
      uppercase: /[A-Z]/.test(form.password),
      lowercase: /[a-z]/.test(form.password),
      number: /\d/.test(form.password),
    }),
    [form.password],
  );

  const passwordIsValid = Object.values(passwordRules).every(Boolean);

  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      setCategoriesLoading(true);
      setCategoriesError("");

      try {
        const supabase = createClient();

        const { data, error: queryError } = await supabase
          .from("service_categories")
          .select("id, name, slug, icon")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true });

        if (!mounted) return;

        if (queryError) {
          console.error("Erro ao carregar categorias:", queryError);
          setCategories([]);
          setCategoriesError(
            "Não foi possível carregar as categorias agora.",
          );
          return;
        }

        setCategories((data ?? []) as ServiceCategory[]);
      } catch (loadError) {
        console.error(
          "Erro inesperado ao carregar categorias:",
          loadError,
        );

        if (mounted) {
          setCategories([]);
          setCategoriesError(
            "Não foi possível carregar as categorias agora.",
          );
        }
      } finally {
        if (mounted) {
          setCategoriesLoading(false);
        }
      }
    }

    void loadCategories();

    return () => {
      mounted = false;
    };
  }, []);

  async function reloadCategories() {
    setCategoriesLoading(true);
    setCategoriesError("");

    try {
      const supabase = createClient();

      const { data, error: queryError } = await supabase
        .from("service_categories")
        .select("id, name, slug, icon")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (queryError) {
        console.error("Erro ao recarregar categorias:", queryError);
        setCategories([]);
        setCategoriesError(
          "Não foi possível carregar as categorias agora.",
        );
        return;
      }

      setCategories((data ?? []) as ServiceCategory[]);
    } catch (loadError) {
      console.error(
        "Erro inesperado ao recarregar categorias:",
        loadError,
      );

      setCategories([]);
      setCategoriesError(
        "Não foi possível carregar as categorias agora.",
      );
    } finally {
      setCategoriesLoading(false);
    }
  }

  function updateField<K extends keyof ProviderFormData>(
    field: K,
    value: ProviderFormData[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (error) setError("");
  }

  function validateStepOne() {
    const name = form.fullName.trim();
    const phone = form.phone.replace(/\D/g, "");
    const email = form.email.trim();

    if (name.length < 3) {
      setError("Informe seu nome completo.");
      return false;
    }

    if (phone.length < 10 || phone.length > 11) {
      setError("Informe um telefone válido com DDD.");
      return false;
    }

    if (!email || !email.includes("@")) {
      setError("Informe um e-mail válido.");
      return false;
    }

    if (!passwordIsValid) {
      setError(
        "Sua senha ainda não atende aos requisitos de segurança.",
      );
      return false;
    }

    if (form.password !== form.repeatPassword) {
      setError("As senhas informadas não são iguais.");
      return false;
    }

    return true;
  }

  function validateStepTwo() {
    if (form.businessName.trim().length < 3) {
      setError("Informe o nome do seu negócio ou atividade.");
      return false;
    }

    if (form.description.trim().length < 20) {
      setError(
        "Conte um pouco mais sobre seu negócio. Use pelo menos 20 caracteres.",
      );
      return false;
    }

    return true;
  }

  function validateStepThree() {
    if (!form.categoryId) {
      setError("Selecione a categoria principal do seu negócio.");
      return false;
    }

    if (form.serviceName.trim().length < 3) {
      setError("Informe o nome da experiência, atividade ou oferta.");
      return false;
    }

    if (form.serviceDescription.trim().length < 10) {
      setError(
        "Descreva melhor o que você deseja apresentar aos viajantes.",
      );
      return false;
    }

    if (form.pricingType !== "quote") {
      const cents = priceToCents(form.price);

      if (cents === null || cents < 0) {
        setError("Informe um valor válido.");
        return false;
      }
    }

    return true;
  }

  function goToStepTwo() {
    if (!validateStepOne()) return;

    setError("");
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToStepThree() {
    if (!validateStepTwo()) return;

    setError("");
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setError("");

    if (step === 2) setStep(1);
    if (step === 3) setStep(2);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function createProviderAccount() {
    if (!validateStepThree()) return;

    setLoading(true);
    setError("");

    const supabase = createClient();

    const normalizedEmail = form.email.trim().toLowerCase();
    const normalizedName = form.fullName.trim();
    const phoneDigits = form.phone.replace(/\D/g, "");

    try {
      /*
       * Mantemos a estrutura interna provider/customer para preservar
       * compatibilidade com o banco e as políticas existentes.
       */
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: normalizedEmail,
          password: form.password,
          options: {
            emailRedirectTo: `${window.location.origin}/protected`,
            data: {
              full_name: normalizedName,
              phone: phoneDigits,
              account_type: "provider",
            },
          },
        });

      if (signUpError) {
        setError(translateAuthError(signUpError.message));
        return;
      }

      if (!signUpData.user) {
        setError("Não foi possível concluir a criação da conta.");
        return;
      }

      if (!signUpData.session) {
        router.replace("/auth/sign-up-success?tipo=prestador");
        return;
      }

      const priceCents =
        form.pricingType === "quote" ? null : priceToCents(form.price);

      /*
       * Envia o cadastro para o fluxo de aprovação.
       * Os nomes técnicos do RPC permanecem inalterados.
       */
      const { error: onboardingError } = await supabase.rpc(
        "submit_provider_onboarding",
        {
          target_phone: phoneDigits,
          target_business_name: form.businessName.trim(),
          target_description: form.description.trim() || null,
          target_category_id: form.categoryId,
          target_service_name: form.serviceName.trim(),
          target_service_description:
            form.serviceDescription.trim() || null,
          target_pricing_type: form.pricingType,
          target_price_cents: priceCents,
        },
      );

      if (onboardingError) {
        console.error(
          "Erro ao enviar cadastro do parceiro:",
          onboardingError,
        );

        setError(
          translateOnboardingError(onboardingError.message),
        );

        return;
      }

      router.replace(
        "/auth/sign-up-success?tipo=prestador&status=pending",
      );

      router.refresh();
    } catch (unexpectedError) {
      console.error(
        "Erro inesperado no cadastro do parceiro:",
        unexpectedError,
      );

      setError("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (step === 1) {
      goToStepTwo();
      return;
    }

    if (step === 2) {
      goToStepThree();
      return;
    }

    await createProviderAccount();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {/* ETAPA 1 */}
      {step === 1 && (
        <>
          <div className="mb-1">
            <p className="text-sm font-extrabold text-slate-900">
              Seus dados
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Primeiro, precisamos criar seu acesso à plataforma.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="provider-full-name"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Nome completo
              </label>

              <div className="relative">
                <UserRound
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="provider-full-name"
                  type="text"
                  autoComplete="name"
                  disabled={loading}
                  value={form.fullName}
                  onChange={(event) =>
                    updateField("fullName", event.target.value)
                  }
                  placeholder="Digite seu nome completo"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-50"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="provider-phone"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                WhatsApp
              </label>

              <div className="relative">
                <Phone
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="provider-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  disabled={loading}
                  value={form.phone}
                  onChange={(event) =>
                    updateField("phone", formatPhone(event.target.value))
                  }
                  placeholder="(73) 99999-9999"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-50"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="provider-email"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                E-mail
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="provider-email"
                  type="email"
                  autoComplete="email"
                  disabled={loading}
                  value={form.email}
                  onChange={(event) =>
                    updateField("email", event.target.value)
                  }
                  placeholder="voce@email.com"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-50"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="provider-password"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Senha
              </label>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="provider-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  disabled={loading}
                  value={form.password}
                  onChange={(event) =>
                    updateField("password", event.target.value)
                  }
                  placeholder="Crie uma senha"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-12 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-50"
                />

                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                  aria-label={
                    showPassword ? "Ocultar senha" : "Mostrar senha"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="provider-repeat-password"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Confirmar senha
              </label>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="provider-repeat-password"
                  type={showRepeatPassword ? "text" : "password"}
                  autoComplete="new-password"
                  disabled={loading}
                  value={form.repeatPassword}
                  onChange={(event) =>
                    updateField("repeatPassword", event.target.value)
                  }
                  placeholder="Repita sua senha"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-12 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-50"
                />

                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    setShowRepeatPassword((current) => !current)
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                  aria-label={
                    showRepeatPassword
                      ? "Ocultar senha"
                      : "Mostrar senha"
                  }
                >
                  {showRepeatPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
              Sua senha precisa ter
            </p>

            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <PasswordRule
                valid={passwordRules.length}
                label="8 ou mais caracteres"
              />

              <PasswordRule
                valid={passwordRules.uppercase}
                label="Uma letra maiúscula"
              />

              <PasswordRule
                valid={passwordRules.lowercase}
                label="Uma letra minúscula"
              />

              <PasswordRule
                valid={passwordRules.number}
                label="Pelo menos um número"
              />
            </div>
          </div>
        </>
      )}

      {/* ETAPA 2 */}
      {step === 2 && (
        <div>
          <div className="mb-6">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <BriefcaseBusiness size={21} />
            </div>

            <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.1em] text-emerald-600">
              Seu negócio
            </p>

            <h3 className="text-xl font-black tracking-[-0.5px] text-slate-900">
              Conte aos viajantes quem você é
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Essas informações ajudam a Porto Serviços a conhecer seu
              negócio antes da publicação na plataforma.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label
                htmlFor="provider-business-name"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Nome do negócio ou atividade
              </label>

              <input
                id="provider-business-name"
                type="text"
                disabled={loading}
                value={form.businessName}
                onChange={(event) =>
                  updateField("businessName", event.target.value)
                }
                placeholder="Ex.: Passeios Porto Azul"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-50"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-4">
                <label
                  htmlFor="provider-description"
                  className="block text-sm font-bold text-slate-700"
                >
                  Apresente seu negócio
                </label>

                <span className="text-xs font-semibold text-slate-400">
                  {form.description.length}/500
                </span>
              </div>

              <textarea
                id="provider-description"
                rows={6}
                maxLength={500}
                disabled={loading}
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                placeholder="Conte o que você oferece, onde atua, seus diferenciais e por que o viajante deveria conhecer seu negócio..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base font-medium leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-50"
              />
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
              <div className="flex items-start gap-3">
                <MapPin
                  size={19}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />

                <p className="text-xs leading-5 text-emerald-900/80">
                  Use uma apresentação clara e atrativa. Essas informações
                  poderão fazer parte da experiência que o viajante verá ao
                  conhecer seu negócio.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ETAPA 3 */}
      {step === 3 && (
        <div>
          <div className="mb-6">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Compass size={21} />
            </div>

            <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.1em] text-emerald-600">
              Sua oferta
            </p>

            <h3 className="text-xl font-black tracking-[-0.5px] text-slate-900">
              O que o viajante encontrará?
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Escolha a categoria e cadastre sua primeira experiência,
              atividade ou oferta. Após a aprovação, ela poderá aparecer na
              plataforma.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label
                htmlFor="provider-category"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Categoria principal
              </label>

              {categoriesLoading ? (
                <div className="flex min-h-[54px] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-500">
                  <Loader2
                    size={18}
                    className="animate-spin text-emerald-600"
                  />
                  Carregando categorias...
                </div>
              ) : categoriesError ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">
                    {categoriesError}
                  </p>

                  <button
                    type="button"
                    onClick={() => void reloadCategories()}
                    className="mt-3 inline-flex items-center gap-2 text-sm font-extrabold text-amber-900"
                  >
                    <RefreshCw size={15} />
                    Tentar novamente
                  </button>
                </div>
              ) : categories.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                  Nenhuma categoria está disponível no momento.
                </div>
              ) : (
                <select
                  id="provider-category"
                  disabled={loading}
                  value={form.categoryId}
                  onChange={(event) =>
                    updateField("categoryId", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                >
                  <option value="">
                    Selecione uma categoria
                  </option>

                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label
                htmlFor="provider-service-name"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Nome da experiência, atividade ou oferta
              </label>

              <input
                id="provider-service-name"
                type="text"
                disabled={loading}
                value={form.serviceName}
                onChange={(event) =>
                  updateField("serviceName", event.target.value)
                }
                placeholder="Ex.: Passeio de escuna para Coroa Alta"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-50"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-4">
                <label
                  htmlFor="provider-service-description"
                  className="block text-sm font-bold text-slate-700"
                >
                  O que está incluído?
                </label>

                <span className="text-xs font-semibold text-slate-400">
                  {form.serviceDescription.length}/500
                </span>
              </div>

              <textarea
                id="provider-service-description"
                rows={5}
                maxLength={500}
                disabled={loading}
                value={form.serviceDescription}
                onChange={(event) =>
                  updateField(
                    "serviceDescription",
                    event.target.value,
                  )
                }
                placeholder="Explique como funciona, o que está incluído e as principais informações que o viajante precisa saber..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base font-medium leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-50"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="provider-pricing-type"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Como deseja informar o preço?
                </label>

                <select
                  id="provider-pricing-type"
                  disabled={loading}
                  value={form.pricingType}
                  onChange={(event) =>
                    updateField(
                      "pricingType",
                      event.target.value as PricingType,
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                >
                  <option value="quote">
                    Consulte o parceiro
                  </option>

                  <option value="fixed">
                    Preço fixo
                  </option>

                  <option value="starting_at">
                    A partir de
                  </option>

                  <option value="hourly">
                    Por hora
                  </option>
                </select>
              </div>

              {form.pricingType !== "quote" && (
                <div>
                  <label
                    htmlFor="provider-price"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Valor
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                      R$
                    </span>

                    <input
                      id="provider-price"
                      type="text"
                      inputMode="numeric"
                      disabled={loading}
                      value={form.price}
                      onChange={(event) =>
                        updateField(
                          "price",
                          formatPrice(event.target.value),
                        )
                      }
                      placeholder="0,00"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-50"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  size={20}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />

                <div>
                  <p className="text-sm font-extrabold text-emerald-900">
                    Publicação somente após aprovação
                  </p>

                  <p className="mt-1 text-xs leading-5 text-emerald-800/80">
                    Seu cadastro será enviado para análise. Seu negócio e sua
                    primeira oferta permanecerão pendentes até a aprovação da
                    Porto Serviços.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <Sparkles
                  size={19}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />

                <div>
                  <p className="text-sm font-extrabold text-slate-800">
                    Você poderá expandir sua presença depois
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Após a aprovação, a plataforma poderá permitir que você
                    apresente outras experiências e opções aos viajantes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
        {step > 1 ? (
          <button
            type="button"
            onClick={goBack}
            disabled={loading}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowLeft size={17} />
            Voltar
          </button>
        ) : (
          <div className="hidden sm:block" />
        )}

        <button
          type="submit"
          disabled={loading || (step === 3 && categoriesLoading)}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#101828] px-6 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Enviando cadastro...
            </>
          ) : step < 3 ? (
            <>
              Continuar
              <ArrowRight size={18} />
            </>
          ) : (
            <>
              Enviar para análise
              <Check size={18} />
            </>
          )}
        </button>
      </div>

      <p className="text-center text-xs leading-5 text-slate-400">
        Ao continuar, você confirma que as informações fornecidas são
        verdadeiras e concorda com os Termos de Uso e a Política de
        Privacidade.
      </p>
    </form>
  );
}

function PasswordRule({
  valid,
  label,
}: {
  valid: boolean;
  label: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 font-semibold ${
        valid ? "text-emerald-700" : "text-slate-500"
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          valid
            ? "bg-emerald-100 text-emerald-700"
            : "bg-slate-200 text-slate-400"
        }`}
      >
        <Check size={12} strokeWidth={3} />
      </span>

      {label}
    </div>
  );
}