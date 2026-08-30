import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const nextBin = path.join(repoRoot, "node_modules", "next", "dist", "bin", "next");
const heapMb = Number.parseInt(process.env.NODE_MAX_OLD_SPACE_SIZE ?? "6144", 10);

if (!Number.isFinite(heapMb) || heapMb < 1024) {
  console.error(
    `[build] Invalid NODE_MAX_OLD_SPACE_SIZE="${process.env.NODE_MAX_OLD_SPACE_SIZE}". Use a value >= 1024.`
  );
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [`--max-old-space-size=${heapMb}`, nextBin, "build", "--webpack"],
  {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env
  }
);

if (result.error) {
  console.error("[build] Failed to start Next build:", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
