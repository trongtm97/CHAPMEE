import { randomUUID } from "crypto";

export const MEDIA_FOLDERS = [
  "avatars",
  "story-covers",
  "chapter-media",
  "composer-images",
  "reel-backgrounds",
  "seo-images",
  "temp"
] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

export type MediaUploadPurpose =
  | "avatar"
  | "story_cover"
  | "chapter_image"
  | "composer_image"
  | "reel_background"
  | "seo_og"
  | "temp";

const PURPOSE_TO_FOLDER: Record<MediaUploadPurpose, MediaFolder> = {
  avatar: "avatars",
  story_cover: "story-covers",
  chapter_image: "chapter-media",
  composer_image: "composer-images",
  reel_background: "reel-backgrounds",
  seo_og: "seo-images",
  temp: "temp"
};

export function isMediaFolder(value: string): value is MediaFolder {
  return (MEDIA_FOLDERS as readonly string[]).includes(value);
}

export function mediaFolderForPurpose(purpose: MediaUploadPurpose): MediaFolder {
  return PURPOSE_TO_FOLDER[purpose];
}

function extensionFromFilename(filename: string) {
  const parts = filename.split(".");
  const ext = parts.length > 1 ? parts.pop()?.toLowerCase() : null;
  if (!ext || !/^[a-z0-9]+$/.test(ext)) {
    return "bin";
  }
  return ext;
}

function datePathSegments(date = new Date()) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd}`;
}

export function buildMediaObjectKey(folder: MediaFolder, filename: string, date = new Date()) {
  const ext = extensionFromFilename(filename);
  return `${folder}/${datePathSegments(date)}/${randomUUID()}.${ext}`;
}

export function buildStoryCoverVariantKey(imageId: string, variant: string, date = new Date()) {
  return `${PURPOSE_TO_FOLDER.story_cover}/${datePathSegments(date)}/${imageId}/${variant}.webp`;
}
