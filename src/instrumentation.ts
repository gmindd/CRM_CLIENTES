/**
 * Agendador interno: corre dentro do próprio processo do Next.js, por isso o
 * VPS não precisa de nenhum cron externo. Pode ser desligado com
 * ALERTAS_AUTO=false (por exemplo se preferir chamar /api/cron/alertas).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.ALERTAS_AUTO === "false") {
    console.log("[alertas] agendador interno desligado (ALERTAS_AUTO=false)");
    return;
  }

  const expressao = process.env.ALERTAS_CRON || "0 9 * * *"; // todos os dias às 09:00
  const fuso = process.env.TZ || "Europe/Lisbon";

  const cron = (await import("node-cron")).default;

  if (!cron.validate(expressao)) {
    console.error(`[alertas] expressão cron inválida: "${expressao}" — agendador não iniciado`);
    return;
  }

  cron.schedule(
    expressao,
    async () => {
      try {
        const { verificarAlertas } = await import("./lib/alertas");
        await verificarAlertas();
      } catch (erro) {
        console.error("[alertas] falha na verificação agendada:", erro);
      }
    },
    { timezone: fuso },
  );

  console.log(`[alertas] agendador ativo — "${expressao}" (${fuso})`);
}
