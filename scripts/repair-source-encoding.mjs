#!/usr/bin/env node
/**
 * Repairs source files with lone Latin-1 bytes (invalid UTF-8).
 * Converts Windows-1252-ish bytes to proper UTF-8 while preserving valid UTF-8 sequences.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = ["lib", "app", "components", "scripts"];
const EXT = /\.(ts|tsx|js|jsx|mjs)$/;

const WIN1252_EXTRA = {
  0x80: "\u20AC",
  0x82: "\u201A",
  0x83: "\u0192",
  0x84: "\u201E",
  0x85: "\u2026",
  0x86: "\u2020",
  0x87: "\u2021",
  0x88: "\u02C6",
  0x89: "\u2030",
  0x8a: "\u0160",
  0x8b: "\u2039",
  0x8c: "\u0152",
  0x8e: "\u017D",
  0x91: "\u2018",
  0x92: "\u2019",
  0x93: "\u201C",
  0x94: "\u201D",
  0x95: "\u2022",
  0x96: "\u2013",
  0x97: "\u2014",
  0x98: "\u02DC",
  0x99: "\u2122",
  0x9a: "\u0161",
  0x9b: "\u203A",
  0x9c: "\u0153",
  0x9e: "\u017E",
  0x9f: "\u0178"
};

function latin1ByteToChar(byte) {
  return WIN1252_EXTRA[byte] ?? String.fromCharCode(byte);
}

function decodeUtf8OrRepair(buffer) {
  const out = [];
  let i = 0;

  while (i < buffer.length) {
    const b = buffer[i];

    if (b <= 0x7f) {
      out.push(String.fromCharCode(b));
      i += 1;
      continue;
    }

    let len = 0;
    if ((b & 0xe0) === 0xc0) len = 2;
    else if ((b & 0xf0) === 0xe0) len = 3;
    else if ((b & 0xf8) === 0xf0) len = 4;

    if (
      len > 0 &&
      i + len <= buffer.length &&
      buffer
        .slice(i + 1, i + len)
        .every((continuation) => (continuation & 0xc0) === 0x80)
    ) {
      try {
        out.push(new TextDecoder("utf-8", { fatal: true }).decode(buffer.slice(i, i + len)));
        i += len;
        continue;
      } catch {
        // fall through to repair single byte
      }
    }

    out.push(latin1ByteToChar(b));
    i += 1;
  }

  return out.join("");
}

function isValidUtf8(buffer) {
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      await walk(full, files);
    } else if (EXT.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  const checkOnly = process.argv.includes("--check");
  const files = [];

  for (const dir of TARGET_DIRS) {
    const abs = path.join(ROOT, dir);
    try {
      await walk(abs, files);
    } catch {
      // ignore missing dirs
    }
  }

  const repaired = [];

  for (const file of files) {
    const buffer = await readFile(file);
    if (isValidUtf8(buffer)) continue;

    if (checkOnly) {
      repaired.push(path.relative(ROOT, file));
      continue;
    }

    const fixed = decodeUtf8OrRepair(buffer);
    await writeFile(file, fixed, "utf8");
    repaired.push(path.relative(ROOT, file));
  }

  if (!repaired.length) {
    console.log("No invalid UTF-8 source files found.");
    return;
  }

  console.log(
    checkOnly
      ? `Invalid UTF-8 (${repaired.length}):\n${repaired.join("\n")}`
      : `Repaired ${repaired.length} file(s):\n${repaired.join("\n")}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
