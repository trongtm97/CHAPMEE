import { getTextS3Bucket } from "@/lib/storage/s3";

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function dateParts(date = new Date()) {
  return {
    year: String(date.getUTCFullYear()),
    month: pad2(date.getUTCMonth() + 1),
    day: pad2(date.getUTCDate())
  };
}

function sanitizeFilename(filename: string) {
  const base = filename.split(/[/\\]/).pop() ?? "import.txt";
  const cleaned = base.replace(/[^\w.\-()+ ]/g, "_").replace(/\s+/g, "_");
  return cleaned.slice(0, 180) || "import.txt";
}

export function buildRawImportObjectKey(input: {
  importJobId: string;
  originalFilename: string;
  at?: Date;
}) {
  const { year, month, day } = dateParts(input.at);
  const name = sanitizeFilename(input.originalFilename);
  return `imports/raw/${year}/${month}/${day}/${input.importJobId}/${name}`;
}

export function buildProcessedImportObjectKey(input: {
  importJobId: string;
  itemId: string;
  format: "txt" | "composer_json";
  at?: Date;
}) {
  const { year, month, day } = dateParts(input.at);
  const ext = input.format === "composer_json" ? "composer_json.gz" : "txt.gz";
  return `imports/processed/${year}/${month}/${day}/${input.importJobId}/${input.itemId}.${ext}`;
}

export function getImportRawBucket() {
  return getTextS3Bucket();
}
