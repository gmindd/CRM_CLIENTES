import Link from "next/link";
import { listarClientes, type FiltrosClientes } from "@/lib/clientes";
import { FASES, FASE_LABEL, type Fase } from "@/lib/types";
import { formatData, formatMoeda } from "@/lib/format";
import { EtiquetaFase, EtiquetaPagamento, Vazio } from "@/components/ui";

export const dynamic = "force-dynamic";

type Params = {
  q?: string;
  fase?: string;
  ativo?: string;
  anuidade?: string;
  ordem?: string;
};

export default async function ListaClientes({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;

  const fase = (FASES as readonly string[]).includes(params.fase ?? "")
    ? (params.fase as Fase)
    : "todas";

  const filtros: FiltrosClientes = {
    procura: params.q,
    fase,
    apenasAtivos: params.ativo === "1",
    apenasAnuidade: params.anuidade === "1",
    ordem: (["recentes", "empresa", "pagamento", "valor"] as const).includes(params.ordem as never)
      ? (params.ordem as FiltrosClientes["ordem"])
      : "recentes",
  };

  const clientes = listarClientes(filtros);
  const totalValor = clientes.reduce((soma, c) => soma + c.valor_projeto, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="mt-1 text-sm text-[var(--color-suave)]">
            {clientes.length} {clientes.length === 1 ? "registo" : "registos"} ·{" "}
            {formatMoeda(Math.round(totalValor * 100) / 100)} em projetos
          </p>
        </div>
        <a href="/api/exportar" className="btn btn-secundario" download>
          Exportar CSV
        </a>
      </div>

      <form className="cartao grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4" method="get">
        <div className="sm:col-span-2">
          <label className="rotulo" htmlFor="q">
            Procurar
          </label>
          <input
            id="q"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Empresa, nome, email, telefone ou NIF"
            className="campo"
          />
        </div>

        <div>
          <label className="rotulo" htmlFor="fase">
            Fase
          </label>
          <select id="fase" name="fase" defaultValue={fase} className="campo">
            <option value="todas">Todas</option>
            {FASES.map((f) => (
              <option key={f} value={f}>
                {FASE_LABEL[f]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="rotulo" htmlFor="ordem">
            Ordenar por
          </label>
          <select id="ordem" name="ordem" defaultValue={filtros.ordem} className="campo">
            <option value="recentes">Mais recentes</option>
            <option value="empresa">Empresa (A-Z)</option>
            <option value="pagamento">Próximo pagamento</option>
            <option value="valor">Valor do projeto</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:col-span-2 lg:col-span-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="ativo" value="1" defaultChecked={filtros.apenasAtivos} />
            Apenas clientes ativos
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="anuidade" value="1" defaultChecked={filtros.apenasAnuidade} />
            Apenas com anuidade
          </label>
        </div>

        <div className="flex gap-2 lg:justify-end">
          <button type="submit" className="btn btn-principal">
            Filtrar
          </button>
          <Link href="/clientes" className="btn btn-secundario">
            Limpar
          </Link>
        </div>
      </form>

      {clientes.length === 0 ? (
        <Vazio
          titulo="Nenhum cliente encontrado"
          descricao="Ajuste os filtros ou adicione o primeiro cliente."
          acao={
            <Link href="/clientes/novo" className="btn btn-principal">
              + Novo cliente
            </Link>
          }
        />
      ) : (
        <div className="cartao overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-[var(--color-borda)] text-left text-xs uppercase tracking-wide text-[var(--color-suave)]">
                <th className="px-4 py-3 font-semibold">Empresa / Cliente</th>
                <th className="px-4 py-3 font-semibold">Fase</th>
                <th className="px-4 py-3 text-right font-semibold">Projeto</th>
                <th className="px-4 py-3 text-right font-semibold">Anuidade</th>
                <th className="px-4 py-3 font-semibold">Próximo pagamento</th>
                <th className="px-4 py-3 font-semibold">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-borda)]">
              {clientes.map((cliente) => {
                const link = cliente.link_final || cliente.link_desenvolvimento;
                return (
                  <tr key={cliente.id} className="hover:bg-[var(--color-texto)]/5">
                    <td className="px-4 py-3">
                      <Link href={`/clientes/${cliente.id}`} className="block">
                        <span className="font-medium">{cliente.empresa}</span>
                        <span className="block text-xs text-[var(--color-suave)]">
                          {cliente.nome_cliente}
                          {cliente.cliente_ativo === 0 && " · inativo"}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <EtiquetaFase fase={cliente.fase} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoeda(cliente.valor_projeto, cliente.moeda)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {cliente.tem_anuidade ? formatMoeda(cliente.valor_anuidade, cliente.moeda) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {cliente.tem_anuidade && cliente.data_proximo_pagamento ? (
                        <div className="flex flex-col items-start gap-1">
                          <span className="tabular-nums">
                            {formatData(cliente.data_proximo_pagamento)}
                          </span>
                          <EtiquetaPagamento cliente={cliente} />
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {link ? (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--color-marca)] underline-offset-2 hover:underline"
                        >
                          {cliente.link_final ? "Site final" : "Dev"}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
