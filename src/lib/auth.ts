import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { COOKIE_SESSAO, tokenValido } from "./sessao";

/**
 * Lê o hash bcrypt configurado.
 *
 * O hash começa sempre por `$2b$...` e há painéis (Coolify, Portainer, alguns
 * ficheiros compose) que tratam o `$` como início de variável e destroem o
 * valor. Por isso aceitamos também APP_PASSWORD_HASH_B64 — o mesmo hash em
 * base64, sem qualquer caractere problemático.
 */
export function hashConfigurado(): string | undefined {
  const base64 = process.env.APP_PASSWORD_HASH_B64;
  if (base64) {
    const descodificado = Buffer.from(base64, "base64").toString("utf8").trim();
    if (descodificado.startsWith("$2")) return descodificado;
    console.error("[auth] APP_PASSWORD_HASH_B64 não contém um hash bcrypt válido");
  }
  return process.env.APP_PASSWORD_HASH;
}

/**
 * Verifica a password de acesso.
 * Preferir APP_PASSWORD_HASH / APP_PASSWORD_HASH_B64 (bcrypt, gerados com
 * `npm run hash-password`). APP_PASSWORD em texto simples existe apenas como
 * alternativa para uso local.
 */
export async function passwordCorreta(password: string): Promise<boolean> {
  const hash = hashConfigurado();
  if (hash) return bcrypt.compare(password, hash);

  const simples = process.env.APP_PASSWORD;
  if (simples) return comparaConstante(password, simples);

  throw new Error(
    "Defina APP_PASSWORD_HASH (ou APP_PASSWORD_HASH_B64) — veja `npm run hash-password`",
  );
}

/**
 * Como está configurado o acesso — mostrado na página de Definições para se
 * perceber, de relance, se a password está guardada como hash ou em texto
 * simples no painel de alojamento.
 */
export function modoAutenticacao(): "hash" | "texto_simples" | "por_configurar" {
  if (hashConfigurado()) return "hash";
  if (process.env.APP_PASSWORD) return "texto_simples";
  return "por_configurar";
}

/** Comparação em tempo constante para não revelar o tamanho da password. */
function comparaConstante(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  const tamanho = Math.max(ba.length, bb.length);
  let diferenca = ba.length ^ bb.length;
  for (let i = 0; i < tamanho; i++) {
    diferenca |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diferenca === 0;
}

/** True se o pedido atual tem sessão válida (para uso em Server Components e rotas API). */
export async function temSessao(): Promise<boolean> {
  const jar = await cookies();
  return tokenValido(jar.get(COOKIE_SESSAO)?.value);
}

// ---- Limitação de tentativas de login (em memória, por IP) ----

const TENTATIVAS_MAX = Number(process.env.LOGIN_MAX_TENTATIVAS || 8);
const JANELA_MS = Number(process.env.LOGIN_JANELA_MINUTOS || 15) * 60_000;
const tentativas = new Map<string, { contagem: number; ate: number }>();

export function bloqueado(ip: string): number {
  const registo = tentativas.get(ip);
  if (!registo) return 0;
  if (Date.now() > registo.ate) {
    tentativas.delete(ip);
    return 0;
  }
  return registo.contagem >= TENTATIVAS_MAX ? Math.ceil((registo.ate - Date.now()) / 1000) : 0;
}

export function registarFalha(ip: string): void {
  const agora = Date.now();
  const registo = tentativas.get(ip);
  if (!registo || agora > registo.ate) {
    tentativas.set(ip, { contagem: 1, ate: agora + JANELA_MS });
  } else {
    registo.contagem += 1;
  }
}

export function limparTentativas(ip: string): void {
  tentativas.delete(ip);
}

export function ipDoPedido(pedido: Request): string {
  const encaminhado = pedido.headers.get("x-forwarded-for");
  if (encaminhado) return encaminhado.split(",")[0].trim();
  return pedido.headers.get("x-real-ip") ?? "desconhecido";
}
