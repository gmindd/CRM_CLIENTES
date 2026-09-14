import Link from "next/link";
import { estatisticas, listarClientes, proximosPagamentos } from "@/lib/clientes";
import { formatData, formatMoeda } from "@/lib/format";
import { CartaoEstatistica, EtiquetaFase, EtiquetaPagamento, Vazio } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Painel() {
  const stats = estatisticas();
  const proximos = proximosPagamentos(8);
  const recentes = listarClientes({ ordem: "recentes" }).slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Painel</h1>
        <p className="mt-1 text-sm text-[var(--color-suave)]">
          Resumo da carteira de clientes e dos pagamentos a chegar.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoEstatistica
          titulo="Clientes"
          valor={String(stats.total_clientes)}
          nota={`${stats.clientes_ativos} ativos`}
          href="/clientes"
        />
        <CartaoEstatistica
          titulo="Anuidades / ano"
          valor={formatMoeda(stats.receita_anual_recorrente)}
          nota="Receita recorrente de clientes ativos"
          href="/clientes?anuidade=1&ordem=pagamento"
        />
        <CartaoEstatistica
          titulo="Pagamentos a chegar"
          valor={String(stats.pagamentos_a_chegar + stats.pagamentos_vencidos)}
          nota={
            stats.pagamentos_vencidos > 0
              ? `${stats.pagamentos_vencidos} em atraso`
              : "dentro da janela de alerta"
          }
          destaque={
            stats.pagamentos_vencidos > 0
              ? "perigo"
              : stats.pagamentos_a_chegar > 0
                ? "aviso"
                : "normal"
          }
        />
        <CartaoEstatistica
          titulo="Recebido (12 meses)"
          valor={formatMoeda(stats.recebido_12_meses)}
          nota="Pagamentos registados nas fichas"
        />
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Valor dos projetos</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <CartaoEstatistica
            titulo="Concluídos"
            valor={formatMoeda(stats.valor_concluido)}
            nota={`${stats.por_fase.concluido} ${
              stats.por_fase.concluido === 1 ? "projeto entregue" : "projetos entregues"
            }`}
            href="/clientes?fase=concluido"
          />
          <CartaoEstatistica
            titulo="Em proposta"
            valor={formatMoeda(stats.valor_em_proposta)}
            nota={`${stats.por_fase.proposta} por fechar`}
            href="/clientes?fase=proposta"
          />
          <CartaoEstatistica
            titulo="Em desenvolvimento"
            valor={formatMoeda(stats.valor_em_desenvolvimento)}
            nota={`${stats.por_fase.desenvolvimento} a decorrer`}
            href="/clientes?fase=desenvolvimento"
          />
          <CartaoEstatistica
            titulo="Total dos projetos"
            valor={formatMoeda(stats.valor_total_projetos)}
            nota={
              stats.por_fase.cancelado > 0
                ? `${stats.por_fase.cancelado} cancelado(s) fora da conta`
                : "Tudo somado, exceto cancelados"
            }
            href="/clientes?ordem=valor"
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Próximos pagamentos</h2>
          <Link href="/clientes?anuidade=1&ordem=pagamento" className="text-sm text-[var(--color-marca)]">
            Ver todos
          </Link>
        </div>

        {proximos.length === 0 ? (
          <Vazio
            titulo="Sem anuidades agendadas"
            descricao="Marque 'Tem anuidade' num cliente e indique a data do próximo pagamento para começar a receber alertas."
          />
        ) : (
          <ul className="cartao divide-y divide-[var(--color-borda)]">
            {proximos.map((cliente) => (
              <li key={cliente.id}>
                <Link
                  href={`/clientes/${cliente.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--color-texto)]/5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{cliente.empresa}</p>
                    <p className="truncate text-xs text-[var(--color-suave)]">
                      {formatData(cliente.data_proximo_pagamento)} ·{" "}
                      {formatMoeda(cliente.valor_anuidade, cliente.moeda)} · alerta{" "}
                      {cliente.alerta_dias_antes} d antes
                    </p>
                  </div>
                  <EtiquetaPagamento cliente={cliente} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {recentes.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Adicionados recentemente</h2>
          <ul className="cartao divide-y divide-[var(--color-borda)]">
            {recentes.map((cliente) => (
              <li key={cliente.id}>
                <Link
                  href={`/clientes/${cliente.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--color-texto)]/5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{cliente.empresa}</p>
                    <p className="truncate text-xs text-[var(--color-suave)]">{cliente.nome_cliente}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm tabular-nums text-[var(--color-suave)]">
                      {formatMoeda(cliente.valor_projeto, cliente.moeda)}
                    </span>
                    <EtiquetaFase fase={cliente.fase} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
