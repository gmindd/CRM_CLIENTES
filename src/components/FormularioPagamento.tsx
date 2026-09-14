"use client";

import { useActionState, useEffect, useRef } from "react";
import { guardarPagamento, type EstadoFormulario } from "@/app/acoes";
import { hojeISO } from "@/lib/format";

const INICIAL: EstadoFormulario = {};

export default function FormularioPagamento({
  clienteId,
  valorSugerido,
}: {
  clienteId: number;
  valorSugerido: number | null;
}) {
  const [estado, acao, pendente] = useActionState(guardarPagamento, INICIAL);
  const formulario = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formulario.current?.reset();
  }, [estado.ok]);

  return (
    <form ref={formulario} action={acao} className="space-y-3">
      <input type="hidden" name="cliente_id" value={clienteId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor="pag_data">
            Data
          </label>
          <input id="pag_data" name="data" type="date" required className="campo" defaultValue={hojeISO()} />
          {estado.erros?.data && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{estado.erros.data}</p>
          )}
        </div>

        <div>
          <label className="rotulo" htmlFor="pag_valor">
            Valor
          </label>
          <input
            id="pag_valor"
            name="valor"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            className="campo"
            defaultValue={valorSugerido ?? ""}
          />
        </div>

        <div>
          <label className="rotulo" htmlFor="pag_tipo">
            Tipo
          </label>
          <select id="pag_tipo" name="tipo" className="campo" defaultValue="anuidade">
            <option value="anuidade">Anuidade</option>
            <option value="projeto">Projeto</option>
            <option value="outro">Outro</option>
          </select>
        </div>

        <div>
          <label className="rotulo" htmlFor="pag_meses">
            Renovar por (meses)
          </label>
          <input
            id="pag_meses"
            name="meses_renovacao"
            type="number"
            min="1"
            max="120"
            className="campo"
            defaultValue={12}
          />
        </div>
      </div>

      <div>
        <label className="rotulo" htmlFor="pag_notas">
          Notas
        </label>
        <input id="pag_notas" name="notas" className="campo" placeholder="Nº de fatura, método…" />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="renovar" defaultChecked />
        Avançar a data do próximo pagamento e reiniciar os alertas
      </label>

      {estado.erroGeral && (
        <p className="text-xs text-red-600 dark:text-red-400">{estado.erroGeral}</p>
      )}
      {estado.ok && <p className="text-xs text-emerald-600 dark:text-emerald-400">Pagamento registado.</p>}

      <button type="submit" className="btn btn-principal w-full" disabled={pendente}>
        {pendente ? "A registar…" : "Registar pagamento"}
      </button>
    </form>
  );
}
