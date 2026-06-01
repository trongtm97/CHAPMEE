export const PRESENTATION_MODES = [
  "standard_prose",
  "chat_story",
  "social_feed",
  "case_file",
  "diary",
  "system_game",
  "script",
  "mixed_media"
] as const;

export type PresentationMode = (typeof PRESENTATION_MODES)[number];

export const CONTENT_FORMATS = [
  "plain_text",
  "markdown",
  "rich_text",
  "structured_json",
  "structured_blocks"
] as const;

export type ContentFormat = (typeof CONTENT_FORMATS)[number];

export type ChatStoryCharacter = {
  id: string;
  name: string;
  avatar_url: string | null;
  side: "left" | "right";
};

export type ChatStoryMessage =
  | {
      type: "message";
      character_id: string;
      text: string;
      time?: string;
    }
  | {
      type: "system";
      text: string;
    };

export type ChatStoryStructuredContent = {
  characters: ChatStoryCharacter[];
  messages: ChatStoryMessage[];
};

export type CaseFileSection =
  | { type: "summary"; title: string; content: string }
  | {
      type: "timeline";
      title: string;
      items: Array<{ time: string; content: string }>;
    }
  | {
      type: "evidence";
      title: string;
      items: Array<{ label: string; content: string; media_id?: string | null }>;
    }
  | { type: "note"; title: string; content: string };

export type CaseFileStructuredContent = {
  case_title?: string;
  case_code?: string;
  status?: string;
  sections: CaseFileSection[];
};

export type DiaryStructuredContent = {
  entries: Array<{
    date?: string;
    location?: string;
    mood?: string;
    title?: string;
    content: string;
  }>;
};

export type SystemGameBlock =
  | { type: "system_notice"; title?: string; content: string }
  | {
      type: "stats";
      title?: string;
      items: Array<{ label: string; value: string }>;
    }
  | { type: "reward"; title?: string; items: string[] }
  | { type: "prose"; content: string };

export type SystemGameStructuredContent = {
  blocks: SystemGameBlock[];
};

export type SocialFeedPost = {
  author: string;
  handle?: string;
  time?: string;
  text: string;
  likes?: number;
  comments_count?: number;
};

export type SocialFeedStructuredContent = {
  platform?: string;
  posts: SocialFeedPost[];
};

export type ScriptLine =
  | { type: "scene"; text: string }
  | { type: "action"; text: string }
  | {
      type: "dialogue";
      speaker: string;
      text: string;
      parenthetical?: string;
    };

export type ScriptStructuredContent = {
  lines: ScriptLine[];
};

export type MixedMediaBlock =
  | { type: "prose"; content: string }
  | { type: "notice"; title?: string; content: string }
  | { type: "quote"; content: string; attribution?: string }
  | { type: "divider" };

export type MixedMediaStructuredContent = {
  blocks: MixedMediaBlock[];
};

export type StructuredContentByMode = {
  standard_prose: null;
  chat_story: ChatStoryStructuredContent;
  social_feed: SocialFeedStructuredContent;
  case_file: CaseFileStructuredContent;
  diary: DiaryStructuredContent;
  system_game: SystemGameStructuredContent;
  script: ScriptStructuredContent;
  mixed_media: MixedMediaStructuredContent;
};
