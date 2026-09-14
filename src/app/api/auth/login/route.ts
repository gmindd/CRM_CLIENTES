import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { bloqueado, ipDoPedido, limparTentativas, passwordCorreta, registarFalha } from "@/lib/auth";
import { COOKIE_SESSAO, criarToken, opcoesCookie } from "@/lib/sessao";

export const runtime = "nodejs";

export async function POST(pedido: Request) {
  const ip = ipDoPedido(pedido);

  const segundos = bloqueado(ip);
  if (segundos > 0) {
    return NextResponse.json(
      { erro: `Demasiadas tentativas. Tente novamente daqui a ${Math.ceil(segundos / 60)} minuto(s).` },
      { status: 429 },
    );
  }

  let password = "";
  try {
    const corpo = await pedido.json();
    password = typeof corpo?.password === "string" ? corpo.password : "";
  } catch {
    return NextResponse.json({ erro: "Pedido inválido" }, { status: 400 });
  }

  try {
    if (!(await passwordCorreta(password))) {
      registarFalha(ip);
      return NextResponse.json({ erro: "Password incorreta" }, { status: 401 });
    }
  } catch (erro) {
    console.error("[login] configuração inválida:", erro);
    return NextResponse.json(
      { erro: "Acesso não configurado no servidor. Veja o ficheiro .env." },
      { status: 500 },
    );
  }

  limparTentativas(ip);
  const jar = await cookies();
  jar.set(COOKIE_SESSAO, await criarToken(), opcoesCookie());

  return NextResponse.json({ ok: true });
}
