import {
  composerModeToPresentationMode,
  getAllowedBlocksForMode,
  isBlockAllowedForMode
} from "@/lib/composer/modes";
import {
  isComposerStructuredDocument,
  parseComposerDocument
} from "@/lib/composer/serializer";
import type {
  ComposerBlockUnion,
  ComposerMode,
  ComposerStructuredContent
} from "@/lib/composer/types";
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

export type LegacyAdaptedContent =
  | { kind: "legacy"; mode: PresentationMode; data: unknown }
  | { kind: "prose"; text: string }
  | { kind: "unsupported"; message: string };

function proseBlocksToPlainText(blocks: ComposerBlockUnion[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    if (block.type === "heading") {
      const level = block.data.level ?? 2;
      const prefix = "#".repeat(Math.min(6, Math.max(1, level)));
      parts.push(`${prefix} ${block.data.text}`.trim());
    } else if (block.type === "prose") {
      parts.push(block.data.text);
    } else if (block.type === "quote") {
      const source = block.data.source?.trim();
      parts.push(
        source
          ? `> ${block.data.text}\n> — ${source}`
          : `> ${block.data.text}`
      );
    }
  }

  return parts.filter(Boolean).join("\n\n");
}

function adaptChatStory(doc: ComposerStructuredContent): LegacyAdaptedContent {
  const charactersMap = new Map<string, ChatStoryStructuredContent["characters"][number]>();
  const messages: ChatStoryStructuredContent["messages"] = [];

  for (const meta of doc.metadata.characters) {
    if (meta.id && meta.name) {
      charactersMap.set(meta.id, {
        id: meta.id,
        name: meta.name,
        avatar_url: null,
        side: meta.side === "right" ? "right" : "left"
      });
    }
  }

  for (const block of doc.blocks) {
    if (block.type === "chat_message") {
      const id = block.data.character_id || `c_${charactersMap.size + 1}`;
      if (!charactersMap.has(id) && block.data.character_name) {
        charactersMap.set(id, {
          id,
          name: block.data.character_name,
          avatar_url: null,
          side: block.data.side === "right" ? "right" : "left"
        });
      }
      if (block.data.text.trim()) {
        messages.push({
          type: "message",
          character_id: id,
          text: block.data.text.trim(),
          time: block.data.time.trim() || undefined
        });
      }
      continue;
    }

    if (block.type === "chat_system" && block.data.text.trim()) {
      messages.push({ type: "system", text: block.data.text.trim() });
      continue;
    }

    if (block.type === "chat_missed_call") {
      const label = `[${block.data.call_type === "video" ? "Video" : "Voice"} call — ${block.data.status}] ${block.data.character_name}`;
      messages.push({ type: "system", text: label.trim() });
      continue;
    }

    if (block.type === "chat_voice_note") {
      const label = `[Voice note ${block.data.duration_seconds}s] ${block.data.character_name}: ${block.data.transcript}`;
      messages.push({ type: "system", text: label.trim() });
    }
  }

  if (messages.length === 0) {
    return { kind: "unsupported", message: "Chat story không có tin nhắn hợp lệ." };
  }

  return {
    kind: "legacy",
    mode: "chat_story",
    data: { characters: [...charactersMap.values()], messages } satisfies ChatStoryStructuredContent
  };
}

function adaptCaseFile(doc: ComposerStructuredContent): LegacyAdaptedContent {
  const sections: CaseFileStructuredContent["sections"] = [];
  let caseTitle = "";
  let caseCode = "";
  let status = "";

  for (const block of doc.blocks) {
    if (block.type === "case_summary") {
      caseTitle = block.data.title;
      caseCode = block.data.case_code;
      status = block.data.status;
      if (block.data.summary.trim()) {
        sections.push({
          type: "summary",
          title: block.data.title || "Tóm tắt",
          content: block.data.summary
        });
      }
      continue;
    }
    if (block.type === "case_timeline" && block.data.items.length > 0) {
      sections.push({
        type: "timeline",
        title: block.data.title || "Dòng thời gian",
        items: block.data.items.filter((i) => i.content.trim())
      });
      continue;
    }
    if (block.type === "case_evidence" && block.data.items.length > 0) {
      sections.push({
        type: "evidence",
        title: block.data.title || "Bằng chứng",
        items: block.data.items
          .filter((i) => i.content.trim() || i.label.trim() || i.media_id?.trim())
          .map((i) => ({
            label: i.label,
            content: i.content,
            media_id: i.media_id?.trim() || null
          }))
      });
      continue;
    }
    if (block.type === "case_note" && block.data.content.trim()) {
      sections.push({
        type: "note",
        title: block.data.title || "Ghi chú",
        content: block.data.content
      });
      continue;
    }
    if (block.type === "case_suspect" && block.data.name.trim()) {
      const body = [
        block.data.role && `Vai trò: ${block.data.role}`,
        block.data.motive && `Động cơ: ${block.data.motive}`,
        block.data.note
      ]
        .filter(Boolean)
        .join("\n");
      sections.push({
        type: "note",
        title: `Nghi phạm: ${block.data.name}`,
        content: body
      });
    }
  }

  if (sections.length === 0) {
    return { kind: "unsupported", message: "Case file không có section hợp lệ." };
  }

  return {
    kind: "legacy",
    mode: "case_file",
    data: {
      case_title: caseTitle || undefined,
      case_code: caseCode || undefined,
      status: status || undefined,
      sections
    } satisfies CaseFileStructuredContent
  };
}

function adaptDiary(doc: ComposerStructuredContent): LegacyAdaptedContent {
  const entries: DiaryStructuredContent["entries"] = [];

  for (const block of doc.blocks) {
    if (block.type === "diary_entry" && block.data.content.trim()) {
      entries.push({
        date: block.data.date || undefined,
        location: block.data.location || undefined,
        mood: block.data.mood || undefined,
        title: block.data.title || undefined,
        content: block.data.content
      });
      continue;
    }
    if (block.type === "prose" && block.data.text.trim()) {
      entries.push({ content: block.data.text });
      continue;
    }
    if (block.type === "quote" && block.data.text.trim()) {
      entries.push({
        title: "Trích dẫn",
        content: block.data.source
          ? `${block.data.text}\n— ${block.data.source}`
          : block.data.text
      });
    }
  }

  if (entries.length === 0) {
    return { kind: "unsupported", message: "Diary không có entry hợp lệ." };
  }

  return { kind: "legacy", mode: "diary", data: { entries } satisfies DiaryStructuredContent };
}

function adaptSystemGame(doc: ComposerStructuredContent): LegacyAdaptedContent {
  const blocks: SystemGameStructuredContent["blocks"] = [];

  for (const block of doc.blocks) {
    if (block.type === "prose" && block.data.text.trim()) {
      blocks.push({ type: "prose", content: block.data.text });
      continue;
    }
    if (block.type === "system_notice" && block.data.content.trim()) {
      blocks.push({
        type: "system_notice",
        title: block.data.title || undefined,
        content: block.data.content
      });
      continue;
    }
    if (block.type === "system_stats" && block.data.items.length > 0) {
      blocks.push({
        type: "stats",
        title: block.data.title || undefined,
        items: block.data.items.filter((i) => i.label && i.value)
      });
      continue;
    }
    if (block.type === "system_reward" && block.data.items.length > 0) {
      blocks.push({
        type: "reward",
        title: block.data.title || undefined,
        items: block.data.items.filter(Boolean)
      });
      continue;
    }
    if (block.type === "system_quest") {
      const questBody = [
        block.data.objective && `Mục tiêu: ${block.data.objective}`,
        block.data.difficulty && `Độ khó: ${block.data.difficulty}`,
        block.data.status && `Trạng thái: ${block.data.status}`
      ]
        .filter(Boolean)
        .join("\n");
      if (questBody) {
        blocks.push({
          type: "system_notice",
          title: block.data.title || "Nhiệm vụ",
          content: questBody
        });
      }
    }
  }

  if (blocks.length === 0) {
    return { kind: "unsupported", message: "System game không có block hợp lệ." };
  }

  return {
    kind: "legacy",
    mode: "system_game",
    data: { blocks } satisfies SystemGameStructuredContent
  };
}

function adaptSocialFeed(doc: ComposerStructuredContent): LegacyAdaptedContent {
  const posts: SocialFeedStructuredContent["posts"] = [];

  for (const block of doc.blocks) {
    if (block.type === "social_post" && block.data.body.trim() && block.data.author_name.trim()) {
      posts.push({
        author: block.data.author_name,
        time: block.data.timestamp || undefined,
        text: block.data.body,
        likes: Number.parseInt(block.data.fake_like_count, 10) || undefined,
        comments_count:
          Number.parseInt(block.data.fake_comment_count, 10) || undefined
      });
    }
  }

  if (posts.length === 0) {
    return { kind: "unsupported", message: "Social feed không có bài đăng hợp lệ." };
  }

  return {
    kind: "legacy",
    mode: "social_feed",
    data: { posts } satisfies SocialFeedStructuredContent
  };
}

function adaptScript(doc: ComposerStructuredContent): LegacyAdaptedContent {
  const lines: ScriptStructuredContent["lines"] = [];

  for (const block of doc.blocks) {
    if (block.type === "heading" && block.data.text.trim()) {
      lines.push({ type: "scene", text: block.data.text });
      continue;
    }
    if (block.type === "script_action" && block.data.action.trim()) {
      lines.push({ type: "action", text: block.data.action });
      continue;
    }
    if (block.type === "script_dialogue" && block.data.dialogue.trim()) {
      lines.push({
        type: "dialogue",
        speaker: block.data.character_name || "NHÂN VẬT",
        text: block.data.dialogue
      });
      continue;
    }
    if (block.type === "prose" && block.data.text.trim()) {
      lines.push({ type: "action", text: block.data.text });
    }
  }

  if (lines.length === 0) {
    return { kind: "unsupported", message: "Script không có dòng hợp lệ." };
  }

  return { kind: "legacy", mode: "script", data: { lines } satisfies ScriptStructuredContent };
}

function adaptMixedMedia(doc: ComposerStructuredContent): LegacyAdaptedContent {
  const blocks: MixedMediaStructuredContent["blocks"] = [];

  for (const block of doc.blocks) {
    if (block.type === "prose" && block.data.text.trim()) {
      blocks.push({ type: "prose", content: block.data.text });
    } else if (block.type === "heading" && block.data.text.trim()) {
      blocks.push({
        type: "notice",
        title: block.data.text,
        content: ""
      });
    } else if (block.type === "quote" && block.data.text.trim()) {
      blocks.push({
        type: "quote",
        content: block.data.text,
        attribution: block.data.source || undefined
      });
    } else if (block.type === "divider") {
      blocks.push({ type: "divider" });
    } else if (block.type === "system_notice" && block.data.content.trim()) {
      blocks.push({
        type: "notice",
        title: block.data.title || undefined,
        content: block.data.content
      });
    }
  }

  if (blocks.length === 0) {
    return { kind: "unsupported", message: "Mixed media không có block hợp lệ." };
  }

  return {
    kind: "legacy",
    mode: "mixed_media",
    data: { blocks } satisfies MixedMediaStructuredContent
  };
}

export function adaptComposerToLegacyPresentation(
  raw: unknown
): LegacyAdaptedContent {
  const parsed = parseComposerDocument(raw);
  if (!parsed.ok) {
    return { kind: "unsupported", message: parsed.error };
  }

  const doc = parsed.data;
  const presentationMode = composerModeToPresentationMode(doc.mode);

  if (doc.mode === "branching_story") {
    const text = doc.blocks
      .map((block) => {
        if (block.type === "choice_node") {
          return `${block.data.title}\n${block.data.content}`;
        }
        if (block.type === "choice_option") {
          return `• ${block.data.label} → ${block.data.target_node_id}`;
        }
        if (block.type === "prose") {
          return block.data.text;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n\n");
    return text
      ? { kind: "prose", text }
      : {
          kind: "unsupported",
          message: "Truyện nhánh chưa có nội dung hiển thị."
        };
  }

  if (doc.mode === "standard_prose") {
    const text = proseBlocksToPlainText(doc.blocks);
    return text ? { kind: "prose", text } : { kind: "unsupported", message: "Không có nội dung văn xuôi." };
  }

  const allowed = new Set(getAllowedBlocksForMode(doc.mode));
  for (const block of doc.blocks) {
    if (!isBlockAllowedForMode(doc.mode, block.type) && !allowed.has(block.type)) {
      // mixed_media allows subset — skip strict fail
    }
  }

  switch (presentationMode) {
    case "chat_story":
      return adaptChatStory(doc);
    case "case_file":
      return adaptCaseFile(doc);
    case "diary":
      return adaptDiary(doc);
    case "system_game":
      return adaptSystemGame(doc);
    case "social_feed":
      return adaptSocialFeed(doc);
    case "script":
      return adaptScript(doc);
    case "mixed_media":
      return adaptMixedMedia(doc);
    default:
      return {
        kind: "prose",
        text: proseBlocksToPlainText(doc.blocks)
      };
  }
}

export function resolveStructuredForRenderer(
  mode: ComposerMode | PresentationMode,
  structuredContent: unknown | null,
  fallbackContent: string
): {
  structuredContent: unknown | null;
  fallbackContent: string;
  composerDocument: ComposerStructuredContent | null;
} {
  if (structuredContent === null || structuredContent === undefined) {
    return {
      structuredContent: null,
      fallbackContent,
      composerDocument: null
    };
  }

  if (isComposerStructuredDocument(structuredContent)) {
    const adapted = adaptComposerToLegacyPresentation(structuredContent);
    if (adapted.kind === "legacy") {
      return {
        structuredContent: adapted.data,
        fallbackContent,
        composerDocument: structuredContent as ComposerStructuredContent
      };
    }
    if (adapted.kind === "prose") {
      return {
        structuredContent: null,
        fallbackContent: adapted.text || fallbackContent,
        composerDocument: structuredContent as ComposerStructuredContent
      };
    }
    return {
      structuredContent: null,
      fallbackContent,
      composerDocument: structuredContent as ComposerStructuredContent
    };
  }

  return {
    structuredContent,
    fallbackContent,
    composerDocument: null
  };
}
