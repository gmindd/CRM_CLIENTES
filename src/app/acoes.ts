"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  apagarCliente,
  apagarPagamento,
  atualizarCliente,
  concluirFollowup,
  criarCliente,
  registarPagamento,
} from "@/lib/clientes";
import {
  clienteSchema,
  definicoesEmailSchema,
  errosPorCampo,
  pagamentoSchema,
} from "@/lib/validation";
import { guardarConfig, type ChaveConfig } from "@/lib/config";
import { temSessao } from "@/lib/auth";
import { verificarAlertas } from "@/lib/alertas";

export interface EstadoFormulario {
  ok?: boolean;
  erroGeral?: string;
  erros?: Record<string, string>;
  valores?: Record<string, string>;
}

async function exigirSessao() {
  if (!(await temSessao())) throw new Error("Não autenticado");
}

function paraObjeto(dados: FormData): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const [chave, valor] of dados.entries()) {
    if (typeof valor === "string") saida[chave] = valor;
  }
  return saida;
}

export async function guardarCliente(
  _estado: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  const valores = paraObjeto(dados);
  const id = valores.id ? Number(valores.id) : null;
  const resultado = clienteSchema.safeParse(valores);

  if (!resultado.success) {
    return { erros: errosPorCampo(resultado.error as z.ZodError), valores };
  }

  let destino: string;
  try {
    if (id) {
      const atualizado = atualizarCliente(id, resultado.data);
      if (!atualizado) return { erroGeral: "Cliente não encontrado", valores };
      destino = `/clientes/${id}`;
    } else {
      const novo = criarCliente(resultado.data);
      destino = `/clientes/${novo.id}`;
    }
  } catch (erro) {
    console.error("[guardarCliente]", erro);
    return { erroGeral: "Não foi possível guardar. Tente novamente.", valores };
  }

  revalidatePath("/");
  revalidatePath("/clientes");
  revalidatePath(destino);
  redirect(destino);
}

export async function removerCliente(dados: FormData) {
  await exigirSessao();
  const id = Number(dados.get("id"));
  if (Number.isFinite(id)) apagarCliente(id);
  revalidatePath("/");
  revalidatePath("/clientes");
  redirect("/clientes");
}

/** Marca o follow-up de um cliente como feito (botão na ficha). */
export async function marcarFollowupFeito(dados: FormData) {
  await exigirSessao();
  const id = Number(dados.get("id"));
  if (Number.isFinite(id)) {
    concluirFollowup(id);
    revalidatePath("/");
    revalidatePath(`/clientes/${id}`);
    revalidatePath("/clientes");
  }
}

export async function guardarPagamento(
  _estado: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  const valores = paraObjeto(dados);
  const clienteId = Number(valores.cliente_id);
  const resultado = pagamentoSchema.safeParse(valores);

  if (!resultado.success) {
    return { erros: errosPorCampo(resultado.error as z.ZodError), valores };
  }
  if (!Number.isFinite(clienteId)) {
    return { erroGeral: "Cliente inválido", valores };
  }

  const pagamento = registarPagamento(clienteId, resultado.data);
  if (!pagamento) return { erroGeral: "Cliente não encontrado", valores };

  revalidatePath("/");
  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function removerPagamento(dados: FormData) {
  await exigirSessao();
  const clienteId = Number(dados.get("cliente_id"));
  const pagamentoId = Number(dados.get("pagamento_id"));
  if (Number.isFinite(clienteId) && Number.isFinite(pagamentoId)) {
    apagarPagamento(clienteId, pagamentoId);
    revalidatePath(`/clientes/${clienteId}`);
  }
}

/** Corre a verificação de alertas manualmente (botão nas Definições). */
export async function correrAlertas(_estado: unknown, dados: FormData) {
  await exigirSessao();
  const simulacao = dados.get("simulacao") === "true";
  try {
    const resultado = await verificarAlertas({ simulacao });
    revalidatePath("/definicoes");
    return { ok: true, simulacao, resultado };
  } catch (erro) {
    return {
      ok: false,
      simulacao,
      erroGeral: erro instanceof Error ? erro.message : "Erro desconhecido",
    };
  }
}

/**
 * Guarda as definições de email escritas na página de Definições.
 *
 * A password só é alterada quando o campo vem preenchido: em branco mantém a
 * que já estava guardada, e a caixa "apagar" remove-a.
 */
export async function guardarDefinicoesEmail(
  _estado: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  const valores = paraObjeto(dados);
  const resultado = definicoesEmailSchema.safeParse(valores);

  if (!resultado.success) {
    return { erros: errosPorCampo(resultado.error as z.ZodError), valores };
  }

  const aGuardar: Partial<Record<ChaveConfig, string | null>> = { ...resultado.data };

  const novaPassword = (valores.SMTP_PASS ?? "").trim();
  if (dados.get("apagar_password") === "on") {
    aGuardar.SMTP_PASS = null;
  } else if (novaPassword) {
    aGuardar.SMTP_PASS = novaPassword;
  }

  try {
    guardarConfig(aGuardar);
  } catch (erro) {
    console.error("[guardarDefinicoesEmail]", erro);
    return { erroGeral: "Não foi possível guardar as definições.", valores };
  }

  revalidatePath("/definicoes");
  return { ok: true };
}
