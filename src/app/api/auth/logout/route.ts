import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_SESSAO } from "@/lib/sessao";

export const runtime = "nodejs";

export async function POST() {
  const jar = await cookies();
  jar.delete(COOKIE_SESSAO);
  return NextResponse.json({ ok: true });
}
