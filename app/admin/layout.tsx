import { redirect } from "next/navigation";
import { Suspense } from "react";

import AdminShell from "./admin-shell";
import { createClient } from "@/lib/supabase/server";

function ShellLoading({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-[#f3f6f2]">{children}</main>;
}

async function SecuredShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (role?.role !== "admin") redirect("/protected");

  return <AdminShell email={user.email ?? "Administrador"}>{children}</AdminShell>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<ShellLoading>{children}</ShellLoading>}><SecuredShell>{children}</SecuredShell></Suspense>;
}
