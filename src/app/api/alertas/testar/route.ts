import { NextResponse } from "next/server";
import { destinatarioAlertas, emailConfigurado, enviarEmail, testarLigacao } from "@/lib/mail";
import { temSessao } from "@/lib/auth";

export const runtime = "nodejs";

/** Envia um email de teste para confirmar que o SMTP está bem configurado. */
export async function POST() {
  if (!(await temSessao())) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }
  if (!emailConfigurado()) {
    return NextResponse.json(
      { erro: "Preencha o servidor SMTP e o remetente nesta página, e guarde primeiro." },
      { status: 400 },
    );
  }

  try {
    await testarLigacao();
    await enviarEmail({
      assunto: "[CRM] Email de teste",
      texto: "Se está a ler isto, os alertas de pagamento do CRM estão a funcionar.",
      html: `<p style="font-family:system-ui,sans-serif">Se está a ler isto, os alertas de pagamento do CRM estão a funcionar. ✅</p>`,
    });
    return NextResponse.json({ ok: true, destinatario: destinatarioAlertas() });
  } catch (erro) {
    return NextResponse.json(
      { ok: false, erro: erro instanceof Error ? erro.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
