import { getDb } from "./db";
import { listarClientes, followupsPendentes } from "./clientes";
import { enviarEmail, destinatarioAlertas, emailConfigurado } from "./mail";
import { valorConfig } from "./config";
import { formatData, formatMoeda, hojeISO } from "./format";
import { FASE_LABEL, type ClienteComEstado } from "./types";

export interface ResultadoAlertas {
  verificados: number;
  enviados: number;
  ignorados: number;
  erros: string[];
  detalhes: Array<{ cliente: string; dias: number; tipo: TipoAlerta; estado: string }>;
}

export type TipoAlerta = "aviso" | "vencido" | "followup";

function urlBase(): string {
  return (valorConfig("APP_URL") || "https://crm.pereiragabriel.com").replace(/\/$/, "");
}

/** Email do lembrete de follow-up: contactei o cliente, está na hora de voltar lá. */
function corpoFollowup(cliente: ClienteComEstado, dias: number) {
  const data = formatData(cliente.followup_data);
  const link = `${urlBase()}/clientes/${cliente.id}`;

  const titulo =
    dias < 0
      ? `Follow-up atrasado ${Math.abs(dias)} dia(s)`
      : "Follow-up marcado para hoje";

  const linhas: Array<[string, string]> = [
    ["Empresa", cliente.empresa],
    ["Contacto", cliente.nome_cliente],
    ["Email", cliente.email || "—"],
    ["Telefone", cliente.telefone || "—"],
    ["Fase", FASE_LABEL[cliente.fase]],
    ["Site atual", cliente.site_atual || "—"],
    ["Marcado para", data],
  ];

  const nota = cliente.followup_nota;

  const texto = [
    titulo,
    "",
    ...(nota ? [`Lembrete: ${nota}`, ""] : []),
    ...linhas.map(([k, v]) => `${k}: ${v}`),
    "",
    `Ver no CRM: ${link}`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="pt"><body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#18181b">
  <table role="presentation" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e4e4e7;border-collapse:separate">
    <tr><td style="padding:24px 28px;border-bottom:1px solid #e4e4e7">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${dias < 0 ? "#b91c1c" : "#4f46e5"}">
        Lembrete de follow-up
      </p>
      <h1 style="margin:0;font-size:20px;line-height:1.3">${escapar(titulo)}</h1>
    </td></tr>
    ${
      nota
        ? `<tr><td style="padding:18px 28px 0">
             <p style="margin:0;padding:12px 14px;background:#f4f4f5;border-radius:8px;font-size:14px;white-space:pre-wrap">${escapar(nota)}</p>
           </td></tr>`
        : ""
    }
    <tr><td style="padding:20px 28px">
      <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">
        ${linhas
          .map(
            ([k, v]) =>
              `<tr><td style="padding:6px 0;color:#71717a;width:45%">${k}</td><td style="padding:6px 0;font-weight:600">${escapar(v)}</td></tr>`,
          )
          .join("")}
      </table>
    </td></tr>
    <tr><td style="padding:0 28px 28px">
      <a href="${link}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">Abrir no CRM</a>
    </td></tr>
  </table>
</body></html>`;

  const assunto =
    dias < 0
      ? `[CRM] Follow-up atrasado — ${cliente.empresa}`
      : `[CRM] Follow-up hoje — ${cliente.empresa}`;

  return { assunto, html, texto };
}

function corpoEmail(cliente: ClienteComEstado, dias: number, tipo: "aviso" | "vencido") {
  const valor = formatMoeda(cliente.valor_anuidade, cliente.moeda);
  const data = formatData(cliente.data_proximo_pagamento);
  const link = `${urlBase()}/clientes/${cliente.id}`;

  const titulo =
    tipo === "vencido"
      ? `Pagamento em atraso há ${Math.abs(dias)} dia(s)`
      : dias === 0
        ? "Pagamento vence hoje"
        : `Pagamento daqui a ${dias} dia(s)`;

  const linhas: Array<[string, string]> = [
    ["Empresa", cliente.empresa],
    ["Cliente", cliente.nome_cliente],
    ["Email", cliente.email || "—"],
    ["Telefone", cliente.telefone || "—"],
    ["Valor da anuidade", valor],
    ["Data de vencimento", data],
    ["Projeto", cliente.link_final || cliente.link_desenvolvimento || "—"],
  ];

  const texto = [
    `${titulo}`,
    "",
    ...linhas.map(([k, v]) => `${k}: ${v}`),
    "",
    `Ver no CRM: ${link}`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="pt"><body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#18181b">
  <table role="presentation" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e4e4e7;border-collapse:separate">
    <tr><td style="padding:24px 28px;border-bottom:1px solid #e4e4e7">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${tipo === "vencido" ? "#b91c1c" : "#a16207"}">
        ${tipo === "vencido" ? "Pagamento em atraso" : "Alerta de pagamento"}
      </p>
      <h1 style="margin:0;font-size:20px;line-height:1.3">${titulo}</h1>
    </td></tr>
    <tr><td style="padding:20px 28px">
      <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">
        ${linhas
          .map(
            ([k, v]) =>
              `<tr><td style="padding:6px 0;color:#71717a;width:45%">${k}</td><td style="padding:6px 0;font-weight:600">${escapar(v)}</td></tr>`,
          )
          .join("")}
      </table>
    </td></tr>
    <tr><td style="padding:0 28px 28px">
      <a href="${link}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">Abrir no CRM</a>
    </td></tr>
  </table>
</body></html>`;

  const assunto =
    tipo === "vencido"
      ? `[CRM] Anuidade em atraso — ${cliente.empresa} (${valor})`
      : `[CRM] Anuidade de ${cliente.empresa} ${dias === 0 ? "vence hoje" : `vence em ${dias} dias`} (${valor})`;

  return { assunto, html, texto };
}

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

/**
 * Percorre os clientes com anuidade ativa e envia email para os que entraram
 * na janela de alerta (ou já estão em atraso). Cada vencimento só gera um
 * email de cada tipo — o registo fica em `alertas_enviados`.
 *
 * @param opcoes.simulacao  não envia nada, apenas devolve o que enviaria
 * @param opcoes.reenviar   ignora o registo e envia mesmo que já tenha enviado
 */
export async function verificarAlertas(
  opcoes: { simulacao?: boolean; reenviar?: boolean } = {},
): Promise<ResultadoAlertas> {
  const db = getDb();
  const hoje = hojeISO();
  const resultado: ResultadoAlertas = {
    verificados: 0,
    enviados: 0,
    ignorados: 0,
    erros: [],
    detalhes: [],
  };

  const candidatos = listarClientes({ apenasAnuidade: true, apenasAtivos: true }).filter(
    (c) => c.data_proximo_pagamento && c.dias_para_pagamento !== null,
  );
  resultado.verificados = candidatos.length;

  const semEmail = !opcoes.simulacao && !emailConfigurado();
  if (candidatos.length && semEmail) {
    resultado.erros.push(
      "Envio de email por configurar — indique o servidor SMTP na página de Definições",
    );
  }

  const jaEnviado = db.prepare(
    "SELECT 1 FROM alertas_enviados WHERE cliente_id = ? AND data_pagamento = ? AND tipo = ?",
  );
  const registar = db.prepare(
    `INSERT OR REPLACE INTO alertas_enviados (cliente_id, data_pagamento, tipo, dias_antes, destinatario, enviado_em)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
  );

  for (const cliente of semEmail ? [] : candidatos) {
    const dias = cliente.dias_para_pagamento!;
    const tipo: "aviso" | "vencido" = dias < 0 ? "vencido" : "aviso";

    // Fora da janela de alerta: nada a fazer.
    if (dias > cliente.alerta_dias_antes) continue;

    const enviadoAntes = !opcoes.reenviar
      ? jaEnviado.get(cliente.id, cliente.data_proximo_pagamento, tipo)
      : undefined;

    if (enviadoAntes) {
      resultado.ignorados += 1;
      resultado.detalhes.push({
        cliente: cliente.empresa,
        dias,
        tipo,
        estado: "já enviado",
      });
      continue;
    }

    if (opcoes.simulacao) {
      resultado.detalhes.push({ cliente: cliente.empresa, dias, tipo, estado: "seria enviado" });
      continue;
    }

    try {
      const mensagem = corpoEmail(cliente, dias, tipo);
      await enviarEmail(mensagem);
      registar.run(
        cliente.id,
        cliente.data_proximo_pagamento,
        tipo,
        cliente.alerta_dias_antes,
        destinatarioAlertas(),
      );
      resultado.enviados += 1;
      resultado.detalhes.push({ cliente: cliente.empresa, dias, tipo, estado: "enviado" });
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      resultado.erros.push(`${cliente.empresa}: ${mensagem}`);
      resultado.detalhes.push({ cliente: cliente.empresa, dias, tipo, estado: `erro: ${mensagem}` });
    }
  }

  // ---- Lembretes de follow-up ----
  //
  // Ao contrário das anuidades (que avisam com dias de antecedência), o
  // follow-up avisa no próprio dia marcado. Se ficar por fazer, o email sai
  // uma vez só; o CRM continua a mostrá-lo como atrasado.
  const followups = followupsPendentes(500).filter(
    (c) => c.fase !== "cancelado" && c.dias_para_followup !== null && c.dias_para_followup <= 0,
  );
  resultado.verificados += followups.length;

  if (followups.length && !opcoes.simulacao && !emailConfigurado()) {
    if (resultado.erros.length === 0) {
      resultado.erros.push(
        "Envio de email por configurar — indique o servidor SMTP na página de Definições",
      );
    }
    return resultado;
  }

  for (const cliente of followups) {
    const dias = cliente.dias_para_followup!;

    const enviadoAntes = !opcoes.reenviar
      ? jaEnviado.get(cliente.id, cliente.followup_data, "followup")
      : undefined;

    if (enviadoAntes) {
      resultado.ignorados += 1;
      resultado.detalhes.push({
        cliente: cliente.empresa,
        dias,
        tipo: "followup",
        estado: "já enviado",
      });
      continue;
    }

    if (opcoes.simulacao) {
      resultado.detalhes.push({
        cliente: cliente.empresa,
        dias,
        tipo: "followup",
        estado: "seria enviado",
      });
      continue;
    }

    try {
      await enviarEmail(corpoFollowup(cliente, dias));
      registar.run(cliente.id, cliente.followup_data, "followup", 0, destinatarioAlertas());
      resultado.enviados += 1;
      resultado.detalhes.push({
        cliente: cliente.empresa,
        dias,
        tipo: "followup",
        estado: "enviado",
      });
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      resultado.erros.push(`${cliente.empresa} (follow-up): ${mensagem}`);
      resultado.detalhes.push({
        cliente: cliente.empresa,
        dias,
        tipo: "followup",
        estado: `erro: ${mensagem}`,
      });
    }
  }

  console.log(
    `[alertas] ${hoje} — verificados: ${resultado.verificados}, enviados: ${resultado.enviados}, ignorados: ${resultado.ignorados}, erros: ${resultado.erros.length}`,
  );

  return resultado;
}

/** Histórico de alertas enviados (para a página de definições). */
export function historicoAlertas(limite = 50) {
  return getDb()
    .prepare(
      `SELECT a.*, c.empresa, c.nome_cliente
       FROM alertas_enviados a
       JOIN clientes c ON c.id = a.cliente_id
       ORDER BY a.enviado_em DESC
       LIMIT ?`,
    )
    .all(limite) as Array<{
    id: number;
    cliente_id: number;
    data_pagamento: string;
    tipo: TipoAlerta;
    dias_antes: number | null;
    destinatario: string | null;
    enviado_em: string;
    empresa: string;
    nome_cliente: string;
  }>;
}
