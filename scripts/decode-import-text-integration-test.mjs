/**
 * Integration test: decode + parseCsv with Vietnamese encodings.
 * Run: npx tsx scripts/decode-import-text-integration-test.mjs
 */

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { decodeImportTextBytes } = await import(
  pathToFileURL(join(root, "lib/encoding/decode-import-text.ts")).href
);
const { parseCsv } = await import(
  pathToFileURL(join(root, "lib/studio/csv.ts")).href
);

const utf8Sample =
  "title;description;main_genre_slug\nTên truyện mẫu;Ngôn tình ngọt sủng;ngon-tinh";

const utf8Bom = new Uint8Array([
  0xef,
  0xbb,
  0xbf,
  ...new TextEncoder().encode(utf8Sample)
]);
const decodedUtf8 = decodeImportTextBytes(utf8Bom);
const parsedUtf8 = parseCsv(decodedUtf8);

// Windows-1258: "Tên" = 0x54 0xEA 0x6E (ê = 0xEA)
const win1258Sample = new Uint8Array([
  ...[0x74, 0x69, 0x74, 0x6c, 0x65, 0x3b, 0x64, 0x65, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x69, 0x6f, 0x6e, 0x0a],
  0x54,
  0xea,
  0x6e
]);
const decoded1258 = decodeImportTextBytes(win1258Sample);

function createMojibakeFileBytes(original) {
  const utf8 = new TextEncoder().encode(original);
  let mojibake = "";
  for (const byte of utf8) {
    mojibake += String.fromCharCode(byte);
  }
  return new TextEncoder().encode(mojibake);
}

const mojibakeBytes = createMojibakeFileBytes("Tên truyện Ngôn tình");
const fixedMojibake = decodeImportTextBytes(mojibakeBytes);

let failed = 0;

if (!decodedUtf8.includes("Tên truyện mẫu")) {
  console.error("FAIL utf8 decode");
  failed++;
} else {
  console.log("OK utf8 decode");
}

if (parsedUtf8.rows[0]?.[0] !== "Tên truyện mẫu") {
  console.error("FAIL parseCsv utf8", parsedUtf8.rows[0]);
  failed++;
} else {
  console.log("OK parseCsv utf8");
}

if (!decoded1258.includes("Tên")) {
  console.error("FAIL win1258 decode", decoded1258);
  failed++;
} else {
  console.log("OK win1258 decode");
}

if (!fixedMojibake.includes("Tên") && !fixedMojibake.includes("truyện")) {
  console.error("FAIL mojibake", fixedMojibake);
  failed++;
} else {
  console.log("OK mojibake repair:", fixedMojibake);
}

if (failed) process.exit(1);
console.log("All integration checks passed.");
