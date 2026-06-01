import type { PresentationMode } from "@/types/presentation";

export const PRESENTATION_SCHEMA_HINTS: Partial<Record<PresentationMode, string>> = {
  chat_story: "Thêm nhân vật (trái/phải) và tin nhắn. System message hiển thị giữa màn hình.",
  case_file:
    "Hồ sơ hư cấu: tóm tắt, timeline, bằng chứng. Không dùng cho tài liệu pháp lý thật.",
  diary: "Mỗi entry có ngày, địa điểm, tâm trạng và nội dung.",
  system_game: "Xen kẽ thông báo hệ thống, chỉ số, phần thưởng và đoạn văn xuôi.",
  social_feed: "Bài đăng giả lập mạng xã hội — tên, handle, nội dung, tương tác.",
  script: "Kịch bản: cảnh, hành động, thoại nhân vật.",
  mixed_media: "Ghép văn xuôi, trích dẫn, thông báo và ngăn cách."
};
