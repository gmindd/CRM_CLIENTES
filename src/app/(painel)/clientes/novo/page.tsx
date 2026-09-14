import FormularioCliente from "@/components/FormularioCliente";

export const dynamic = "force-dynamic";

export default function NovoCliente() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo cliente</h1>
        <p className="mt-1 text-sm text-[var(--color-suave)]">
          Os campos marcados com * são obrigatórios.
        </p>
      </div>
      <FormularioCliente />
    </div>
  );
}
