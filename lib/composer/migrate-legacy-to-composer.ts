import { createBlock } from "@/lib/composer/blocks";
import { createEmptyMetadata, COMPOSER_SCHEMA_VERSION } from "@/lib/composer/schema";
import { normalizeBlockOrder } from "@/lib/composer/serializer";
import { presentationModeToComposerMode } from "@/lib/composer/modes";
import type { ComposerMode, ComposerStructuredContent } from "@/lib/composer/types";
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
import { parseStructuredContentForMode } from "@/lib/presentation/parse-structured";

export function migrateLegacyStructuredToComposer(
  mode: PresentationMode,
  raw: unknown
): ComposerStructuredContent | null {
  const parsed = parseStructuredContentForMode(mode, raw);
  if (!parsed.ok) {
    return null;
  }

  const composerMode = presentationModeToComposerMode(mode);
  const blocks: ReturnType<typeof createBlock>[] = [];

  switch (mode) {
    case "chat_story": {
      const data = parsed.data as ChatStoryStructuredContent;
      for (const message of data.messages) {
        if (message.type === "system") {
          blocks.push(createBlock("chat_system", { text: message.text }));
        } else {
          const character = data.characters.find((c) => c.id === message.character_id);
          blocks.push(
            createBlock("chat_message", {
              character_id: message.character_id,
              character_name: character?.name ?? message.character_id,
              side: character?.side ?? "left",
              text: message.text,
              time: message.time ?? "",
              status: "sent"
            })
          );
        }
      }
      return {
        version: COMPOSER_SCHEMA_VERSION,
        mode: composerMode,
        blocks: normalizeBlockOrder(blocks),
        metadata: {
          ...createEmptyMetadata(),
          characters: data.characters.map((c) => ({
            id: c.id,
            name: c.name,
            side: c.side
          }))
        }
      };
    }
    case "case_file": {
      const data = parsed.data as CaseFileStructuredContent;
      for (const section of data.sections) {
        if (section.type === "summary") {
          blocks.push(
            createBlock("case_summary", {
              case_code: data.case_code ?? "",
              title: section.title,
              status: data.status ?? "",
              summary: section.content
            })
          );
        } else if (section.type === "timeline") {
          blocks.push(
            createBlock("case_timeline", {
              title: section.title,
              items: section.items
            })
          );
        } else if (section.type === "evidence") {
          blocks.push(
            createBlock("case_evidence", {
              title: section.title,
              items: section.items.map((i) => ({
                ...i,
                media_id: null
              }))
            })
          );
        } else if (section.type === "note") {
          blocks.push(
            createBlock("case_note", {
              title: section.title,
              content: section.content
            })
          );
        }
      }
      break;
    }
    case "diary": {
      const data = parsed.data as DiaryStructuredContent;
      for (const entry of data.entries) {
        blocks.push(
          createBlock("diary_entry", {
            date: entry.date ?? "",
            location: entry.location ?? "",
            mood: entry.mood ?? "",
            title: entry.title ?? "",
            content: entry.content
          })
        );
      }
      break;
    }
    case "system_game": {
      const data = parsed.data as SystemGameStructuredContent;
      for (const block of data.blocks) {
        if (block.type === "prose") {
          blocks.push(createBlock("prose", { text: block.content }));
        } else if (block.type === "system_notice") {
          blocks.push(
            createBlock("system_notice", {
              title: block.title ?? "",
              content: block.content,
              tone: "neutral"
            })
          );
        } else if (block.type === "stats") {
          blocks.push(
            createBlock("system_stats", {
              title: block.title ?? "Trạng thái",
              items: block.items
            })
          );
        } else if (block.type === "reward") {
          blocks.push(
            createBlock("system_reward", {
              title: block.title ?? "Phần thưởng",
              items: block.items
            })
          );
        }
      }
      break;
    }
    case "social_feed": {
      const data = parsed.data as SocialFeedStructuredContent;
      for (const post of data.posts) {
        blocks.push(
          createBlock("social_post", {
            author_name: post.author,
            body: post.text,
            timestamp: post.time ?? "",
            fake_like_count: post.likes != null ? String(post.likes) : "",
            fake_comment_count:
              post.comments_count != null ? String(post.comments_count) : ""
          })
        );
      }
      break;
    }
    case "script": {
      const data = parsed.data as ScriptStructuredContent;
      for (const line of data.lines) {
        if (line.type === "dialogue") {
          blocks.push(
            createBlock("script_dialogue", {
              character_name: line.speaker,
              dialogue: line.text
            })
          );
        } else {
          blocks.push(
            createBlock("script_action", {
              action: line.text
            })
          );
        }
      }
      break;
    }
    case "mixed_media": {
      const data = parsed.data as MixedMediaStructuredContent;
      for (const block of data.blocks) {
        if (block.type === "prose") {
          blocks.push(createBlock("prose", { text: block.content }));
        } else if (block.type === "notice") {
          blocks.push(
            createBlock("system_notice", {
              title: block.title ?? "",
              content: block.content,
              tone: "neutral"
            })
          );
        } else if (block.type === "quote") {
          blocks.push(
            createBlock("quote", {
              text: block.content,
              source: block.attribution ?? ""
            })
          );
        } else if (block.type === "divider") {
          blocks.push(createBlock("divider"));
        }
      }
      break;
    }
    default:
      return null;
  }

  if (blocks.length === 0) {
    return null;
  }

  return {
    version: COMPOSER_SCHEMA_VERSION,
    mode: composerMode,
    blocks: normalizeBlockOrder(blocks),
    metadata: createEmptyMetadata()
  };
}
