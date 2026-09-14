"use client";

import { useActionState } from "react";
import { guardarDefinicoesEmail, type EstadoFormulario } from "@/app/acoes";
import type { ChaveConfig, Origem } from "@/lib/config";

const INICIAL: EstadoFormulario = {};

export interface CampoConfig {
  valor?: string;
  origem: Origem;
  secreta: boolean;
  ilegivel: boolean;
}

export type EstadoConfigPublico = Record<ChaveConfig, CampoConfig>;

function Origem({ origem }: { origem: Origem }) {
  if (origem !== "ambiente") return null;
  return (
    <span className="ml-2 text-[10px] font-normal normal-case tracking-normal text-[var(--color-suave)]">
      (vem das variáveis de ambiente)
    </span>
  );
}

export default function FormularioEmail({ config }: { config: EstadoConfigPublico }) {
  const [estado, acao, pendente] = useActionState(guardarDefinicoesEmail, INICIAL);

  const valor = (chave: ChaveConfig) => estado.valores?.[chave] ?? config[chave].valor ?? "";
  const erro = (chave: string) =>
    estado.erros?.[chave] ? (
      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{estado.erros[chave]}</p>
    ) : null;

  const temPassword = config.SMTP_PASS.origem !== "nenhuma" && !config.SMTP_PASS.ilegivel;

  return (
    <form action={acao} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="rotulo" htmlFor="SMTP_HOST">
            Servidor SMTP
            <Origem origem={config.SMTP_HOST.origem} />
          </label>
          <input
            id="SMTP_HOST"
            name="SMTP_HOST"
            className="campo"
            placeholder="smtp.o-seu-servidor.com"
            defaultValue={valor("SMTP_HOST")}
          />
          {erro("SMTP_HOST")}
        </div>

        <div>
          <label className="rotulo" htmlFor="SMTP_PORT">
            Porta
            <Origem origem={config.SMTP_PORT.origem} />
          </label>
          <input
            id="SMTP_PORT"
            name="SMTP_PORT"
            inputMode="numeric"
            className="campo"
            placeholder="587"
            defaultValue={valor("SMTP_PORT")}
          />
          {erro("SMTP_PORT")}
        </div>

        <div>
          <label className="rotulo" htmlFor="SMTP_SECURE">
            Ligação segura
          </label>
          <select
            id="SMTP_SECURE"
            name="SMTP_SECURE"
            className="campo"
            defaultValue={config.SMTP_SECURE.valor ?? "auto"}
          >
            <option value="auto">Automático (465 = SSL, 587 = STARTTLS)</option>
            <option value="true">Sempre SSL/TLS</option>
            <option value="false">STARTTLS</option>
          </select>
        </div>

        <div>
          <label className="rotulo" htmlFor="SMTP_USER">
            Utilizador
            <Origem origem={config.SMTP_USER.origem} />
          </label>
          <input
            id="SMTP_USER"
            name="SMTP_USER"
            autoComplete="off"
            className="campo"
            placeholder="crm@pereiragabriel.com"
            defaultValue={valor("SMTP_USER")}
          />
          {erro("SMTP_USER")}
        </div>

        <div>
          <label className="rotulo" htmlFor="SMTP_PASS">
            Password
            <Origem origem={config.SMTP_PASS.origem} />
          </label>
          <input
            id="SMTP_PASS"
            name="SMTP_PASS"
            type="password"
            autoComplete="new-password"
            className="campo"
            placeholder={temPassword ? "•••••••• (guardada)" : "por definir"}
          />
          {config.SMTP_PASS.ilegivel && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              A password guardada deixou de poder ser lida (o SESSION_SECRET mudou). Escreva-a de
              novo.
            </p>
          )}
          {temPassword && (
            <label className="mt-2 flex items-center gap-2 text-xs text-[var(--color-suave)]">
              <input type="checkbox" name="apagar_password" />
              Apagar a password guardada
            </label>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="rotulo" htmlFor="MAIL_FROM">
            Remetente dos emails
            <Origem origem={config.MAIL_FROM.origem} />
          </label>
          <input
            id="MAIL_FROM"
            name="MAIL_FROM"
            className="campo"
            placeholder="CRM <crm@pereiragabriel.com>"
            defaultValue={valor("MAIL_FROM")}
          />
          {erro("MAIL_FROM")}
        </div>

        <div>
          <label className="rotulo" htmlFor="ALERT_EMAIL_TO">
            Receber alertas em
            <Origem origem={config.ALERT_EMAIL_TO.origem} />
          </label>
          <input
            id="ALERT_EMAIL_TO"
            name="ALERT_EMAIL_TO"
            type="email"
            className="campo"
            placeholder="o-seu-email@exemplo.com"
            defaultValue={valor("ALERT_EMAIL_TO")}
          />
          {erro("ALERT_EMAIL_TO")}
        </div>

        <div>
          <label className="rotulo" htmlFor="APP_URL">
            Endereço do CRM
            <Origem origem={config.APP_URL.origem} />
          </label>
          <input
            id="APP_URL"
            name="APP_URL"
            type="url"
            className="campo"
            placeholder="https://crm.pereiragabriel.com"
            defaultValue={valor("APP_URL")}
          />
          {erro("APP_URL")}
        </div>
      </div>

      {estado.erroGeral && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {estado.erroGeral}
        </p>
      )}
      {estado.ok && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          Definições guardadas. Use o botão de teste abaixo para confirmar.
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-principal" disabled={pendente}>
          {pendente ? "A guardar…" : "Guardar definições de email"}
        </button>
        <p className="text-xs text-[var(--color-suave)]">
          Guardado na base de dados; a password fica cifrada.
        </p>
      </div>
    </form>
  );
}
