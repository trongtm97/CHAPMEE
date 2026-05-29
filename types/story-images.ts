export const storyImageVariants = [
  "original",
  "portrait",
  "landscape",
  "square",
  "thumb",
  "blur"
] as const;

export type StoryImageVariant = (typeof storyImageVariants)[number];

export const STORY_IMAGE_STORAGE_BUCKET = "story-images" as const;

export type StoryImageVariantOutputSpec = {
  width: number;
  height: number;
  quality: number;
};

/** Derived variants (excludes original). */
export const STORY_IMAGE_VARIANT_OUTPUTS: Record<
  Exclude<StoryImageVariant, "original">,
  StoryImageVariantOutputSpec
> = {
  portrait: { width: 800, height: 1200, quality: 80 },
  landscape: { width: 1280, height: 720, quality: 80 },
  square: { width: 600, height: 600, quality: 80 },
  thumb: { width: 480, height: 480, quality: 75 },
  blur: { width: 64, height: 64, quality: 45 }
};

export type StoryImage = {
  id: string;
  storyId: string;
  originalUrl: string | null;
  portraitUrl: string | null;
  landscapeUrl: string | null;
  squareUrl: string | null;
  thumbUrl: string | null;
  blurUrl: string | null;
  focalX: number;
  focalY: number;
  originalWidth: number | null;
  originalHeight: number | null;
  originalFileSizeBytes: number | null;
  processedFileSizeBytes: number | null;
  mimeType: string | null;
  storageBucket: string;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StoryImageRow = {
  id: string;
  story_id: string;
  original_url: string | null;
  portrait_url: string | null;
  landscape_url: string | null;
  square_url: string | null;
  thumb_url: string | null;
  blur_url: string | null;
  focal_x: number | string | null;
  focal_y: number | string | null;
  original_width: number | null;
  original_height: number | null;
  original_file_size_bytes: number | null;
  processed_file_size_bytes: number | null;
  mime_type: string | null;
  storage_bucket: string | null;
  is_current: boolean | null;
  created_at: string;
  updated_at: string;
};

const variantUrlKey: Record<
  StoryImageVariant,
  keyof Pick<
    StoryImage,
    | "originalUrl"
    | "portraitUrl"
    | "landscapeUrl"
    | "squareUrl"
    | "thumbUrl"
    | "blurUrl"
  >
> = {
  original: "originalUrl",
  portrait: "portraitUrl",
  landscape: "landscapeUrl",
  square: "squareUrl",
  thumb: "thumbUrl",
  blur: "blurUrl"
};

export function getStoryImageVariantUrl(
  image: StoryImage | null | undefined,
  variant: StoryImageVariant
): string | null {
  if (!image) {
    return null;
  }

  return image[variantUrlKey[variant]] ?? null;
}

/** Minimal story shape for {@link import("@/lib/images/get-story-image").getStoryImage}. */
export type StoryWithImages = {
  title: string;
  coverUrl?: string | null;
  cover_url?: string | null;
  currentImage?: StoryImage | null;
  current_image?: StoryImage | null;
};
