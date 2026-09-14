"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Resultado {
  verificados: number;
  enviados: number;
  ignorados: number;
  erros: string[];
  detalhes: Array<{ cliente: string; dias: number; tipo: string; estado: string }>;
}

export default function PainelAlertas() {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<null | "teste" | "simulacao" | "envio">(null);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function testarEmail() {
    setOcupado("teste");
    setMensagem(null);
    try {
      const resposta = await fetch("/api/alertas/testar", { method: "POST" });
      const dados = await resposta.json();
      setMensagem(
        resposta.ok
          ? { tipo: "ok", texto: `Email de teste enviado para ${dados.destinatario}.` }
          : { tipo: "erro", texto: dados.erro ?? "Falhou o envio." },
      );
    } catch {
      setMensagem({ tipo: "erro", texto: "Falha de ligação ao servidor." });
    }
    setOcupado(null);
  }

  async function verificar(simulacao: boolean) {
    setOcupado(simulacao ? "simulacao" : "envio");
    setMensagem(null);
    setResultado(null);
    try {
      const resposta = await fetch(`/api/cron/alertas?simulacao=${simulacao}`, { method: "POST" });
      const dados = await resposta.json();
      if (!resposta.ok) {
        setMensagem({ tipo: "erro", texto: dados.erro ?? "Falhou a verificação." });
      } else {
        setResultado(dados);
        setMensagem({
          tipo: dados.erros?.length ? "erro" : "ok",
          texto: simulacao
            ? `Simulação: ${dados.detalhes.length} alerta(s) dentro da janela.`
            : `${dados.enviados} email(s) enviado(s), ${dados.ignorados} já tinham sido enviados.`,
        });
        if (!simulacao) router.refresh();
      }
    } catch {
      setMensagem({ tipo: "erro", texto: "Falha de ligação ao servidor." });
    }
    setOcupado(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-secundario" onClick={testarEmail} disabled={ocupado !== null}>
          {ocupado === "teste" ? "A enviar…" : "Enviar email de teste"}
        </button>
        <button className="btn btn-secundario" onClick={() => verificar(true)} disabled={ocupado !== null}>
          {ocupado === "simulacao" ? "A verificar…" : "Simular verificação"}
        </button>
        <button className="btn btn-principal" onClick={() => verificar(false)} disabled={ocupado !== null}>
          {ocupado === "envio" ? "A verificar…" : "Verificar e enviar agora"}
        </button>
      </div>

      {mensagem && (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${
            mensagem.tipo === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
          }`}
        >
          {mensagem.texto}
        </p>
      )}

      {resultado && resultado.detalhes.length > 0 && (
        <ul className="divide-y divide-[var(--color-borda)] text-sm">
          {resultado.detalhes.map((detalhe, indice) => (
            <li key={indice} className="flex items-center justify-between gap-3 py-2">
              <span className="font-medium">{detalhe.cliente}</span>
              <span className="text-xs text-[var(--color-suave)]">
                {detalhe.dias < 0 ? `${Math.abs(detalhe.dias)} d em atraso` : `faltam ${detalhe.dias} d`} ·{" "}
                {detalhe.estado}
              </span>
            </li>
          ))}
        </ul>
      )}

      {resultado && resultado.erros.length > 0 && (
        <ul className="text-xs text-red-600 dark:text-red-400">
          {resultado.erros.map((erro, indice) => (
            <li key={indice}>• {erro}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
