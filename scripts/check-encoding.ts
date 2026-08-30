#!/usr/bin/env npx tsx
/**
 * Scan source/text files for encoding issues (mojibake, replacement char, ?-loss).
 *
 *   npm run encoding:check
 *   npm run encoding:check -- --strict
 *   npm run encoding:check -- --json
 *   npm run encoding:check -- --paths lib,app/components
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { scanTextForEncodingIssues } from "../lib/encoding/detect-encoding-issues";

const ROOT = process.cwd();

const DEFAULT_DIRS = ["lib", "app", "components", "scripts", "types"];

const TEXT_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".mdx",
  ".sql",
  ".csv",
  ".txt",
  ".yml",
  ".yaml"
]);

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".git",
  "public",
  "db"
]);

const SKIP_REL_PATHS = new Set([
  "lib/encoding/patterns.ts",
  "lib/encoding/detect-encoding-issues.ts",
  "docs/ENCODING_AUDIT_REPORT.md",
  "docs/ENCODING_STANDARD.md"
]);

const SKIP_FILES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "ENCODING_AUDIT_REPORT.md"
]);

type FileReport = {
  file: string;
  hits: ReturnType<typeof scanTextForEncodingIssues>["hits"];
};

function parseArgs() {
  const argv = process.argv.slice(2);
  const strict = argv.includes("--strict");
  const json = argv.includes("--json");
  const pathsIdx = argv.indexOf("--paths");
  const paths =
    pathsIdx >= 0
      ? argv
          .slice(pathsIdx + 1)
          .filter((a) => !a.startsWith("--"))
          .map((p) => p.replace(/,/g, path.sep))
      : DEFAULT_DIRS;
  return { strict, json, paths };
}

async function walk(dir: string, files: string[] = []): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(full, files);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!TEXT_EXT.has(ext)) continue;
      if (SKIP_FILES.has(entry.name)) continue;
      files.push(full);
    }
  }
  return files;
}

async function readUtf8(file: string): Promise<{ text: string; readError: string | null }> {
  const buffer = await readFile(file);
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return { text, readError: null };
  } catch (error) {
    return {
      text: buffer.toString("utf8"),
      readError: error instanceof Error ? error.message : "invalid UTF-8"
    };
  }
}

async function main() {
  const { strict, json, paths } = parseArgs();
  const targets = paths.map((p) => path.resolve(ROOT, p));
  const allFiles: string[] = [];
  for (const target of targets) {
    await walk(target, allFiles);
  }

  const suspicious: FileReport[] = [];
  let readErrors = 0;

  for (const file of allFiles) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    if (SKIP_REL_PATHS.has(rel)) continue;

    const { text, readError } = await readUtf8(file);
    if (readError) {
      readErrors += 1;
      suspicious.push({
        file: path.relative(ROOT, file),
        hits: [{ kind: "replacement_char", pattern: "invalid_utf8_bytes", count: 1 }]
      });
      continue;
    }
    const scan = scanTextForEncodingIssues(text);
    if (scan.hasIssues) {
      suspicious.push({ file: rel, hits: scan.hits });
    }
  }

  const summary = {
    scanned: allFiles.length,
    suspicious: suspicious.length,
    readErrors,
    strict,
    files: suspicious
  };

  if (json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`Scanned ${summary.scanned} text files.`);
    if (readErrors > 0) {
      console.log(`Invalid UTF-8 byte sequences: ${readErrors} file(s).`);
    }
    if (suspicious.length === 0) {
      console.log("No suspicious encoding patterns found.");
    } else {
      console.log(`Suspicious files (${suspicious.length}):`);
      for (const row of suspicious) {
        const detail = row.hits
          .map((h) => `${h.kind}:${h.pattern}×${h.count}`)
          .join(", ");
        console.log(`  ${row.file}  (${detail})`);
      }
    }
  }

  const hasMojibake = suspicious.some((f) =>
    f.hits.some((h) => h.kind === "mojibake" || h.pattern === "invalid_utf8_bytes")
  );
  const hasQmLoss = suspicious.some((f) =>
    f.hits.some((h) => h.kind === "question_mark_loss")
  );

  if (strict) {
    process.exit(suspicious.length > 0 ? 1 : 0);
  }
  // Default: fail only on mojibake / invalid UTF-8 (known hard corruption).
  process.exit(hasMojibake ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
