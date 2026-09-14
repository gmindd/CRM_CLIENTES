"use client";

/** Botão de submit que pede confirmação antes de enviar o formulário. */
export default function BotaoApagar({
  children,
  confirmacao,
  className = "btn btn-perigo",
}: {
  children: React.ReactNode;
  confirmacao: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(evento) => {
        if (!window.confirm(confirmacao)) evento.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
