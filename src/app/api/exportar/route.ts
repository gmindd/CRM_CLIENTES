import { listarClientes } from "@/lib/clientes";
import { temSessao } from "@/lib/auth";
import { hojeISO } from "@/lib/format";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLUNAS = [
  "id",
  "empresa",
  "nome_cliente",
  "email",
  "telefone",
  "nif",
  "fase",
  "cliente_ativo",
  "valor_projeto",
  "moeda",
  "link_desenvolvimento",
  "link_final",
  "tem_anuidade",
  "valor_anuidade",
  "alerta_dias_antes",
  "data_proximo_pagamento",
  "data_inicio",
  "data_conclusao",
  "notas",
  "criado_em",
] as const;

function celula(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  const texto = String(valor);
  return /[",;\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** Exporta todos os clientes em CSV (separador ';' — abre direto no Excel PT). */
export async function GET() {
  if (!(await temSessao())) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const clientes = listarClientes({ ordem: "empresa" });
  const linhas = [
    COLUNAS.join(";"),
    ...clientes.map((c) => COLUNAS.map((coluna) => celula(c[coluna])).join(";")),
  ];

  // BOM para o Excel reconhecer UTF-8
  const csv = `﻿${linhas.join("\n")}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clientes-${hojeISO()}.csv"`,
    },
  });
}
