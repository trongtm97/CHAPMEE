/**
 * ChapMee Studio Composer — central types.
 * PresentationMode (T6) remains in @/types/presentation; ComposerMode extends it.
 */

export const COMPOSER_MODES = [
  "standard_prose",
  "chat_story",
  "social_feed",
  "case_file",
  "diary",
  "system_game",
  "script",
  "mixed_media",
  "branching_story"
] as const;

export type ComposerMode = (typeof COMPOSER_MODES)[number];

/** Composer content formats (superset of episode DB formats). */
export const COMPOSER_CONTENT_FORMATS = [
  "plain_text",
  "markdown",
  "rich_text",
  "structured_json",
  "structured_blocks"
] as const;

export type ComposerContentFormat = (typeof COMPOSER_CONTENT_FORMATS)[number];

export const COMPOSER_BLOCK_TYPES = [
  "heading",
  "prose",
  "quote",
  "divider",
  "image",
  "chat_message",
  "chat_system",
  "chat_missed_call",
  "chat_voice_note",
  "social_post",
  "social_comment",
  "social_reaction",
  "case_summary",
  "case_timeline",
  "case_evidence",
  "case_suspect",
  "case_note",
  "diary_entry",
  "system_notice",
  "system_stats",
  "system_quest",
  "system_reward",
  "script_dialogue",
  "script_action",
  "choice_node",
  "choice_option"
] as const;

export type ComposerBlockType = (typeof COMPOSER_BLOCK_TYPES)[number];

export type ComposerRenderContext = "public" | "preview" | "admin";

export type ComposerCharacterRef = {
  id: string;
  name: string;
  side?: "left" | "right";
};

export type ComposerStructuredMetadata = {
  characters: ComposerCharacterRef[];
  warnings: string[];
  composer_version: number;
};

/** Discriminated union — enables narrowing `block.data` by `block.type`. */
export type ComposerBlockUnion = {
  [K in ComposerBlockType]: {
    id: string;
    type: K;
    order: number;
    data: ComposerBlockDataMap[K];
  };
}[ComposerBlockType];

export type ComposerBlock<T extends ComposerBlockType = ComposerBlockType> =
  Extract<ComposerBlockUnion, { type: T }>;

export type ComposerStructuredContent = {
  version: 1;
  mode: ComposerMode;
  blocks: ComposerBlockUnion[];
  metadata: ComposerStructuredMetadata;
};

export type HeadingBlockData = { level: 1 | 2 | 3 | 4 | 5 | 6; text: string };
export type ProseBlockData = { text: string };
export type QuoteBlockData = { text: string; source: string };
export type DividerBlockData = { style: "line" | "dots" | "space" };
export type ImageBlockData = { media_id: string; caption: string; alt: string };

export type ChatMessageBlockData = {
  character_id: string;
  character_name: string;
  side: "left" | "right";
  text: string;
  time: string;
  status: "sent" | "delivered" | "seen";
};

export type ChatSystemBlockData = { text: string };

export type ChatMissedCallBlockData = {
  character_name: string;
  call_type: "voice" | "video";
  status: "missed" | "ended" | "declined";
  time: string;
};

export type ChatVoiceNoteBlockData = {
  character_name: string;
  side: "left" | "right";
  duration_seconds: number;
  transcript: string;
};

export type SocialPostBlockData = {
  author_name: string;
  body: string;
  timestamp: string;
  fake_like_count: string;
  fake_comment_count: string;
};

export type SocialCommentBlockData = {
  author_name: string;
  body: string;
  level: number;
};

export type SocialReactionBlockData = {
  reaction: string;
  count_text: string;
};

export type CaseSummaryBlockData = {
  case_code: string;
  title: string;
  status: string;
  summary: string;
};

export type CaseTimelineBlockData = {
  title: string;
  items: Array<{ time: string; content: string }>;
};

export type CaseEvidenceBlockData = {
  title: string;
  items: Array<{ label: string; content: string; media_id: string | null }>;
};

export type CaseSuspectBlockData = {
  name: string;
  role: string;
  motive: string;
  note: string;
};

export type CaseNoteBlockData = { title: string; content: string };

export type DiaryEntryBlockData = {
  date: string;
  location: string;
  mood: string;
  title: string;
  content: string;
};

export type SystemNoticeBlockData = {
  title: string;
  content: string;
  tone: "neutral" | "success" | "warning" | "danger";
};

export type SystemStatsBlockData = {
  title: string;
  items: Array<{ label: string; value: string }>;
};

export type SystemQuestBlockData = {
  title: string;
  objective: string;
  difficulty: string;
  status: string;
};

export type SystemRewardBlockData = {
  title: string;
  items: string[];
};

export type ScriptDialogueBlockData = {
  character_name: string;
  dialogue: string;
};

export type ScriptActionBlockData = { action: string };

export type ChoiceNodeBlockData = {
  node_id: string;
  title: string;
  content: string;
};

export type ChoiceOptionBlockData = {
  label: string;
  target_node_id: string;
};

export type ComposerBlockDataMap = {
  heading: HeadingBlockData;
  prose: ProseBlockData;
  quote: QuoteBlockData;
  divider: DividerBlockData;
  image: ImageBlockData;
  chat_message: ChatMessageBlockData;
  chat_system: ChatSystemBlockData;
  chat_missed_call: ChatMissedCallBlockData;
  chat_voice_note: ChatVoiceNoteBlockData;
  social_post: SocialPostBlockData;
  social_comment: SocialCommentBlockData;
  social_reaction: SocialReactionBlockData;
  case_summary: CaseSummaryBlockData;
  case_timeline: CaseTimelineBlockData;
  case_evidence: CaseEvidenceBlockData;
  case_suspect: CaseSuspectBlockData;
  case_note: CaseNoteBlockData;
  diary_entry: DiaryEntryBlockData;
  system_notice: SystemNoticeBlockData;
  system_stats: SystemStatsBlockData;
  system_quest: SystemQuestBlockData;
  system_reward: SystemRewardBlockData;
  script_dialogue: ScriptDialogueBlockData;
  script_action: ScriptActionBlockData;
  choice_node: ChoiceNodeBlockData;
  choice_option: ChoiceOptionBlockData;
};

export type ComposerValidationLevel = "error" | "warning" | "info";

export type ComposerValidationIssue = {
  code: string;
  message: string;
  blockId?: string;
  /** @deprecated Prefer `level` */
  severity: ComposerValidationLevel;
  level?: ComposerValidationLevel;
  field?: string;
};

export type ComposerValidationStats = {
  block_count: number;
  media_count: number;
  empty_blocks: number;
  unsupported_blocks: number;
};

export type ComposerValidationReport = {
  valid: boolean;
  errors: ComposerValidationIssue[];
  warnings: ComposerValidationIssue[];
  info: ComposerValidationIssue[];
  stats: ComposerValidationStats;
};

export type ComposerValidationResult = {
  ok: boolean;
  errors: ComposerValidationIssue[];
  warnings: ComposerValidationIssue[];
};
