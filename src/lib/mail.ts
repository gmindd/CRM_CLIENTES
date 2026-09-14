import nodemailer, { type Transporter } from "nodemailer";

let _transporte: Transporter | null = null;

export function emailConfigurado(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);
}

export function destinatarioAlertas(): string {
  return process.env.ALERT_EMAIL_TO || process.env.MAIL_FROM || "";
}

function transporte(): Transporter {
  if (_transporte) return _transporte;

  const host = process.env.SMTP_HOST;
  if (!host) throw new Error("SMTP_HOST não definido — configure o envio de email no .env");

  const port = Number(process.env.SMTP_PORT || 587);
  _transporte = nodemailer.createTransport({
    host,
    port,
    // porta 465 = TLS implícito; 587/25 = STARTTLS
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || "" }
      : undefined,
  });

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
  if (!para) throw new Error("Sem destinatário: defina ALERT_EMAIL_TO no .env");

  await transporte().sendMail({
    from: process.env.MAIL_FROM,
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
