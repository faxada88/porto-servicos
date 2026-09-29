"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AdminActionState = {
  success: boolean;
  message: string;
};

async function verifyAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/login");
  }

  const { data: userRole, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleError || userRole?.role !== "admin") {
    return {
      supabase,
      user,
      authorized: false,
    };
  }

  return {
    supabase,
    user,
    authorized: true,
  };
}

export async function approveProvider(
  providerId: string,
): Promise<AdminActionState> {
  const { supabase, authorized } = await verifyAdmin();

  if (!authorized) {
    return {
      success: false,
      message: "Você não possui permissão para realizar esta ação.",
    };
  }

  const { error } = await supabase.rpc("approve_provider", {
    target_provider_id: providerId,
  });

  if (error) {
    console.error("Erro ao aprovar parceiro:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    if (error.message.includes("PROVIDER_PROFILE_NOT_FOUND")) {
      return {
        success: false,
        message: "Parceiro não encontrado.",
      };
    }

    if (error.message.includes("INVALID_PROVIDER_STATUS")) {
      return {
        success: false,
        message: "Este cadastro não está mais aguardando aprovação.",
      };
    }

    if (error.message.includes("ADMIN_REQUIRED")) {
      return {
        success: false,
        message: "Apenas administradores podem aprovar parceiros.",
      };
    }

    return {
      success: false,
      message: "Não foi possível aprovar o parceiro.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/protected");
  revalidatePath("/protected/prestador/status");

  return {
    success: true,
    message: "Parceiro aprovado com sucesso.",
  };
}

export async function rejectProvider(
  providerId: string,
  reason: string,
): Promise<AdminActionState> {
  const { supabase, authorized } = await verifyAdmin();

  if (!authorized) {
    return {
      success: false,
      message: "Você não possui permissão para realizar esta ação.",
    };
  }

  const normalizedReason = reason.trim();

  if (!normalizedReason) {
    return {
      success: false,
      message: "Informe o motivo da recusa.",
    };
  }

  if (normalizedReason.length < 5) {
    return {
      success: false,
      message: "Informe um motivo de recusa mais detalhado.",
    };
  }

  const { error } = await supabase.rpc("reject_provider", {
    target_provider_id: providerId,
    rejection_reason: normalizedReason,
  });

  if (error) {
    console.error("Erro ao recusar parceiro:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    if (error.message.includes("PROVIDER_PROFILE_NOT_FOUND")) {
      return {
        success: false,
        message: "Parceiro não encontrado.",
      };
    }

    if (error.message.includes("INVALID_PROVIDER_STATUS")) {
      return {
        success: false,
        message: "Este cadastro não está mais aguardando análise.",
      };
    }

    if (error.message.includes("ADMIN_REQUIRED")) {
      return {
        success: false,
        message: "Apenas administradores podem recusar parceiros.",
      };
    }

    return {
      success: false,
      message: "Não foi possível recusar o parceiro.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/protected");
  revalidatePath("/protected/prestador/status");

  return {
    success: true,
    message: "Parceiro recusado com sucesso.",
  };
}

export async function signOutAdmin() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/auth/login");
}