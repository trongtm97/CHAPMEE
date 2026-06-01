import { getAllowedBlocksForMode, COMPOSER_MODE_LABELS } from "@/lib/composer/modes";
import type { ComposerBlockType, ComposerMode } from "@/lib/composer/types";

export type ComposerValidationSettings = {
  require_publishing_check: boolean;
  require_preview_before_publish: boolean;
  block_publish_when_critical: boolean;
  allow_publish_with_warning: boolean;
  require_ownership_confirmation: boolean;
  require_sensitive_tag_warning_confirmation: boolean;
  check_invalid_block_schema: boolean;
  check_empty_blocks: boolean;
  check_block_order: boolean;
  check_missing_chat_character: boolean;
  check_branching_dead_ends: boolean;
  check_unused_media: boolean;
  check_system_game_required_panels: boolean;
  check_case_file_required_sections: boolean;
  max_blocks_per_chapter: number;
  max_timeline_items: number;
  max_stats_items: number;
  max_evidence_items: number;
  max_characters_per_message: number;
  max_media_items_per_chapter: number;
  max_branch_depth: number;
  max_options_per_choice_block: number;
  severity_map: Record<string, "error" | "warning" | "info" | "disabled">;
  allow_branching_public: boolean;
  allow_mixed_media: boolean;
  allow_voice_note_audio_upload: boolean;
  allow_video_block: boolean;
  branching_missing_options_is_error: boolean;
};

export type ComposerModeRegistryEntry = {
  mode: ComposerMode;
  label: string;
  description: string;
  is_active: boolean;
  is_creator_selectable: boolean;
  default_for_content_type: string | null;
  supports_single_part_story: boolean;
  supports_multi_chapter_story: boolean;
  supports_reels_excerpt: boolean;
  supports_paid_content: boolean;
  supports_comments: boolean;
  recommended_for: string[];
  sort_order: number;
};

export type ComposerBlockTypeRegistryEntry = {
  block_type: ComposerBlockType;
  modes: ComposerMode[];
  label: string;
  description: string;
  category: string;
  is_active: boolean;
  is_creator_selectable: boolean;
  requires_media: boolean;
  supports_mobile_preview: boolean;
  schema_version: number;
  validation_rules: string[];
  sort_order: number;
};

export type ComposerTemplateRegistryEntry = {
  id: string;
  name: string;
  slug: string;
  mode_key: ComposerMode;
  content_structure: "single_part" | "multi_chapter" | "both";
  description: string | null;
  starter_blocks_json: Record<string, unknown>;
  preview_text: string | null;
  active: boolean;
  creator_selectable: boolean;
  sort_order: number;
  updated_at?: string | null;
};

export const DEFAULT_COMPOSER_VALIDATION_SETTINGS: ComposerValidationSettings = {
  require_publishing_check: true,
  require_preview_before_publish: false,
  block_publish_when_critical: true,
  allow_publish_with_warning: true,
  require_ownership_confirmation: true,
  require_sensitive_tag_warning_confirmation: true,
  check_invalid_block_schema: true,
  check_empty_blocks: true,
  check_block_order: true,
  check_missing_chat_character: true,
  check_branching_dead_ends: true,
  check_unused_media: true,
  check_system_game_required_panels: true,
  check_case_file_required_sections: true,
  max_blocks_per_chapter: 500,
  max_timeline_items: 50,
  max_stats_items: 50,
  max_evidence_items: 50,
  max_characters_per_message: 2000,
  max_media_items_per_chapter: 120,
  max_branch_depth: 10,
  max_options_per_choice_block: 6,
  severity_map: {
    missing_required_character: "error",
    unused_media: "warning",
    missing_story_hook: "info"
  },
  allow_branching_public: false,
  allow_mixed_media: true,
  allow_voice_note_audio_upload: false,
  allow_video_block: false,
  branching_missing_options_is_error: false
};

function defaultModeRegistry(): ComposerModeRegistryEntry[] {
  return (Object.keys(COMPOSER_MODE_LABELS) as ComposerMode[]).map((mode, index) => ({
    mode,
    label: COMPOSER_MODE_LABELS[mode],
    description: "",
    is_active: true,
    is_creator_selectable: mode !== "branching_story",
    default_for_content_type: null,
    supports_single_part_story: true,
    supports_multi_chapter_story: true,
    supports_reels_excerpt: true,
    supports_paid_content: true,
    supports_comments: true,
    recommended_for: [],
    sort_order: index
  }));
}

function getBlockCategory(blockType: ComposerBlockType): string {
  if (
    blockType === "heading" ||
    blockType === "prose" ||
    blockType === "quote" ||
    blockType === "divider" ||
    blockType === "image"
  ) {
    return "basic";
  }
  if (
    blockType === "chat_message" ||
    blockType === "chat_system" ||
    blockType === "chat_missed_call" ||
    blockType === "chat_voice_note"
  ) {
    return "chat_story";
  }
  if (
    blockType === "social_post" ||
    blockType === "social_comment" ||
    blockType === "social_reaction"
  ) {
    return "social_feed";
  }
  if (
    blockType === "case_summary" ||
    blockType === "case_timeline" ||
    blockType === "case_evidence" ||
    blockType === "case_suspect" ||
    blockType === "case_note"
  ) {
    return "case_file";
  }
  if (blockType === "diary_entry") {
    return "diary";
  }
  if (
    blockType === "system_notice" ||
    blockType === "system_stats" ||
    blockType === "system_quest" ||
    blockType === "system_reward"
  ) {
    return "system_game";
  }
  if (blockType === "choice_node" || blockType === "choice_option") {
    return "branching";
  }
  return "other";
}

function defaultBlockRegistry(): ComposerBlockTypeRegistryEntry[] {
  const entries: ComposerBlockTypeRegistryEntry[] = [];
  const seen = new Set<string>();

  for (const mode of Object.keys(COMPOSER_MODE_LABELS) as ComposerMode[]) {
    for (const blockType of getAllowedBlocksForMode(mode)) {
      if (seen.has(blockType)) {
        const row = entries.find((e) => e.block_type === blockType);
        if (row && !row.modes.includes(mode)) {
          row.modes.push(mode);
        }
        continue;
      }
      seen.add(blockType);
      entries.push({
        block_type: blockType,
        modes: [mode],
        label: blockType,
        description: "",
        category: getBlockCategory(blockType),
        is_active: true,
        is_creator_selectable: true,
        requires_media: blockType === "image",
        supports_mobile_preview: true,
        schema_version: 1,
        validation_rules: [],
        sort_order: entries.length
      });
    }
  }

  return entries;
}

export type ComposerAdminSettingsBundle = {
  validation: ComposerValidationSettings;
  modes: ComposerModeRegistryEntry[];
  blockTypes: ComposerBlockTypeRegistryEntry[];
  templates: ComposerTemplateRegistryEntry[];
};

export function getDefaultComposerAdminSettings(): ComposerAdminSettingsBundle {
  return {
    validation: { ...DEFAULT_COMPOSER_VALIDATION_SETTINGS },
    modes: defaultModeRegistry(),
    blockTypes: defaultBlockRegistry(),
    templates: []
  };
}

export function mergeValidationSettings(raw: unknown): ComposerValidationSettings {
  const base = DEFAULT_COMPOSER_VALIDATION_SETTINGS;
  if (!raw || typeof raw !== "object") {
    return base;
  }
  const record = raw as Record<string, unknown>;
  return {
    require_publishing_check:
      typeof record.require_publishing_check === "boolean"
        ? record.require_publishing_check
        : base.require_publishing_check,
    require_preview_before_publish:
      typeof record.require_preview_before_publish === "boolean"
        ? record.require_preview_before_publish
        : base.require_preview_before_publish,
    block_publish_when_critical:
      typeof record.block_publish_when_critical === "boolean"
        ? record.block_publish_when_critical
        : base.block_publish_when_critical,
    allow_publish_with_warning:
      typeof record.allow_publish_with_warning === "boolean"
        ? record.allow_publish_with_warning
        : base.allow_publish_with_warning,
    require_ownership_confirmation:
      typeof record.require_ownership_confirmation === "boolean"
        ? record.require_ownership_confirmation
        : base.require_ownership_confirmation,
    require_sensitive_tag_warning_confirmation:
      typeof record.require_sensitive_tag_warning_confirmation === "boolean"
        ? record.require_sensitive_tag_warning_confirmation
        : base.require_sensitive_tag_warning_confirmation,
    check_invalid_block_schema:
      typeof record.check_invalid_block_schema === "boolean"
        ? record.check_invalid_block_schema
        : base.check_invalid_block_schema,
    check_empty_blocks:
      typeof record.check_empty_blocks === "boolean"
        ? record.check_empty_blocks
        : base.check_empty_blocks,
    check_block_order:
      typeof record.check_block_order === "boolean"
        ? record.check_block_order
        : base.check_block_order,
    check_missing_chat_character:
      typeof record.check_missing_chat_character === "boolean"
        ? record.check_missing_chat_character
        : base.check_missing_chat_character,
    check_branching_dead_ends:
      typeof record.check_branching_dead_ends === "boolean"
        ? record.check_branching_dead_ends
        : base.check_branching_dead_ends,
    check_unused_media:
      typeof record.check_unused_media === "boolean"
        ? record.check_unused_media
        : base.check_unused_media,
    check_system_game_required_panels:
      typeof record.check_system_game_required_panels === "boolean"
        ? record.check_system_game_required_panels
        : base.check_system_game_required_panels,
    check_case_file_required_sections:
      typeof record.check_case_file_required_sections === "boolean"
        ? record.check_case_file_required_sections
        : base.check_case_file_required_sections,
    max_blocks_per_chapter:
      Number(record.max_blocks_per_chapter) > 0
        ? Number(record.max_blocks_per_chapter)
        : base.max_blocks_per_chapter,
    max_timeline_items:
      Number(record.max_timeline_items) > 0
        ? Number(record.max_timeline_items)
        : base.max_timeline_items,
    max_stats_items:
      Number(record.max_stats_items) > 0
        ? Number(record.max_stats_items)
        : base.max_stats_items,
    max_evidence_items:
      Number(record.max_evidence_items) > 0
        ? Number(record.max_evidence_items)
        : base.max_evidence_items,
    max_characters_per_message:
      Number(record.max_characters_per_message) > 0
        ? Number(record.max_characters_per_message)
        : base.max_characters_per_message,
    max_media_items_per_chapter:
      Number(record.max_media_items_per_chapter) > 0
        ? Number(record.max_media_items_per_chapter)
        : base.max_media_items_per_chapter,
    max_branch_depth:
      Number(record.max_branch_depth) > 0
        ? Number(record.max_branch_depth)
        : base.max_branch_depth,
    max_options_per_choice_block:
      Number(record.max_options_per_choice_block) > 0
        ? Number(record.max_options_per_choice_block)
        : base.max_options_per_choice_block,
    severity_map:
      record.severity_map && typeof record.severity_map === "object"
        ? {
            ...base.severity_map,
            ...(record.severity_map as Record<
              string,
              "error" | "warning" | "info" | "disabled"
            >)
          }
        : base.severity_map,
    allow_branching_public:
      typeof record.allow_branching_public === "boolean"
        ? record.allow_branching_public
        : base.allow_branching_public,
    allow_mixed_media:
      typeof record.allow_mixed_media === "boolean"
        ? record.allow_mixed_media
        : base.allow_mixed_media,
    allow_voice_note_audio_upload:
      typeof record.allow_voice_note_audio_upload === "boolean"
        ? record.allow_voice_note_audio_upload
        : base.allow_voice_note_audio_upload,
    allow_video_block:
      typeof record.allow_video_block === "boolean"
        ? record.allow_video_block
        : base.allow_video_block,
    branching_missing_options_is_error:
      typeof record.branching_missing_options_is_error === "boolean"
        ? record.branching_missing_options_is_error
        : base.branching_missing_options_is_error
  };
}

export function mergeModeSettings(raw: unknown): ComposerModeRegistryEntry[] {
  const defaults = defaultModeRegistry();
  if (!Array.isArray(raw)) {
    return defaults;
  }
  const byMode = new Map(defaults.map((item) => [item.mode, item]));
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const record = row as Partial<ComposerModeRegistryEntry> & { mode?: ComposerMode };
    if (!record.mode || !byMode.has(record.mode)) continue;
    const base = byMode.get(record.mode)!;
    byMode.set(record.mode, {
      ...base,
      ...record,
      recommended_for: Array.isArray(record.recommended_for)
        ? record.recommended_for.filter((item): item is string => typeof item === "string")
        : base.recommended_for
    });
  }
  return [...byMode.values()].sort((a, b) => a.sort_order - b.sort_order);
}

export function mergeBlockTypeSettings(raw: unknown): ComposerBlockTypeRegistryEntry[] {
  const defaults = defaultBlockRegistry();
  if (!Array.isArray(raw)) {
    return defaults;
  }
  const byType = new Map(defaults.map((item) => [item.block_type, item]));
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const record = row as Partial<ComposerBlockTypeRegistryEntry> & {
      block_type?: ComposerBlockType;
    };
    if (!record.block_type || !byType.has(record.block_type)) continue;
    const base = byType.get(record.block_type)!;
    byType.set(record.block_type, {
      ...base,
      ...record,
      modes: Array.isArray(record.modes) ? record.modes : base.modes,
      validation_rules: Array.isArray(record.validation_rules)
        ? record.validation_rules.filter((item): item is string => typeof item === "string")
        : base.validation_rules
    });
  }
  return [...byType.values()].sort((a, b) => a.sort_order - b.sort_order);
}

export function isModeActiveForCreators(
  settings: ComposerAdminSettingsBundle,
  mode: ComposerMode
): boolean {
  const row = settings.modes.find((m) => m.mode === mode);
  if (!row) {
    return mode !== "branching_story";
  }
  return row.is_active && row.is_creator_selectable;
}

export function isBlockTypeActive(
  settings: ComposerAdminSettingsBundle,
  mode: ComposerMode,
  blockType: ComposerBlockType
): boolean {
  if (settings.blockTypes.length === 0) {
    return getAllowedBlocksForMode(mode).includes(blockType);
  }
  const row = settings.blockTypes.find((b) => b.block_type === blockType);
  if (!row) {
    return getAllowedBlocksForMode(mode).includes(blockType);
  }
  return row.is_active && row.is_creator_selectable && row.modes.includes(mode);
}
