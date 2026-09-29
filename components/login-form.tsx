"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type ProviderStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

function translateLoginError(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials")
  ) {
    return "E-mail ou senha incorretos.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar.";
  }

  if (
    normalized.includes("rate limit") ||
    normalized.includes("too many requests")
  ) {
    return "Muitas tentativas de acesso. Aguarde um momento e tente novamente.";
  }

  return "Não foi possível entrar na sua conta. Tente novamente.";
}

export function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] =
    useState(false);

  async function handleLogin(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setIsLoading(true);

    const supabase = createClient();

    try {
      const {
        data: signInData,
        error: signInError,
      } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setError(
          translateLoginError(signInError.message),
        );
        return;
      }

      const user = signInData.user;

      if (!user) {
        setError(
          "Não foi possível identificar sua conta.",
        );
        return;
      }

      /*
       * PRIMEIRO: verifica se é administrador.
       */
      const {
        data: userRole,
        error: roleError,
      } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleError) {
        console.error(
          "Erro ao verificar função do usuário:",
          roleError,
        );

        setError(
          "Não foi possível verificar sua conta agora.",
        );
        return;
      }

      if (userRole?.role === "admin") {
        router.replace("/admin");
        router.refresh();
        return;
      }

      /*
       * SEGUNDO: verifica se a conta possui
       * perfil profissional.
       *
       * Cliente comum não possui provider_profiles.
       */
      const {
        data: providerProfile,
        error: providerError,
      } = await supabase
        .from("provider_profiles")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (providerError) {
        console.error(
          "Erro ao verificar perfil profissional:",
          providerError,
        );

        setError(
          "Não foi possível verificar o status do seu perfil.",
        );
        return;
      }

      if (providerProfile) {
        const status =
          providerProfile.status as ProviderStatus;

        /*
         * PRESTADOR AGUARDANDO APROVAÇÃO
         */
        if (status === "pending") {
          router.replace(
            "/protected/prestador/status",
          );
          router.refresh();
          return;
        }

        /*
         * PRESTADOR REJEITADO
         */
        if (status === "rejected") {
          router.replace(
            "/protected/prestador/status",
          );
          router.refresh();
          return;
        }

        /*
         * PRESTADOR SUSPENSO
         */
        if (status === "suspended") {
          router.replace(
            "/protected/prestador/status",
          );
          router.refresh();
          return;
        }

        /*
         * PRESTADOR APROVADO
         */
        if (status === "approved") {
          router.replace("/protected");
          router.refresh();
          return;
        }
      }

      /*
       * CLIENTE COMUM
       */
      router.replace("/protected");
      router.refresh();
    } catch (unexpectedError) {
      console.error(
        "Erro inesperado no login:",
        unexpectedError,
      );

      setError(
        "Ocorreu um erro inesperado. Tente novamente.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <LockKeyhole size={22} />
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-700">
          <ShieldCheck size={13} />
          Acesso seguro
        </div>

        <h1 className="mt-4 text-[32px] font-black tracking-[-0.045em] text-[#101828]">
          Bem-vindo de volta.
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Entre na sua conta para continuar na
          PortoServiços.
        </p>
      </div>

      <form
        onSubmit={handleLogin}
        className="space-y-5"
      >
        <div>
          <label
            htmlFor="login-email"
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
              id="login-email"
              type="email"
              autoComplete="email"
              required
              disabled={isLoading}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);

                if (error) setError("");
              }}
              placeholder="voce@email.com"
              className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-50"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-4">
            <label
              htmlFor="login-password"
              className="block text-sm font-bold text-slate-700"
            >
              Senha
            </label>

            <Link
              href="/auth/forgot-password"
              className="text-xs font-extrabold text-emerald-600 transition hover:text-emerald-700"
            >
              Esqueci minha senha
            </Link>
          </div>

          <div className="relative">
            <LockKeyhole
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              id="login-password"
              type={
                showPassword ? "text" : "password"
              }
              autoComplete="current-password"
              required
              disabled={isLoading}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);

                if (error) setError("");
              }}
              placeholder="Digite sua senha"
              className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-12 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-50"
            />

            <button
              type="button"
              disabled={isLoading}
              onClick={() =>
                setShowPassword(
                  (current) => !current,
                )
              }
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
              aria-label={
                showPassword
                  ? "Ocultar senha"
                  : "Mostrar senha"
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

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#101828] px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2
                size={18}
                className="animate-spin"
              />
              Entrando...
            </>
          ) : (
            <>
              Entrar na minha conta
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <div className="my-7 flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200" />

        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          ou
        </span>

        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <Link
        href="/auth/sign-up"
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      >
        <BriefcaseBusiness size={17} />
        Criar uma conta
      </Link>

      <div className="mt-7 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
        <Sparkles
          size={13}
          className="text-emerald-500"
        />
        Simples, seguro e feito para Porto Seguro.
      </div>
    </div>
  );
}