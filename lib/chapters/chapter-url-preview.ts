import { buildStorySegment } from "@/lib/urls/paths";

type ChapterUrlPreviewInput = {
  storySlug: string;
  storyPublicCode: string | null | undefined;
  episodeNumber: number;
  /** Canonical chapter segment when episode already exists */
  chapterSegment?: string | null;
};

/** Preview URL shown while drafting — uses story code + chapter number until published. */
export function buildChapterUrlPreview(input: ChapterUrlPreviewInput): string {
  const host = "chapmee.vn";

  if (input.storyPublicCode?.trim()) {
    const storyPart = buildStorySegment(input.storySlug, input.storyPublicCode.trim());
    const chapterPart = input.chapterSegment?.trim() || String(input.episodeNumber);
    return `${host}/truyen/${storyPart}/chuong/${chapterPart}`;
  }

  return `${host}/truyen/${input.storySlug}/chuong/${input.episodeNumber}`;
}
