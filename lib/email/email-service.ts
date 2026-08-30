import "server-only";

import { and, eq, lte } from "drizzle-orm";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { emailJobs } from "@/lib/db/schema/email";
import { getEmailConfig } from "@/lib/email/email-config";
import { renderEmailTemplate } from "@/lib/email/email-templates";

export { renderEmailTemplate };
import type {
  EmailJobStatus,
  EmailType,
  EnqueueEmailInput,
  SendEmailNowInput
} from "@/lib/email/email-types";

const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailAddress(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.length > 3 && trimmed.length <= 320 && EMAIL_RE.test(trimmed);
}

function maskSensitiveUrl(url: string): string {
  if (process.env.NODE_ENV === "production") {
    try {
      const parsed = new URL(url);
      const token = parsed.searchParams.get("token");
      if (token && token.length > 8) {
        parsed.searchParams.set("token", `${token.slice(0, 4)}…`);
        return parsed.toString();
      }
    } catch {
      return "[url]";
    }
  }
  return url;
}

function logConsoleEmail(input: {
  type?: string;
  to: string;
  subject: string;
  text: string;
}) {
  const preview = input.text
    .split("\n")
    .map((line) =>
      line.includes("http") ? line.replace(/https?:\/\/\S+/g, (m) => maskSensitiveUrl(m)) : line
    )
    .join("\n");

  console.info(
    [
      "",
      "──────── ChapMee email (console mode) ────────",
      `type: ${input.type ?? "direct"}`,
      `to: ${input.to}`,
      `subject: ${input.subject}`,
      preview,
      "────────────────────────────────────────────",
      ""
    ].join("\n")
  );
}

async function deliverSmtp(input: SendEmailNowInput) {
  const config = getEmailConfig();
  if (!config.mailFrom) {
    return { ok: false as const, error: "MAIL_FROM chưa được cấu hình." };
  }

  const transport = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    tls: {
      rejectUnauthorized: config.smtp.tlsRejectUnauthorized
    },
    ...(config.smtp.user && config.smtp.pass
      ? { auth: { user: config.smtp.user, pass: config.smtp.pass } }
      : {})
  });

  const result = await transport.sendMail({
    from: config.mailFrom,
    to: input.toEmail,
    replyTo: config.mailReplyTo,
    subject: input.subject,
    text: input.text,
    html: input.html
  });

  return {
    ok: true as const,
    provider: "smtp" as const,
    messageId: result.messageId ?? null
  };
}

export async function sendEmailNow(
  input: SendEmailNowInput & { type?: EmailType }
): Promise<{ ok: boolean; error?: string; provider?: string; messageId?: string | null }> {
  if (!isValidEmailAddress(input.toEmail)) {
    return { ok: false, error: "Email người nhận không hợp lệ." };
  }

  const config = getEmailConfig();

  if (config.mode === "console") {
    logConsoleEmail({
      type: input.type,
      to: input.toEmail,
      subject: input.subject,
      text: input.text
    });
    return { ok: true, provider: "console", messageId: null };
  }

  try {
    const sent = await deliverSmtp(input);
    if (!sent.ok) {
      return sent;
    }
    return {
      ok: true,
      provider: sent.provider,
      messageId: sent.messageId
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không gửi được email SMTP."
    };
  }
}

export async function enqueueEmail<T extends EmailType>(
  input: EnqueueEmailInput<T>
): Promise<{ ok: boolean; jobId?: string; error?: string }> {
  if (!isValidEmailAddress(input.toEmail)) {
    return { ok: false, error: "Email người nhận không hợp lệ." };
  }

  const config = getEmailConfig();
  const rendered = renderEmailTemplate(input.type, input.variables);
  const now = new Date();

  const [row] = await db
    .insert(emailJobs)
    .values({
      type: input.type,
      toEmail: input.toEmail.trim().toLowerCase(),
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      status: "pending",
      maxRetries: input.maxRetries ?? config.maxRetries,
      scheduledAt: input.scheduledAt ?? now,
      createdAt: now,
      updatedAt: now
    })
    .returning({ id: emailJobs.id });

  return { ok: true, jobId: row?.id };
}

async function markJob(
  jobId: string,
  patch: {
    status?: EmailJobStatus;
    provider?: string | null;
    providerMessageId?: string | null;
    errorMessage?: string | null;
    retryCount?: number;
    sentAt?: Date | null;
    scheduledAt?: Date;
  }
) {
  await db
    .update(emailJobs)
    .set({
      ...patch,
      updatedAt: new Date()
    })
    .where(eq(emailJobs.id, jobId));
}

export async function processPendingEmails(limit = 20): Promise<{
  processed: number;
  sent: number;
  failed: number;
  retried: number;
}> {
  const now = new Date();
  const config = getEmailConfig();

  const pending = await db
    .select()
    .from(emailJobs)
    .where(
      and(
        eq(emailJobs.status, "pending"),
        lte(emailJobs.scheduledAt, now)
      )
    )
    .orderBy(emailJobs.scheduledAt)
    .limit(limit);

  let sent = 0;
  let failed = 0;
  let retried = 0;

  for (const job of pending) {
    await markJob(job.id, { status: "sending", errorMessage: null });

    const result = await sendEmailNow({
      type: job.type as EmailType,
      toEmail: job.toEmail,
      subject: job.subject,
      html: job.html,
      text: job.text
    });

    if (result.ok) {
      sent += 1;
      await markJob(job.id, {
        status: "sent",
        provider: result.provider ?? config.mode,
        providerMessageId: result.messageId ?? null,
        errorMessage: null,
        sentAt: new Date()
      });
      continue;
    }

    const nextRetry = job.retryCount + 1;
    const errorMessage = result.error ?? "Gửi email thất bại.";

    if (nextRetry < job.maxRetries) {
      retried += 1;
      const backoffMs = Math.min(60_000 * nextRetry, 300_000);
      await markJob(job.id, {
        status: "pending",
        retryCount: nextRetry,
        errorMessage,
        scheduledAt: new Date(Date.now() + backoffMs)
      });
    } else {
      failed += 1;
      await markJob(job.id, {
        status: "failed",
        retryCount: nextRetry,
        errorMessage
      });
    }
  }

  return { processed: pending.length, sent, failed, retried };
}
