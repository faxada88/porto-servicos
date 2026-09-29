"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronDown,
  Coins,
  Compass,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type UserAccountMenuProps = {
  firstName: string;
  email: string;
  isProvider: boolean;
  isAdmin: boolean;
};

type MenuLinkProps = {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  variant?: "default" | "credits";
  onClick: () => void;
};

function MenuLink({
  href,
  title,
  description,
  icon,
  variant = "default",
  onClick,
}: MenuLinkProps) {
  const isCredits = variant === "credits";

  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-[18px] border px-3 py-3 transition-all duration-200 ${
        isCredits
          ? "border-amber-100 bg-amber-50/60 hover:border-amber-200 hover:bg-amber-50"
          : "border-transparent hover:border-slate-100 hover:bg-slate-50"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] transition-all ${
          isCredits
            ? "bg-white text-amber-600 shadow-sm ring-1 ring-amber-100"
            : "bg-slate-50 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600"
        }`}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={`text-[13px] font-extrabold leading-5 ${
            isCredits
              ? "text-amber-950"
              : "text-slate-800"
          }`}
        >
          {title}
        </p>

        <p
          className={`mt-0.5 truncate text-[10px] font-semibold ${
            isCredits
              ? "text-amber-700/60"
              : "text-slate-400"
          }`}
        >
          {description}
        </p>
      </div>

      <ArrowRight
        size={15}
        className={`shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 ${
          isCredits
            ? "text-amber-500"
            : "text-slate-300 group-hover:text-emerald-500"
        }`}
      />
    </Link>
  );
}

export function UserAccountMenu({
  firstName,
  email,
  isProvider,
  isAdmin,
}: UserAccountMenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] =
    useState(false);
  const [logoutError, setLogoutError] =
    useState("");

  const normalizedName =
    firstName.trim() || "Usuário";

  const initial =
    normalizedName.charAt(0).toUpperCase();

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent,
    ) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, []);

  function closeMenu() {
    setIsOpen(false);
    setLogoutError("");
  }

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setLogoutError("");

    const supabase = createClient();

    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error(
        "Erro ao sair da conta:",
        error,
      );

      setLogoutError(
        "Não foi possível sair. Tente novamente.",
      );

      setIsLoggingOut(false);
    }
  }

  return (
    <div
      ref={menuRef}
      className="relative"
    >
      <button
        type="button"
        onClick={() => {
          setIsOpen(
            (current) => !current,
          );

          setLogoutError("");
        }}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Abrir menu da conta"
        className={`group flex items-center gap-2 rounded-full border bg-white p-1.5 pr-3 transition-all duration-200 ${
          isOpen
            ? "border-emerald-200 shadow-[0_10px_30px_-18px_rgba(5,46,22,0.35)]"
            : "border-slate-200 hover:border-emerald-200 hover:shadow-sm"
        }`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-black text-emerald-700 ring-1 ring-emerald-100">
          {initial}
        </div>

        <div className="hidden min-w-0 text-left sm:block">
          <p className="max-w-[110px] truncate text-[12px] font-black leading-4 text-slate-900">
            {normalizedName}
          </p>

          <div className="mt-0.5 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

            <span className="text-[9px] font-bold text-slate-400">
              {isAdmin
                ? "Administrador"
                : isProvider
                  ? "Parceiro"
                  : "Viajante"}
            </span>
          </div>
        </div>

        <ChevronDown
          size={14}
          className={`hidden text-slate-400 transition-transform duration-200 sm:block ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+12px)] z-[100] w-[340px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_30px_80px_-25px_rgba(15,23,42,0.3)]"
        >
          <div className="p-4 pb-3">
            <div className="flex items-center gap-3 rounded-[20px] bg-slate-50/80 p-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-white text-sm font-black text-emerald-700 shadow-sm ring-1 ring-slate-100">
                {initial}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-black text-slate-900">
                  {normalizedName}
                </p>

                <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">
                  {email ||
                    "Conta PortoServiços"}
                </p>
              </div>

              {isProvider || isAdmin ? (
                <div
                  title={
                    isAdmin
                      ? "Administrador"
                      : "Parceiro aprovado"
                  }
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"
                >
                  <ShieldCheck size={15} />
                </div>
              ) : null}
            </div>
          </div>

          {isAdmin ? (
            <>
              <div className="px-4 pb-4">
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Administração
                  </p>

                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Admin
                  </div>
                </div>

                <div className="space-y-1">
                  <MenuLink
                    href="/admin"
                    title="Painel administrativo"
                    description="Gerencie a Porto Serviços"
                    icon={<LayoutDashboard size={18} />}
                    onClick={closeMenu}
                  />

                  <MenuLink
                    href="/protected"
                    title="Ver plataforma"
                    description="Visualize a experiência do viajante"
                    icon={<Compass size={18} />}
                    onClick={closeMenu}
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck
                    size={13}
                    className="shrink-0 text-slate-400"
                  />

                  <p className="truncate text-[10px] font-semibold text-slate-400">
                    Acesso administrativo
                  </p>
                </div>
              </div>
            </>
          ) : isProvider ? (
            <>
              <div className="px-4 pb-4">
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Gestão do parceiro
                  </p>

                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Aprovado
                  </div>
                </div>

                <div className="space-y-1">
                  <MenuLink
                    href="/protected/prestador"
                    title="Central do Parceiro"
                    description="Resumo da sua operação"
                    icon={
                      <LayoutDashboard
                        size={18}
                      />
                    }
                    onClick={closeMenu}
                  />

                  <MenuLink
                    href="/protected/prestador/servicos"
                    title="Meus serviços"
                    description="Gerencie seu catálogo"
                    icon={
                      <Store size={18} />
                    }
                    onClick={closeMenu}
                  />

                  <MenuLink
                    href="/protected/prestador#comprar-creditos"
                    title="Comprar créditos"
                    description="Saldo para desbloquear contatos"
                    icon={
                      <Coins size={18} />
                    }
                    variant="credits"
                    onClick={closeMenu}
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-3">
                <div className="flex items-center gap-2">
                  <BriefcaseBusiness
                    size={13}
                    className="shrink-0 text-slate-400"
                  />

                  <p className="truncate text-[10px] font-semibold text-slate-400">
                    Ambiente exclusivo do parceiro
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="px-4 pb-4">
              <p className="mb-2 px-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                Sua conta
              </p>

              <div className="space-y-1">
                <MenuLink
                  href="/protected"
                  title="Início"
                  description="Explore Porto Seguro"
                  icon={
                    <Compass size={18} />
                  }
                  onClick={closeMenu}
                />

                <MenuLink
                  href="/protected"
                  title="Minha conta"
                  description="Seus dados e preferências"
                  icon={
                    <UserRound size={18} />
                  }
                  onClick={closeMenu}
                />
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 p-3">
            {logoutError && (
              <div className="mb-2 rounded-[14px] border border-red-100 bg-red-50 px-3 py-2 text-[10px] font-semibold leading-4 text-red-600">
                {logoutError}
              </div>
            )}

            <button
              type="button"
              role="menuitem"
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="group flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 transition group-hover:bg-red-100">
                {isLoggingOut ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-200 border-t-red-600" />
                ) : (
                  <LogOut size={16} />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-extrabold text-red-600">
                  {isLoggingOut
                    ? "Saindo..."
                    : "Sair da conta"}
                </p>

                {!isLoggingOut && (
                  <p className="mt-0.5 text-[9px] font-medium text-red-400">
                    Encerrar sessão
                  </p>
                )}
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}