import type { PresentationModeSlug } from "@/lib/taxonomy/constants";

export const PRESENTATION_MODE_DESCRIPTIONS: Record<
  PresentationModeSlug,
  string
> = {
  standard_prose: "Văn xuôi truyền thống",
  chat_story: "Truyện dạng tin nhắn",
  social_feed: "Bài đăng / bình luận giả lập",
  case_file: "Hồ sơ vụ án / điều tra",
  diary: "Nhật ký nhân vật",
  system_game: "Giao diện hệ thống / game",
  script: "Kịch bản thoại",
  mixed_media: "Kết hợp nhiều dạng trình bày"
};

export function presentationModeDescription(slug: string): string | null {
  return (
    PRESENTATION_MODE_DESCRIPTIONS[slug as PresentationModeSlug] ?? null
  );
}
