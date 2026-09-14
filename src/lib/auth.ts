import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { COOKIE_SESSAO, tokenValido } from "./sessao";

/**
 * Verifica a password de acesso.
 * Preferir APP_PASSWORD_HASH (bcrypt, gerado com `npm run hash-password`).
 * APP_PASSWORD em texto simples existe apenas como alternativa para uso local.
 */
export async function passwordCorreta(password: string): Promise<boolean> {
  const hash = process.env.APP_PASSWORD_HASH;
  if (hash) return bcrypt.compare(password, hash);

  const simples = process.env.APP_PASSWORD;
  if (simples) return comparaConstante(password, simples);

  throw new Error("Defina APP_PASSWORD_HASH (recomendado) ou APP_PASSWORD no ficheiro .env");
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
