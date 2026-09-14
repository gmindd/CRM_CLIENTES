"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FormularioLogin({ destino }: { destino?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState(false);

  async function submeter(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setAEnviar(true);

    try {
      const resposta = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível entrar");
        setAEnviar(false);
        return;
      }

      router.replace(destino && destino.startsWith("/") ? destino : "/");
      router.refresh();
    } catch {
      setErro("Falha de ligação ao servidor");
      setAEnviar(false);
    }
  }

  return (
    <form onSubmit={submeter} className="cartao space-y-4 p-6">
      <div>
        <label className="rotulo" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          className="campo"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {erro && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {erro}
        </p>
      )}

      <button type="submit" className="btn btn-principal w-full" disabled={aEnviar || !password}>
        {aEnviar ? "A entrar…" : "Entrar"}
      </button>
    </form>
  );
}
