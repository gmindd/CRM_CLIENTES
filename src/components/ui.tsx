import Link from "next/link";
import { FASE_LABEL, type Fase, type ClienteComEstado } from "@/lib/types";

const CORES_FASE: Record<Fase, string> = {
  contactado: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/25",
  proposta: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25",
  desenvolvimento: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25",
  concluido: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
  cancelado: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/25",
};

export function EtiquetaFase({ fase }: { fase: Fase }) {
  return <span className={`etiqueta ${CORES_FASE[fase]}`}>{FASE_LABEL[fase]}</span>;
}

export function EtiquetaPagamento({ cliente }: { cliente: ClienteComEstado }) {
  const dias = cliente.dias_para_pagamento;
  if (cliente.estado_pagamento === "sem_anuidade" || dias === null) return null;

  if (cliente.estado_pagamento === "vencido") {
    return (
      <span className="etiqueta border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-400">
        Em atraso há {Math.abs(dias)} d
      </span>
    );
  }
  if (cliente.estado_pagamento === "alerta") {
    return (
      <span className="etiqueta border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400">
        {dias === 0 ? "Vence hoje" : `Faltam ${dias} d`}
      </span>
    );
  }
  return (
    <span className="etiqueta border-[var(--color-borda)] bg-transparent text-[var(--color-suave)]">
      Faltam {dias} d
    </span>
  );
}

export function EtiquetaFollowup({ cliente }: { cliente: ClienteComEstado }) {
  const dias = cliente.dias_para_followup;

  if (cliente.estado_followup === "atrasado" && dias !== null) {
    return (
      <span className="etiqueta border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-400">
        Follow-up há {Math.abs(dias)} d
      </span>
    );
  }
  if (cliente.estado_followup === "hoje") {
    return (
      <span className="etiqueta border-[var(--color-marca)]/30 bg-[var(--color-marca)]/10 text-[var(--color-marca)]">
        Follow-up hoje
      </span>
    );
  }
  if (cliente.estado_followup === "agendado" && dias !== null) {
    return (
      <span className="etiqueta border-[var(--color-borda)] bg-transparent text-[var(--color-suave)]">
        Follow-up em {dias} d
      </span>
    );
  }
  return null;
}

export function CartaoEstatistica({
  titulo,
  valor,
  nota,
  destaque,
  href,
}: {
  titulo: string;
  valor: string;
  nota?: string;
  destaque?: "normal" | "aviso" | "perigo";
  href?: string;
}) {
  const cor =
    destaque === "perigo"
      ? "text-red-600 dark:text-red-400"
      : destaque === "aviso"
        ? "text-amber-600 dark:text-amber-400"
        : "";

  const conteudo = (
    <div className="cartao h-full p-4 transition-colors hover:border-[var(--color-marca)]/40">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-suave)]">{titulo}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${cor}`}>{valor}</p>
      {nota && <p className="mt-1 text-xs text-[var(--color-suave)]">{nota}</p>}
    </div>
  );

  return href ? <Link href={href}>{conteudo}</Link> : conteudo;
}

export function Vazio({ titulo, descricao, acao }: { titulo: string; descricao?: string; acao?: React.ReactNode }) {
  return (
    <div className="cartao flex flex-col items-center gap-3 px-6 py-14 text-center">
      <p className="font-medium">{titulo}</p>
      {descricao && <p className="max-w-sm text-sm text-[var(--color-suave)]">{descricao}</p>}
      {acao}
    </div>
  );
}

export function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-borda)] py-2.5 last:border-0">
      <span className="shrink-0 text-sm text-[var(--color-suave)]">{rotulo}</span>
      <span className="text-right text-sm font-medium break-words">{children}</span>
    </div>
  );
}
