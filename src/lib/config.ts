import crypto from "node:crypto";
import { getDb } from "./db";

/**
 * Configurações que podem ser editadas na página de Definições, sem mexer nas
 * variáveis de ambiente nem fazer novo deploy.
 *
 * Prioridade: o que está guardado na base de dados ganha à variável de ambiente
 * com o mesmo nome. Assim quem preferir configurar tudo pelo painel de
 * alojamento continua a poder fazê-lo.
 */
export const CHAVES_CONFIG = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASS",
  "MAIL_FROM",
  "ALERT_EMAIL_TO",
  "APP_URL",
] as const;

export type ChaveConfig = (typeof CHAVES_CONFIG)[number];

/** Chaves cujo valor nunca deve ser mostrado nem devolvido ao browser. */
const SECRETAS: ReadonlySet<ChaveConfig> = new Set<ChaveConfig>(["SMTP_PASS"]);

export type Origem = "definicoes" | "ambiente" | "nenhuma";

// ---------------------------------------------------------------------------
// Cifra dos valores secretos
//
// A password do email fica no ficheiro SQLite, que é copiado em cada backup.
// Guardá-la cifrada faz com que uma cópia da base de dados, por si só, não
// chegue para a ler — é preciso também o SESSION_SECRET, que vive no ambiente.
// ---------------------------------------------------------------------------

const PREFIXO_CIFRADO = "enc:v1:";

function chaveDeCifra(): Buffer | null {
  const segredo = process.env.SESSION_SECRET;
  if (!segredo) return null;
  return crypto.createHash("sha256").update(`config:${segredo}`).digest();
}

function cifrar(valor: string): string {
  const chave = chaveDeCifra();
  if (!chave) return valor; // sem SESSION_SECRET guarda-se como está

  const iv = crypto.randomBytes(12);
  const cifra = crypto.createCipheriv("aes-256-gcm", chave, iv);
  const dados = Buffer.concat([cifra.update(valor, "utf8"), cifra.final()]);
  const etiqueta = cifra.getAuthTag();

  return (
    PREFIXO_CIFRADO +
    [iv, etiqueta, dados].map((parte) => parte.toString("base64")).join(":")
  );
}

function decifrar(guardado: string): string | null {
  if (!guardado.startsWith(PREFIXO_CIFRADO)) return guardado;

  const chave = chaveDeCifra();
  if (!chave) return null;

  try {
    const [iv, etiqueta, dados] = guardado
      .slice(PREFIXO_CIFRADO.length)
      .split(":")
      .map((parte) => Buffer.from(parte, "base64"));
    const decifra = crypto.createDecipheriv("aes-256-gcm", chave, iv);
    decifra.setAuthTag(etiqueta);
    return Buffer.concat([decifra.update(dados), decifra.final()]).toString("utf8");
  } catch {
    // SESSION_SECRET mudou desde que o valor foi guardado.
    return null;
  }
}

// ---------------------------------------------------------------------------
// Leitura e escrita
// ---------------------------------------------------------------------------

function lerBruto(chave: ChaveConfig): string | null {
  const linha = getDb()
    .prepare("SELECT valor FROM configuracoes WHERE chave = ?")
    .get(chave) as { valor: string | null } | undefined;
  return linha?.valor ?? null;
}

/** Valor em uso, já a respeitar a prioridade base de dados > ambiente. */
export function valorConfig(chave: ChaveConfig): string | undefined {
  const guardado = lerBruto(chave);
  if (guardado !== null && guardado !== "") {
    const valor = SECRETAS.has(chave) ? decifrar(guardado) : guardado;
    if (valor) return valor;
  }
  const doAmbiente = process.env[chave];
  return doAmbiente && doAmbiente !== "" ? doAmbiente : undefined;
}

export interface EstadoConfig {
  valor: string | undefined;
  origem: Origem;
  /** Verdadeiro para valores que não podem ser mostrados (passwords). */
  secreta: boolean;
  /** Valor guardado mas ilegível (o SESSION_SECRET mudou). */
  ilegivel: boolean;
}

export function estadoConfig(chave: ChaveConfig): EstadoConfig {
  const secreta = SECRETAS.has(chave);
  const guardado = lerBruto(chave);

  if (guardado !== null && guardado !== "") {
    const valor = secreta ? decifrar(guardado) : guardado;
    if (valor === null) {
      return { valor: undefined, origem: "definicoes", secreta, ilegivel: true };
    }
    return { valor, origem: "definicoes", secreta, ilegivel: false };
  }

  const doAmbiente = process.env[chave];
  if (doAmbiente) return { valor: doAmbiente, origem: "ambiente", secreta, ilegivel: false };

  return { valor: undefined, origem: "nenhuma", secreta, ilegivel: false };
}

/** Estado de todas as chaves, com os valores secretos já omitidos. */
export function estadoDeTudo(): Record<ChaveConfig, Omit<EstadoConfig, "valor"> & { valor?: string }> {
  const saida = {} as Record<ChaveConfig, Omit<EstadoConfig, "valor"> & { valor?: string }>;
  for (const chave of CHAVES_CONFIG) {
    const estado = estadoConfig(chave);
    saida[chave] = estado.secreta ? { ...estado, valor: undefined } : estado;
  }
  return saida;
}

/**
 * Guarda configurações. Um valor `null` apaga a entrada — a chave volta a
 * seguir a variável de ambiente, se existir.
 */
export function guardarConfig(valores: Partial<Record<ChaveConfig, string | null>>): void {
  const db = getDb();
  const inserir = db.prepare(
    `INSERT INTO configuracoes (chave, valor, atualizado_em) VALUES (?, ?, datetime('now'))
     ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, atualizado_em = datetime('now')`,
  );
  const apagar = db.prepare("DELETE FROM configuracoes WHERE chave = ?");

  db.transaction(() => {
    for (const [chave, valor] of Object.entries(valores) as Array<[ChaveConfig, string | null]>) {
      if (!CHAVES_CONFIG.includes(chave)) continue;
      if (valor === null || valor === "") {
        apagar.run(chave);
      } else {
        inserir.run(chave, SECRETAS.has(chave) ? cifrar(valor) : valor);
      }
    }
  })();
}

/** Muda sempre que a configuração de email muda — usado para refazer o transporte SMTP. */
export function impressaoDigitalEmail(): string {
  return CHAVES_CONFIG.filter((chave) => chave.startsWith("SMTP_") || chave === "MAIL_FROM")
    .map((chave) => `${chave}=${valorConfig(chave) ?? ""}`)
    .join("|");
}
