# CRM · Clientes

CRM privado para gerir clientes, projetos e anuidades, com **alertas por email**
quando um pagamento se aproxima. Feito para correr num VPS, atrás de Nginx,
num subdomínio protegido por password (ex.: `crm.pereiragabriel.com`).
Inclui instruções para **Coolify**, Docker Compose ou systemd.

| | |
|---|---|
| **Stack** | Next.js 16 (App Router) · TypeScript · Tailwind 4 · SQLite |
| **Base de dados** | Um único ficheiro `data/crm.sqlite` — backup = copiar o ficheiro |
| **Acesso** | Password única + cookie de sessão assinado (JWT HS256) |
| **Alertas** | Agendador interno (node-cron) ou cron externo via `/api/cron/alertas` |

---

## O que guarda de cada cliente

Os campos pedidos, mais alguns que valem a pena ter:

| Campo | Notas |
|---|---|
| Nome da empresa | obrigatório |
| Nome do cliente | obrigatório |
| Email · Telefone · NIF | o email é validado |
| Fase | Proposta · Em desenvolvimento · Concluído · Cancelado |
| **Ainda é cliente** | ativo/inativo, independente da fase (um projeto concluído pode já não ser cliente) |
| Valor do projeto + moeda | aceita `1250,75` ou `1250.75` (EUR/USD/GBP/BRL) |
| Link de desenvolvimento | staging, enquanto está a ser feito |
| Link final | site em produção |
| Tem anuidade? | ativa os campos seguintes |
| Valor da anuidade | |
| Dias antes do alerta | por omissão 30 |
| Data do próximo pagamento | base do cálculo dos alertas |
| Data de início · conclusão | |
| Notas | texto livre |

**Extras incluídos:** painel com receita recorrente anual e pagamentos a chegar,
histórico de pagamentos por cliente (com renovação automática da data), pesquisa
e filtros, exportação para CSV, registo dos alertas enviados, e página de
definições com teste de email.

---

## Como funcionam os alertas

1. Todos os dias às 09:00 (configurável) a aplicação percorre os clientes
   **ativos com anuidade** e data de próximo pagamento definida.
2. Quando faltam `alerta_dias_antes` dias ou menos, envia um email com os dados
   do cliente e um link direto para a ficha.
3. Se a data passar sem o pagamento ser registado, envia um segundo email de
   **atraso**.
4. Cada vencimento só gera **um email de cada tipo** — o registo fica na tabela
   `alertas_enviados`.
5. Ao registar o pagamento na ficha do cliente, a data avança 12 meses (ou os
   meses que indicar) e o ciclo de alertas reinicia.

Pode sempre forçar uma verificação em **Definições → Verificar e enviar agora**,
ou simular sem enviar nada.

---

## Instalação local

```bash
npm install
cp .env.example .env

# Gera APP_PASSWORD_HASH e SESSION_SECRET — cole os dois no .env
npm run hash-password -- "a-sua-password"

npm run dev        # http://localhost:3000
```

A base de dados é criada sozinha na primeira utilização.

---

## Deploy no VPS (Docker — recomendado)

### 1. Código e configuração

```bash
ssh o-seu-vps
sudo mkdir -p /var/www/crm && sudo chown $USER:$USER /var/www/crm
git clone <este-repositorio> /var/www/crm
cd /var/www/crm

cp .env.example .env
docker run --rm -v "$PWD":/app -w /app node:22-bookworm-slim \
  sh -c "npm install bcryptjs >/dev/null 2>&1 && node scripts/hash-password.mjs 'a-sua-password'"
nano .env      # colar o hash, o SESSION_SECRET e os dados de SMTP
```

Valores mínimos a preencher no `.env`:

```ini
APP_URL=https://crm.pereiragabriel.com
APP_PASSWORD_HASH='$2b$12$...'
SESSION_SECRET='...48 bytes aleatórios...'
SMTP_HOST=smtp.o-seu-servidor.com
SMTP_PORT=587
SMTP_USER=crm@pereiragabriel.com
SMTP_PASS=...
MAIL_FROM="CRM <crm@pereiragabriel.com>"
ALERT_EMAIL_TO=pereiragabriel.gp@gmail.com
```

### 2. Arrancar

```bash
docker compose up -d --build
docker compose logs -f          # deve mostrar: [alertas] agendador ativo
```

O contentor escuta apenas em `127.0.0.1:3000` — não fica exposto à internet.

### 3. Subdomínio + HTTPS

No DNS de `pereiragabriel.com`, crie um registo **A** de `crm` a apontar para o
IP do VPS. Depois, no servidor:

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/crm.pereiragabriel.com
sudo ln -s /etc/nginx/sites-available/crm.pereiragabriel.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d crm.pereiragabriel.com
```

Já está: `https://crm.pereiragabriel.com` pede password e mais nada é acessível.

### 4. Backups

```bash
sudo apt install sqlite3
sudo crontab -e
# 0 3 * * * DATABASE_PATH=/var/www/crm/data/crm.sqlite /var/www/crm/deploy/backup.sh
```

### 5. Atualizar

```bash
cd /var/www/crm && git pull && docker compose up -d --build
```

---

## Deploy no Coolify

O Coolify trata do domínio, do HTTPS e do proxy, por isso **não precisa do
`deploy/nginx.conf`** — esse ficheiro é só para quem instala à mão.

### 1. Criar a aplicação

**+ New Resource → Application →** escolha a origem:

- repositório **público**: *Public Repository* e cole
  `https://github.com/gmindd/CRM_CLIENTES`
- repositório **privado**: *Private Repository (with GitHub App)*

Depois, nas definições da aplicação:

| Campo | Valor |
|---|---|
| **Build Pack** | **Dockerfile** |
| Branch | `claude/crm-clientes-alertas-kij574` (ou `main`, se renomear) |
| Base Directory | `/` |
| Dockerfile Location | `/Dockerfile` |
| Ports Exposes | `3000` |
| Domain | `https://crm.pereiragabriel.com` |

> **Porquê Dockerfile e não Railpack/Nixpacks?** O Railpack detetava o Next.js e
> construía, mas ignorava o modo `standalone`, recompilava o `better-sqlite3` à
> sua maneira e não garantia a pasta de dados. O `Dockerfile` deste repositório
> já está testado: compila o módulo nativo, gera a imagem mínima, corre como
> utilizador sem privilégios e traz *healthcheck*.

### 2. Armazenamento persistente (o passo que não pode falhar)

Sem isto, **a base de dados é apagada em cada deploy**.

**Storages → + Add → Volume Mount**

| Campo | Valor |
|---|---|
| Name | `crm-data` |
| Destination Path | `/app/data` |

Use *Volume Mount* (volume Docker), não *Bind Mount*: o contentor corre como
utilizador `crm` (uid 1001) e um bind mount numa pasta do host fica a pertencer
ao `root`, o que impede a escrita.

### 3. Variáveis de ambiente

Gere os segredos (na sua máquina, com o repositório clonado):

```bash
npm install
npm run hash-password -- "a-sua-password"
```

No Coolify, **Environment Variables → + Add**, uma a uma, todas como variáveis
de *runtime* (deixe o *Build Variable* desligado). Use a variante **base64** do
hash, que evita problemas com o `$`:

```ini
APP_PASSWORD_HASH_B64=<a linha base64 impressa pelo comando acima>
SESSION_SECRET=<a linha SESSION_SECRET impressa pelo comando acima>
APP_URL=https://crm.pereiragabriel.com
TZ=Europe/Lisbon
DATABASE_PATH=/app/data/crm.sqlite

SMTP_HOST=smtp.o-seu-servidor.com
SMTP_PORT=587
SMTP_USER=crm@pereiragabriel.com
SMTP_PASS=<password do email>
MAIL_FROM=CRM <crm@pereiragabriel.com>
ALERT_EMAIL_TO=pereiragabriel.gp@gmail.com

ALERTAS_AUTO=true
ALERTAS_CRON=0 9 * * *
```

### 4. DNS e deploy

No DNS de `pereiragabriel.com`, crie um registo **A** de `crm` para o IP do
servidor do Coolify. Depois carregue em **Deploy**. O Coolify emite o
certificado Let's Encrypt sozinho.

A primeira build demora alguns minutos (compila o `better-sqlite3`) e precisa de
memória: **num VPS com 1 GB de RAM pode falhar por falta de memória** — nesse
caso acrescente swap ao servidor antes de construir.

### 5. Confirmar

1. Abra `https://crm.pereiragabriel.com` → deve pedir a password.
2. **Definições** → *Enviar email de teste* → confirme que chega à sua caixa.
3. **Definições** → *Simular verificação* → mostra quem receberia alerta hoje.

### Notas

- O agendador corre dentro do contentor; com 1 réplica basta. Se fizer *rolling
  update* e houver dois contentores por instantes, não há risco de emails
  repetidos — a base de dados tem uma restrição de unicidade por vencimento.
- Backups: em vez do `deploy/backup.sh`, pode usar os *Scheduled Backups* do
  próprio Coolify sobre o volume, ou correr no servidor:
  `docker cp crm-container:/app/data/crm.sqlite ./backup.sqlite`.

---

## Deploy sem Docker (systemd)

```bash
cd /var/www/crm
npm ci
npm run build
cp -r .next/static .next/standalone/.next/    # necessário no modo standalone
cp -r public .next/standalone/ 2>/dev/null || true

sudo cp deploy/crm.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now crm
```

O Nginx e o certificado configuram-se da mesma forma.

---

## Alertas por cron externo

Se preferir não usar o agendador interno, ponha `ALERTAS_AUTO=false` no `.env`,
defina um `CRON_SECRET` e agende:

```bash
0 9 * * * curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://crm.pereiragabriel.com/api/cron/alertas
```

ou, a partir da própria pasta do projeto: `node scripts/check-alerts.mjs`.

---

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|:---:|---|
| `APP_PASSWORD_HASH` | sim¹ | Hash bcrypt da password de acesso |
| `APP_PASSWORD_HASH_B64` | sim¹ | O mesmo hash em base64 (para painéis onde o `$` dá problemas) |
| `APP_PASSWORD` | — | Password em texto simples (só para uso local) |
| `SESSION_SECRET` | sim | Segredo do cookie de sessão (≥ 32 caracteres) |
| `SESSION_DAYS` | — | Dias que a sessão dura (7) |
| `APP_URL` | — | Endereço público, usado nos links dos emails |
| `DATABASE_PATH` | — | Ficheiro SQLite (`./data/crm.sqlite`) |
| `TZ` | — | Fuso horário (`Europe/Lisbon`) |
| `SMTP_HOST` · `SMTP_PORT` · `SMTP_SECURE` · `SMTP_USER` · `SMTP_PASS` | para alertas | Servidor de email |
| `MAIL_FROM` | para alertas | Remetente |
| `ALERT_EMAIL_TO` | para alertas | Destinatário dos alertas |
| `ALERTAS_AUTO` | — | `false` desliga o agendador interno |
| `ALERTAS_CRON` | — | Expressão cron (`0 9 * * *`) |
| `CRON_SECRET` | — | Segredo do endpoint `/api/cron/alertas` |
| `LOGIN_MAX_TENTATIVAS` · `LOGIN_JANELA_MINUTOS` | — | Limite de tentativas de login por IP (8 / 15 min) |

¹ é preciso **uma** destas: `APP_PASSWORD_HASH_B64`, `APP_PASSWORD_HASH` ou `APP_PASSWORD`.

---

## Estrutura

```
src/
  app/
    (painel)/            páginas protegidas: painel, clientes, definições
    api/                 login, logout, cron/alertas, exportar, testar email
    acoes.ts             server actions (criar/editar/apagar/pagamentos)
    login/               ecrã de acesso
  components/            formulários e UI
  lib/
    db.ts                SQLite + esquema
    clientes.ts          consultas e estatísticas
    alertas.ts           motor de alertas e emails
    mail.ts              SMTP
    validation.ts        validação dos formulários (zod)
    sessao.ts / auth.ts  sessão e password
  middleware.ts          protege tudo o que não seja o login
deploy/                  nginx, systemd, backup
scripts/                 hash-password, check-alerts
testes/e2e.mjs           teste end-to-end (Playwright)
```

## Testes

```bash
npm run typecheck
npm run build
# com a aplicação a correr:
E2E_PASSWORD="a-sua-password" npm run test:e2e
```

## Segurança

- Todas as rotas (páginas e API) passam pelo middleware de sessão; só o login e
  o endpoint de cron (com segredo próprio) ficam abertos.
- Password guardada como hash bcrypt; cookie `httpOnly`, `SameSite=Lax` e
  `Secure` em produção.
- Limite de tentativas de login por IP.
- `noindex` nos cabeçalhos e nos metadados.
- A base de dados **nunca** é versionada (`data/` está no `.gitignore`).
