#!/usr/bin/env node
/**
 * @deprecated Use: npm run test:rbac:setup
 */
import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["--yes", "tsx", "scripts/rbac-setup-test-users.ts", ...process.argv.slice(2)],
  { stdio: "inherit", shell: process.platform === "win32" }
);
process.exit(result.status ?? 1);
