import {
  CONTENT_FORMATS,
  PRESENTATION_MODES,
  type ContentFormat,
  type PresentationMode
} from "@/types/presentation";

export const PRESENTATION_MODE_LABELS: Record<PresentationMode, string> = {
  standard_prose: "Văn xuôi",
  chat_story: "Chat story",
  social_feed: "Social feed",
  case_file: "Hồ sơ vụ án",
  diary: "Nhật ký",
  system_game: "Hệ thống / game",
  script: "Kịch bản",
  mixed_media: "Hỗn hợp"
};

export const STRUCTURED_PRESENTATION_MODES = [
  "chat_story",
  "social_feed",
  "case_file",
  "diary",
  "system_game",
  "script",
  "mixed_media"
] as const satisfies readonly PresentationMode[];

export type StructuredPresentationMode = (typeof STRUCTURED_PRESENTATION_MODES)[number];

export function isPresentationMode(value: string): value is PresentationMode {
  return (PRESENTATION_MODES as readonly string[]).includes(value);
}

export function isContentFormat(value: string): value is ContentFormat {
  return (CONTENT_FORMATS as readonly string[]).includes(value);
}

export function isStructuredPresentationMode(
  mode: PresentationMode
): mode is StructuredPresentationMode {
  return (STRUCTURED_PRESENTATION_MODES as readonly string[]).includes(mode);
}

export function modeUsesStructuredContent(mode: PresentationMode): boolean {
  return isStructuredPresentationMode(mode);
}
