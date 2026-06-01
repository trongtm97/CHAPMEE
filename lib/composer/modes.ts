import type { ComposerBlockType, ComposerMode } from "@/lib/composer/types";
import type { PresentationMode } from "@/types/presentation";

export const COMPOSER_MODE_LABELS: Record<ComposerMode, string> = {
  standard_prose: "Văn xuôi",
  chat_story: "Chat story",
  social_feed: "Social feed",
  case_file: "Hồ sơ vụ án",
  diary: "Nhật ký",
  system_game: "Hệ thống / game",
  script: "Kịch bản",
  mixed_media: "Hỗn hợp",
  branching_story: "Truyện nhánh (chuẩn bị)"
};

const ALLOWED_BLOCKS_BY_MODE: Record<ComposerMode, readonly ComposerBlockType[]> = {
  standard_prose: ["heading", "prose", "quote", "image", "divider"],
  chat_story: [
    "prose",
    "chat_message",
    "chat_system",
    "chat_missed_call",
    "chat_voice_note",
    "image",
    "divider"
  ],
  social_feed: [
    "prose",
    "social_post",
    "social_comment",
    "social_reaction",
    "image",
    "divider"
  ],
  case_file: [
    "prose",
    "case_summary",
    "case_timeline",
    "case_evidence",
    "case_suspect",
    "case_note",
    "image",
    "divider"
  ],
  diary: ["diary_entry", "prose", "quote", "image", "divider"],
  system_game: [
    "prose",
    "system_notice",
    "system_stats",
    "system_quest",
    "system_reward",
    "divider"
  ],
  script: ["script_dialogue", "script_action", "heading", "prose", "divider"],
  mixed_media: [
    "heading",
    "prose",
    "quote",
    "image",
    "divider",
    "chat_message",
    "system_notice",
    "diary_entry"
  ],
  branching_story: [
    "choice_node",
    "choice_option",
    "prose",
    "heading",
    "image",
    "divider"
  ]
};

export function isComposerMode(value: string): value is ComposerMode {
  return (Object.keys(ALLOWED_BLOCKS_BY_MODE) as ComposerMode[]).includes(
    value as ComposerMode
  );
}

export function getAllowedBlocksForMode(mode: ComposerMode): ComposerBlockType[] {
  return [...ALLOWED_BLOCKS_BY_MODE[mode]];
}

export function isBlockAllowedForMode(
  mode: ComposerMode,
  blockType: ComposerBlockType
): boolean {
  return ALLOWED_BLOCKS_BY_MODE[mode].includes(blockType);
}

/** Maps Composer mode to T6 PresentationMode for legacy renderers. */
export function composerModeToPresentationMode(mode: ComposerMode): PresentationMode {
  if (mode === "branching_story") {
    return "standard_prose";
  }
  return mode;
}

export function presentationModeToComposerMode(
  mode: string | null | undefined
): ComposerMode {
  if (mode && isComposerMode(mode)) {
    return mode;
  }
  if (
    mode === "standard_prose" ||
    mode === "chat_story" ||
    mode === "social_feed" ||
    mode === "case_file" ||
    mode === "diary" ||
    mode === "system_game" ||
    mode === "script" ||
    mode === "mixed_media"
  ) {
    return mode;
  }
  return "standard_prose";
}

export function modeUsesComposerBlocks(mode: ComposerMode): boolean {
  return mode !== "standard_prose";
}
