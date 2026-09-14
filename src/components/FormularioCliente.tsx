"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { guardarCliente, type EstadoFormulario } from "@/app/acoes";
import { FASES, FASE_LABEL, type ClienteComEstado } from "@/lib/types";

const INICIAL: EstadoFormulario = {};

export default function FormularioCliente({ cliente }: { cliente?: ClienteComEstado }) {
  const [estado, acao, pendente] = useActionState(guardarCliente, INICIAL);

  // Os valores devolvidos pelo servidor (quando há erro) têm prioridade sobre os do cliente.
  const v = (campo: string, omissao: string | number | null = "") =>
    estado.valores?.[campo] ?? (omissao === null ? "" : String(omissao));

  const [temAnuidade, setTemAnuidade] = useState(
    estado.valores?.tem_anuidade === "on" || cliente?.tem_anuidade === 1,
  );
  const [fase, setFase] = useState(estado.valores?.fase ?? cliente?.fase ?? "proposta");

  const erro = (campo: string) =>
    estado.erros?.[campo] ? (
      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{estado.erros[campo]}</p>
    ) : null;

  return (
    <form action={acao} className="space-y-6">
      {cliente && <input type="hidden" name="id" value={cliente.id} />}

      {estado.erroGeral && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {estado.erroGeral}
        </p>
      )}

      {/* ---- Identificação ---- */}
      <fieldset className="cartao space-y-4 p-5">
        <legend className="px-1 text-sm font-semibold">Identificação</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="rotulo" htmlFor="empresa">
              Nome da empresa *
            </label>
            <input
              id="empresa"
              name="empresa"
              required
              maxLength={200}
              className="campo"
              defaultValue={v("empresa", cliente?.empresa ?? "")}
            />
            {erro("empresa")}
          </div>

          <div>
            <label className="rotulo" htmlFor="nome_cliente">
              Nome do cliente *
            </label>
            <input
              id="nome_cliente"
              name="nome_cliente"
              required
              maxLength={200}
              className="campo"
              defaultValue={v("nome_cliente", cliente?.nome_cliente ?? "")}
            />
            {erro("nome_cliente")}
          </div>

          <div>
            <label className="rotulo" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="campo"
              defaultValue={v("email", cliente?.email)}
            />
            {erro("email")}
          </div>

          <div>
            <label className="rotulo" htmlFor="telefone">
              Telefone
            </label>
            <input
              id="telefone"
              name="telefone"
              type="tel"
              className="campo"
              defaultValue={v("telefone", cliente?.telefone)}
            />
            {erro("telefone")}
          </div>

          <div>
            <label className="rotulo" htmlFor="nif">
              NIF / Contribuinte
            </label>
            <input id="nif" name="nif" className="campo" defaultValue={v("nif", cliente?.nif)} />
            {erro("nif")}
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="cliente_ativo"
                defaultChecked={
                  estado.valores ? estado.valores.cliente_ativo === "on" : (cliente?.cliente_ativo ?? 1) === 1
                }
              />
              Ainda é cliente (ativo)
            </label>
          </div>
        </div>
      </fieldset>

      {/* ---- Projeto ---- */}
      <fieldset className="cartao space-y-4 p-5">
        <legend className="px-1 text-sm font-semibold">Projeto</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="rotulo" htmlFor="fase">
              Fase *
            </label>
            <select
              id="fase"
              name="fase"
              className="campo"
              value={fase}
              onChange={(e) => setFase(e.target.value)}
            >
              {FASES.map((f) => (
                <option key={f} value={f}>
                  {FASE_LABEL[f]}
                </option>
              ))}
            </select>
            {erro("fase")}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="rotulo" htmlFor="valor_projeto">
                Valor do projeto
              </label>
              <input
                id="valor_projeto"
                name="valor_projeto"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                className="campo"
                defaultValue={v("valor_projeto", cliente?.valor_projeto ?? "")}
              />
              {erro("valor_projeto")}
            </div>
            <div>
              <label className="rotulo" htmlFor="moeda">
                Moeda
              </label>
              <select
                id="moeda"
                name="moeda"
                className="campo"
                defaultValue={v("moeda", cliente?.moeda ?? "EUR")}
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="BRL">BRL</option>
              </select>
            </div>
          </div>

          <div>
            <label className="rotulo" htmlFor="data_inicio">
              Data de início
            </label>
            <input
              id="data_inicio"
              name="data_inicio"
              type="date"
              className="campo"
              defaultValue={v("data_inicio", cliente?.data_inicio)}
            />
            {erro("data_inicio")}
          </div>

          <div>
            <label className="rotulo" htmlFor="data_conclusao">
              Data de conclusão
            </label>
            <input
              id="data_conclusao"
              name="data_conclusao"
              type="date"
              className="campo"
              defaultValue={v("data_conclusao", cliente?.data_conclusao)}
            />
            {erro("data_conclusao")}
          </div>

          <div>
            <label className="rotulo" htmlFor="link_desenvolvimento">
              Link de desenvolvimento
            </label>
            <input
              id="link_desenvolvimento"
              name="link_desenvolvimento"
              type="url"
              placeholder="https://staging.exemplo.com"
              className="campo"
              defaultValue={v("link_desenvolvimento", cliente?.link_desenvolvimento)}
            />
            {erro("link_desenvolvimento")}
          </div>

          <div>
            <label className="rotulo" htmlFor="link_final">
              Link final {fase === "concluido" && <span className="text-[var(--color-marca)]">·  site em produção</span>}
            </label>
            <input
              id="link_final"
              name="link_final"
              type="url"
              placeholder="https://exemplo.com"
              className="campo"
              defaultValue={v("link_final", cliente?.link_final)}
            />
            {erro("link_final")}
          </div>
        </div>
      </fieldset>

      {/* ---- Anuidade e alertas ---- */}
      <fieldset className="cartao space-y-4 p-5">
        <legend className="px-1 text-sm font-semibold">Anuidade e alertas</legend>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="tem_anuidade"
            checked={temAnuidade}
            onChange={(e) => setTemAnuidade(e.target.checked)}
          />
          Este cliente tem anuidade (manutenção, alojamento, domínio…)
        </label>

        {temAnuidade && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="rotulo" htmlFor="valor_anuidade">
                Valor da anuidade
              </label>
              <input
                id="valor_anuidade"
                name="valor_anuidade"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                className="campo"
                defaultValue={v("valor_anuidade", cliente?.valor_anuidade)}
              />
              {erro("valor_anuidade")}
            </div>

            <div>
              <label className="rotulo" htmlFor="data_proximo_pagamento">
                Data do próximo pagamento
              </label>
              <input
                id="data_proximo_pagamento"
                name="data_proximo_pagamento"
                type="date"
                className="campo"
                defaultValue={v("data_proximo_pagamento", cliente?.data_proximo_pagamento)}
              />
              {erro("data_proximo_pagamento")}
            </div>

            <div>
              <label className="rotulo" htmlFor="alerta_dias_antes">
                Alerta quantos dias antes?
              </label>
              <input
                id="alerta_dias_antes"
                name="alerta_dias_antes"
                type="number"
                min="0"
                max="365"
                className="campo"
                defaultValue={v("alerta_dias_antes", cliente?.alerta_dias_antes ?? 30)}
              />
              {erro("alerta_dias_antes")}
            </div>

            <p className="text-xs text-[var(--color-suave)] sm:col-span-3">
              Vai receber um email quando faltarem esses dias para o pagamento e outro se a data
              passar sem estar registada. Depois de receber o pagamento, registe-o na ficha do
              cliente para a data avançar automaticamente.
            </p>
          </div>
        )}
      </fieldset>

      {/* ---- Notas ---- */}
      <fieldset className="cartao space-y-2 p-5">
        <legend className="px-1 text-sm font-semibold">Notas</legend>
        <textarea
          id="notas"
          name="notas"
          rows={4}
          className="campo resize-y"
          placeholder="Condições acordadas, acessos, histórico de conversas…"
          defaultValue={v("notas", cliente?.notas)}
        />
        {erro("notas")}
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-principal" disabled={pendente}>
          {pendente ? "A guardar…" : cliente ? "Guardar alterações" : "Criar cliente"}
        </button>
        <Link href={cliente ? `/clientes/${cliente.id}` : "/clientes"} className="btn btn-secundario">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
