import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <div className="cartao flex flex-col items-center gap-3 px-6 py-20 text-center">
      <p className="text-3xl font-semibold">404</p>
      <p className="text-sm text-[var(--color-suave)]">
        Esta página ou cliente não existe (ou foi apagado).
      </p>
      <Link href="/clientes" className="btn btn-principal">
        Voltar aos clientes
      </Link>
    </div>
  );
}
