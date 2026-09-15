/**
 * Ciclo completo do lembrete de follow-up: criar cliente contactado com data de
 * hoje, confirmar que aparece no painel, receber o email, não receber duas
 * vezes, e marcar como feito.
 */
import { chromium } from "playwright";

const BASE = (process.env.E2E_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const PASSWORD = process.env.E2E_PASSWORD || "segredo-de-teste";
const SEGREDO_CRON = process.env.E2E_CRON_SECRET || "teste-cron";

const falhas = [];
const ok = (m) => console.log("  ✓", m);
const falhar = (m) => { falhas.push(m); console.log("  ✗", m); };

const hoje = new Date().toISOString().slice(0, 10);
const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

const browser = await chromium.launch(
  process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"] }
    : {},
);
const pagina = await browser.newPage({ viewport: { width: 1280, height: 1000 } });

await pagina.goto(`${BASE}/login`);
await pagina.fill("#password", PASSWORD);
await pagina.click("button[type=submit]");
await pagina.waitForURL(`${BASE}/`, { timeout: 15000 });

console.log("1. Novo contacto com follow-up para hoje");
await pagina.goto(`${BASE}/clientes/novo`);
await pagina.fill("#empresa", "Ginásio Forma");
await pagina.fill("#nome_cliente", "Rita Lopes");
await pagina.fill("#email", "rita@ginasioforma.pt");
await pagina.selectOption("#fase", "contactado");
await pagina.fill("#site_atual", "https://ginasioforma-antigo.pt");
await pagina.fill("#followup_data", hoje);
await pagina.fill("#followup_nota", "Perguntar se recebeu o email com o orçamento");
await pagina.click('button[type=submit]');
await pagina.waitForURL(/\/clientes\/\d+$/, { timeout: 15000 });
const urlFicha = pagina.url();
const ficha = await pagina.textContent("body");
ficha.includes("Contactado") ? ok("fase 'contactado' aplicada") : falhar("fase 'contactado' falhou");
ficha.includes("ginasioforma-antigo.pt") ? ok("site atual guardado") : falhar("site atual não guardado");
ficha.includes("Perguntar se recebeu") ? ok("nota do follow-up guardada") : falhar("nota não guardada");
ficha.includes("É hoje") ? ok("follow-up marcado como sendo hoje") : falhar("estado do follow-up errado");

console.log("2. Aparece no painel e na lista filtrada");
await pagina.goto(`${BASE}/`);
const painel = await pagina.textContent("body");
painel.includes("Follow-ups a fazer") && painel.includes("Ginásio Forma")
  ? ok("aparece na secção de follow-ups do painel")
  : falhar("não aparece no painel");
await pagina.goto(`${BASE}/clientes?followup=1`);
(await pagina.textContent("body")).includes("Ginásio Forma")
  ? ok("aparece no filtro 'com follow-up por fazer'")
  : falhar("filtro de follow-up não o encontra");

console.log("3. Validação: nota sem data é rejeitada");
await pagina.goto(`${BASE}/clientes/novo`);
await pagina.fill("#empresa", "Sem Data");
await pagina.fill("#nome_cliente", "Teste");
await pagina.fill("#followup_nota", "isto não tem data");
await pagina.click('button[type=submit]');
await pagina.waitForTimeout(2500);
(await pagina.textContent("body")).includes("Indique a data em que quer ser lembrado")
  ? ok("nota sem data é rejeitada")
  : falhar("aceitou nota sem data");

console.log("4. O email de follow-up é enviado uma única vez");
const primeira = await (await fetch(`${BASE}/api/cron/alertas`, {
  method: "POST",
  headers: { Authorization: `Bearer ${SEGREDO_CRON}` },
})).json();
const meu = primeira.detalhes.find((d) => d.cliente === "Ginásio Forma");
meu && meu.tipo === "followup" && meu.estado === "enviado"
  ? ok("email de follow-up enviado")
  : falhar(`email de follow-up não saiu: ${JSON.stringify(meu)}`);

const segunda = await (await fetch(`${BASE}/api/cron/alertas`, {
  method: "POST",
  headers: { Authorization: `Bearer ${SEGREDO_CRON}` },
})).json();
const repetido = segunda.detalhes.find((d) => d.cliente === "Ginásio Forma");
repetido && repetido.estado === "já enviado"
  ? ok("não repete o email no dia seguinte")
  : falhar(`repetiu o email: ${JSON.stringify(repetido)}`);

console.log("5. Marcar como feito tira-o da lista");
await pagina.goto(urlFicha);
await pagina.click('button:has-text("Marcar follow-up como feito")');
await pagina.waitForTimeout(2500);
(await pagina.textContent("body")).includes("Feito")
  ? ok("fica marcado como feito")
  : falhar("não ficou marcado como feito");
await pagina.goto(`${BASE}/clientes?followup=1`);
(await pagina.textContent("body")).includes("Ginásio Forma")
  ? falhar("continua a aparecer por fazer")
  : ok("sai da lista de follow-ups por fazer");

console.log("6. Data nova volta a pô-lo por fazer");
await pagina.goto(`${urlFicha}/editar`);
await pagina.fill("#followup_data", ontem);
await pagina.click('button[type=submit]');
await pagina.waitForURL(/\/clientes\/\d+$/, { timeout: 15000 });
(await pagina.textContent("body")).includes("Atrasado")
  ? ok("nova data reabre o follow-up (atrasado)")
  : falhar("a nova data não reabriu o follow-up");

const terceira = await (await fetch(`${BASE}/api/cron/alertas`, {
  method: "POST",
  headers: { Authorization: `Bearer ${SEGREDO_CRON}` },
})).json();
const reaberto = terceira.detalhes.find((d) => d.cliente === "Ginásio Forma");
reaberto && reaberto.estado === "enviado"
  ? ok("volta a avisar para a data nova")
  : falhar(`não avisou para a data nova: ${JSON.stringify(reaberto)}`);

await pagina.goto(`${BASE}/`);
await pagina.screenshot({ path: `${process.argv[2] || "./testes"}/painel-followup.png`, fullPage: true });

console.log("7. Limpeza");
await pagina.goto(urlFicha);
pagina.once("dialog", (d) => d.accept());
await pagina.click('button:has-text("Apagar cliente")');
await pagina.waitForURL(`${BASE}/clientes`, { timeout: 15000 });
ok("cliente de teste apagado");

await browser.close();
console.log(falhas.length === 0 ? "\nTODOS OS TESTES PASSARAM" : `\n${falhas.length} FALHA(S): ${falhas.join(" | ")}`);
process.exit(falhas.length === 0 ? 0 : 1);
