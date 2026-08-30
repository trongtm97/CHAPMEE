import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getMediaUrlFromAsset } from "@/lib/media/media-url";
import { resolvePublicMediaUrlClient } from "@/lib/media/public-media-client";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function requiredEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let s3Client: S3Client | null = null;

export function getS3Client() {
  if (!s3Client) {
    const endpoint = requiredEnv("S3_ENDPOINT", process.env.S3_ENDPOINT);
    const region = process.env.S3_REGION ?? "us-east-1";
    const accessKeyId = requiredEnv("S3_ACCESS_KEY_ID", process.env.S3_ACCESS_KEY_ID);
    const secretAccessKey = requiredEnv(
      "S3_SECRET_ACCESS_KEY",
      process.env.S3_SECRET_ACCESS_KEY
    );
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== "false";

    s3Client = new S3Client({
      region,
      endpoint,
      forcePathStyle,
      credentials: { accessKeyId, secretAccessKey }
    });
  }
  return s3Client;
}

export function getS3Bucket() {
  return requiredEnv("S3_BUCKET", process.env.S3_BUCKET);
}

/**
 * Media (image) bucket — public read so browsers/CDN can fetch directly.
 * Falls back to S3_BUCKET for backward compatibility.
 */
export function getMediaS3Bucket() {
  return (
    process.env.S3_MEDIA_BUCKET ??
    process.env.S3_BUCKET ??
    requiredEnv("S3_MEDIA_BUCKET", undefined)
  );
}

/**
 * Text content bucket — private. Server-side GET only via secret keys.
 */
export function getTextS3Bucket() {
  return (
    process.env.S3_TEXT_BUCKET ??
    process.env.S3_BUCKET ??
    requiredEnv("S3_TEXT_BUCKET", undefined)
  );
}

/**
 * Xác minh (KYC) bucket — private. No public read, no ACL public-read.
 * Only accessed through short-lived signed URLs via authenticated API.
 */
export function getXacminhS3Bucket() {
  return process.env.S3_XACMINH_BUCKET ?? requiredEnv("S3_XACMINH_BUCKET", undefined);
}

export function isXacminhBucket(logicalBucket: string): boolean {
  return logicalBucket === "creator-verification-documents";
}

function getPublicMediaBaseUrl() {
  return (
    process.env.S3_MEDIA_PUBLIC_BASE_URL ??
    process.env.S3_PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL
  )?.replace(/\/$/, "");
}

export function getPublicMediaUrl(objectKey: string) {
  const normalizedKey = objectKey.replace(/^\/+/, "");
  const base = getPublicMediaBaseUrl();
  if (base) {
    return `${base}/${normalizedKey}`;
  }

  // Client bundles must not require server-only S3 secrets.
  if (typeof window !== "undefined") {
    return resolvePublicMediaUrlClient(normalizedKey) ?? `/${normalizedKey}`;
  }

  const endpoint = process.env.S3_ENDPOINT?.replace(/\/$/, "");
  const bucket = getMediaS3Bucket();
  if (!endpoint) {
    return `/${normalizedKey}`;
  }
  if (process.env.S3_FORCE_PATH_STYLE !== "false") {
    return `${endpoint}/${bucket}/${normalizedKey}`;
  }
  return `${endpoint.replace("://", `://${bucket}.`)}/${normalizedKey}`;
}

export async function createPresignedUploadUrl(input: {
  objectKey: string;
  contentType: string;
  expiresInSeconds?: number;
}) {
  const command = new PutObjectCommand({
    Bucket: getMediaS3Bucket(),
    Key: input.objectKey,
    ContentType: input.contentType
  });
  const url = await getSignedUrl(getS3Client(), command, {
    expiresIn: input.expiresInSeconds ?? 900
  });
  return url;
}

export async function createPresignedDownloadUrl(input: {
  objectKey: string;
  expiresInSeconds?: number;
}) {
  const command = new GetObjectCommand({
    Bucket: getMediaS3Bucket(),
    Key: input.objectKey
  });
  return getSignedUrl(getS3Client(), command, {
    expiresIn: input.expiresInSeconds ?? 900
  });
}

export async function deleteObject(objectKey: string, bucket?: string) {
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: bucket ?? getMediaS3Bucket(),
      Key: objectKey
    })
  );
}

export async function headObject(input: { objectKey: string; bucket?: string }) {
  const response = await getS3Client().send(
    new HeadObjectCommand({
      Bucket: input.bucket ?? getMediaS3Bucket(),
      Key: input.objectKey
    })
  );
  return {
    contentLength: response.ContentLength ?? null,
    contentType: response.ContentType ?? null
  };
}

export async function objectExists(objectKey: string, bucket?: string) {
  try {
    await headObject({ objectKey, bucket });
    return true;
  } catch {
    return false;
  }
}

export async function listObjectKeys(input: {
  prefix: string;
  maxKeys?: number;
  continuationToken?: string;
  bucket?: string;
}) {
  const response = await getS3Client().send(
    new ListObjectsV2Command({
      Bucket: input.bucket ?? getMediaS3Bucket(),
      Prefix: input.prefix,
      MaxKeys: Math.min(Math.max(input.maxKeys ?? 200, 1), 1000),
      ContinuationToken: input.continuationToken
    })
  );

  const keys = (response.Contents ?? [])
    .map((item) => item.Key)
    .filter((key): key is string => Boolean(key));

  return {
    keys,
    isTruncated: response.IsTruncated ?? false,
    nextContinuationToken: response.NextContinuationToken
  };
}

export async function putObjectBytes(input: {
  objectKey: string;
  body: Buffer | Uint8Array;
  contentType: string;
  contentEncoding?: string;
  bucket?: string;
}) {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: input.bucket ?? getMediaS3Bucket(),
      Key: input.objectKey,
      Body: input.body,
      ContentType: input.contentType,
      ContentEncoding: input.contentEncoding
    })
  );
}

export async function getObjectBytes(input: {
  objectKey: string;
  bucket?: string;
}): Promise<Buffer> {
  const response = await getS3Client().send(
    new GetObjectCommand({
      Bucket: input.bucket ?? getMediaS3Bucket(),
      Key: input.objectKey
    })
  );
  const bytes = await response.Body?.transformToByteArray();
  if (!bytes) {
    throw new Error(`Empty object body for key ${input.objectKey}`);
  }
  return Buffer.from(bytes);
}

export { getMediaUrlFromAsset };

export function getMediaUrlFromObjectKey(objectKey: string) {
  return getPublicMediaUrl(objectKey);
}
