/**
 * Initialize MinIO/S3 bucket for ChapMee (create + public read-only policy).
 *
 *   npx --yes tsx scripts/init-storage.ts
 *   npx --yes tsx scripts/init-storage.ts --file .env.production
 *   npm run storage:init
 *
 * Does not print secrets. Does not grant public write.
 * MinIO anonymous policy: uses PutBucketPolicy when supported; otherwise prints `mc` commands.
 */
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { loadEnvForScripts } from "./lib/load-env-file";

const LOCAL_DEV_BUCKET = "chapmee-local-media";
const PROD_BUCKET = "chapmee-media";

function parseArgs() {
  const args = process.argv.slice(2);
  let file: string | undefined;
  let dryRun = false;
  let skipPolicy = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" && args[i + 1]) file = args[++i];
    else if (args[i] === "--dry-run") dryRun = true;
    else if (args[i] === "--skip-policy") skipPolicy = true;
  }
  return { file, dryRun, skipPolicy };
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function mask(value: string) {
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}…${value.slice(-2)} (${value.length} chars)`;
}

function buildS3Client(): S3Client {
  const endpoint = requiredEnv("S3_ENDPOINT");
  const region = process.env.S3_REGION?.trim() || "us-east-1";
  const accessKeyId = requiredEnv("S3_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnv("S3_SECRET_ACCESS_KEY");
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== "false";
  return new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials: { accessKeyId, secretAccessKey }
  });
}

function publicReadPolicy(bucket: string) {
  return JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "PublicReadGetObject",
        Effect: "Allow",
        Principal: "*",
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${bucket}/*`]
      }
    ]
  });
}

function assertBucketNameForEnvironment(bucket: string) {
  const publicBase =
    process.env.S3_MEDIA_PUBLIC_BASE_URL ??
    process.env.S3_PUBLIC_BASE_URL ??
    "";
  const endpoint = process.env.S3_ENDPOINT?.trim() ?? "";
  const looksProduction =
    publicBase.includes("media.chapmee.com") || endpoint.includes("minio:9000");

  if (looksProduction && bucket === LOCAL_DEV_BUCKET) {
    throw new Error(
      `Refusing to use local dev bucket "${LOCAL_DEV_BUCKET}" with production-style S3_MEDIA_PUBLIC_BASE_URL or minio:9000. Use "${PROD_BUCKET}".`
    );
  }
}

function printMcFallback(bucket: string) {
  console.log("\nIf bucket policy API failed, set public read with MinIO Client (mc):\n");
  console.log("# From VPS (production compose):");
  console.log(
    "docker compose -f docker-compose.production.yml run --rm minio/mc sh -c \\"
  );
  console.log(
    `  'mc alias set local http://minio:9000 \"$MINIO_ROOT_USER\" \"$MINIO_ROOT_PASSWORD\" && \\`
  );
  console.log(`   mc mb -p local/${bucket} && \\`);
  console.log(`   mc anonymous set download local/${bucket} && \\`);
  console.log(`   mc anonymous get local/${bucket}'`);
  console.log("\n# Inside minio container (loopback API):");
  console.log("docker compose -f docker-compose.production.yml exec minio sh");
  console.log('mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"');
  console.log(`mc mb -p local/${bucket}`);
  console.log(`mc anonymous set download local/${bucket}`);
  console.log(`mc anonymous get local/${bucket}`);
  console.log("\nPolicy: download = public read only (no anonymous upload).");
}

async function bucketExists(client: S3Client, bucket: string): Promise<boolean> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return true;
  } catch (err: unknown) {
    const code = (err as { name?: string; $metadata?: { httpStatusCode?: number } }).name;
    const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (code === "NotFound" || status === 404) return false;
    throw err;
  }
}

async function main() {
  const { file, dryRun, skipPolicy } = parseArgs();
  loadEnvForScripts(file);

  const bucket = requiredEnv("S3_BUCKET");
  assertBucketNameForEnvironment(bucket);

  const endpoint = requiredEnv("S3_ENDPOINT");
  const publicBase = process.env.S3_PUBLIC_BASE_URL?.trim() ?? "(unset)";
  const accessKeyId = requiredEnv("S3_ACCESS_KEY_ID");

  console.log("ChapMee storage init");
  console.log(`  S3_ENDPOINT=${endpoint}`);
  console.log(`  S3_BUCKET=${bucket}`);
  console.log(`  S3_ACCESS_KEY_ID=${mask(accessKeyId)}`);
  console.log(`  S3_PUBLIC_BASE_URL=${publicBase}`);
  console.log(`  dry_run=${dryRun} skip_policy=${skipPolicy}`);

  if (dryRun) {
    console.log("\nDry run — no API calls.");
    return;
  }

  const client = buildS3Client();
  const exists = await bucketExists(client, bucket);

  if (!exists) {
    console.log(`Creating bucket: ${bucket}`);
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  } else {
    console.log(`Bucket exists: ${bucket}`);
  }

  const verified = await bucketExists(client, bucket);
  if (!verified) {
    throw new Error(`Bucket verification failed: ${bucket}`);
  }
  console.log("Bucket verified.");

  if (skipPolicy) {
    console.log("Skipped bucket policy (--skip-policy).");
    printMcFallback(bucket);
    return;
  }

  try {
    await client.send(
      new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: publicReadPolicy(bucket)
      })
    );
    console.log("Bucket policy applied: public GetObject only (no public write).");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`WARN: PutBucketPolicy failed (${message}).`);
    printMcFallback(bucket);
  }

  console.log("\nNext: npm run storage:check");
  console.log("Never store full public URLs in the database — use media_asset_id / object_key only.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
