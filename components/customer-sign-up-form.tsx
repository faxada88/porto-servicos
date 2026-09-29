"use client";

import { createClient } from "@/lib/supabase/client";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) {
    return digits.length ? `(${digits}` : "";
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function translateAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("user already registered") ||
    normalized.includes("already been registered")
  ) {
    return "Este e-mail já possui uma conta.";
  }

  if (normalized.includes("password should be")) {
    return "A senha não atende aos requisitos mínimos de segurança.";
  }

  if (normalized.includes("invalid email")) {
    return "Digite um endereço de e-mail válido.";
  }

  if (
    normalized.includes("email rate limit") ||
    normalized.includes("rate limit")
  ) {
    return "Muitas tentativas foram realizadas. Aguarde alguns instantes e tente novamente.";
  }

  return message || "Não foi possível criar sua conta. Tente novamente.";
}

export function CustomerSignUpForm() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const passwordRules = useMemo(
    () => ({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
    }),
    [password],
  );

  const passwordIsValid = Object.values(passwordRules).every(Boolean);

  const passwordsMatch =
    repeatPassword.length > 0 && password === repeatPassword;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    setError(null);

    const normalizedName = fullName.trim().replace(/\s+/g, " ");
    const normalizedEmail = email.trim().toLowerCase();
    const phoneDigits = phone.replace(/\D/g, "");

    if (normalizedName.length < 3 || !normalizedName.includes(" ")) {
      setError("Digite seu nome completo.");
      return;
    }

    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setError("Digite um telefone válido com DDD.");
      return;
    }

    if (!normalizedEmail) {
      setError("Digite seu e-mail.");
      return;
    }

    if (!passwordIsValid) {
      setError(
        "Sua senha precisa ter pelo menos 8 caracteres, incluindo letra maiúscula, letra minúscula e número.",
      );
      return;
    }

    if (password !== repeatPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/protected`,
          data: {
            full_name: normalizedName,
            phone: phoneDigits,
            account_type: "customer",
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      /*
       * Se a confirmação de e-mail estiver desativada no Supabase,
       * signUp pode retornar uma sessão imediatamente.
       */
      if (data.session) {
        router.replace("/protected");
        router.refresh();
        return;
      }

      /*
       * Com confirmação de e-mail ativada, mostramos a página
       * de confirmação.
       */
      router.push("/auth/sign-up-success");
    } catch (caughtError: unknown) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Não foi possível criar sua conta.";

      setError(translateAuthError(message));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-8"
    >
      <div className="grid gap-5">
        {/* NOME */}
        <div>
          <label
            htmlFor="customer-full-name"
            className="mb-2 block text-sm font-extrabold text-[#101828]"
          >
            Nome completo
          </label>

          <div className="relative">
            <UserRound
              aria-hidden="true"
              size={19}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              id="customer-full-name"
              name="fullName"
              type="text"
              autoComplete="name"
              placeholder="Ex.: Victor Hugo Conceição"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              disabled={isLoading}
              required
              className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-[16px] font-medium text-[#101828] outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </div>
        </div>

        {/* TELEFONE */}
        <div>
          <label
            htmlFor="customer-phone"
            className="mb-2 block text-sm font-extrabold text-[#101828]"
          >
            Telefone com DDD
          </label>

          <div className="relative">
            <Phone
              aria-hidden="true"
              size={19}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              id="customer-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(73) 99999-9999"
              value={phone}
              onChange={(event) =>
                setPhone(formatPhone(event.target.value))
              }
              disabled={isLoading}
              required
              className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-[16px] font-medium text-[#101828] outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </div>
        </div>

        {/* EMAIL */}
        <div>
          <label
            htmlFor="customer-email"
            className="mb-2 block text-sm font-extrabold text-[#101828]"
          >
            E-mail
          </label>

          <div className="relative">
            <Mail
              aria-hidden="true"
              size={19}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              id="customer-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="voce@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isLoading}
              required
              className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-[16px] font-medium text-[#101828] outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </div>
        </div>

        {/* SENHA */}
        <div>
          <label
            htmlFor="customer-password"
            className="mb-2 block text-sm font-extrabold text-[#101828]"
          >
            Crie uma senha
          </label>

          <div className="relative">
            <LockKeyhole
              aria-hidden="true"
              size={19}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              id="customer-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Digite uma senha segura"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isLoading}
              required
              className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-12 text-[16px] font-medium text-[#101828] outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
            />

            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              disabled={isLoading}
              aria-label={
                showPassword ? "Ocultar senha" : "Mostrar senha"
              }
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-50 hover:text-[#101828] focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>

          {/* FORÇA DA SENHA */}
          {password.length > 0 && (
            <div className="mt-3 rounded-2xl bg-slate-50 p-4">
              <p className="mb-3 text-xs font-extrabold text-slate-600">
                Sua senha precisa ter:
              </p>

              <div className="grid gap-2 sm:grid-cols-2">
                <PasswordRule
                  valid={passwordRules.length}
                  label="8 caracteres"
                />

                <PasswordRule
                  valid={passwordRules.uppercase}
                  label="1 letra maiúscula"
                />

                <PasswordRule
                  valid={passwordRules.lowercase}
                  label="1 letra minúscula"
                />

                <PasswordRule
                  valid={passwordRules.number}
                  label="1 número"
                />
              </div>
            </div>
          )}
        </div>

        {/* CONFIRMAR SENHA */}
        <div>
          <label
            htmlFor="customer-repeat-password"
            className="mb-2 block text-sm font-extrabold text-[#101828]"
          >
            Confirme sua senha
          </label>

          <div className="relative">
            <LockKeyhole
              aria-hidden="true"
              size={19}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              id="customer-repeat-password"
              name="repeatPassword"
              type={showRepeatPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Digite novamente"
              value={repeatPassword}
              onChange={(event) =>
                setRepeatPassword(event.target.value)
              }
              disabled={isLoading}
              required
              className={`h-14 w-full rounded-2xl border bg-white pl-12 pr-12 text-[16px] font-medium text-[#101828] outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50 ${
                repeatPassword.length === 0
                  ? "border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/10"
                  : passwordsMatch
                    ? "border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/10"
                    : "border-red-300 focus:border-red-400 focus:ring-red-500/10"
              }`}
            />

            <button
              type="button"
              onClick={() =>
                setShowRepeatPassword((current) => !current)
              }
              disabled={isLoading}
              aria-label={
                showRepeatPassword
                  ? "Ocultar confirmação de senha"
                  : "Mostrar confirmação de senha"
              }
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-50 hover:text-[#101828] focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {showRepeatPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>

          {repeatPassword.length > 0 && (
            <p
              className={`mt-2 flex items-center gap-1.5 text-xs font-bold ${
                passwordsMatch
                  ? "text-emerald-600"
                  : "text-red-500"
              }`}
            >
              {passwordsMatch && <Check size={14} />}

              {passwordsMatch
                ? "As senhas coincidem"
                : "As senhas ainda não coincidem"}
            </p>
          )}
        </div>

        {/* ERRO */}
        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-semibold leading-6 text-red-700"
          >
            {error}
          </div>
        )}

        {/* TERMOS */}
        <p className="text-xs leading-5 text-slate-500">
          Ao criar sua conta, você declara que leu e concorda com os{" "}
          <span className="font-bold text-[#101828]">
            Termos de Uso
          </span>{" "}
          e com a{" "}
          <span className="font-bold text-[#101828]">
            Política de Privacidade
          </span>
          .
        </p>

        {/* BOTÃO */}
        <button
          type="submit"
          disabled={isLoading}
          className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#101828] px-5 text-sm font-extrabold text-white shadow-[0_12px_30px_-16px_rgba(15,23,42,0.8)] transition-all hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-[0_16px_35px_-16px_rgba(5,150,105,0.6)] focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Criando sua conta...
            </>
          ) : (
            <>
              Criar minha conta
              <ArrowRight
                size={18}
                className="transition-transform group-hover:translate-x-1"
              />
            </>
          )}
        </button>

        {/* LOGIN */}
        <p className="text-center text-sm text-slate-500">
          Já possui uma conta?{" "}
          <a
            href="/auth/login"
            className="font-extrabold text-[#101828] transition hover:text-emerald-600"
          >
            Entrar
          </a>
        </p>
      </div>
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
      className={`flex items-center gap-2 text-xs font-bold transition-colors ${
        valid ? "text-emerald-600" : "text-slate-400"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full transition-colors ${
          valid
            ? "bg-emerald-100 text-emerald-600"
            : "bg-slate-200 text-slate-400"
        }`}
      >
        <Check size={12} strokeWidth={3} />
      </span>

      {label}
    </div>
  );
}