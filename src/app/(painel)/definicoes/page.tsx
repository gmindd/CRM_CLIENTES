import { historicoAlertas } from "@/lib/alertas";
import { destinatarioAlertas, emailConfigurado } from "@/lib/mail";
import { formatData } from "@/lib/format";
import { Linha } from "@/components/ui";
import PainelAlertas from "@/components/PainelAlertas";
import { dbPath } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Definicoes() {
  const historico = historicoAlertas(30);
  const configurado = emailConfigurado();
  const agendadorAtivo = process.env.ALERTAS_AUTO !== "false";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Definições</h1>
        <p className="mt-1 text-sm text-[var(--color-suave)]">
          Estado do envio de alertas e configuração do servidor.
        </p>
      </div>

      <section className="cartao p-5">
        <h2 className="mb-3 font-semibold">Alertas de pagamento</h2>
        <Linha rotulo="Envio de email">
          {configurado ? (
            <span className="text-emerald-600 dark:text-emerald-400">Configurado</span>
          ) : (
            <span className="text-red-600 dark:text-red-400">Falta SMTP_HOST / MAIL_FROM</span>
          )}
        </Linha>
        <Linha rotulo="Destinatário">{destinatarioAlertas() || "—"}</Linha>
        <Linha rotulo="Verificação automática">
          {agendadorAtivo ? (
            <>
              Ativa · <code className="text-xs">{process.env.ALERTAS_CRON || "0 9 * * *"}</code>
            </>
          ) : (
            "Desligada (ALERTAS_AUTO=false)"
          )}
        </Linha>
        <Linha rotulo="Fuso horário">{process.env.TZ || "Europe/Lisbon"}</Linha>

        <div className="mt-4">
          <PainelAlertas />
        </div>
      </section>

      <section className="cartao p-5">
        <h2 className="mb-3 font-semibold">Últimos alertas enviados</h2>
        {historico.length === 0 ? (
          <p className="text-sm text-[var(--color-suave)]">Ainda não foi enviado nenhum alerta.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-borda)]">
            {historico.map((alerta) => (
              <li key={alerta.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{alerta.empresa}</p>
                  <p className="truncate text-xs text-[var(--color-suave)]">
                    {alerta.tipo === "vencido" ? "Aviso de atraso" : "Aviso de vencimento"} ·
                    vencimento {formatData(alerta.data_pagamento)} · para {alerta.destinatario}
                  </p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-[var(--color-suave)]">
                  {alerta.enviado_em.slice(0, 16).replace("T", " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="cartao p-5">
        <h2 className="mb-3 font-semibold">Servidor</h2>
        <Linha rotulo="Base de dados">
          <code className="text-xs break-all">{dbPath}</code>
        </Linha>
        <Linha rotulo="Endereço público">{process.env.APP_URL || "—"}</Linha>
        <Linha rotulo="Endpoint de cron externo">
          <code className="text-xs">/api/cron/alertas</code>
        </Linha>
        <p className="mt-3 text-xs text-[var(--color-suave)]">
          Faça backup regular do ficheiro da base de dados — contém todos os clientes, pagamentos e
          alertas.
        </p>
      </section>
    </div>
  );
}
