import type {
  ComposerBlockDataMap,
  ComposerBlockType,
  ComposerStructuredContent
} from "@/lib/composer/types";

export const COMPOSER_SCHEMA_VERSION = 1 as const;

export const BLOCK_DEFAULT_DATA: {
  [K in ComposerBlockType]: ComposerBlockDataMap[K];
} = {
  heading: { level: 2, text: "" },
  prose: { text: "" },
  quote: { text: "", source: "" },
  divider: { style: "line" },
  image: { media_id: "", caption: "", alt: "" },
  chat_message: {
    character_id: "",
    character_name: "",
    side: "left",
    text: "",
    time: "",
    status: "sent"
  },
  chat_system: { text: "" },
  chat_missed_call: {
    character_name: "",
    call_type: "voice",
    status: "missed",
    time: ""
  },
  chat_voice_note: {
    character_name: "",
    side: "left",
    duration_seconds: 12,
    transcript: ""
  },
  social_post: {
    author_name: "",
    body: "",
    timestamp: "",
    fake_like_count: "",
    fake_comment_count: ""
  },
  social_comment: { author_name: "", body: "", level: 0 },
  social_reaction: { reaction: "like", count_text: "" },
  case_summary: { case_code: "", title: "", status: "", summary: "" },
  case_timeline: { title: "Dòng thời gian", items: [{ time: "", content: "" }] },
  case_evidence: {
    title: "Bằng chứng",
    items: [{ label: "", content: "", media_id: null }]
  },
  case_suspect: { name: "", role: "", motive: "", note: "" },
  case_note: { title: "", content: "" },
  diary_entry: {
    date: "",
    location: "",
    mood: "",
    title: "",
    content: ""
  },
  system_notice: { title: "", content: "", tone: "neutral" },
  system_stats: { title: "Trạng thái", items: [{ label: "", value: "" }] },
  system_quest: { title: "", objective: "", difficulty: "", status: "" },
  system_reward: { title: "Phần thưởng", items: [""] },
  script_dialogue: { character_name: "", dialogue: "" },
  script_action: { action: "" },
  choice_node: { node_id: "", title: "", content: "" },
  choice_option: { label: "", target_node_id: "" }
};

export function getDefaultBlockData<T extends ComposerBlockType>(
  type: T
): ComposerBlockDataMap[T] {
  return structuredClone(BLOCK_DEFAULT_DATA[type]);
}

export function createEmptyMetadata(): ComposerStructuredContent["metadata"] {
  return {
    characters: [],
    warnings: [],
    composer_version: COMPOSER_SCHEMA_VERSION
  };
}
