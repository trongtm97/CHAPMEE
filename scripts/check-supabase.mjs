/**
 * Quick connectivity check: node scripts/check-supabase.mjs
 * Loads .env.local via dotenv if present (manual: set vars in shell).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) {
    return;
  }
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const started = Date.now();
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 12_000);

try {
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: controller.signal
  });
  console.log(`OK ${response.status} in ${Date.now() - started}ms — ${url}`);
} catch (error) {
  console.error(`FAIL after ${Date.now() - started}ms —`, error instanceof Error ? error.message : error);
  console.error("Check VPN/firewall, project URL region, and that the project is not paused.");
  process.exit(1);
} finally {
  clearTimeout(timer);
}
