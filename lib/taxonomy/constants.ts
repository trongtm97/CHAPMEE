import type { TaxonomyType } from "@/types/taxonomy";

/** Max terms per type when a creator saves story taxonomy. */
export const STORY_TAXONOMY_LIMITS: Partial<
  Record<TaxonomyType, { min?: number; max: number; required?: boolean }>
> = {
  content_type: { min: 1, max: 1, required: true },
  main_genre: { min: 1, max: 1, required: true },
  subgenre: { max: 3 },
  trope_tag: { max: 12 },
  setting_tag: { max: 5 },
  character_tag: { max: 5 },
  relationship_tag: { max: 3 },
  narrative_style: { max: 3 },
  presentation_mode: { min: 1, max: 1, required: true },
  reader_experience: { max: 5 },
  content_warning: { max: 30 },
  age_rating: { min: 1, max: 1, required: true },
  story_status: { max: 3 },
  monetization_access: { max: 3 },
  editorial_tag: { max: 20 }
};

/** Types creators may attach to their own stories (enforced in validation + RLS app layer). */
export const CREATOR_ASSIGNABLE_TAXONOMY_TYPES: TaxonomyType[] = [
  "content_type",
  "main_genre",
  "subgenre",
  "trope_tag",
  "setting_tag",
  "character_tag",
  "relationship_tag",
  "narrative_style",
  "presentation_mode",
  "reader_experience",
  "content_warning",
  "age_rating",
  "story_status"
];

export const DEPRECATED_CONTENT_TYPE_SLUGS = [
  "truyen-mot-chuong",
  "truyen-nhieu-chuong"
] as const;

/**
 * Loại nội dung (content_type) hợp lệ khi tạo/sửa truyện trong Studio.
 * Các mục editorial (bài viết, thông báo, hướng dẫn, review) và Reels có luồng riêng.
 */
export const STORY_FORM_CONTENT_TYPE_SLUGS = [
  "truyen-dai",
  "truyen-ngan",
  "series-truyen-ngan",
  "tieu-thuyet-web",
  "doan-van",
  "tan-van",
  "nhat-ky-hu-cau",
  "tho",
  "kich-ban-hoi-thoai",
  "chat-story",
  "truyen-dang-tin-nhan",
  "truyen-tuong-tac",
  "truyen-lua-chon-nhanh"
] as const;

/** content_type không thuộc form truyện — dùng module khác (content-hub, reels, editorial). */
export const NON_STORY_CONTENT_TYPE_SLUGS = [
  "reels-truyen",
  "bai-viet",
  "thong-bao",
  "huong-dan-viet-truyen",
  "review-cam-nhan-truyen"
] as const;

/** Thể loại chính luôn hiển thị cuối danh sách chọn (sau sắp A–Z). */
export const MAIN_GENRE_PIN_TO_END_SLUGS = ["the-loai-khac"] as const;

/** Admin/system-only taxonomy groups. */
export const ADMIN_ONLY_TAXONOMY_TYPES: TaxonomyType[] = [
  "editorial_tag",
  "monetization_access"
];

/** Required before publish (in addition to legacy story fields). */
export const PUBLISH_REQUIRED_TAXONOMY_TYPES: TaxonomyType[] = [
  "content_type",
  "main_genre",
  "age_rating",
  "presentation_mode"
];

export const PRESENTATION_MODE_SLUGS = [
  "standard_prose",
  "chat_story",
  "social_feed",
  "case_file",
  "diary",
  "system_game",
  "script",
  "mixed_media"
] as const;

export type PresentationModeSlug = (typeof PRESENTATION_MODE_SLUGS)[number];

export const TAXONOMY_TYPE_LABELS: Record<TaxonomyType, string> = {
  content_type: "Loại nội dung",
  main_genre: "Thể loại chính",
  subgenre: "Thể loại phụ",
  trope_tag: "Chủ đề / motif",
  setting_tag: "Bối cảnh",
  character_tag: "Kiểu nhân vật",
  relationship_tag: "Quan hệ / tình cảm",
  narrative_style: "Cách kể",
  presentation_mode: "Cách trình bày",
  reader_experience: "Cảm giác đọc",
  content_warning: "Cảnh báo nội dung",
  age_rating: "Độ tuổi",
  story_status: "Trạng thái truyện",
  monetization_access: "Truy cập / kiếm tiền",
  editorial_tag: "Nhãn biên tập"
};
