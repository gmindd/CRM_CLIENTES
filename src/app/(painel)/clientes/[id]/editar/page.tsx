import Link from "next/link";
import { notFound } from "next/navigation";
import { obterCliente } from "@/lib/clientes";
import FormularioCliente from "@/components/FormularioCliente";

export const dynamic = "force-dynamic";

export default async function EditarCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = obterCliente(Number(id));
  if (!cliente) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={`/clientes/${cliente.id}`} className="text-sm text-[var(--color-suave)] hover:underline">
          ← {cliente.empresa}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Editar cliente</h1>
      </div>
      <FormularioCliente cliente={cliente} />
    </div>
  );
}
