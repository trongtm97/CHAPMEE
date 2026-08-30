import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Load key=value env file without overwriting existing process.env entries. */
export function loadEnvFile(filename: string, cwd = process.cwd()) {
  const path = resolve(cwd, filename);
  if (!existsSync(path)) return false;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
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
  return true;
}

/** Prefer explicit --file, then .env.production, then .env.local. */
export function loadEnvForScripts(explicitFile?: string) {
  if (explicitFile) {
    loadEnvFile(explicitFile);
    return;
  }
  loadEnvFile(".env.production");
  loadEnvFile(".env.local");
}
