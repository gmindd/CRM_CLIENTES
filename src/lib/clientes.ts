import { getDb } from "./db";
import { diasAte, hojeISO, adicionarMeses, arredondar } from "./format";
import type { Cliente, ClienteComEstado, Pagamento, Fase } from "./types";
import type { ClienteInput, PagamentoInput } from "./validation";

const CAMPOS = `id, empresa, nome_cliente, email, telefone, nif, fase, cliente_ativo,
  valor_projeto, moeda, link_desenvolvimento, link_final, tem_anuidade, valor_anuidade,
  alerta_dias_antes, data_proximo_pagamento, data_inicio, data_conclusao, notas,
  criado_em, atualizado_em`;

/** Acrescenta o estado do pagamento (vencido / alerta / agendado) a um cliente. */
export function comEstado(cliente: Cliente, hoje = hojeISO()): ClienteComEstado {
  const dias = cliente.tem_anuidade && cliente.cliente_ativo
    ? diasAte(cliente.data_proximo_pagamento, hoje)
    : null;

  let estado: ClienteComEstado["estado_pagamento"] = "sem_anuidade";
  if (dias !== null) {
    if (dias < 0) estado = "vencido";
    else if (dias <= cliente.alerta_dias_antes) estado = "alerta";
    else estado = "agendado";
  }

  return { ...cliente, dias_para_pagamento: dias, estado_pagamento: estado };
}

export interface FiltrosClientes {
  procura?: string;
  fase?: Fase | "todas";
  apenasAtivos?: boolean;
  apenasAnuidade?: boolean;
  ordem?: "recentes" | "empresa" | "pagamento" | "valor";
}

export function listarClientes(filtros: FiltrosClientes = {}): ClienteComEstado[] {
  const db = getDb();
  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (filtros.procura?.trim()) {
    where.push(`(empresa LIKE :q OR nome_cliente LIKE :q OR email LIKE :q OR telefone LIKE :q OR nif LIKE :q)`);
    params.q = `%${filtros.procura.trim()}%`;
  }
  if (filtros.fase && filtros.fase !== "todas") {
    where.push("fase = :fase");
    params.fase = filtros.fase;
  }
  if (filtros.apenasAtivos) where.push("cliente_ativo = 1");
  if (filtros.apenasAnuidade) where.push("tem_anuidade = 1");

  const ordenacao =
    filtros.ordem === "empresa"
      ? "empresa COLLATE NOCASE ASC"
      : filtros.ordem === "valor"
        ? "valor_projeto DESC"
        : filtros.ordem === "pagamento"
          ? "data_proximo_pagamento IS NULL, data_proximo_pagamento ASC"
          : "id DESC";

  const sql = `SELECT ${CAMPOS} FROM clientes
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY ${ordenacao}`;

  const linhas = db.prepare(sql).all(params) as Cliente[];
  const hoje = hojeISO();
  return linhas.map((c) => comEstado(c, hoje));
}

export function obterCliente(id: number): ClienteComEstado | null {
  const db = getDb();
  const linha = db.prepare(`SELECT ${CAMPOS} FROM clientes WHERE id = ?`).get(id) as Cliente | undefined;
  return linha ? comEstado(linha) : null;
}

export function criarCliente(dados: ClienteInput): ClienteComEstado {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO clientes (
        empresa, nome_cliente, email, telefone, nif, fase, cliente_ativo, valor_projeto, moeda,
        link_desenvolvimento, link_final, tem_anuidade, valor_anuidade, alerta_dias_antes,
        data_proximo_pagamento, data_inicio, data_conclusao, notas
      ) VALUES (
        @empresa, @nome_cliente, @email, @telefone, @nif, @fase, @cliente_ativo, @valor_projeto, @moeda,
        @link_desenvolvimento, @link_final, @tem_anuidade, @valor_anuidade, @alerta_dias_antes,
        @data_proximo_pagamento, @data_inicio, @data_conclusao, @notas
      )`,
    )
    .run(dados);

  return obterCliente(Number(info.lastInsertRowid))!;
}

export function atualizarCliente(id: number, dados: ClienteInput): ClienteComEstado | null {
  const db = getDb();
  const anterior = obterCliente(id);
  if (!anterior) return null;

  db.prepare(
    `UPDATE clientes SET
      empresa = @empresa, nome_cliente = @nome_cliente, email = @email, telefone = @telefone,
      nif = @nif, fase = @fase, cliente_ativo = @cliente_ativo, valor_projeto = @valor_projeto,
      moeda = @moeda, link_desenvolvimento = @link_desenvolvimento, link_final = @link_final,
      tem_anuidade = @tem_anuidade, valor_anuidade = @valor_anuidade,
      alerta_dias_antes = @alerta_dias_antes, data_proximo_pagamento = @data_proximo_pagamento,
      data_inicio = @data_inicio, data_conclusao = @data_conclusao, notas = @notas,
      atualizado_em = datetime('now')
    WHERE id = @id`,
  ).run({ ...dados, id });

  // Se a data de vencimento mudou, os alertas antigos deixam de ser relevantes.
  if (anterior.data_proximo_pagamento !== dados.data_proximo_pagamento) {
    db.prepare("DELETE FROM alertas_enviados WHERE cliente_id = ? AND data_pagamento != ?").run(
      id,
      dados.data_proximo_pagamento ?? "",
    );
  }

  return obterCliente(id);
}

export function apagarCliente(id: number): boolean {
  const db = getDb();
  return db.prepare("DELETE FROM clientes WHERE id = ?").run(id).changes > 0;
}

export function listarPagamentos(clienteId: number): Pagamento[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM pagamentos WHERE cliente_id = ? ORDER BY data DESC, id DESC")
    .all(clienteId) as Pagamento[];
}

/**
 * Regista um pagamento. Com `renovar`, avança a data do próximo pagamento
 * (por omissão +12 meses) e limpa os alertas já enviados para o ciclo anterior.
 */
export function registarPagamento(clienteId: number, dados: PagamentoInput): Pagamento | null {
  const db = getDb();
  const cliente = obterCliente(clienteId);
  if (!cliente) return null;

  const transacao = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO pagamentos (cliente_id, tipo, valor, data, notas)
         VALUES (@cliente_id, @tipo, @valor, @data, @notas)`,
      )
      .run({
        cliente_id: clienteId,
        tipo: dados.tipo,
        valor: dados.valor,
        data: dados.data,
        notas: dados.notas,
      });

    if (dados.renovar) {
      const base = cliente.data_proximo_pagamento ?? dados.data;
      const nova = adicionarMeses(base, dados.meses_renovacao);
      db.prepare(
        "UPDATE clientes SET data_proximo_pagamento = ?, atualizado_em = datetime('now') WHERE id = ?",
      ).run(nova, clienteId);
      db.prepare("DELETE FROM alertas_enviados WHERE cliente_id = ? AND data_pagamento != ?").run(
        clienteId,
        nova,
      );
    }

    return db.prepare("SELECT * FROM pagamentos WHERE id = ?").get(info.lastInsertRowid) as Pagamento;
  });

  return transacao();
}

export function apagarPagamento(clienteId: number, pagamentoId: number): boolean {
  const db = getDb();
  return (
    db.prepare("DELETE FROM pagamentos WHERE id = ? AND cliente_id = ?").run(pagamentoId, clienteId)
      .changes > 0
  );
}

export interface Estatisticas {
  total_clientes: number;
  clientes_ativos: number;
  por_fase: Record<Fase, number>;
  valor_total_projetos: number;
  valor_em_proposta: number;
  valor_em_desenvolvimento: number;
  valor_concluido: number;
  receita_anual_recorrente: number;
  pagamentos_vencidos: number;
  pagamentos_a_chegar: number;
  recebido_12_meses: number;
}

export function estatisticas(): Estatisticas {
  const clientes = listarClientes();
  const db = getDb();

  const porFase: Record<Fase, number> = {
    proposta: 0,
    desenvolvimento: 0,
    concluido: 0,
    cancelado: 0,
  };

  let valorTotal = 0;
  let valorProposta = 0;
  let valorDesenvolvimento = 0;
  let valorConcluido = 0;
  let arr = 0;
  let vencidos = 0;
  let aChegar = 0;

  for (const c of clientes) {
    porFase[c.fase] += 1;
    if (c.fase !== "cancelado") valorTotal += c.valor_projeto;
    if (c.fase === "proposta") valorProposta += c.valor_projeto;
    if (c.fase === "desenvolvimento") valorDesenvolvimento += c.valor_projeto;
    if (c.fase === "concluido") valorConcluido += c.valor_projeto;
    if (c.tem_anuidade && c.cliente_ativo) arr += c.valor_anuidade ?? 0;
    if (c.estado_pagamento === "vencido") vencidos += 1;
    if (c.estado_pagamento === "alerta") aChegar += 1;
  }

  const recebido = db
    .prepare("SELECT COALESCE(SUM(valor), 0) AS total FROM pagamentos WHERE data >= date('now','-12 months')")
    .get() as { total: number };

  return {
    total_clientes: clientes.length,
    clientes_ativos: clientes.filter((c) => c.cliente_ativo === 1).length,
    por_fase: porFase,
    valor_total_projetos: arredondar(valorTotal),
    valor_em_proposta: arredondar(valorProposta),
    valor_em_desenvolvimento: arredondar(valorDesenvolvimento),
    valor_concluido: arredondar(valorConcluido),
    receita_anual_recorrente: arredondar(arr),
    pagamentos_vencidos: vencidos,
    pagamentos_a_chegar: aChegar,
    recebido_12_meses: arredondar(recebido.total),
  };
}

/** Clientes com anuidade ativa ordenados pelo próximo vencimento. */
export function proximosPagamentos(limite = 10): ClienteComEstado[] {
  return listarClientes({ apenasAnuidade: true, apenasAtivos: true, ordem: "pagamento" })
    .filter((c) => c.data_proximo_pagamento)
    .slice(0, limite);
}
