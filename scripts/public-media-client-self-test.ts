import { resolvePublicMediaUrlClient } from "../lib/media/public-media-client";

process.env.NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL = "https://media.chapmee.com";

const key = "story-images/story-id/image-id/portrait.webp";
const url = resolvePublicMediaUrlClient(key);

if (url !== "https://media.chapmee.com/story-images/story-id/image-id/portrait.webp") {
  throw new Error(`unexpected URL: ${url ?? "null"}`);
}

const absolute = resolvePublicMediaUrlClient("https://media.chapmee.com/avatars/x.webp");
if (absolute !== "https://media.chapmee.com/avatars/x.webp") {
  throw new Error(`unexpected absolute URL: ${absolute ?? "null"}`);
}

console.log("public-media-client-self-test: ok");
