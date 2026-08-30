import assert from "node:assert/strict";
import { resolveStoryCoverPreviewUrl } from "@/lib/images/resolve-story-cover-preview-url";
import type { StoryImage } from "@/types/story-images";

process.env.NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL = "https://media.example.com";

const oldImage = {
  id: "old",
  storyId: "story-1",
  originalUrl: "stories/story-1/old/original.webp",
  portraitUrl: "stories/story-1/old/portrait.webp",
  landscapeUrl: null,
  squareUrl: null,
  thumbUrl: null,
  blurUrl: null,
  focalX: 0.5,
  focalY: 0.5,
  originalWidth: 800,
  originalHeight: 800,
  originalFileSizeBytes: 1,
  processedFileSizeBytes: 1,
  mimeType: "image/webp",
  storageBucket: "media",
  isCurrent: true,
  createdAt: "",
  updatedAt: ""
} satisfies StoryImage;

const newStored = "stories/story-1/new/portrait.webp";

assert.equal(
  resolveStoryCoverPreviewUrl(newStored, oldImage),
  "https://media.example.com/stories/story-1/new/portrait.webp"
);

assert.equal(
  resolveStoryCoverPreviewUrl(null, oldImage),
  "https://media.example.com/stories/story-1/old/portrait.webp"
);

assert.equal(resolveStoryCoverPreviewUrl(null, null), null);

console.log("resolve-story-cover-preview-url.self-check: ok");
