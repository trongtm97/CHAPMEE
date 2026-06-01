import { BLOCK_TYPE_LABELS } from "@/lib/composer/blocks";
import type { ComposerBlockUnion } from "@/lib/composer/types";

export function getBlockSummary(block: ComposerBlockUnion): string {
  const label = BLOCK_TYPE_LABELS[block.type];

  switch (block.type) {
    case "heading":
      return block.data.text.trim() || `${label} (trống)`;
    case "prose":
      return block.data.text.trim().slice(0, 80) || `${label} (trống)`;
    case "quote":
      return block.data.text.trim().slice(0, 60) || `${label} (trống)`;
    case "divider":
      return `${label} — ${block.data.style}`;
    case "image":
      return block.data.media_id
        ? `${label}: ${block.data.media_id}`
        : `${label} (chưa chọn ảnh)`;
    case "chat_message":
      return `${block.data.character_name || "???"}: ${block.data.text.slice(0, 50)}`;
    case "chat_system":
      return block.data.text.slice(0, 70) || `${label} (trống)`;
    case "chat_missed_call":
      return `${block.data.character_name} — ${block.data.status}`;
    case "chat_voice_note":
      return `${block.data.character_name} — ${block.data.duration_seconds}s`;
    case "social_post":
      return `@${block.data.author_name}: ${block.data.body.slice(0, 50)}`;
    case "social_comment":
      return `${block.data.author_name}: ${block.data.body.slice(0, 50)}`;
    case "social_reaction":
      return `${block.data.reaction} ${block.data.count_text}`;
    case "case_summary":
      return `${block.data.case_code} ${block.data.title}`.trim() || label;
    case "case_timeline":
      return `${label} (${block.data.items.length} mục)`;
    case "case_evidence":
      return `${label} (${block.data.items.length} mục)`;
    case "case_suspect":
      return block.data.name || label;
    case "case_note":
      return block.data.title || block.data.content.slice(0, 50) || label;
    case "diary_entry":
      return block.data.title || block.data.content.slice(0, 50) || label;
    case "system_notice":
      return block.data.title || block.data.content.slice(0, 50) || label;
    case "system_stats":
      return `${label} (${block.data.items.length} chỉ số)`;
    case "system_quest":
      return block.data.title || label;
    case "system_reward":
      return `${label} (${block.data.items.length} phần)`;
    case "script_dialogue":
      return `${block.data.character_name}: ${block.data.dialogue.slice(0, 50)}`;
    case "script_action":
      return block.data.action.slice(0, 60) || label;
    case "choice_node":
      return block.data.title || block.data.node_id || label;
    case "choice_option":
      return `${block.data.label} → ${block.data.target_node_id}`;
    default:
      return label;
  }
}

export function blockHasContent(block: ComposerBlockUnion): boolean {
  const summary = getBlockSummary(block);
  return !summary.includes("(trống)") && !summary.includes("chưa chọn");
}
