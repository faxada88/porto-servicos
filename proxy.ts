import { updateSession } from "@/lib/supabase/proxy";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  /*
   * O webhook do Stripe precisa receber o POST diretamente.
   *
   * Não pode passar pelo fluxo de autenticação/sessão do
   * Supabase, pois o Stripe não possui sessão de usuário e
   * redirects 307 impedem o processamento correto do webhook.
   *
   * A segurança dessa rota é feita pela assinatura
   * criptográfica "stripe-signature", validada dentro de:
   * /api/stripe/webhook
   */
  if (
    request.nextUrl.pathname === "/api/stripe/webhook"
  ) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Mantemos o proxy ativo para toda a aplicação.
     *
     * A exceção específica do Stripe Webhook é tratada
     * diretamente dentro da função proxy acima.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
