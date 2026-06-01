import { COMPOSER_MODE_LABELS } from "@/lib/composer/modes";
import { getDefaultBlockData } from "@/lib/composer/schema";
import type { ComposerMode } from "@/lib/composer/types";
import type {
  ComposerBlock,
  ComposerBlockDataMap,
  ComposerBlockType,
  ComposerBlockUnion
} from "@/lib/composer/types";

export const BLOCK_TYPE_LABELS: Record<ComposerBlockType, string> = {
  heading: "Tiêu đề",
  prose: "Đoạn văn",
  quote: "Trích dẫn",
  divider: "Ngăn cách",
  image: "Ảnh nội bộ",
  chat_message: "Tin nhắn",
  chat_system: "Hệ thống chat",
  chat_missed_call: "Cuộc gọi nhỡ",
  chat_voice_note: "Voice note (giả lập)",
  social_post: "Bài đăng",
  social_comment: "Bình luận",
  social_reaction: "Cảm xúc",
  case_summary: "Tóm tắt vụ án",
  case_timeline: "Dòng thời gian",
  case_evidence: "Bằng chứng",
  case_suspect: "Nghi phạm",
  case_note: "Ghi chú điều tra",
  diary_entry: "Mục nhật ký",
  system_notice: "Thông báo hệ thống",
  system_stats: "Chỉ số",
  system_quest: "Nhiệm vụ",
  system_reward: "Phần thưởng",
  script_dialogue: "Thoại",
  script_action: "Hành động",
  choice_node: "Nút lựa chọn",
  choice_option: "Lựa chọn"
};

export const BLOCK_TYPE_DESCRIPTIONS: Record<ComposerBlockType, string> = {
  heading: "Tiêu đề cấp 1–6 cho văn xuôi.",
  prose: "Đoạn văn thuần, hỗ trợ xuống dòng.",
  quote: "Trích dẫn kèm nguồn tùy chọn.",
  divider: "Đường kẻ hoặc khoảng cách giữa các phần.",
  image: "Ảnh từ media_id nội bộ (không URL ngoài).",
  chat_message: "Tin nhắn trái/phải theo nhân vật.",
  chat_system: "Dòng trạng thái hệ thống trong chat.",
  chat_missed_call: "Cuộc gọi nhỡ / từ chối (giả lập).",
  chat_voice_note: "Voice note giả lập, có transcript.",
  social_post: "Bài đăng mạng xã hội giả lập.",
  social_comment: "Bình luận lồng nhau.",
  social_reaction: "Hàng cảm xúc / lượt thích.",
  case_summary: "Mã vụ án, trạng thái, tóm tắt.",
  case_timeline: "Sự kiện theo thời gian.",
  case_evidence: "Danh sách bằng chứng.",
  case_suspect: "Hồ sơ nghi phạm.",
  case_note: "Ghi chú điều tra.",
  diary_entry: "Một ngày trong nhật ký nhân vật.",
  system_notice: "Panel thông báo LitRPG.",
  system_stats: "Bảng chỉ số nhân vật.",
  system_quest: "Nhiệm vụ / quest.",
  system_reward: "Danh sách phần thưởng.",
  script_dialogue: "Thoại nhân vật.",
  script_action: "Mô tả hành động / bối cảnh.",
  choice_node: "Điểm rẽ nhánh (chưa tương tác công khai).",
  choice_option: "Lựa chọn dẫn tới node khác."
};

let blockIdCounter = 0;

export function generateBlockId(): string {
  blockIdCounter += 1;
  return `block_${Date.now().toString(36)}_${blockIdCounter}`;
}

export function createBlock<T extends ComposerBlockType>(
  blockType: T,
  partial?: Partial<ComposerBlockDataMap[T]>,
  order?: number
): Extract<ComposerBlockUnion, { type: T }> {
  const data = {
    ...getDefaultBlockData(blockType),
    ...partial
  } as ComposerBlockDataMap[T];

  return {
    id: generateBlockId(),
    type: blockType,
    order: order ?? 0,
    data
  } as Extract<ComposerBlockUnion, { type: T }>;
}

export function getBlockTypeLabel(blockType: ComposerBlockType): string {
  return BLOCK_TYPE_LABELS[blockType];
}

export function getBlockTypeDescription(blockType: ComposerBlockType): string {
  return BLOCK_TYPE_DESCRIPTIONS[blockType];
}

export function getComposerModeLabel(mode: ComposerMode): string {
  return COMPOSER_MODE_LABELS[mode];
}

export function duplicateBlock(block: ComposerBlockUnion): ComposerBlockUnion {
  return {
    ...structuredClone(block),
    id: generateBlockId()
  };
}
