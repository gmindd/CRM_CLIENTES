export const FASES = ["proposta", "desenvolvimento", "concluido", "cancelado"] as const;
export type Fase = (typeof FASES)[number];

export const FASE_LABEL: Record<Fase, string> = {
  proposta: "Proposta",
  desenvolvimento: "Em desenvolvimento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const TIPOS_PAGAMENTO = ["anuidade", "projeto", "outro"] as const;
export type TipoPagamento = (typeof TIPOS_PAGAMENTO)[number];

export interface Cliente {
  id: number;
  empresa: string;
  nome_cliente: string;
  email: string | null;
  telefone: string | null;
  nif: string | null;
  fase: Fase;
  cliente_ativo: number;
  valor_projeto: number;
  moeda: string;
  link_desenvolvimento: string | null;
  link_final: string | null;
  tem_anuidade: number;
  valor_anuidade: number | null;
  alerta_dias_antes: number;
  data_proximo_pagamento: string | null;
  data_inicio: string | null;
  data_conclusao: string | null;
  notas: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface Pagamento {
  id: number;
  cliente_id: number;
  tipo: TipoPagamento;
  valor: number;
  data: string;
  notas: string | null;
  criado_em: string;
}

export interface AlertaEnviado {
  id: number;
  cliente_id: number;
  data_pagamento: string;
  tipo: "aviso" | "vencido";
  dias_antes: number | null;
  destinatario: string | null;
  enviado_em: string;
}

/** Cliente + campos calculados usados nas listagens e no dashboard. */
export interface ClienteComEstado extends Cliente {
  dias_para_pagamento: number | null;
  estado_pagamento: "sem_anuidade" | "vencido" | "alerta" | "agendado";
}
