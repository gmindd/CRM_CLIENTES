import { NextResponse } from "next/server";
import { verificarAlertas } from "@/lib/alertas";
import { temSessao } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint para acionar a verificação de alertas a partir do exterior
 * (cron do sistema, Uptime Kuma, GitHub Actions, ...).
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://crm.exemplo.com/api/cron/alertas
 *
 * Fica acessível sem sessão, mas exige o CRON_SECRET. Se CRON_SECRET não
 * estiver definido, só é possível chamar com sessão iniciada.
 */
async function autorizado(pedido: Request): Promise<boolean> {
  const segredo = process.env.CRON_SECRET;
  if (segredo) {
    const cabecalho = pedido.headers.get("authorization") ?? "";
    const url = new URL(pedido.url);
    if (cabecalho === `Bearer ${segredo}` || url.searchParams.get("secret") === segredo) {
      return true;
    }
  }
  return temSessao();
}

async function processar(pedido: Request) {
  if (!(await autorizado(pedido))) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const url = new URL(pedido.url);
  const simulacao = url.searchParams.get("simulacao") === "true";

  try {
    const resultado = await verificarAlertas({ simulacao });
    return NextResponse.json({ ok: true, simulacao, ...resultado });
  } catch (erro) {
    console.error("[cron/alertas]", erro);
    return NextResponse.json(
      { ok: false, erro: erro instanceof Error ? erro.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}

export const GET = processar;
export const POST = processar;
