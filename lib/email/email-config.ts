import "server-only";

export type EmailMode = "console" | "smtp";

export type EmailConfig = {
  mode: EmailMode;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    tlsRejectUnauthorized: boolean;
    user: string | undefined;
    pass: string | undefined;
  };
  mailFrom: string;
  mailReplyTo: string | undefined;
  maxRetries: number;
};

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1";
}

export function getEmailConfig(): EmailConfig {
  const mode: EmailMode = process.env.EMAIL_MODE === "smtp" ? "smtp" : "console";
  const port = Number.parseInt(process.env.SMTP_PORT ?? "25", 10);

  return {
    mode,
    smtp: {
      host: process.env.SMTP_HOST?.trim() || "127.0.0.1",
      port: Number.isFinite(port) ? port : 25,
      secure: parseBoolean(process.env.SMTP_SECURE, false),
      tlsRejectUnauthorized: parseBoolean(
        process.env.SMTP_TLS_REJECT_UNAUTHORIZED,
        true
      ),
      user: process.env.SMTP_USER?.trim() || undefined,
      pass: process.env.SMTP_PASS?.trim() || undefined
    },
    mailFrom: process.env.MAIL_FROM?.trim() || "",
    mailReplyTo: process.env.MAIL_REPLY_TO?.trim() || undefined,
    maxRetries: Math.max(
      1,
      Number.parseInt(process.env.EMAIL_MAX_RETRIES ?? "3", 10) || 3
    )
  };
}
