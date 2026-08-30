import { decodeImportTextBytes } from "@/lib/encoding/decode-import-text";
import { sanitizeImportText } from "@/lib/encoding/sanitize-import-text";

/** Read a text/CSV import file with automatic Vietnamese encoding repair. */
export function readImportTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (!(result instanceof ArrayBuffer)) {
        reject(new Error("Không đọc được file."));
        return;
      }
      resolve(sanitizeImportText(decodeImportTextBytes(result)));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Không đọc được file."));
    };
    reader.readAsArrayBuffer(file);
  });
}
