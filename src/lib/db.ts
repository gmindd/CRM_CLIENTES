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

const SCHEMA = `
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

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);

  _db = db;
  return db;
}

export const dbPath = DB_PATH;
