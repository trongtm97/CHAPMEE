import { strToU8, zipSync } from "fflate";

export function buildZipFromTextFiles(
  files: Array<{ name: string; content: string }>
): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const file of files) {
    entries[file.name] = strToU8(file.content);
  }
  return zipSync(entries);
}

export function zipToBase64(zip: Uint8Array): string {
  return Buffer.from(zip).toString("base64");
}
