/**
 * Testa a configuração do servidor de email feita pela própria aplicação:
 * guardar, enviar email de teste e correr a verificação de alertas — tudo sem
 * nenhuma variável de ambiente de email definida.
 */
import { chromium } from "playwright";

const BASE = (process.env.E2E_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const PASSWORD = process.env.E2E_PASSWORD || "segredo-de-teste";
const SMTP_PORTA = process.env.E2E_SMTP_PORT || "2525";

const falhas = [];
const ok = (m) => console.log("  ✓", m);
const falhar = (m) => { falhas.push(m); console.log("  ✗", m); };

const browser = await chromium.launch(
  process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"] }
    : {},
);
const pagina = await browser.newPage({ viewport: { width: 1280, height: 1000 } });

await pagina.goto(`${BASE}/login`);
await pagina.fill("#password", PASSWORD);
await pagina.click('button[type=submit]');
await pagina.waitForURL(`${BASE}/`, { timeout: 15000 });

console.log("1. Validação dos campos");
await pagina.goto(`${BASE}/definicoes`);

// Campos de texto: quem valida é o servidor.
await pagina.fill("#SMTP_HOST", "isto não é um host");
await pagina.fill("#MAIL_FROM", "remetente-invalido");
await pagina.click('button:has-text("Guardar definições de email")');
await pagina.waitForTimeout(2500);
const validacao = await pagina.textContent("body");
validacao.includes("Endereço inválido") ? ok("servidor rejeita host inválido") : falhar("aceitou host inválido");
validacao.includes('Use "nome@dominio.com"')
  ? ok("servidor rejeita remetente inválido")
  : falhar("aceitou remetente inválido");

// Campos type=email: o browser bloqueia antes de sair do ecrã.
await pagina.goto(`${BASE}/definicoes`);
await pagina.fill("#ALERT_EMAIL_TO", "tambem-nao");
const emailBloqueado = await pagina.evaluate(
  () => !document.querySelector("#ALERT_EMAIL_TO").checkValidity(),
);
emailBloqueado ? ok("browser bloqueia email inválido") : falhar("browser deixou passar email inválido");

// E nada disto foi guardado.
await pagina.goto(`${BASE}/definicoes`);
(await pagina.inputValue("#SMTP_HOST")) === "isto não é um host"
  ? falhar("o host inválido ficou guardado")
  : ok("nada inválido foi guardado");

console.log("2. Guardar configuração válida");
await pagina.goto(`${BASE}/definicoes`);
await pagina.fill("#SMTP_HOST", "127.0.0.1");
await pagina.fill("#SMTP_PORT", SMTP_PORTA);
await pagina.selectOption("#SMTP_SECURE", "false");
await pagina.fill("#SMTP_USER", "crm@pereiragabriel.com");
await pagina.fill("#SMTP_PASS", "password-do-email");
await pagina.fill("#MAIL_FROM", "CRM <crm@pereiragabriel.com>");
await pagina.fill("#ALERT_EMAIL_TO", "destino@exemplo.com");
await pagina.fill("#APP_URL", "https://crm.pereiragabriel.com");
await pagina.click('button:has-text("Guardar definições de email")');
await pagina.waitForTimeout(2500);
(await pagina.textContent("body")).includes("Definições guardadas")
  ? ok("configuração guardada")
  : falhar("não guardou a configuração");

await pagina.reload();
const depois = await pagina.textContent("body");
depois.includes("Configurado") ? ok("estado passa a 'Configurado'") : falhar("estado não mudou");
depois.includes("destino@exemplo.com") ? ok("destinatário aplicado") : falhar("destinatário não aplicado");

console.log("3. A password não volta para o browser");
const html = await pagina.content();
html.includes("password-do-email")
  ? falhar("a password apareceu no HTML da página")
  : ok("a password nunca é devolvida ao browser");
(await pagina.getAttribute("#SMTP_PASS", "placeholder"))?.includes("guardada")
  ? ok("o campo indica que há password guardada")
  : falhar("o campo não indica password guardada");

console.log("4. Email de teste com a configuração da interface");
await pagina.click('button:has-text("Enviar email de teste")');
await pagina.waitForTimeout(4000);
(await pagina.textContent("body")).includes("Email de teste enviado para destino@exemplo.com")
  ? ok("email de teste enviado")
  : falhar("email de teste falhou");

console.log("5. Alertas reais com a configuração da interface");
await pagina.click('button:has-text("Verificar e enviar agora")');
await pagina.waitForTimeout(5000);
const alertas = await pagina.textContent("body");
/\d+ email\(s\) enviado\(s\)/.test(alertas) ? ok("verificação de alertas correu") : falhar("verificação falhou");

await pagina.screenshot({ path: `${process.argv[2] || "./testes"}/definicoes-email.png`, fullPage: true });
await browser.close();

console.log(falhas.length === 0 ? "\nTODOS OS TESTES PASSARAM" : `\n${falhas.length} FALHA(S): ${falhas.join(" | ")}`);
process.exit(falhas.length === 0 ? 0 : 1);
