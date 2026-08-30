import { gzipContent, computeContentHash } from "@/lib/content/chapter-content-utils";
import {
  buildProcessedImportObjectKey,
  buildRawImportObjectKey,
  getImportRawBucket
} from "@/lib/import/pipeline/import-object-keys";
import { getObjectBytes, putObjectBytes } from "@/lib/storage/s3";

export async function uploadRawImportFile(input: {
  importJobId: string;
  originalFilename: string;
  bytes: Buffer;
  contentType?: string;
}) {
  const bucket = getImportRawBucket();
  const objectKey = buildRawImportObjectKey({
    importJobId: input.importJobId,
    originalFilename: input.originalFilename
  });

  await putObjectBytes({
    objectKey,
    body: input.bytes,
    contentType: input.contentType ?? guessContentType(input.originalFilename)
  });

  return { bucket, objectKey, sizeBytes: input.bytes.byteLength };
}

export async function downloadRawImportFile(objectKey: string) {
  const bytes = await getObjectBytes({ objectKey });
  return Buffer.from(bytes);
}

export async function uploadProcessedChapterText(input: {
  importJobId: string;
  itemId: string;
  text: string;
}) {
  const objectKey = buildProcessedImportObjectKey({
    importJobId: input.importJobId,
    itemId: input.itemId,
    format: "txt"
  });
  const gz = gzipContent(input.text);
  await putObjectBytes({
    objectKey,
    body: gz,
    contentType: "application/gzip"
  });
  return {
    objectKey,
    contentHash: computeContentHash(gz),
    sizeBytes: gz.byteLength,
    encoding: "gzip" as const
  };
}

export async function downloadProcessedChapterText(objectKey: string) {
  const bytes = Buffer.from(await getObjectBytes({ objectKey }));
  const { gunzipContent } = await import("@/lib/content/chapter-content-utils");
  return gunzipContent(bytes).toString("utf8");
}

function guessContentType(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".json")) return "application/json; charset=utf-8";
  if (lower.endsWith(".md")) return "text/markdown; charset=utf-8";
  return "text/plain; charset=utf-8";
}
