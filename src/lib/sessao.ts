import { SignJWT, jwtVerify } from "jose";

export const COOKIE_SESSAO = "crm_sessao";

const DIAS_SESSAO = Number(process.env.SESSION_DAYS || 7);

function segredo(): Uint8Array {
  const valor = process.env.SESSION_SECRET;
  if (!valor || valor.length < 32) {
    throw new Error(
      "SESSION_SECRET em falta ou demasiado curto (mínimo 32 caracteres). Gere um com: openssl rand -base64 48",
    );
  }
  return new TextEncoder().encode(valor);
}

/** Cria o token de sessão (JWT HS256) guardado no cookie. */
export async function criarToken(): Promise<string> {
  return new SignJWT({ sub: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DIAS_SESSAO}d`)
    .sign(segredo());
}

export async function tokenValido(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, segredo(), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export function opcoesCookie() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DIAS_SESSAO * 24 * 60 * 60,
  };
}
