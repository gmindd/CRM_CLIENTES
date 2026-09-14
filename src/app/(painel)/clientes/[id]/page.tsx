import Link from "next/link";
import { notFound } from "next/navigation";
import { listarPagamentos, obterCliente } from "@/lib/clientes";
import { formatData, formatMoeda } from "@/lib/format";
import { EtiquetaFase, EtiquetaPagamento, Linha } from "@/components/ui";
import FormularioPagamento from "@/components/FormularioPagamento";
import BotaoApagar from "@/components/BotaoApagar";
import { removerCliente, removerPagamento } from "@/app/acoes";

export const dynamic = "force-dynamic";

export default async function FichaCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = obterCliente(Number(id));
  if (!cliente) notFound();

  const pagamentos = listarPagamentos(cliente.id);
  const totalPago = pagamentos.reduce((soma, p) => soma + p.valor, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clientes" className="text-sm text-[var(--color-suave)] hover:underline">
          ← Clientes
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{cliente.empresa}</h1>
            <p className="mt-1 text-sm text-[var(--color-suave)]">{cliente.nome_cliente}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <EtiquetaFase fase={cliente.fase} />
            {cliente.cliente_ativo === 0 && (
              <span className="etiqueta border-[var(--color-borda)] text-[var(--color-suave)]">Inativo</span>
            )}
            <EtiquetaPagamento cliente={cliente} />
            <Link href={`/clientes/${cliente.id}/editar`} className="btn btn-secundario">
              Editar
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <section className="cartao p-5">
            <h2 className="mb-2 font-semibold">Contacto</h2>
            <Linha rotulo="Email">
              {cliente.email ? (
                <a href={`mailto:${cliente.email}`} className="text-[var(--color-marca)] hover:underline">
                  {cliente.email}
                </a>
              ) : (
                "—"
              )}
            </Linha>
            <Linha rotulo="Telefone">
              {cliente.telefone ? (
                <a href={`tel:${cliente.telefone}`} className="text-[var(--color-marca)] hover:underline">
                  {cliente.telefone}
                </a>
              ) : (
                "—"
              )}
            </Linha>
            <Linha rotulo="NIF">{cliente.nif || "—"}</Linha>
          </section>

          <section className="cartao p-5">
            <h2 className="mb-2 font-semibold">Projeto</h2>
            <Linha rotulo="Valor">{formatMoeda(cliente.valor_projeto, cliente.moeda)}</Linha>
            <Linha rotulo="Início">{formatData(cliente.data_inicio)}</Linha>
            <Linha rotulo="Conclusão">{formatData(cliente.data_conclusao)}</Linha>
            <Linha rotulo="Link de desenvolvimento">
              {cliente.link_desenvolvimento ? (
                <a
                  href={cliente.link_desenvolvimento}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-marca)] hover:underline"
                >
                  {cliente.link_desenvolvimento}
                </a>
              ) : (
                "—"
              )}
            </Linha>
            <Linha rotulo="Link final">
              {cliente.link_final ? (
                <a
                  href={cliente.link_final}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-marca)] hover:underline"
                >
                  {cliente.link_final}
                </a>
              ) : (
                "—"
              )}
            </Linha>
          </section>

          {cliente.notas && (
            <section className="cartao p-5">
              <h2 className="mb-2 font-semibold">Notas</h2>
              <p className="whitespace-pre-wrap text-sm text-[var(--color-suave)]">{cliente.notas}</p>
            </section>
          )}

          <section className="cartao p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Histórico de pagamentos</h2>
              <span className="text-sm text-[var(--color-suave)]">
                Total: {formatMoeda(Math.round(totalPago * 100) / 100, cliente.moeda)}
              </span>
            </div>

            {pagamentos.length === 0 ? (
              <p className="py-4 text-sm text-[var(--color-suave)]">Ainda não há pagamentos registados.</p>
            ) : (
              <ul className="divide-y divide-[var(--color-borda)]">
                {pagamentos.map((pagamento) => (
                  <li key={pagamento.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium tabular-nums">
                        {formatData(pagamento.data)} · {formatMoeda(pagamento.valor, cliente.moeda)}
                      </p>
                      <p className="truncate text-xs text-[var(--color-suave)]">
                        {pagamento.tipo}
                        {pagamento.notas ? ` · ${pagamento.notas}` : ""}
                      </p>
                    </div>
                    <form action={removerPagamento}>
                      <input type="hidden" name="cliente_id" value={cliente.id} />
                      <input type="hidden" name="pagamento_id" value={pagamento.id} />
                      <BotaoApagar
                        confirmacao="Apagar este pagamento?"
                        className="text-xs text-[var(--color-suave)] hover:text-red-600"
                      >
                        Apagar
                      </BotaoApagar>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <section className="cartao p-5">
            <h2 className="mb-2 font-semibold">Anuidade</h2>
            {cliente.tem_anuidade ? (
              <>
                <Linha rotulo="Valor">{formatMoeda(cliente.valor_anuidade, cliente.moeda)}</Linha>
                <Linha rotulo="Próximo pagamento">{formatData(cliente.data_proximo_pagamento)}</Linha>
                <Linha rotulo="Alerta">{cliente.alerta_dias_antes} dias antes</Linha>
                <Linha rotulo="Estado">
                  {cliente.dias_para_pagamento === null
                    ? "—"
                    : cliente.dias_para_pagamento < 0
                      ? `Em atraso há ${Math.abs(cliente.dias_para_pagamento)} dias`
                      : cliente.dias_para_pagamento === 0
                        ? "Vence hoje"
                        : `Faltam ${cliente.dias_para_pagamento} dias`}
                </Linha>
              </>
            ) : (
              <p className="py-2 text-sm text-[var(--color-suave)]">Sem anuidade associada.</p>
            )}
          </section>

          <section className="cartao p-5">
            <h2 className="mb-3 font-semibold">Registar pagamento</h2>
            <FormularioPagamento
              clienteId={cliente.id}
              valorSugerido={cliente.tem_anuidade ? cliente.valor_anuidade : cliente.valor_projeto}
            />
          </section>

          <section className="cartao p-5">
            <h2 className="mb-2 font-semibold">Zona perigosa</h2>
            <p className="mb-3 text-sm text-[var(--color-suave)]">
              Apagar o cliente remove também o histórico de pagamentos e alertas.
            </p>
            <form action={removerCliente}>
              <input type="hidden" name="id" value={cliente.id} />
              <BotaoApagar
                confirmacao="Apagar este cliente e todo o seu histórico? Esta ação não pode ser anulada."
                className="btn btn-perigo w-full"
              >
                Apagar cliente
              </BotaoApagar>
            </form>
          </section>

          <p className="text-xs text-[var(--color-suave)]">
            Criado em {formatData(cliente.criado_em)} · atualizado em {formatData(cliente.atualizado_em)}
          </p>
        </div>
      </div>
    </div>
  );
}
