import { redirect } from "next/navigation";
import { temSessao } from "@/lib/auth";
import FormularioLogin from "@/components/FormularioLogin";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ destino?: string }>;
}) {
  if (await temSessao()) redirect("/");
  const { destino } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Logo texto="" tamanho={56} />
          </div>
          <h1 className="text-xl font-semibold">CRM · Clientes</h1>
          <p className="mt-1 text-sm text-[var(--color-suave)]">Área privada. Introduza a password.</p>
        </div>
        <FormularioLogin destino={destino} />
      </div>
    </main>
  );
}
