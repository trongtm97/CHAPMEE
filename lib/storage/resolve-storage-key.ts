import { getMediaS3Bucket, getS3Bucket, getTextS3Bucket } from "@/lib/storage/s3";

const LEGACY_BUCKET_PREFIXES: Record<string, string> = {
  "story-images": "story-images",
  "chapter-images": "chapter-images"
};

/**
 * Maps legacy db bucket names to object keys inside the app S3 bucket.
 * New uploads should pass full keys (story-covers/..., chapter-media/...).
 */
export function resolveStorageObjectKey(legacyBucket: string | undefined, path: string) {
  const trimmed = path.replace(/^\/+/, "");
  const currentBuckets = new Set(
    [getS3Bucket(), getMediaS3Bucket(), getTextS3Bucket()].filter(Boolean) as string[]
  );
  if (!legacyBucket || currentBuckets.has(legacyBucket)) {
    return trimmed;
  }

  const knownPrefixes = [
    "avatars/",
    "story-covers/",
    "chapter-media/",
    "composer-images/",
    "reel-backgrounds/",
    "temp/",
    "story-images/",
    "chapter-images/"
  ];

  if (knownPrefixes.some((prefix) => trimmed.startsWith(prefix))) {
    return trimmed;
  }

  const prefix = LEGACY_BUCKET_PREFIXES[legacyBucket];
  if (prefix) {
    return `${prefix}/${trimmed}`;
  }

  return trimmed;
}
