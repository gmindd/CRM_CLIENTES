"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LIGACOES = [
  { href: "/", rotulo: "Painel" },
  { href: "/clientes", rotulo: "Clientes" },
  { href: "/definicoes", rotulo: "Definições" },
];

export default function Navegacao() {
  const caminho = usePathname();
  const router = useRouter();

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-borda)] bg-[var(--color-superficie)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-marca)] text-xs font-bold text-white">
            GP
          </span>
          CRM
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {LIGACOES.map(({ href, rotulo }) => {
            const ativo = href === "/" ? caminho === "/" : caminho.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                  ativo
                    ? "bg-[var(--color-marca)]/10 text-[var(--color-marca)]"
                    : "text-[var(--color-suave)] hover:text-[var(--color-texto)]"
                }`}
              >
                {rotulo}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/clientes/novo" className="btn btn-principal">
            + Novo cliente
          </Link>
          <button type="button" onClick={sair} className="btn btn-secundario" title="Terminar sessão">
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
