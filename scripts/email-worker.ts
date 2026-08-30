/**
 * Process pending email_jobs (SMTP or console per EMAIL_MODE).
 *
 *   npm run email:worker
 *   npm run email:worker -- --limit=50
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
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number.parseInt(limitArg.split("=")[1] ?? "20", 10) : 20;

  const { processPendingEmails } = await import("@/lib/email/email-service");
  const { getEmailConfig } = await import("@/lib/email/email-config");

  const config = getEmailConfig();
  console.info(`[email-worker] mode=${config.mode} limit=${limit}`);

  const result = await processPendingEmails(Number.isFinite(limit) ? limit : 20);
  console.info(
    `[email-worker] processed=${result.processed} sent=${result.sent} retried=${result.retried} failed=${result.failed}`
  );

  if (result.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[email-worker] fatal:", error);
  process.exit(1);
});
