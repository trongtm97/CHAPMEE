import type { StudioTemplateType } from "@/types/templates";

export const STUDIO_TEMPLATE_TYPE_LABELS: Record<StudioTemplateType, string> = {
  author_note: "Ghi chú tác giả",
  chapter: "Chương",
  community_post: "Bài cộng đồng",
  seo: "SEO",
  story_description: "Mô tả truyện",
  reels: "Reels"
};

export const STUDIO_TEMPLATE_TYPE_OPTIONS: Array<{
  label: string;
  value: StudioTemplateType;
}> = [
  { label: "Chương", value: "chapter" },
  { label: "Mô tả truyện", value: "story_description" },
  { label: "Ghi chú tác giả", value: "author_note" },
  { label: "Reels", value: "reels" },
  { label: "SEO", value: "seo" },
  { label: "Bài cộng đồng", value: "community_post" }
];
