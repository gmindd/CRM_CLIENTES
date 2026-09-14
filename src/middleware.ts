import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, tokenValido } from "@/lib/sessao";

/**
 * Protege toda a aplicação com a sessão por password.
 * Só ficam abertos: o ecrã de login, a própria rota de login e o endpoint de
 * alertas (que tem o seu próprio segredo, CRON_SECRET).
 */
const PUBLICAS = ["/login", "/api/auth/login", "/api/cron/alertas"];

export async function middleware(pedido: NextRequest) {
  const { pathname } = pedido.nextUrl;

  if (PUBLICAS.some((rota) => pathname === rota || pathname.startsWith(`${rota}/`))) {
    return NextResponse.next();
  }

  const autenticado = await tokenValido(pedido.cookies.get(COOKIE_SESSAO)?.value);
  if (autenticado) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const url = pedido.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?destino=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Os ícones têm de ficar de fora: são pedidos pelo browser antes de haver
  // sessão (nomeadamente no próprio ecrã de login).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|robots.txt).*)",
  ],
};
