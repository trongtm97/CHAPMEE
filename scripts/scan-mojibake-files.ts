#!/usr/bin/env npx tsx
/**
 * Scan seed/source files for mojibake (read-only).
 *
 *   npm run mojibake:scan:files
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  excerpt,
  isSuspiciousMojibake,
  previewMojibakeRepair
} from "@/lib/encoding/mojibake-repair";

const ROOT = process.cwd();

const SCAN_DIRS = [
  "scripts/seed",
  "supabase/seed",
  "lib/taxonomy/seed",
  "db/migrations",
  "drizzle"
];

const TEXT_EXT = new Set([
  ".sql",
  ".json",
  ".md",
  ".txt",
  ".csv",
  ".ts"
]);

const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "build", "coverage"]);

const SKIP_FILES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock"
]);

type FileHit = {
  file: string;
  confidence: string;
  score: number;
  excerpt: string;
  repairedExcerpt: string;
};

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
    } else if (TEXT_EXT.has(path.extname(entry.name).toLowerCase())) {
      if (SKIP_FILES.has(entry.name)) continue;
      files.push(full);
    }
  }
  return files;
}

async function main() {
  const json = process.argv.includes("--json");
  const allFiles: string[] = [];
  for (const dir of SCAN_DIRS) {
    await walk(path.join(ROOT, dir), allFiles);
  }

  const hits: FileHit[] = [];

  for (const file of allFiles) {
    let text: string;
    try {
      text = await readFile(file, "utf8");
    } catch {
      continue;
    }

    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const lines = text.split("\n");
    let reported = false;

    for (const line of lines) {
      if (!isSuspiciousMojibake(line)) continue;
      const preview = previewMojibakeRepair(line);
      if (preview.confidence === "none" || preview.original === preview.repaired) continue;
      if (preview.repaired.includes("\uFFFD") || preview.confidence === "low") continue;
      hits.push({
        file: rel,
        confidence: preview.confidence,
        score: preview.score,
        excerpt: excerpt(preview.original, 100),
        repairedExcerpt: excerpt(preview.repaired, 100)
      });
      reported = true;
      break;
    }

    if (!reported && text.length < 50_000 && isSuspiciousMojibake(text)) {
      const preview = previewMojibakeRepair(text);
      if (
        preview.confidence !== "none" &&
        preview.original !== preview.repaired &&
        !preview.repaired.includes("\uFFFD") &&
        preview.confidence !== "low"
      ) {
        hits.push({
          file: rel,
          confidence: preview.confidence,
          score: preview.score,
          excerpt: excerpt(text, 100),
          repairedExcerpt: excerpt(preview.repaired, 100)
        });
      }
    }
  }

  if (json) {
    console.log(JSON.stringify({ scanned: allFiles.length, hits }, null, 2));
  } else {
    console.log(`Scanned ${allFiles.length} seed/source files.`);
    console.log(`Suspicious files: ${hits.length}`);
    for (const h of hits) {
      console.log(`\n${h.file} [${h.confidence} ${h.score.toFixed(2)}]`);
      console.log(`  ${h.excerpt}`);
      if (h.repairedExcerpt !== h.excerpt) {
        console.log(`  → ${h.repairedExcerpt}`);
      }
    }
  }

  process.exit(hits.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
