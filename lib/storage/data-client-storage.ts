import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  type PutObjectCommandInput
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageClient } from "@/lib/db/types";
import {
  deleteObject,
  getMediaS3Bucket,
  getPublicMediaUrl,
  getS3Client,
  getXacminhS3Bucket,
  isXacminhBucket
} from "@/lib/storage/s3";
import { resolveStorageObjectKey } from "@/lib/storage/resolve-storage-key";

function resolveS3Bucket(logicalBucket: string): string {
  if (isXacminhBucket(logicalBucket)) {
    return getXacminhS3Bucket();
  }
  return getMediaS3Bucket();
}

function shouldSetPublicAcl(logicalBucket: string): boolean {
  return !isXacminhBucket(logicalBucket);
}

async function toBuffer(
  body: ArrayBuffer | Buffer | Blob | File | Uint8Array
): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    const arrayBuffer = await body.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  return Buffer.from(body as unknown as Uint8Array);
}

export function createStorageNamespace(): StorageClient {
  return {
    from(bucket: string) {
      return {
        async upload(path, body, options) {
          try {
            const buffer = await toBuffer(body);
            const objectKey = resolveStorageObjectKey(bucket, path);
            const s3Bucket = resolveS3Bucket(bucket);
            const command: PutObjectCommandInput = {
              Bucket: s3Bucket,
              Key: objectKey,
              Body: buffer,
              ContentType: options?.contentType
            };
            if (shouldSetPublicAcl(bucket)) {
              command.ACL = "public-read";
            }
            await getS3Client().send(new PutObjectCommand(command));
            return { data: { path: objectKey }, error: null };
          } catch (error) {
            return {
              data: null,
              error: {
                message: error instanceof Error ? error.message : "Upload failed"
              }
            };
          }
        },
        async remove(paths) {
          try {
            const objectKeys = paths.map((path) => resolveStorageObjectKey(bucket, path));
            const s3Bucket = resolveS3Bucket(bucket);
            await Promise.all(
              objectKeys.map((objectKey) =>
                getS3Client().send(
                  new DeleteObjectCommand({ Bucket: s3Bucket, Key: objectKey })
                )
              )
            );
            return { data: objectKeys, error: null };
          } catch (error) {
            return {
              data: null,
              error: {
                message: error instanceof Error ? error.message : "Remove failed"
              }
            };
          }
        },
        getPublicUrl(path) {
          const objectKey = resolveStorageObjectKey(bucket, path);
          return { data: { publicUrl: getPublicMediaUrl(objectKey) } };
        },
        async createSignedUrl(path, expiresIn) {
          try {
            const objectKey = resolveStorageObjectKey(bucket, path);
            const s3Bucket = resolveS3Bucket(bucket);
            const signedUrl = await getSignedUrl(
              getS3Client(),
              new GetObjectCommand({ Bucket: s3Bucket, Key: objectKey }),
              { expiresIn }
            );
            return { data: { signedUrl }, error: null };
          } catch (error) {
            return {
              data: null,
              error: {
                message:
                  error instanceof Error ? error.message : "Could not sign URL"
              }
            };
          }
        }
      };
    }
  };
}

export { deleteObject, getPublicMediaUrl };
