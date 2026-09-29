"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AdminActionState = {
  success: boolean;
  message: string;
};

export type AdminCreditAdjustmentResult = AdminActionState & {
  data?: {
    providerUserId: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    transactionId: string;
  };
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

export async function adjustPartnerCredits(
  providerUserId: string,
  amount: number,
  reason: string,
): Promise<AdminCreditAdjustmentResult> {
  const { supabase, authorized } = await verifyAdmin();

  if (!authorized) {
    return {
      success: false,
      message: "Você não possui permissão para ajustar créditos.",
    };
  }

  const normalizedProviderUserId = providerUserId.trim();
  const normalizedReason = reason.trim();

  if (!normalizedProviderUserId) {
    return {
      success: false,
      message: "Parceiro não informado.",
    };
  }

  if (!Number.isSafeInteger(amount) || amount === 0) {
    return {
      success: false,
      message: "Informe uma quantidade inteira de créditos diferente de zero.",
    };
  }

  if (normalizedReason.length < 5) {
    return {
      success: false,
      message: "Informe um motivo com pelo menos 5 caracteres.",
    };
  }

  if (normalizedReason.length > 500) {
    return {
      success: false,
      message: "O motivo deve possuir no máximo 500 caracteres.",
    };
  }

  const { data, error } = await supabase.rpc("admin_adjust_partner_credits", {
    target_provider_user_id: normalizedProviderUserId,
    adjustment_amount: amount,
    adjustment_reason: normalizedReason,
  });

  if (error) {
    console.error("Erro ao ajustar créditos do parceiro:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    if (error.message.includes("ADMIN_REQUIRED")) {
      return {
        success: false,
        message: "Apenas administradores podem ajustar créditos.",
      };
    }

    if (error.message.includes("PROVIDER_PROFILE_NOT_FOUND")) {
      return {
        success: false,
        message: "Parceiro não encontrado.",
      };
    }

    if (error.message.includes("INSUFFICIENT_CREDITS_FOR_ADJUSTMENT")) {
      return {
        success: false,
        message: "O parceiro não possui créditos suficientes para esta remoção.",
      };
    }

    if (error.message.includes("INVALID_ADJUSTMENT_AMOUNT")) {
      return {
        success: false,
        message: "A quantidade de créditos deve ser diferente de zero.",
      };
    }

    if (
      error.message.includes("ADJUSTMENT_REASON_TOO_SHORT") ||
      error.message.includes("ADJUSTMENT_REASON_TOO_LONG")
    ) {
      return {
        success: false,
        message: "Informe um motivo entre 5 e 500 caracteres.",
      };
    }

    return {
      success: false,
      message: "Não foi possível ajustar os créditos do parceiro.",
    };
  }

  const result = Array.isArray(data) ? data[0] : data;

  if (!result) {
    return {
      success: false,
      message: "O ajuste foi processado, mas o resultado não pôde ser confirmado.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/parceiros");
  revalidatePath(`/admin/parceiros/${normalizedProviderUserId}`);
  revalidatePath("/admin/financeiro");
  revalidatePath("/protected/prestador/creditos");

  return {
    success: true,
    message:
      amount > 0
        ? `${amount} crédito(s) adicionado(s) com sucesso.`
        : `${Math.abs(amount)} crédito(s) removido(s) com sucesso.`,
    data: {
      providerUserId: result.provider_user_id,
      amount: result.amount,
      balanceBefore: result.balance_before,
      balanceAfter: result.balance_after,
      transactionId: result.transaction_id,
    },
  };
}

export async function signOutAdmin() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/auth/login");
}
