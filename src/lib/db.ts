import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * Base de dados SQLite — um unico ficheiro, facil de guardar em backup no VPS.
 * Localizacao configuravel via DATABASE_PATH (por omissao ./data/crm.sqlite).
 */
const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), "data", "crm.sqlite");

/** Esquema inicial (versão 1). Nunca mudar — as alterações vão em MIGRACOES. */
const ESQUEMA_V1 = `
CREATE TABLE IF NOT EXISTS clientes (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  empresa                 TEXT    NOT NULL,
  nome_cliente            TEXT    NOT NULL,
  email                   TEXT,
  telefone                TEXT,
  nif                     TEXT,
  fase                    TEXT    NOT NULL DEFAULT 'proposta'
                            CHECK (fase IN ('proposta','desenvolvimento','concluido','cancelado')),
  cliente_ativo           INTEGER NOT NULL DEFAULT 1,
  valor_projeto           REAL    NOT NULL DEFAULT 0,
  moeda                   TEXT    NOT NULL DEFAULT 'EUR',
  link_desenvolvimento    TEXT,
  link_final              TEXT,
  tem_anuidade            INTEGER NOT NULL DEFAULT 0,
  valor_anuidade          REAL,
  alerta_dias_antes       INTEGER NOT NULL DEFAULT 30,
  data_proximo_pagamento  TEXT,
  data_inicio             TEXT,
  data_conclusao          TEXT,
  notas                   TEXT,
  criado_em               TEXT    NOT NULL DEFAULT (datetime('now')),
  atualizado_em           TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clientes_fase ON clientes(fase);
CREATE INDEX IF NOT EXISTS idx_clientes_proximo_pagamento ON clientes(data_proximo_pagamento);

CREATE TABLE IF NOT EXISTS pagamentos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id  INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo        TEXT    NOT NULL DEFAULT 'anuidade'
                CHECK (tipo IN ('anuidade','projeto','outro')),
  valor       REAL    NOT NULL DEFAULT 0,
  data        TEXT    NOT NULL,
  notas       TEXT,
  criado_em   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_cliente ON pagamentos(cliente_id);

-- Configuracoes editaveis na propria aplicacao (ex.: dados do servidor de email).
-- O que estiver aqui tem prioridade sobre as variaveis de ambiente.
CREATE TABLE IF NOT EXISTS configuracoes (
  chave         TEXT PRIMARY KEY,
  valor         TEXT,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Registo dos alertas ja enviados: impede emails repetidos para o mesmo vencimento.
CREATE TABLE IF NOT EXISTS alertas_enviados (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id      INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  data_pagamento  TEXT    NOT NULL,
  tipo            TEXT    NOT NULL DEFAULT 'aviso' CHECK (tipo IN ('aviso','vencido')),
  dias_antes      INTEGER,
  destinatario    TEXT,
  enviado_em      TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (cliente_id, data_pagamento, tipo)
);
`;

/**
 * Migrações
 * ---------
 * A versão do esquema fica em `PRAGMA user_version`. Cada migração corre uma
 * vez, por ordem, dentro de uma transação. Nunca alterar uma migração já
 * publicada — acrescentar outra a seguir.
 *
 * Nota sobre o SQLite: restrições CHECK não se alteram com ALTER TABLE. Para
 * as mudar é preciso recriar a tabela (ver `recriarTabela`).
 */
interface Migracao {
  versao: number;
  nome: string;
  aplicar: (db: Database.Database) => void;
}

/**
 * Recria uma tabela com um esquema novo, copiando os dados.
 *
 * As chaves estrangeiras são desligadas durante o processo: sem isso, o DROP
 * da tabela antiga apagaria em cascata os pagamentos e alertas que lhe estão
 * ligados. É o procedimento recomendado pela documentação do SQLite.
 */
function recriarTabela(
  db: Database.Database,
  tabela: string,
  esquemaNovo: string,
  colunas: string[],
): void {
  const temporaria = `${tabela}_nova`;
  db.exec(esquemaNovo.replace(new RegExp(`\\b${tabela}\\b`), temporaria));
  db.exec(
    `INSERT INTO ${temporaria} (${colunas.join(", ")})
     SELECT ${colunas.join(", ")} FROM ${tabela}`,
  );
  db.exec(`DROP TABLE ${tabela}`);
  db.exec(`ALTER TABLE ${temporaria} RENAME TO ${tabela}`);
}

const MIGRACOES: Migracao[] = [
  {
    versao: 2,
    nome: "fase 'contactado', follow-ups e site atual",
    aplicar: (db) => {
      // 1. Campos novos na ficha do cliente.
      db.exec(`
        ALTER TABLE clientes ADD COLUMN site_atual TEXT;
        ALTER TABLE clientes ADD COLUMN followup_data TEXT;
        ALTER TABLE clientes ADD COLUMN followup_nota TEXT;
        ALTER TABLE clientes ADD COLUMN followup_concluido INTEGER NOT NULL DEFAULT 0;
      `);

      // 2. A fase 'contactado' não cabia no CHECK antigo. Como as fases ainda
      //    hão de mudar, a coluna deixa de ter CHECK — quem valida passa a ser
      //    o `clienteSchema` em src/lib/validation.ts, que conhece a lista.
      recriarTabela(
        db,
        "clientes",
        `CREATE TABLE clientes (
          id                      INTEGER PRIMARY KEY AUTOINCREMENT,
          empresa                 TEXT    NOT NULL,
          nome_cliente            TEXT    NOT NULL,
          email                   TEXT,
          telefone                TEXT,
          nif                     TEXT,
          fase                    TEXT    NOT NULL DEFAULT 'contactado',
          cliente_ativo           INTEGER NOT NULL DEFAULT 1,
          valor_projeto           REAL    NOT NULL DEFAULT 0,
          moeda                   TEXT    NOT NULL DEFAULT 'EUR',
          site_atual              TEXT,
          link_desenvolvimento    TEXT,
          link_final              TEXT,
          tem_anuidade            INTEGER NOT NULL DEFAULT 0,
          valor_anuidade          REAL,
          alerta_dias_antes       INTEGER NOT NULL DEFAULT 30,
          data_proximo_pagamento  TEXT,
          data_inicio             TEXT,
          data_conclusao          TEXT,
          followup_data           TEXT,
          followup_nota           TEXT,
          followup_concluido      INTEGER NOT NULL DEFAULT 0,
          notas                   TEXT,
          criado_em               TEXT    NOT NULL DEFAULT (datetime('now')),
          atualizado_em           TEXT    NOT NULL DEFAULT (datetime('now'))
        )`,
        [
          "id", "empresa", "nome_cliente", "email", "telefone", "nif", "fase",
          "cliente_ativo", "valor_projeto", "moeda", "site_atual",
          "link_desenvolvimento", "link_final", "tem_anuidade", "valor_anuidade",
          "alerta_dias_antes", "data_proximo_pagamento", "data_inicio",
          "data_conclusao", "followup_data", "followup_nota", "followup_concluido",
          "notas", "criado_em", "atualizado_em",
        ],
      );

      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_clientes_fase ON clientes(fase);
        CREATE INDEX IF NOT EXISTS idx_clientes_proximo_pagamento ON clientes(data_proximo_pagamento);
        CREATE INDEX IF NOT EXISTS idx_clientes_followup ON clientes(followup_data);
      `);

      // 3. Os alertas passam a ter um terceiro tipo: o lembrete de follow-up.
      recriarTabela(
        db,
        "alertas_enviados",
        `CREATE TABLE alertas_enviados (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          cliente_id      INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
          data_pagamento  TEXT    NOT NULL,
          tipo            TEXT    NOT NULL DEFAULT 'aviso'
                            CHECK (tipo IN ('aviso','vencido','followup')),
          dias_antes      INTEGER,
          destinatario    TEXT,
          enviado_em      TEXT    NOT NULL DEFAULT (datetime('now')),
          UNIQUE (cliente_id, data_pagamento, tipo)
        )`,
        ["id", "cliente_id", "data_pagamento", "tipo", "dias_antes", "destinatario", "enviado_em"],
      );
    },
  },
];

/** Aplica as migrações em falta. Idempotente: correr duas vezes não faz nada. */
function migrar(db: Database.Database): void {
  const tabelaExiste = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'clientes'")
    .get();

  if (!tabelaExiste) {
    // Base de dados nova: cria o esquema original e marca-o como versão 1.
    db.exec(ESQUEMA_V1);
    db.pragma("user_version = 1");
  } else if ((db.pragma("user_version", { simple: true }) as number) === 0) {
    // Base de dados criada antes de existirem migrações: já está na versão 1.
    db.exec(ESQUEMA_V1); // garante tabelas acrescentadas entretanto (configuracoes)
    db.pragma("user_version = 1");
  }

  for (const migracao of MIGRACOES) {
    const atual = db.pragma("user_version", { simple: true }) as number;
    if (migracao.versao <= atual) continue;

    // As chaves estrangeiras têm de estar desligadas FORA da transação.
    db.pragma("foreign_keys = OFF");
    try {
      db.transaction(() => {
        migracao.aplicar(db);
        db.pragma(`user_version = ${migracao.versao}`);
      })();

      const problemas = db.pragma("foreign_key_check") as unknown[];
      if (problemas.length > 0) {
        throw new Error(`migração ${migracao.versao} deixou referências inválidas`);
      }
      console.log(`[db] migração ${migracao.versao} aplicada — ${migracao.nome}`);
    } finally {
      db.pragma("foreign_keys = ON");
    }
  }
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrar(db);

  _db = db;
  return db;
}

export const dbPath = DB_PATH;
