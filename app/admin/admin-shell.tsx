"use client";

import {
  ChevronRight,
  Coins,
  ExternalLink,
  Handshake,
  LayoutGrid,
  Menu,
  PackageCheck,
  ShieldCheck,
  Store,
  Tags,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const nav = [
  { href: "/admin", label: "Visão geral", icon: LayoutGrid, exact: true },
  { href: "/admin/parceiros", label: "Parceiros", icon: Store },
  { href: "/admin/experiencias", label: "Experiências", icon: PackageCheck, disabled: true },
  { href: "/admin/oportunidades", label: "Oportunidades", icon: Handshake },
  { href: "/admin/categorias", label: "Categorias", icon: Tags, disabled: true },
  { href: "/admin/financeiro", label: "Financeiro & créditos", icon: Coins, disabled: true },
];

export default function AdminShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const active = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <main className="min-h-screen bg-[#f3f6f2] text-[#142018]">
      <div className="mx-auto flex min-h-screen max-w-[1920px]">
        <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-[#e5e9e4] bg-[#fbfcfa] px-4 py-5 lg:flex">
          <Brand />
          <p className="mb-2 mt-8 px-3 text-[9px] font-black uppercase tracking-[0.18em] text-[#a1aaa3]">Operação</p>
          <nav className="space-y-1">
            {nav.map((item) => <NavItem key={item.label} {...item} selected={active(item.href, item.exact)} />)}
          </nav>

          <div className="mt-auto">
            <Link href="/protected" className="flex items-center justify-between rounded-[16px] border border-[#e3e8e3] bg-white px-3.5 py-3 text-[11px] font-black text-[#526057] transition hover:border-[#c9d8cd]">
              <span className="flex items-center gap-2"><ExternalLink className="h-3.5 w-3.5 text-[#15845b]" /> Ver plataforma</span>
              <ChevronRight className="h-3.5 w-3.5 text-[#a6aea8]" />
            </Link>
            <div className="mt-3 rounded-[18px] bg-[#123c2a] p-3.5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[11px] font-black">A</div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black">Administrador</p>
                  <p className="mt-0.5 truncate text-[9px] font-semibold text-white/55">{email}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-50 border-b border-[#e4e9e4] bg-[#fbfcfa]/95 backdrop-blur-xl lg:hidden">
            <div className="flex h-16 items-center justify-between px-4">
              <Brand compact />
              <button onClick={() => setOpen(!open)} className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-[#e2e7e2] bg-white" aria-label="Abrir menu">
                {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
            {open ? (
              <nav className="grid grid-cols-2 gap-2 border-t border-[#e9ede9] p-4">
                {nav.map((item) => <NavItem key={item.label} {...item} selected={active(item.href, item.exact)} mobile onNavigate={() => setOpen(false)} />)}
              </nav>
            ) : null}
          </header>
          {children}
        </div>
      </div>
    </main>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/admin" className="flex items-center gap-3 px-2">
      <div className={`flex ${compact ? "h-9 w-9 rounded-[13px]" : "h-10 w-10 rounded-[15px]"} items-center justify-center bg-[#123c2a] text-white shadow-[0_10px_25px_-15px_rgba(18,60,42,.9)]`}>
        <ShieldCheck className="h-[18px] w-[18px]" />
      </div>
      <div>
        <p className={`${compact ? "text-sm" : "text-[17px]"} font-black tracking-[-0.045em]`}>Porto<span className="text-[#16a36f]">Serviços</span></p>
        <p className="text-[8px] font-black uppercase tracking-[0.17em] text-[#9aa39c]">Admin</p>
      </div>
    </Link>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  selected,
  disabled,
  mobile,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  selected: boolean;
  disabled?: boolean;
  exact?: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const classes = `flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-[11px] font-black transition ${selected ? "bg-[#e9f5ee] text-[#125b3e]" : "text-[#69766e] hover:bg-[#f0f4f1] hover:text-[#263a2e]"} ${disabled ? "cursor-default opacity-45" : ""}`;
  const content = <><Icon className="h-[16px] w-[16px] shrink-0" /><span className="truncate">{label}</span>{selected ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#18a36f]" /> : null}</>;

  if (disabled) return <div className={classes} title="Módulo em construção">{content}</div>;
  return <Link href={href} onClick={onNavigate} className={`${classes} ${mobile ? "border border-[#e7ebe7] bg-white" : ""}`}>{content}</Link>;
}
