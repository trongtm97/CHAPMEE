/**
 * Self-test for CSV import text decoding.
 * Run: node scripts/decode-import-text-self-test.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { decodeImportTextBytes } = await import(
  pathToFileURL(join(root, "lib/encoding/decode-import-text.ts")).href
);

function encodeUtf8(text) {
  return new TextEncoder().encode(text);
}

function encodeWin1258Approx(text) {
  // Node may not have windows-1258; use latin1 for ANSI-style exports in CI.
  return Buffer.from(text, "latin1");
}

const cases = [
  {
    name: "utf8 bom vietnamese",
    bytes: Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), encodeUtf8("Tên truyện mẫu")]),
    expect: "Tên truyện mẫu"
  },
  {
    name: "utf8 no bom",
    bytes: encodeUtf8("Ngôn tình, Ngọt sủng"),
    expect: "Ngôn tình, Ngọt sủng"
  },
  {
    name: "utf16le bom",
    bytes: Buffer.concat([
      Buffer.from([0xff, 0xfe]),
      Buffer.from("Tiêu đề chương", "utf16le")
    ]),
    expect: "Tiêu đề chương"
  }
];

let failed = 0;

for (const testCase of cases) {
  const actual = decodeImportTextBytes(new Uint8Array(testCase.bytes));
  if (actual !== testCase.expect) {
    console.error(
      `FAIL [${testCase.name}]: got ${JSON.stringify(actual)}, expected ${JSON.stringify(testCase.expect)}`
    );
    failed += 1;
  } else {
    console.log(`OK [${testCase.name}]`);
  }
}

if (failed > 0) {
  process.exit(1);
}

console.log(`All ${cases.length} decode checks passed.`);
