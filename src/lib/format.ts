/** Utilitários de formatação (pt-PT) partilhados entre servidor e browser. */

export function formatMoeda(valor: number | null | undefined, moeda = "EUR"): string {
  if (valor === null || valor === undefined) return "—";
  try {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: moeda || "EUR",
      maximumFractionDigits: 2,
    }).format(valor);
  } catch {
    return `${valor.toFixed(2)} ${moeda}`;
  }
}

export function formatData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}

/** Data de hoje em YYYY-MM-DD, no fuso definido em TZ (ex.: Europe/Lisbon). */
export function hojeISO(timeZone?: string): string {
  // `process` não existe no browser: o fuso do servidor só é lido no servidor.
  const fuso =
    timeZone ?? (typeof process !== "undefined" ? process.env.TZ : undefined) ?? "Europe/Lisbon";
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: fuso }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** Diferença em dias entre hoje e uma data ISO (negativo = já passou). */
export function diasAte(iso: string | null | undefined, hoje = hojeISO()): number | null {
  if (!iso) return null;
  const alvo = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  const base = Date.parse(`${hoje}T00:00:00Z`);
  if (Number.isNaN(alvo) || Number.isNaN(base)) return null;
  return Math.round((alvo - base) / 86_400_000);
}

/** Soma meses a uma data ISO mantendo-a válida (ex.: 31/01 + 1 mês => 28/02). */
export function adicionarMeses(iso: string, meses: number): string {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  const data = new Date(Date.UTC(a, m - 1 + meses, 1));
  const ultimoDia = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + 1, 0)).getUTCDate();
  data.setUTCDate(Math.min(d, ultimoDia));
  return data.toISOString().slice(0, 10);
}

export function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}
