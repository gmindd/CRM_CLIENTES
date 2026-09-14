/**
 * Teste end-to-end do CRM. Requer a aplicação a correr e a password de acesso:
 *
 *   E2E_URL=http://127.0.0.1:3000 E2E_PASSWORD=a-sua-password npm run test:e2e
 */
import { chromium } from "playwright";

const BASE = (process.env.E2E_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const PASSWORD = process.env.E2E_PASSWORD || "segredo-de-teste";
const SAIDA = process.argv[2] || "./testes";
const falhas = [];
const ok = (m) => console.log("  ✓", m);
const falhar = (m) => { falhas.push(m); console.log("  ✗", m); };

const browser = await chromium.launch(
  process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"] }
    : {},
);
const pagina = await browser.newPage({ viewport: { width: 1280, height: 900 } });

console.log("1. Login");
await pagina.goto(`${BASE}/clientes`);
await pagina.waitForURL(/\/login/);
ok("rota protegida redireciona para /login");
await pagina.fill("#password", PASSWORD);
await pagina.click('button[type=submit]');
await pagina.waitForURL(`${BASE}/clientes`, { timeout: 15000 });
ok("login entra e volta ao destino original");

console.log("2. Criar cliente");
await pagina.goto(`${BASE}/clientes/novo`);
await pagina.fill("#empresa", "Teste E2E Lda");
await pagina.fill("#nome_cliente", "João Teste");
await pagina.fill("#email", "joao@teste.pt");
await pagina.fill("#telefone", "+351911222333");
await pagina.selectOption("#fase", "concluido");
await pagina.fill("#valor_projeto", "3200,50");
await pagina.fill("#link_final", "https://teste-e2e.pt");
await pagina.check('input[name=tem_anuidade]');
await pagina.fill("#valor_anuidade", "150");
await pagina.fill("#alerta_dias_antes", "20");
const daqui40 = new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10);
await pagina.fill("#data_proximo_pagamento", daqui40);
await pagina.fill("#notas", "Criado pelo teste automático.");
await pagina.click('button[type=submit]');
await pagina.waitForURL(/\/clientes\/\d+$/, { timeout: 15000 });
const urlFicha = pagina.url();
ok(`cliente criado → ${urlFicha}`);

const corpo = await pagina.textContent("body");
for (const esperado of ["Teste E2E Lda", "João Teste", "3200,50", "150,00", "20 dias antes", "Concluído"]) {
  corpo.includes(esperado) ? ok(`ficha mostra "${esperado}"`) : falhar(`ficha não mostra "${esperado}"`);
}

console.log("3. Validação do formulário");
await pagina.goto(`${BASE}/clientes/novo`);
await pagina.fill("#empresa", "Sem Anuidade Definida");
await pagina.fill("#nome_cliente", "Teste");
await pagina.fill("#email", "isto-nao-e-email@x");
await pagina.check('input[name=tem_anuidade]');
await pagina.click('button[type=submit]');
await pagina.waitForTimeout(2500);
const textoValidacao = await pagina.textContent("body");
textoValidacao.includes("Indique o valor da anuidade")
  ? ok("bloqueia anuidade sem valor")
  : falhar("não bloqueou anuidade sem valor");
textoValidacao.includes("Indique a data do próximo pagamento")
  ? ok("bloqueia anuidade sem data")
  : falhar("não bloqueou anuidade sem data");

console.log("4. Registar pagamento e renovar data");
await pagina.goto(urlFicha);
await pagina.fill("#pag_valor", "150");
await pagina.fill("#pag_notas", "Fatura 2026/01");
await pagina.click('form:has(#pag_valor) button[type=submit]');
await pagina.waitForTimeout(3000);
await pagina.reload();
const depois = await pagina.textContent("body");
const esperada = new Date(Date.parse(daqui40 + "T00:00:00Z"));
esperada.setUTCFullYear(esperada.getUTCFullYear() + 1);
const [a, m, d] = esperada.toISOString().slice(0, 10).split("-");
depois.includes(`${d}/${m}/${a}`)
  ? ok(`data avançou 12 meses → ${d}/${m}/${a}`)
  : falhar(`data não avançou (esperava ${d}/${m}/${a})`);
depois.includes("Fatura 2026/01") ? ok("pagamento aparece no histórico") : falhar("pagamento não aparece");

console.log("5. Editar cliente");
await pagina.goto(`${urlFicha}/editar`);
await pagina.fill("#empresa", "Teste E2E Renomeada");
await pagina.click('button[type=submit]');
await pagina.waitForURL(/\/clientes\/\d+$/, { timeout: 15000 });
(await pagina.textContent("body")).includes("Teste E2E Renomeada")
  ? ok("edição guardada")
  : falhar("edição não guardada");

console.log("6. Pesquisa e filtros");
await pagina.goto(`${BASE}/clientes?q=Teste+E2E+Renomeada`);
const lista = await pagina.textContent("body");
lista.includes("Teste E2E Renomeada") ? ok("pesquisa encontra o cliente") : falhar("pesquisa falhou");
await pagina.goto(`${BASE}/clientes?q=zzz-nao-existe-zzz`);
(await pagina.textContent("body")).includes("Nenhum cliente encontrado")
  ? ok("pesquisa sem resultados mostra estado vazio")
  : falhar("estado vazio não aparece");

console.log("7. Painel e definições");
await pagina.goto(`${BASE}/`);
await pagina.screenshot({ path: `${SAIDA}/painel.png`, fullPage: true });
ok("painel renderiza (screenshot guardado)");
await pagina.goto(`${BASE}/definicoes`);
const definicoes = await pagina.textContent("body");
definicoes.includes("Últimos alertas enviados") ? ok("definições renderiza") : falhar("definições falhou");
await pagina.screenshot({ path: `${SAIDA}/definicoes.png`, fullPage: true });
await pagina.goto(`${BASE}/clientes`);
await pagina.screenshot({ path: `${SAIDA}/clientes.png`, fullPage: true });

console.log("8. Apagar o cliente de teste");
await pagina.goto(urlFicha);
pagina.once("dialog", (dialogo) => dialogo.accept());
await pagina.click('button:has-text("Apagar cliente")');
await pagina.waitForURL(`${BASE}/clientes`, { timeout: 15000 });
await pagina.goto(urlFicha);
(await pagina.textContent("body")).includes("404")
  ? ok("cliente de teste apagado (a ficha devolve 404)")
  : falhar("cliente de teste não foi apagado");

console.log("9. Terminar sessão");
await pagina.click('button:has-text("Sair")');
await pagina.waitForURL(/\/login/, { timeout: 15000 });
ok("logout volta ao login");

await browser.close();
console.log(falhas.length === 0 ? "\nTODOS OS TESTES PASSARAM" : `\n${falhas.length} FALHA(S): ${falhas.join(" | ")}`);
process.exit(falhas.length === 0 ? 0 : 1);
