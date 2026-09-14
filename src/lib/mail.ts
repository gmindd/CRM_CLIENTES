import nodemailer, { type Transporter } from "nodemailer";
import { impressaoDigitalEmail, valorConfig } from "./config";

/**
 * O transporte é reconstruído sempre que a configuração muda (guardada na
 * página de Definições), por isso guardamos a "impressão digital" dos valores
 * com que foi criado.
 */
let _transporte: Transporter | null = null;
let _impressao = "";

export function emailConfigurado(): boolean {
  return Boolean(valorConfig("SMTP_HOST") && valorConfig("MAIL_FROM"));
}

export function destinatarioAlertas(): string {
  return valorConfig("ALERT_EMAIL_TO") || valorConfig("MAIL_FROM") || "";
}

function transporte(): Transporter {
  const impressao = impressaoDigitalEmail();
  if (_transporte && _impressao === impressao) return _transporte;

  const host = valorConfig("SMTP_HOST");
  if (!host) {
    throw new Error("Servidor de email por configurar — veja a página de Definições");
  }

  const port = Number(valorConfig("SMTP_PORT") || 587);
  const secureConfigurado = valorConfig("SMTP_SECURE");
  const utilizador = valorConfig("SMTP_USER");

  _transporte = nodemailer.createTransport({
    host,
    port,
    // porta 465 = TLS implícito; 587/25 = STARTTLS
    secure: secureConfigurado ? secureConfigurado === "true" : port === 465,
    auth: utilizador ? { user: utilizador, pass: valorConfig("SMTP_PASS") || "" } : undefined,
  });
  _impressao = impressao;

  return _transporte;
}

export interface Mensagem {
  para?: string;
  assunto: string;
  html: string;
  texto: string;
}

export async function enviarEmail(mensagem: Mensagem): Promise<void> {
  const para = mensagem.para || destinatarioAlertas();
  if (!para) {
    throw new Error("Sem destinatário: defina o email de destino na página de Definições");
  }

  await transporte().sendMail({
    from: valorConfig("MAIL_FROM"),
    to: para,
    subject: mensagem.assunto,
    text: mensagem.texto,
    html: mensagem.html,
  });
}

/** Testa a ligação ao servidor SMTP sem enviar nada. */
export async function testarLigacao(): Promise<void> {
  await transporte().verify();
}
