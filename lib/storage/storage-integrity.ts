import { verifyContentHash } from "@/lib/content/chapter-content-utils";
import { getObjectBytes, headObject, objectExists } from "@/lib/storage/s3";

export type IntegrityIssueCode =
  | "missing_object"
  | "hash_mismatch"
  | "size_mismatch"
  | "head_failed";

export type IntegrityIssue = {
  code: IntegrityIssueCode;
  message: string;
  objectKey: string;
  expectedHash?: string | null;
  actualHash?: string | null;
  expectedSizeBytes?: number | null;
  actualSizeBytes?: number | null;
};

export async function checkS3ObjectExists(objectKey: string): Promise<boolean> {
  try {
    return await objectExists(objectKey);
  } catch {
    return false;
  }
}

export async function verifyChapterContentObject(input: {
  objectKey: string;
  expectedHash?: string | null;
  expectedSizeBytes?: number | null;
}): Promise<IntegrityIssue[]> {
  const issues: IntegrityIssue[] = [];
  const exists = await checkS3ObjectExists(input.objectKey);
  if (!exists) {
    issues.push({
      code: "missing_object",
      message: "Object not found in bucket",
      objectKey: input.objectKey
    });
    return issues;
  }

  try {
    const head = await headObject({ objectKey: input.objectKey });
    if (
      input.expectedSizeBytes != null &&
      head.contentLength != null &&
      Number(head.contentLength) !== Number(input.expectedSizeBytes)
    ) {
      issues.push({
        code: "size_mismatch",
        message: "Content-Length does not match episodes.content_size_bytes",
        objectKey: input.objectKey,
        expectedSizeBytes: input.expectedSizeBytes,
        actualSizeBytes: Number(head.contentLength)
      });
    }
  } catch (error) {
    issues.push({
      code: "head_failed",
      message: error instanceof Error ? error.message : "HEAD failed",
      objectKey: input.objectKey
    });
  }

  if (input.expectedHash?.trim()) {
    try {
      const bytes = await getObjectBytes({ objectKey: input.objectKey });
      const ok = verifyContentHash(bytes, input.expectedHash);
      if (!ok) {
        const { computeContentHash } = await import("@/lib/content/chapter-content-utils");
        issues.push({
          code: "hash_mismatch",
          message: "SHA-256 of object bytes does not match content_hash",
          objectKey: input.objectKey,
          expectedHash: input.expectedHash,
          actualHash: computeContentHash(bytes)
        });
      }
    } catch (error) {
      issues.push({
        code: "head_failed",
        message: error instanceof Error ? error.message : "GET failed",
        objectKey: input.objectKey
      });
    }
  }

  return issues;
}
