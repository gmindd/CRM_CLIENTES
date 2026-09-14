/**
 * Logótipo da aplicação.
 *
 * ┌── PARA COLOCAR O LOGÓTIPO DE pereiragabriel.com ─────────────────────────┐
 * │ Substitua APENAS o conteúdo de <Marca /> pelo SVG do seu site.           │
 * │ A animação a cintilar é aplicada por fora (classe `logo-cintilar`),      │
 * │ por isso funciona com qualquer desenho que lá ponha.                     │
 * │                                                                          │
 * │ Se preferir um ficheiro de imagem, coloque-o em `public/logo.svg` e      │
 * │ troque <Marca /> por:                                                    │
 * │   <img src="/logo.svg" alt="" width={28} height={28} />                  │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

function Marca() {
  return (
    <svg viewBox="0 0 64 64" width="28" height="28" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="logo-fundo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#logo-fundo)" />
      <text
        x="32"
        y="43"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontSize="28"
        fontWeight="700"
        fill="#ffffff"
      >
        GP
      </text>
    </svg>
  );
}

export default function Logo({ texto = "CRM" }: { texto?: string }) {
  return (
    <span className="flex items-center gap-2 font-semibold">
      <span className="logo-cintilar" aria-hidden="true">
        <Marca />
      </span>
      {texto}
    </span>
  );
}
