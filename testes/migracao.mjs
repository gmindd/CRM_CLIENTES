/**
 * Verifica que uma base de dados criada com o esquema ANTIGO sobrevive à
 * migração: dados intactos, campos novos disponíveis, relações preservadas.
 *
 *   npm run test:migracao
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const falhas = [];
const ok = (m) => console.log("  ✓", m);
const falhar = (m) => { falhas.push(m); console.log("  ✗", m); };

const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "crm-migracao-"));
const ficheiro = path.join(pasta, "antiga.sqlite");

console.log("1. Criar base de dados com o esquema antigo");
{
  const db = new Database(ficheiro);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa TEXT NOT NULL, nome_cliente TEXT NOT NULL, email TEXT, telefone TEXT, nif TEXT,
      fase TEXT NOT NULL DEFAULT 'proposta'
        CHECK (fase IN ('proposta','desenvolvimento','concluido','cancelado')),
      cliente_ativo INTEGER NOT NULL DEFAULT 1, valor_projeto REAL NOT NULL DEFAULT 0,
      moeda TEXT NOT NULL DEFAULT 'EUR', link_desenvolvimento TEXT, link_final TEXT,
      tem_anuidade INTEGER NOT NULL DEFAULT 0, valor_anuidade REAL,
      alerta_dias_antes INTEGER NOT NULL DEFAULT 30, data_proximo_pagamento TEXT,
      data_inicio TEXT, data_conclusao TEXT, notas TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now')),
      atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE pagamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL DEFAULT 'anuidade' CHECK (tipo IN ('anuidade','projeto','outro')),
      valor REAL NOT NULL DEFAULT 0, data TEXT NOT NULL, notas TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE alertas_enviados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      data_pagamento TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'aviso' CHECK (tipo IN ('aviso','vencido')),
      dias_antes INTEGER, destinatario TEXT,
      enviado_em TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (cliente_id, data_pagamento, tipo)
    );
  `);
  db.prepare(`INSERT INTO clientes (empresa, nome_cliente, email, fase, valor_projeto, tem_anuidade, valor_anuidade, data_proximo_pagamento, notas)
              VALUES (?,?,?,?,?,?,?,?,?)`)
    .run("Padaria Central", "Ana Silva", "ana@padaria.pt", "concluido", 2500, 1, 180, "2026-10-01", "nota antiga");
  db.prepare(`INSERT INTO clientes (empresa, nome_cliente, fase, valor_projeto) VALUES (?,?,?,?)`)
    .run("Startup XPTO", "Pedro Costa", "proposta", 9000);
  db.prepare("INSERT INTO pagamentos (cliente_id, tipo, valor, data, notas) VALUES (1,'anuidade',180,'2025-10-01','fatura 1')").run();
  db.prepare("INSERT INTO alertas_enviados (cliente_id, data_pagamento, tipo, destinatario) VALUES (1,'2026-10-01','aviso','eu@exemplo.com')").run();
  db.close();
  ok("criada com 2 clientes, 1 pagamento e 1 alerta");
}

console.log("2. Abrir com o código atual (aplica as migrações)");
process.env.DATABASE_PATH = ficheiro;
const { getDb } = await import("../src/lib/db.ts");
const db = getDb();
ok(`versão do esquema: ${db.pragma("user_version", { simple: true })}`);

console.log("3. Os dados sobreviveram");
const clientes = db.prepare("SELECT * FROM clientes ORDER BY id").all();
clientes.length === 2 ? ok("2 clientes mantidos") : falhar(`ficaram ${clientes.length} clientes`);
clientes[0].empresa === "Padaria Central" && clientes[0].valor_projeto === 2500
  ? ok("dados do cliente intactos")
  : falhar("dados do cliente alterados");
clientes[0].notas === "nota antiga" ? ok("notas preservadas") : falhar("notas perdidas");
clientes[0].data_proximo_pagamento === "2026-10-01"
  ? ok("data de pagamento preservada")
  : falhar("data de pagamento perdida");

const pagamentos = db.prepare("SELECT * FROM pagamentos").all();
pagamentos.length === 1 && pagamentos[0].notas === "fatura 1"
  ? ok("pagamento preservado (não foi apagado em cascata)")
  : falhar("pagamento perdido na recriação da tabela");

const alertas = db.prepare("SELECT * FROM alertas_enviados").all();
alertas.length === 1 && alertas[0].destinatario === "eu@exemplo.com"
  ? ok("histórico de alertas preservado")
  : falhar("histórico de alertas perdido");

console.log("4. As novidades funcionam");
const colunas = db.prepare("PRAGMA table_info(clientes)").all().map((c) => c.name);
for (const nova of ["site_atual", "followup_data", "followup_nota", "followup_concluido"]) {
  colunas.includes(nova) ? ok(`coluna ${nova} existe`) : falhar(`coluna ${nova} em falta`);
}
try {
  db.prepare("UPDATE clientes SET fase = 'contactado' WHERE id = 2").run();
  ok("a fase 'contactado' é aceite");
} catch (e) {
  falhar(`a fase 'contactado' foi rejeitada: ${e.message}`);
}
try {
  db.prepare("INSERT INTO alertas_enviados (cliente_id, data_pagamento, tipo) VALUES (1,'2026-11-01','followup')").run();
  ok("o tipo de alerta 'followup' é aceite");
} catch (e) {
  falhar(`o tipo 'followup' foi rejeitado: ${e.message}`);
}
try {
  db.prepare("INSERT INTO alertas_enviados (cliente_id, data_pagamento, tipo) VALUES (1,'2026-11-01','inventado')").run();
  falhar("um tipo de alerta inválido passou");
} catch {
  ok("tipos de alerta inválidos continuam a ser rejeitados");
}

console.log("5. Chaves estrangeiras continuam a funcionar");
db.prepare("DELETE FROM clientes WHERE id = 1").run();
db.prepare("SELECT COUNT(*) n FROM pagamentos").get().n === 0
  ? ok("apagar cliente apaga os pagamentos em cascata")
  : falhar("a cascata deixou de funcionar");

console.log("6. Aplicar de novo não muda nada (idempotente)");
const versaoAntes = db.pragma("user_version", { simple: true });
const clientesAntes = db.prepare("SELECT COUNT(*) n FROM clientes").get().n;
db.close();

const segunda = new Database(ficheiro);
const { getDb: abrirOutraVez } = await import(`../src/lib/db.ts?v=${Date.now()}`);
segunda.close();
const db2 = abrirOutraVez();
db2.pragma("user_version", { simple: true }) === versaoAntes
  ? ok("a versão do esquema mantém-se")
  : falhar("a versão do esquema mudou na segunda abertura");
db2.prepare("SELECT COUNT(*) n FROM clientes").get().n === clientesAntes
  ? ok("os dados mantêm-se")
  : falhar("os dados mudaram na segunda abertura");
db2.close();

fs.rmSync(pasta, { recursive: true, force: true });

console.log(falhas.length === 0 ? "\nTODOS OS TESTES PASSARAM" : `\n${falhas.length} FALHA(S): ${falhas.join(" | ")}`);
process.exit(falhas.length === 0 ? 0 : 1);
