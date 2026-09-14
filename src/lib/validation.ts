import { z } from "zod";
import { FASES, TIPOS_PAGAMENTO } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Campo de texto opcional: "" do formulário passa a null. */
const textoOpcional = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

const emailOpcional = textoOpcional.refine((v) => v === null || EMAIL_RE.test(v), {
  message: "Email inválido",
});

const dataOpcional = textoOpcional.refine((v) => v === null || DATA_RE.test(v), {
  message: "Data inválida (formato AAAA-MM-DD)",
});

const urlOpcional = textoOpcional.refine(
  (v) => v === null || /^https?:\/\/.+/i.test(v),
  { message: "O link deve começar por http:// ou https://" },
);

/**
 * Aceita valores escritos à portuguesa ("1.250,75") ou à inglesa ("1250.75").
 * Devolve NaN se o texto não for um número — o refine seguinte trata do erro.
 */
export function lerNumero(valor: unknown): number {
  if (typeof valor === "number") return valor;
  const texto = String(valor ?? "").trim().replace(/[\s\u00a0€$£]/g, "");
  if (!texto) return NaN;

  const temVirgula = texto.includes(",");
  const temPonto = texto.includes(".");
  let normalizado = texto;

  if (temVirgula && temPonto) {
    // O último separador a aparecer é o decimal.
    normalizado =
      texto.lastIndexOf(",") > texto.lastIndexOf(".")
        ? texto.replace(/\./g, "").replace(",", ".")
        : texto.replace(/,/g, "");
  } else if (temVirgula) {
    normalizado = texto.replace(",", ".");
  }

  return Number(normalizado);
}

const numeroOpcional = z
  .union([z.number(), z.string()])
  .optional()
  .nullable()
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = lerNumero(v);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
  })
  .refine((v) => v === null || Number.isFinite(v), { message: "Valor inválido (ex.: 1250,75)" })
  .refine((v) => v === null || v >= 0, { message: "O valor não pode ser negativo" });

const booleano = z
  .union([z.boolean(), z.string(), z.number()])
  .optional()
  .transform((v) => (v === true || v === "true" || v === "on" || v === 1 || v === "1" ? 1 : 0));

export const clienteSchema = z
  .object({
    empresa: z.string().trim().min(1, "O nome da empresa é obrigatório").max(200),
    nome_cliente: z.string().trim().min(1, "O nome do cliente é obrigatório").max(200),
    email: emailOpcional,
    telefone: textoOpcional,
    nif: textoOpcional,
    fase: z.enum(FASES),
    cliente_ativo: booleano,
    valor_projeto: numeroOpcional.transform((v) => v ?? 0),
    moeda: z
      .string()
      .trim()
      .length(3)
      .optional()
      .transform((v) => (v ? v.toUpperCase() : "EUR")),
    link_desenvolvimento: urlOpcional,
    link_final: urlOpcional,
    tem_anuidade: booleano,
    valor_anuidade: numeroOpcional,
    alerta_dias_antes: z
      .union([z.number(), z.string()])
      .optional()
      .transform((v) => {
        const n = Number(v);
        return Number.isFinite(n) && n >= 0 && n <= 365 ? Math.trunc(n) : 30;
      }),
    data_proximo_pagamento: dataOpcional,
    data_inicio: dataOpcional,
    data_conclusao: dataOpcional,
    notas: textoOpcional,
  })
  .superRefine((dados, ctx) => {
    if (dados.tem_anuidade === 1 && !dados.data_proximo_pagamento) {
      ctx.addIssue({
        code: "custom",
        path: ["data_proximo_pagamento"],
        message: "Indique a data do próximo pagamento para poder receber alertas",
      });
    }
    if (dados.tem_anuidade === 1 && (dados.valor_anuidade ?? 0) <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["valor_anuidade"],
        message: "Indique o valor da anuidade",
      });
    }
  });

export type ClienteInput = z.infer<typeof clienteSchema>;

export const pagamentoSchema = z.object({
  tipo: z.enum(TIPOS_PAGAMENTO).default("anuidade"),
  valor: numeroOpcional.transform((v) => v ?? 0),
  data: z.string().regex(DATA_RE, "Data inválida"),
  notas: textoOpcional,
  /** Se verdadeiro, avança a data do próximo pagamento em `meses_renovacao`. */
  renovar: z.union([z.boolean(), z.string()]).optional().transform((v) => v === true || v === "true" || v === "on"),
  meses_renovacao: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 && n <= 120 ? Math.trunc(n) : 12;
    }),
});

export type PagamentoInput = z.infer<typeof pagamentoSchema>;

/** Converte erros do zod num objeto { campo: mensagem } para mostrar no formulário. */
export function errosPorCampo(erro: z.ZodError): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const issue of erro.issues) {
    const campo = issue.path.join(".") || "_";
    if (!saida[campo]) saida[campo] = issue.message;
  }
  return saida;
}

// ---------------------------------------------------------------------------
// Definições de email editáveis na aplicação
// ---------------------------------------------------------------------------

/** Aceita "pessoa@exemplo.com" ou "Nome <pessoa@exemplo.com>". */
const remetente = textoOpcional.refine(
  (v) => {
    if (v === null) return true;
    const dentroDosSinais = v.match(/<([^>]+)>\s*$/);
    return EMAIL_RE.test(dentroDosSinais ? dentroDosSinais[1].trim() : v);
  },
  { message: 'Use "nome@dominio.com" ou "Nome <nome@dominio.com>"' },
);

export const definicoesEmailSchema = z.object({
  SMTP_HOST: textoOpcional.refine((v) => v === null || /^[a-z0-9.-]+$/i.test(v), {
    message: "Endereço inválido (ex.: smtp.dominio.com)",
  }),
  SMTP_PORT: textoOpcional.refine(
    (v) => v === null || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 65535),
    { message: "Porta inválida (normalmente 587 ou 465)" },
  ),
  SMTP_SECURE: z
    .enum(["auto", "true", "false"])
    .optional()
    .transform((v) => (v === "auto" || v === undefined ? null : v)),
  SMTP_USER: textoOpcional,
  MAIL_FROM: remetente,
  ALERT_EMAIL_TO: emailOpcional,
  APP_URL: urlOpcional,
});

export type DefinicoesEmailInput = z.infer<typeof definicoesEmailSchema>;
