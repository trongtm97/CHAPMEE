/**
 * Runs storage health + integrity checks (read-only, no deletes).
 *
 *   npm run storage:check-all
 *   npm run storage:check-all -- --verify-hash --probe-s3
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const extra = process.argv.slice(2);

function run(label: string, script: string, args: string[] = []) {
  console.log(`\n=== ${label} ===\n`);
  const result = spawnSync("npx", ["--yes", "tsx", script, ...args, ...extra], {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: process.env
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("storage:health", "scripts/storage-health.ts", ["--probe-s3"]);
run("chapter integrity", "scripts/check-chapter-content-integrity.ts", ["--limit=100"]);
run("import integrity", "scripts/check-import-storage-integrity.ts");
run("S3 orphan sample", "scripts/check-s3-orphan-chapter-keys.ts", ["--limit=150"]);

console.log("\n=== All storage checks completed ===\n");
