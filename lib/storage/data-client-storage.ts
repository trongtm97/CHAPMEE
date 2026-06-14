import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageClient } from "@/lib/db/types";
import {
  deleteObject,
  getMediaS3Bucket,
  getPublicMediaUrl,
  getS3Client
} from "@/lib/storage/s3";
import { resolveStorageObjectKey } from "@/lib/storage/resolve-storage-key";

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
            await getS3Client().send(
              new PutObjectCommand({
                Bucket: getMediaS3Bucket(),
                Key: objectKey,
                Body: buffer,
                ContentType: options?.contentType
              })
            );
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
            await Promise.all(
              objectKeys.map((objectKey) =>
                getS3Client().send(
                  new DeleteObjectCommand({ Bucket: getMediaS3Bucket(), Key: objectKey })
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
            const signedUrl = await getSignedUrl(
              getS3Client(),
              new GetObjectCommand({ Bucket: getMediaS3Bucket(), Key: objectKey }),
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
