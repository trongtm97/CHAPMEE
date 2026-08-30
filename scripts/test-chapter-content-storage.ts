/**
 * Manual integration test: save/load chapter content via MinIO.
 *
 *   npx --yes tsx scripts/test-chapter-content-storage.ts
 *
 * Requires: docker compose local MinIO + .env.local S3_* vars
 */
import { randomUUID } from "node:crypto";
import { loadEnvLocal } from "./lib/load-env-local";
import {
  chapterContentObjectExists,
  loadChapterContentObject,
  saveChapterContentObject
} from "../lib/storage/chapter-content-storage";
import { getObjectBytes } from "../lib/storage/s3";
import { computeContentHash } from "../lib/content/chapter-content-utils";

loadEnvLocal();

const storyId = randomUUID();
const chapterId = randomUUID();

async function main() {
  const sample = {
    v: 1,
    blocks: [
      {
        type: "prose",
        data: { text: "Đây là đoạn thử nghiệm lưu chương qua MinIO. " + "x".repeat(120) }
      }
    ]
  };

  const saved = await saveChapterContentObject({
    storyId,
    chapterId,
    format: "composer_json",
    content: sample
  });

  console.log("SAVE_OK", {
    objectKey: saved.objectKey,
    hash: saved.hash,
    sizeBytes: saved.sizeBytes,
    encoding: saved.encoding,
    wordCount: saved.wordCount,
    excerptLength: saved.excerpt.length,
    previewLength: saved.plainTextPreview.length
  });

  const exists = await chapterContentObjectExists({ objectKey: saved.objectKey });
  if (!exists) {
    throw new Error("Object not found in S3 after save");
  }

  const loaded = await loadChapterContentObject({
    objectKey: saved.objectKey,
    format: "composer_json",
    encoding: saved.encoding,
    expectedHash: saved.hash
  });

  if (!JSON.stringify(loaded.content).includes("Đây là đoạn thử nghiệm")) {
    throw new Error("Loaded content does not match sample");
  }

  console.log("LOAD_OK", {
    hash: loaded.hash,
    sizeBytes: loaded.sizeBytes,
    matchesSavedHash: loaded.hash === saved.hash,
    matchesCompute:
      loaded.hash ===
      computeContentHash(await getObjectBytes({ objectKey: saved.objectKey }))
  });

  console.log("PASS", { storyId, chapterId, objectKey: saved.objectKey });
}

main().catch((error) => {
  console.error("FAIL", error);
  process.exit(1);
});
