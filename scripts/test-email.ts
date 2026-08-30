/**
 * Send a test email (enqueue + process).
 *
 *   npm run email:test
 *   EMAIL_MODE=smtp SMTP_HOST=127.0.0.1 SMTP_PORT=25 npm run email:test
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

async function main() {
  const to =
    process.env.EMAIL_TEST_TO?.trim() ||
    process.argv.find((a) => a.startsWith("--to="))?.split("=")[1]?.trim();

  if (!to) {
    console.error("Thiếu email nhận. Đặt EMAIL_TEST_TO hoặc --to=user@example.com");
    process.exit(1);
  }

  const { enqueueEmail, processPendingEmails } = await import("@/lib/email/email-service");
  const { getEmailConfig } = await import("@/lib/email/email-config");

  const config = getEmailConfig();
  console.info(`[email:test] mode=${config.mode} to=${to}`);

  const enqueued = await enqueueEmail({
    type: "system.notice",
    toEmail: to,
    variables: {
      title: "Email thử nghiệm ChapMee",
      message: "Đây là email kiểm tra hệ thống gửi mail giao dịch.",
      actionUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      actionLabel: "Mở ChapMee"
    }
  });

  if (!enqueued.ok) {
    console.error("[email:test] enqueue failed:", enqueued.error);
    process.exit(1);
  }

  console.info(`[email:test] jobId=${enqueued.jobId}`);

  const result = await processPendingEmails(5);
  console.info(
    `[email:test] processed=${result.processed} sent=${result.sent} failed=${result.failed}`
  );

  if (config.mode === "smtp" && result.sent === 0) {
    console.warn(
      "[email:test] SMTP không gửi được (ECONNREFUSED trên máy local là bình thường — Postfix chạy trên VPS)."
    );
  }
}

main().catch((error) => {
  console.error("[email:test] fatal:", error);
  process.exit(1);
});
