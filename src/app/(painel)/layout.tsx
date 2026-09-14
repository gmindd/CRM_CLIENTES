import { redirect } from "next/navigation";
import { temSessao } from "@/lib/auth";
import Navegacao from "@/components/Navegacao";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  // O middleware já protege as rotas; esta verificação é a segunda barreira.
  if (!(await temSessao())) redirect("/login");

  return (
    <div className="min-h-screen">
      <Navegacao />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
