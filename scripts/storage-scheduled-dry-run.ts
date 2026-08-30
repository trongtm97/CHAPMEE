/**
 * Cron-friendly: health + integrity checks + cleanup dry-runs (no deletes).
 *
 *   npm run storage:scheduled-dry-run
 *   # crontab: 0 3 * * * cd /app && npm run storage:scheduled-dry-run >> /var/log/chapmee-storage.log 2>&1
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function run(label: string, npmScript: string, extraArgs: string[] = []) {
  console.log(`\n=== ${label} ===\n`);
  const result = spawnSync(
    "npm",
    ["run", npmScript, "--", ...extraArgs],
    { cwd: root, stdio: "inherit", shell: true, env: process.env }
  );
  if (result.status !== 0) {
    console.warn(`[scheduled] ${label} exited ${result.status ?? 1}`);
  }
}

console.log(`[scheduled] ${new Date().toISOString()} storage dry-run started`);

run("health", "storage:health", ["--probe-s3"]);
run("chapters", "storage:check-chapters", ["--limit=200"]);
run("imports", "storage:check-imports");
run("s3 orphans sample", "storage:check-s3-orphans", ["--limit=150"]);
run("cleanup import temp", "storage:cleanup-import-temp");
run("cleanup orphan chapters", "storage:cleanup-orphan-chapters");

console.log(`\n[scheduled] ${new Date().toISOString()} finished (dry-run only)\n`);
