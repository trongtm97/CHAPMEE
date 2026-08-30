/**
 * Registers a no-op stub for `server-only` when running tsx scripts outside Next.js.
 */
import { createRequire, builtinModules } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const stubPath = join(dirname(fileURLToPath(import.meta.url)), "server-only-stub.cjs");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodeModule = require("module") as typeof import("node:module") & {
  _resolveFilename: (
    request: string,
    parent: NodeModule | null | undefined,
    isMain: boolean,
    options?: unknown
  ) => string;
};

const originalResolve = nodeModule._resolveFilename.bind(nodeModule);

nodeModule._resolveFilename = function (
  request: string,
  parent: NodeModule | null | undefined,
  isMain: boolean,
  options?: unknown
) {
  if (request === "server-only") {
    return stubPath;
  }
  return originalResolve(request, parent, isMain, options);
};

void builtinModules;
