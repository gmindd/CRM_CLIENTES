/**
 * Logótipo da aplicação — a marca de pereiragabriel.com.
 *
 * O mesmo desenho está em `src/app/icon.svg` (favicon) e em
 * `src/app/apple-icon.png` (ecrã principal do telemóvel). Se mexer aqui,
 * mexa também nesses dois.
 *
 * A animação a cintilar vem da classe `logo-cintilar` (ver globals.css) e é
 * aplicada por fora, portanto continua a funcionar se trocar o desenho.
 */

const CREME = "#F1EBE1";
const DOURADO = "#C6A469";

function Marca({ tamanho = 28 }: { tamanho?: number }) {
  return (
    <svg
      viewBox="0 0 192 192"
      width={tamanho}
      height={tamanho}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="192" height="192" rx="44" fill="#0E0E0E" />
      <g fill={CREME}>
        <rect x="32" y="28" width="50" height="50" rx="9" />
        <rect x="88" y="28" width="50" height="50" rx="9" />
        <rect x="32" y="88" width="50" height="50" rx="9" />
        <rect x="144" y="88" width="24" height="24" rx="5" />
        <rect x="62" y="144" width="24" height="24" rx="5" />
      </g>
      <g fill={DOURADO}>
        <rect x="144" y="28" width="24" height="24" rx="5" />
        <rect x="144" y="58" width="24" height="24" rx="5" />
        <rect x="32" y="144" width="24" height="24" rx="5" />
      </g>
    </svg>
  );
}

export default function Logo({
  texto = "CRM",
  tamanho = 28,
}: {
  texto?: string;
  tamanho?: number;
}) {
  return (
    <span className="flex items-center gap-2 font-semibold">
      <span className="logo-cintilar" aria-hidden="true">
        <Marca tamanho={tamanho} />
      </span>
      {texto}
    </span>
  );
}
