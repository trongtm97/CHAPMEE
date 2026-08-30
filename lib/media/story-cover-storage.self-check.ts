process.env.S3_MEDIA_PUBLIC_BASE_URL = "https://media.chapmee.com";
process.env.NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL = "https://media.chapmee.com";

import {
  isOwnedMediaUrl,
  normalizeStoryCoverForStorage,
  resolveStoredMediaUrl,
  shouldIngestExternalMediaUrl
} from "./media-url";

const key = "story-covers/2026/06/18/abc/portrait.webp";
const keyNorm = normalizeStoryCoverForStorage(key);
if (keyNorm.kind !== "object_key" || keyNorm.objectKey !== key) {
  throw new Error(`object key normalize failed: ${JSON.stringify(keyNorm)}`);
}

const cdnUrl = "https://media.chapmee.com/story-covers/2026/06/18/abc/portrait.webp";
const cdnNorm = normalizeStoryCoverForStorage(cdnUrl);
if (cdnNorm.kind !== "object_key" || !cdnNorm.objectKey.endsWith("portrait.webp")) {
  throw new Error(`CDN normalize failed: ${JSON.stringify(cdnNorm)}`);
}

const external = "https://congtynamviet.com/anh/412885.webp";
if (!shouldIngestExternalMediaUrl(external)) {
  throw new Error("expected external URL to need ingest");
}
const externalNorm = normalizeStoryCoverForStorage(external);
if (externalNorm.kind !== "ingest" || externalNorm.url !== external) {
  throw new Error(`external normalize failed: ${JSON.stringify(externalNorm)}`);
}

if (resolveStoredMediaUrl(external) !== null) {
  throw new Error("legacy external URL must not resolve for display");
}

const display = resolveStoredMediaUrl(key);
if (display !== "https://media.chapmee.com/story-covers/2026/06/18/abc/portrait.webp") {
  throw new Error(`unexpected display URL: ${display}`);
}

if (!isOwnedMediaUrl(cdnUrl)) {
  throw new Error("media.chapmee.com should be owned");
}

console.log("story-cover-storage.self-check: ok");
