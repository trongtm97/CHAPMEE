/**
 * Verify S3/MinIO upload + internal read; print expected public URL and curl test.
 *
 *   npx --yes tsx scripts/check-storage.ts
 *   npx --yes tsx scripts/check-storage.ts --file .env.production --cleanup
 *   npm run storage:check
 */
import { loadEnvForScripts } from "./lib/load-env-file";
import {
  deleteObject,
  getObjectBytes,
  getPublicMediaUrl,
  getS3Bucket,
  headObject,
  putObjectBytes
} from "../lib/storage/s3";

const TEST_KEY = "health/chapmee-storage-test.txt";
const TEST_BODY = `chapmee-storage-check ${new Date().toISOString()}\n`;

function parseArgs() {
  const args = process.argv.slice(2);
  let file: string | undefined;
  let cleanup = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" && args[i + 1]) file = args[++i];
    else if (args[i] === "--cleanup") cleanup = true;
  }
  return { file, cleanup };
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function main() {
  const { file, cleanup } = parseArgs();
  loadEnvForScripts(file);

  const endpoint = requiredEnv("S3_ENDPOINT");
  const bucket = getS3Bucket();
  const publicBase =
    process.env.S3_MEDIA_PUBLIC_BASE_URL?.trim() ??
    process.env.S3_PUBLIC_BASE_URL?.trim() ??
    "";

  console.log("ChapMee storage check");
  console.log(`  S3_ENDPOINT=${endpoint}`);
  console.log(`  S3_BUCKET=${bucket}`);
  console.log(`  test_key=${TEST_KEY}`);

  await putObjectBytes({
    objectKey: TEST_KEY,
    body: Buffer.from(TEST_BODY, "utf8"),
    contentType: "text/plain; charset=utf-8"
  });
  console.log("OK: uploaded test object via internal S3 API");

  const meta = await headObject({ objectKey: TEST_KEY });
  console.log(`OK: head object (size=${meta.contentLength}, type=${meta.contentType})`);

  const bytes = await getObjectBytes({ objectKey: TEST_KEY });
  const text = bytes.toString("utf8");
  if (!text.startsWith("chapmee-storage-check")) {
    throw new Error("Downloaded body mismatch");
  }
  console.log("OK: read object via internal S3 API");

  const publicUrl = getPublicMediaUrl(TEST_KEY);
  console.log(`\nExpected public URL (browser/CDN):\n  ${publicUrl}`);

  if (publicBase) {
    const expectedPrefix = publicBase.replace(/\/$/, "");
    if (!publicUrl.startsWith(expectedPrefix)) {
      console.warn(
        `WARN: public URL does not start with S3_MEDIA_PUBLIC_BASE_URL (${expectedPrefix})`
      );
    }
  } else {
    console.warn("WARN: S3_MEDIA_PUBLIC_BASE_URL unset — configure for production media domain");
  }

  console.log("\nTest public read from a machine with DNS access to media.chapmee.com:");
  console.log(`  curl -sI "${publicUrl}"`);
  console.log("  # Expect HTTP 200 for object; bucket root may return 403 — that is OK.");

  if (cleanup) {
    await deleteObject(TEST_KEY);
    console.log("\nOK: deleted test object (--cleanup)");
  } else {
    console.log("\nTest object left in bucket. Re-run with --cleanup to remove.");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
