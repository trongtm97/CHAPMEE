/**
 * CLI: upload + optional parse for import pipeline MVP.
 *
 *   npm run import:local-file -- --file=./docs/samples/import-sample.json --owner-profile-id=<uuid> --source-name=test --parse
 *   npm run import:local-file -- --file=./book.txt --owner-profile-id=<uuid> --rights --parse --publish
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import "./lib/register-server-only";
import { loadEnvLocal } from "./lib/load-env-local";
import {
  createImportJobRecord,
  getImportJobById
} from "@/lib/import/pipeline/import-jobs";
import { parseImportJob } from "@/lib/import/pipeline/import-runner";
import { publishImportItems } from "@/lib/import/pipeline/import-publisher";
import { listImportItemsForJob } from "@/lib/import/pipeline/import-jobs";
import { assertNoEncodingIssuesInImportText } from "@/lib/encoding/detect-encoding-issues";
import { uploadRawImportFile } from "@/lib/import/pipeline/import-storage";
import { createAdminClient } from "@/lib/data/admin";
import { closePgPool } from "@/lib/db/pool";

loadEnvLocal();

function arg(name: string) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.split("=").slice(1).join("=")?.trim() || null;
}

const filePath = arg("file");
const ownerProfileId = arg("owner-profile-id");
const sourceName = arg("source-name");
const doParse = process.argv.includes("--parse");
const doPublish = process.argv.includes("--publish");
const rights = process.argv.includes("--rights");

async function main() {
  if (!filePath || !ownerProfileId) {
    console.error(
      "Usage: npm run import:local-file -- --file=path --owner-profile-id=uuid [--source-name=x] [--rights] [--parse] [--publish]"
    );
    process.exit(1);
  }

  if (!rights) {
    console.error("Thêm --rights để xác nhận có quyền sử dụng nội dung.");
    process.exit(1);
  }

  const abs = resolve(filePath);
  const filename = abs.split(/[/\\]/).pop() ?? "import.txt";
  const bytes = readFileSync(abs);
  const textPreview = bytes.toString("utf8");
  const encodingCheck = assertNoEncodingIssuesInImportText(textPreview, filename);
  if (!encodingCheck.ok) {
    console.error(encodingCheck.error);
    process.exit(1);
  }
  const jobId = randomUUID();
  const db = createAdminClient();

  const uploaded = await uploadRawImportFile({
    importJobId: jobId,
    originalFilename: filename,
    bytes
  });

  const job = await createImportJobRecord(db, {
    id: jobId,
    sourceName,
    sourceType: "local_file",
    rawBucket: uploaded.bucket,
    rawObjectKey: uploaded.objectKey,
    originalFilename: filename,
    createdByProfileId: ownerProfileId,
    ownerProfileId,
    rightsAttestedAt: new Date().toISOString()
  });

  console.log("[import] job created", { jobId: job.id, rawKey: uploaded.objectKey });

  if (doParse) {
    const parsed = await parseImportJob(db, job.id);
    console.log("[import] parse", parsed);
    if (!parsed.ok) {
      process.exit(1);
    }
  }

  if (doPublish) {
    const fresh = await getImportJobById(db, job.id);
    if (fresh?.status !== "parsed") {
      console.error("Job chưa parsed — chạy với --parse trước.");
      process.exit(1);
    }
    const items = await listImportItemsForJob(db, job.id);
    const ids = items
      .filter((item) => item.status === "ready" || item.status === "parsed")
      .map((item) => item.id);
    const result = await publishImportItems(db, job.id, {
      itemIds: ids,
      storyStatus: "draft",
      visibility: "private"
    });
    console.log("[import] publish", result);
    if (!result.ok) {
      process.exit(1);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closePgPool());
