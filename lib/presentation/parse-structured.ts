import { presentationModeToComposerMode } from "@/lib/composer/modes";
import { isComposerStructuredDocument } from "@/lib/composer/serializer";
import { validateComposerJsonForImport } from "@/lib/composer/validators";
import { modeUsesStructuredContent } from "@/lib/presentation/constants";
import type {
  CaseFileStructuredContent,
  ChatStoryStructuredContent,
  DiaryStructuredContent,
  MixedMediaStructuredContent,
  PresentationMode,
  ScriptStructuredContent,
  SocialFeedStructuredContent,
  SystemGameStructuredContent
} from "@/types/presentation";

export type ParseStructuredResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function parseChatStory(raw: unknown): ParseStructuredResult<ChatStoryStructuredContent> {
  if (!isRecord(raw)) {
    return { ok: false, error: "Chat story cần là object JSON." };
  }

  const charactersRaw = Array.isArray(raw.characters) ? raw.characters : [];
  const messagesRaw = Array.isArray(raw.messages) ? raw.messages : [];

  if (messagesRaw.length === 0) {
    return { ok: false, error: "Chat story cần ít nhất một tin nhắn." };
  }

  const characters = charactersRaw
    .map((item, index) => {
      if (!isRecord(item)) {
        return null;
      }
      const id = asString(item.id, `c${index + 1}`);
      const name = asString(item.name).trim();
      if (!name) {
        return null;
      }
      const side = item.side === "right" ? "right" : "left";
      return {
        id,
        name,
        avatar_url: typeof item.avatar_url === "string" ? item.avatar_url : null,
        side
      };
    })
    .filter((item): item is ChatStoryStructuredContent["characters"][number] =>
      Boolean(item)
    );

  const messages: ChatStoryStructuredContent["messages"] = [];

  for (const item of messagesRaw) {
    if (!isRecord(item)) {
      continue;
    }
    if (item.type === "system") {
      const text = asString(item.text).trim();
      if (text) {
        messages.push({ type: "system", text });
      }
      continue;
    }

    const text = asString(item.text).trim();
    const characterId = asString(item.character_id).trim();
    if (!text || !characterId) {
      continue;
    }
    messages.push({
      type: "message",
      character_id: characterId,
      text,
      time: asString(item.time).trim() || undefined
    });
  }

  if (messages.length === 0) {
    return { ok: false, error: "Không có tin nhắn hợp lệ." };
  }

  return { ok: true, data: { characters, messages } };
}

function parseCaseFile(raw: unknown): ParseStructuredResult<CaseFileStructuredContent> {
  if (!isRecord(raw)) {
    return { ok: false, error: "Case file cần là object JSON." };
  }

  const sectionsRaw = Array.isArray(raw.sections) ? raw.sections : [];
  if (sectionsRaw.length === 0) {
    return { ok: false, error: "Case file cần ít nhất một section." };
  }

  const sections: CaseFileStructuredContent["sections"] = [];

  for (const item of sectionsRaw) {
    if (!isRecord(item)) {
      continue;
    }
    const type = asString(item.type);
    const title = asString(item.title).trim() || "Mục";

    if (type === "summary" || type === "note") {
      const content = asString(item.content).trim();
      if (content) {
        sections.push({ type, title, content });
      }
      continue;
    }

    if (type === "timeline" || type === "evidence") {
      const itemsRaw = Array.isArray(item.items) ? item.items : [];
      const items = itemsRaw
        .map((row) => {
          if (!isRecord(row)) {
            return null;
          }
          if (type === "timeline") {
            const content = asString(row.content).trim();
            if (!content) {
              return null;
            }
            return { time: asString(row.time).trim(), content };
          }
          const content = asString(row.content).trim();
          const label = asString(row.label).trim() || "Mục";
          if (!content) {
            return null;
          }
          return { label, content };
        })
        .filter(Boolean) as Array<{ time: string; content: string } | { label: string; content: string }>;

      if (items.length > 0) {
        if (type === "timeline") {
          sections.push({
            type: "timeline",
            title,
            items: items as Array<{ time: string; content: string }>
          });
        } else {
          sections.push({
            type: "evidence",
            title,
            items: items as Array<{ label: string; content: string }>
          });
        }
      }
    }
  }

  if (sections.length === 0) {
    return { ok: false, error: "Không có section hợp lệ." };
  }

  return {
    ok: true,
    data: {
      case_title: asString(raw.case_title).trim() || undefined,
      case_code: asString(raw.case_code).trim() || undefined,
      status: asString(raw.status).trim() || undefined,
      sections
    }
  };
}

function parseDiary(raw: unknown): ParseStructuredResult<DiaryStructuredContent> {
  if (!isRecord(raw)) {
    return { ok: false, error: "Diary cần là object JSON." };
  }

  const entriesRaw = Array.isArray(raw.entries) ? raw.entries : [];
  const entries = entriesRaw
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }
      const content = asString(item.content).trim();
      if (!content) {
        return null;
      }
      return {
        date: asString(item.date).trim() || undefined,
        location: asString(item.location).trim() || undefined,
        mood: asString(item.mood).trim() || undefined,
        title: asString(item.title).trim() || undefined,
        content
      };
    })
    .filter((item) => item !== null) as DiaryStructuredContent["entries"];

  if (entries.length === 0) {
    return { ok: false, error: "Diary cần ít nhất một entry." };
  }

  return { ok: true, data: { entries } };
}

function parseSystemGame(
  raw: unknown
): ParseStructuredResult<SystemGameStructuredContent> {
  if (!isRecord(raw)) {
    return { ok: false, error: "System game cần là object JSON." };
  }

  const blocksRaw = Array.isArray(raw.blocks) ? raw.blocks : [];
  const blocks: SystemGameStructuredContent["blocks"] = [];

  for (const item of blocksRaw) {
    if (!isRecord(item)) {
      continue;
    }
    const type = asString(item.type);

    if (type === "prose") {
      const content = asString(item.content).trim();
      if (content) {
        blocks.push({ type: "prose", content });
      }
      continue;
    }

    if (type === "system_notice") {
      const content = asString(item.content).trim();
      if (content) {
        blocks.push({
          type: "system_notice",
          title: asString(item.title).trim() || undefined,
          content
        });
      }
      continue;
    }

    if (type === "stats" || type === "reward") {
      const itemsRaw = Array.isArray(item.items) ? item.items : [];
      if (type === "reward") {
        const items = itemsRaw
          .map((row) => (typeof row === "string" ? row.trim() : ""))
          .filter(Boolean);
        if (items.length > 0) {
          blocks.push({
            type: "reward",
            title: asString(item.title).trim() || undefined,
            items
          });
        }
      } else {
        const items = itemsRaw
          .map((row) => {
            if (!isRecord(row)) {
              return null;
            }
            const label = asString(row.label).trim();
            const value = asString(row.value).trim();
            if (!label || !value) {
              return null;
            }
            return { label, value };
          })
          .filter((row): row is { label: string; value: string } => Boolean(row));

        if (items.length > 0) {
          blocks.push({
            type: "stats",
            title: asString(item.title).trim() || undefined,
            items
          });
        }
      }
    }
  }

  if (blocks.length === 0) {
    return { ok: false, error: "System game cần ít nhất một block." };
  }

  return { ok: true, data: { blocks } };
}

function parseSocialFeed(raw: unknown): ParseStructuredResult<SocialFeedStructuredContent> {
  if (!isRecord(raw)) {
    return { ok: false, error: "Social feed cần là object JSON." };
  }

  const postsRaw = Array.isArray(raw.posts) ? raw.posts : [];
  const posts = postsRaw
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }
      const text = asString(item.text).trim();
      const author = asString(item.author).trim();
      if (!text || !author) {
        return null;
      }
      return {
        author,
        handle: asString(item.handle).trim() || undefined,
        time: asString(item.time).trim() || undefined,
        text,
        likes:
          item.likes != null && Number.isFinite(Number(item.likes))
            ? Number(item.likes)
            : undefined,
        comments_count:
          item.comments_count != null && Number.isFinite(Number(item.comments_count))
            ? Number(item.comments_count)
            : undefined
      };
    })
    .filter((item) => item !== null) as SocialFeedStructuredContent["posts"];

  if (posts.length === 0) {
    return { ok: false, error: "Social feed cần ít nhất một bài đăng." };
  }

  return {
    ok: true,
    data: {
      platform: asString(raw.platform).trim() || undefined,
      posts
    }
  };
}

function parseScript(raw: unknown): ParseStructuredResult<ScriptStructuredContent> {
  if (!isRecord(raw)) {
    return { ok: false, error: "Script cần là object JSON." };
  }

  const linesRaw = Array.isArray(raw.lines) ? raw.lines : [];
  const lines: ScriptStructuredContent["lines"] = [];

  for (const item of linesRaw) {
    if (!isRecord(item)) {
      continue;
    }
    const type = asString(item.type);
    if (type === "scene" || type === "action") {
      const text = asString(item.text).trim();
      if (text) {
        lines.push({ type, text });
      }
      continue;
    }
    if (type === "dialogue") {
      const speaker = asString(item.speaker).trim();
      const text = asString(item.text).trim();
      if (speaker && text) {
        lines.push({
          type: "dialogue",
          speaker,
          text,
          parenthetical: asString(item.parenthetical).trim() || undefined
        });
      }
    }
  }

  if (lines.length === 0) {
    return { ok: false, error: "Script cần ít nhất một dòng." };
  }

  return { ok: true, data: { lines } };
}

function parseMixedMedia(raw: unknown): ParseStructuredResult<MixedMediaStructuredContent> {
  if (!isRecord(raw)) {
    return { ok: false, error: "Mixed media cần là object JSON." };
  }

  const blocksRaw = Array.isArray(raw.blocks) ? raw.blocks : [];
  const blocks: MixedMediaStructuredContent["blocks"] = [];

  for (const item of blocksRaw) {
    if (!isRecord(item)) {
      continue;
    }
    const type = asString(item.type);
    if (type === "divider") {
      blocks.push({ type: "divider" });
      continue;
    }
    if (type === "prose") {
      const content = asString(item.content).trim();
      if (content) {
        blocks.push({ type: "prose", content });
      }
      continue;
    }
    if (type === "notice") {
      const content = asString(item.content).trim();
      if (content) {
        blocks.push({
          type: "notice",
          title: asString(item.title).trim() || undefined,
          content
        });
      }
      continue;
    }
    if (type === "quote") {
      const content = asString(item.content).trim();
      if (content) {
        blocks.push({
          type: "quote",
          content,
          attribution: asString(item.attribution).trim() || undefined
        });
      }
    }
  }

  if (blocks.length === 0) {
    return { ok: false, error: "Mixed media cần ít nhất một block." };
  }

  return { ok: true, data: { blocks } };
}

export function parseStructuredContentJson(
  json: string
): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = json.trim();
  if (!trimmed) {
    return { ok: true, value: null };
  }

  try {
    return { ok: true, value: JSON.parse(trimmed) as unknown };
  } catch {
    return { ok: false, error: "JSON không hợp lệ." };
  }
}

export function parseStructuredContentForMode(
  mode: PresentationMode,
  raw: unknown
): ParseStructuredResult<unknown> {
  if (!modeUsesStructuredContent(mode)) {
    return { ok: false, error: "Mode không dùng structured content." };
  }

  if (raw === null || raw === undefined) {
    return { ok: false, error: "Thiếu structured content." };
  }

  switch (mode) {
    case "chat_story":
      return parseChatStory(raw);
    case "case_file":
      return parseCaseFile(raw);
    case "diary":
      return parseDiary(raw);
    case "system_game":
      return parseSystemGame(raw);
    case "social_feed":
      return parseSocialFeed(raw);
    case "script":
      return parseScript(raw);
    case "mixed_media":
      return parseMixedMedia(raw);
    default:
      return { ok: false, error: "Mode không hỗ trợ." };
  }
}

export function validateStructuredContentForImport(
  mode: PresentationMode,
  jsonText: string
): { ok: true } | { ok: false; error: string } {
  if (!jsonText.trim()) {
    return { ok: true };
  }

  const parsedJson = parseStructuredContentJson(jsonText);
  if (!parsedJson.ok) {
    return parsedJson;
  }

  if (parsedJson.value === null) {
    return { ok: true };
  }

  if (!modeUsesStructuredContent(mode)) {
    return { ok: false, error: `Mode ${mode} không dùng structured_content_json.` };
  }

  if (isComposerStructuredDocument(parsedJson.value)) {
    return validateComposerJsonForImport(
      presentationModeToComposerMode(mode),
      jsonText
    );
  }

  const validated = parseStructuredContentForMode(mode, parsedJson.value);
  if (!validated.ok) {
    return validated;
  }

  return { ok: true };
}
