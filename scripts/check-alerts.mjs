#!/usr/bin/env node
/**
 * Aciona a verificação de alertas através da API (alternativa ao agendador
 * interno). Útil para o cron do sistema:
 *
 *   0 9 * * * cd /var/www/crm && node scripts/check-alerts.mjs >> /var/log/crm-alertas.log 2>&1
 *
 * Lê APP_URL e CRON_SECRET do ambiente (ou do .env, se existir).
 */
import fs from "node:fs";
import path from "node:path";

const ficheiroEnv = path.join(process.cwd(), ".env");
if (fs.existsSync(ficheiroEnv)) {
  for (const linha of fs.readFileSync(ficheiroEnv, "utf8").split("\n")) {
    const par = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (par && !process.env[par[1]]) {
      process.env[par[1]] = par[2].replace(/^['"]|['"]$/g, "");
    }
  }
}

const base = (process.env.APP_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const segredo = process.env.CRON_SECRET;

if (!segredo) {
  console.error("CRON_SECRET não definido — defina-o no .env para poder chamar o endpoint.");
  process.exit(1);
}

const resposta = await fetch(`${base}/api/cron/alertas`, {
  method: "POST",
  headers: { Authorization: `Bearer ${segredo}` },
});

const dados = await resposta.json().catch(() => ({}));
console.log(new Date().toISOString(), JSON.stringify(dados));

process.exit(resposta.ok ? 0 : 1);
