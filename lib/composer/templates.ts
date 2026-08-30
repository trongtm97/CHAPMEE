import { createBlock } from "@/lib/composer/blocks";
import { createEmptyMetadata, COMPOSER_SCHEMA_VERSION } from "@/lib/composer/schema";
import type {
  ComposerBlockUnion,
  ComposerMode,
  ComposerStructuredContent
} from "@/lib/composer/types";

function normalizeBlockOrder(blocks: ComposerBlockUnion[]): ComposerBlockUnion[] {
  return blocks.map((block, index) => ({ ...block, order: index + 1 }));
}

function buildDocument(
  mode: ComposerMode,
  blocks: ReturnType<typeof createBlock>[]
): ComposerStructuredContent {
  return {
    version: COMPOSER_SCHEMA_VERSION,
    mode,
    blocks: normalizeBlockOrder(blocks),
    metadata: createEmptyMetadata()
  };
}

export function getDefaultTemplateForMode(mode: ComposerMode): ComposerStructuredContent {
  switch (mode) {
    case "chat_story":
      return buildDocument(mode, [
        createBlock("chat_message", {
          character_id: "a",
          character_name: "Lan",
          side: "left",
          text: "Cậu còn thức không?",
          time: "00:03",
          status: "sent"
        }),
        createBlock("chat_message", {
          character_id: "b",
          character_name: "Minh",
          side: "right",
          text: "Có chuyện gì vậy?",
          time: "00:04",
          status: "delivered"
        }),
        createBlock("chat_system", { text: "Minh đang nhập..." }),
        createBlock("chat_missed_call", {
          character_name: "Lan",
          call_type: "voice",
          status: "missed",
          time: "00:05"
        }),
        createBlock("chat_voice_note", {
          character_name: "Minh",
          side: "right",
          duration_seconds: 12,
          transcript: "Nghe voice note này nhé..."
        })
      ]);
    case "case_file":
      return buildDocument(mode, [
        createBlock("case_summary", {
          case_code: "CF-017",
          title: "Hồ sơ số 17",
          status: "Đang điều tra",
          summary: "Một vụ việc hư cấu trong tòa nhà cũ."
        }),
        createBlock("case_timeline", {
          title: "Dòng thời gian",
          items: [{ time: "22:10", content: "Nạn nhân rời khỏi quán." }]
        }),
        createBlock("case_evidence", {
          title: "Bằng chứng",
          items: [{ label: "Bằng chứng A", content: "Một chiếc chìa khóa gãy.", media_id: null }]
        }),
        createBlock("case_suspect", {
          name: "Không rõ",
          role: "Nhân chứng",
          motive: "",
          note: "Mặt áo khoác tối màu."
        }),
        createBlock("case_note", {
          title: "Ghi chú",
          content: "Cần đối chiếu camera hành lang."
        })
      ]);
    case "diary":
      return buildDocument(mode, [
        createBlock("diary_entry", {
          date: "2026-05-31",
          location: "Sài Gòn",
          mood: "Mưa nhẹ",
          title: "Ngày đầu tiên",
          content: "Hôm nay trời mưa nhẹ. Tôi viết những dòng đầu tiên..."
        }),
        createBlock("quote", {
          text: "Mưa làm lòng người dịu lại.",
          source: ""
        })
      ]);
    case "system_game":
      return buildDocument(mode, [
        createBlock("system_notice", {
          title: "Nhiệm vụ mới",
          content: "Sống sót qua đêm đầu tiên.",
          tone: "success"
        }),
        createBlock("system_stats", {
          title: "Trạng thái",
          items: [
            { label: "Cấp", value: "3" },
            { label: "HP", value: "80/100" }
          ]
        }),
        createBlock("system_quest", {
          title: "Đêm đầu tiên",
          objective: "Tìm nơi trú ẩn an toàn.",
          difficulty: "Dễ",
          status: "Đang làm"
        }),
        createBlock("system_reward", {
          title: "Phần thưởng",
          items: ["+50 EXP", "Vật phẩm: Bình nước"]
        }),
        createBlock("prose", {
          text: "Tôi nhìn màn hình xanh hiện ra trước mắt..."
        })
      ]);
    case "social_feed":
      return buildDocument(mode, [
        createBlock("social_post", {
          author_name: "@lan",
          body: "Đêm nay không ngủ được.",
          timestamp: "2h",
          fake_like_count: "128",
          fake_comment_count: "12"
        }),
        createBlock("social_comment", {
          author_name: "@minh",
          body: "Sao vậy?",
          level: 0
        })
      ]);
    case "script":
      return buildDocument(mode, [
        createBlock("heading", { level: 2, text: "CẢNH 1 — NỘI THÀNH" }),
        createBlock("script_action", { action: "Lan đứng bên cửa sổ, nhìn mưa." }),
        createBlock("script_dialogue", {
          character_name: "LAN",
          dialogue: "Trời mưa hoài."
        })
      ]);
    case "branching_story":
      return buildDocument(mode, [
        createBlock("choice_node", {
          node_id: "start",
          title: "Bắt đầu",
          content: "Bạn đứng trước ngã ba."
        }),
        createBlock("choice_option", { label: "Rẽ trái", target_node_id: "left" }),
        createBlock("choice_option", { label: "Rẽ phải", target_node_id: "right" }),
        createBlock("choice_node", {
          node_id: "left",
          title: "Con đường bên trái",
          content: "Lối mờ dẫn vào khu vườn yên ắng."
        }),
        createBlock("choice_node", {
          node_id: "right",
          title: "Con đường bên phải",
          content: "Ánh đèn leo lét phía cuối hành lang."
        })
      ]);
    case "mixed_media":
      return buildDocument(mode, [
        createBlock("heading", { level: 2, text: "Hỗn hợp" }),
        createBlock("prose", { text: "Đoạn mở đầu..." }),
        createBlock("divider", { style: "line" })
      ]);
    case "standard_prose":
    default:
      return buildDocument("standard_prose", [
        createBlock("heading", { level: 2, text: "Tiêu đề chương" }),
        createBlock("prose", { text: "Nội dung chương..." }),
        createBlock("divider", { style: "line" })
      ]);
  }
}

export function createEmptyStructuredContent(mode: ComposerMode): ComposerStructuredContent {
  return getDefaultTemplateForMode(mode);
}
