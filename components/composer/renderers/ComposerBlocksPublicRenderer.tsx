"use client";

import type { ReactNode } from "react";
import { useContext } from "react";
import { ImageBlock } from "@/components/editor/ImageBlock";
import { ChapterContentView } from "@/components/editor/ChapterContentView";
import {
  InlineCommentReaderContext,
  type InlineCommentReaderContextValue
} from "@/components/reader/inline-comments/InlineCommentReaderContext";
import { InlineCommentBlockShell } from "@/components/reader/inline-comments/InlineCommentBlockShell";
import { buildComposerBlockId } from "@/lib/reader/block-ids";
import { CaseFileRenderer } from "@/components/composer/renderers/CaseFileRenderer";
import { ChatStoryRenderer } from "@/components/composer/renderers/ChatStoryRenderer";
import { DiaryRenderer } from "@/components/composer/renderers/DiaryRenderer";
import { ScriptRenderer } from "@/components/composer/renderers/ScriptRenderer";
import { SocialFeedRenderer } from "@/components/composer/renderers/SocialFeedRenderer";
import { SystemGameRenderer } from "@/components/composer/renderers/SystemGameRenderer";
import { PresentationReaderShell } from "@/components/presentation/PresentationReaderShell";
import { StandardProseRenderer } from "@/components/composer/renderers/StandardProseRenderer";
import { BranchingChoicesPreview } from "@/components/composer/BranchingChoicesPreview";
import { migrateLegacyStructuredToComposer } from "@/lib/composer/migrate-legacy-to-composer";
import { adaptComposerToLegacyPresentation } from "@/lib/composer/adapters/to-legacy-presentation";
import { composerDocumentToRichContent } from "@/lib/composer/composer-document-to-rich-content";
import type { ChapterImageMap } from "@/lib/images/get-chapter-images-map";
import { sanitizeDisplayText } from "@/lib/presentation/sanitize-display-text";
import type {
  ComposerBlockUnion,
  ComposerStructuredContent
} from "@/lib/composer/types";
import type { PresentationMode } from "@/types/presentation";

const CHAT_BLOCK_TYPES = new Set([
  "chat_message",
  "chat_system",
  "chat_missed_call",
  "chat_voice_note"
]);

const CASE_BLOCK_TYPES = new Set([
  "case_summary",
  "case_timeline",
  "case_evidence",
  "case_suspect",
  "case_note"
]);

const SYSTEM_BLOCK_TYPES = new Set([
  "system_notice",
  "system_stats",
  "system_quest",
  "system_reward",
  "prose"
]);

type ComposerBlocksPublicRendererProps = {
  doc: ComposerStructuredContent;
  imageMap?: ChapterImageMap;
  fallbackContent: string;
};

function isChatBlock(block: ComposerBlockUnion) {
  return CHAT_BLOCK_TYPES.has(block.type);
}

function isCaseBlock(block: ComposerBlockUnion) {
  return CASE_BLOCK_TYPES.has(block.type);
}

function isSystemBlock(block: ComposerBlockUnion) {
  return SYSTEM_BLOCK_TYPES.has(block.type);
}

function flushChatGroup(
  blocks: ComposerBlockUnion[],
  nodes: ReactNode[],
  key: string
) {
  if (blocks.length === 0) {
    return;
  }
  const miniDoc: ComposerStructuredContent = {
    version: 1,
    mode: "chat_story",
    blocks,
    metadata: { characters: [], warnings: [], composer_version: 1 }
  };
  const adapted = adaptComposerToLegacyPresentation(miniDoc);
  if (adapted.kind === "legacy" && adapted.mode === "chat_story") {
    nodes.push(
      <ChatStoryRenderer data={adapted.data as import("@/types/presentation").ChatStoryStructuredContent} key={key} />
    );
  }
  blocks.length = 0;
}

function flushCaseGroup(
  blocks: ComposerBlockUnion[],
  nodes: ReactNode[],
  key: string,
  imageMap: ChapterImageMap
) {
  if (blocks.length === 0) {
    return;
  }
  const miniDoc: ComposerStructuredContent = {
    version: 1,
    mode: "case_file",
    blocks,
    metadata: { characters: [], warnings: [], composer_version: 1 }
  };
  const adapted = adaptComposerToLegacyPresentation(miniDoc);
  if (adapted.kind === "legacy" && adapted.mode === "case_file") {
    nodes.push(
      <CaseFileRenderer
        data={adapted.data as import("@/types/presentation").CaseFileStructuredContent}
        imageMap={imageMap}
        key={key}
      />
    );
  }
  blocks.length = 0;
}

function flushSystemGroup(
  blocks: ComposerBlockUnion[],
  nodes: ReactNode[],
  key: string
) {
  if (blocks.length === 0) {
    return;
  }
  const miniDoc: ComposerStructuredContent = {
    version: 1,
    mode: "system_game",
    blocks,
    metadata: { characters: [], warnings: [], composer_version: 1 }
  };
  const adapted = adaptComposerToLegacyPresentation(miniDoc);
  if (adapted.kind === "legacy" && adapted.mode === "system_game") {
    nodes.push(
      <SystemGameRenderer
        data={adapted.data as import("@/types/presentation").SystemGameStructuredContent}
        key={key}
      />
    );
  }
  blocks.length = 0;
}

function ComposerProseBlock({
  block,
  blockKey
}: {
  block: Extract<ComposerBlockUnion, { type: "prose" }>;
  blockKey: string;
}) {
  const inlineCtx = useContext(InlineCommentReaderContext);
  const anchorBlockId =
    inlineCtx?.enabled && inlineCtx.chapterId
      ? buildComposerBlockId(inlineCtx.chapterId, block.id)
      : null;

  return (
    <ChapterContentView
      anchorBlockId={anchorBlockId}
      content={block.data.text}
      key={blockKey}
      paragraphClassName="mb-[1.15em] last:mb-0"
    />
  );
}

function renderSingleBlock(
  block: ComposerBlockUnion,
  imageMap: ChapterImageMap,
  key: string,
  inlineCtx: InlineCommentReaderContextValue | null
) {
  if (block.type === "image") {
    const resolved = imageMap[block.data.media_id.trim()];
    if (resolved) {
      return (
        <ImageBlock
          block={{
            ...resolved,
            alt: block.data.alt.trim() || resolved.alt,
            caption: block.data.caption.trim() || resolved.caption
          }}
          key={key}
        />
      );
    }
    return (
      <p className="text-sm text-zinc-500" key={key}>
        [Ảnh chưa tải hoặc không tìm thấy]
      </p>
    );
  }

  if (block.type === "prose") {
    return <ComposerProseBlock block={block} blockKey={key} />;
  }

  if (block.type === "heading") {
    const blockId =
      inlineCtx?.enabled && inlineCtx.chapterId
        ? buildComposerBlockId(inlineCtx.chapterId, block.id)
        : null;
    return (
      <InlineCommentBlockShell blockId={blockId} key={key}>
        <p className="text-lg font-bold text-white">{sanitizeDisplayText(block.data.text)}</p>
      </InlineCommentBlockShell>
    );
  }

  if (block.type === "quote") {
    const blockId =
      inlineCtx?.enabled && inlineCtx.chapterId
        ? buildComposerBlockId(inlineCtx.chapterId, block.id)
        : null;
    return (
      <InlineCommentBlockShell blockId={blockId} key={key}>
        <blockquote className="border-l-2 border-zinc-500 pl-4 italic text-zinc-300">
          <p>{sanitizeDisplayText(block.data.text)}</p>
        </blockquote>
      </InlineCommentBlockShell>
    );
  }

  if (block.type === "divider") {
    return <hr className="border-white/15" key={key} />;
  }

  if (block.type === "diary_entry") {
    const adapted = adaptComposerToLegacyPresentation({
      version: 1,
      mode: "diary",
      blocks: [block],
      metadata: { characters: [], warnings: [], composer_version: 1 }
    });
    if (adapted.kind === "legacy" && adapted.mode === "diary") {
      return (
        <DiaryRenderer
          data={adapted.data as import("@/types/presentation").DiaryStructuredContent}
          key={key}
        />
      );
    }
  }

  if (block.type === "social_post" || block.type === "social_comment" || block.type === "social_reaction") {
    const adapted = adaptComposerToLegacyPresentation({
      version: 1,
      mode: "social_feed",
      blocks: [block],
      metadata: { characters: [], warnings: [], composer_version: 1 }
    });
    if (adapted.kind === "legacy" && adapted.mode === "social_feed") {
      return (
        <SocialFeedRenderer
          data={adapted.data as import("@/types/presentation").SocialFeedStructuredContent}
          key={key}
        />
      );
    }
  }

  if (block.type === "script_dialogue" || block.type === "script_action") {
    const adapted = adaptComposerToLegacyPresentation({
      version: 1,
      mode: "script",
      blocks: [block],
      metadata: { characters: [], warnings: [], composer_version: 1 }
    });
    if (adapted.kind === "legacy" && adapted.mode === "script") {
      return (
        <ScriptRenderer
          data={adapted.data as import("@/types/presentation").ScriptStructuredContent}
          key={key}
        />
      );
    }
  }

  if (block.type === "choice_node" || block.type === "choice_option") {
    return <BranchingChoicesPreview block={block} key={key} />;
  }

  return null;
}

export function ComposerBlocksPublicRenderer({
  doc,
  fallbackContent,
  imageMap = {}
}: ComposerBlocksPublicRendererProps) {
  const inlineCtx = useContext(InlineCommentReaderContext);

  if (doc.blocks.length === 0) {
    return <StandardProseRenderer content={fallbackContent} />;
  }

  const richOnlyModes = new Set<PresentationMode>(["standard_prose"]);
  const onlyRichBlocks = doc.blocks.every((block) =>
    ["heading", "prose", "quote", "divider", "image"].includes(block.type)
  );

  if (richOnlyModes.has(doc.mode as PresentationMode) || onlyRichBlocks) {
    const rich = composerDocumentToRichContent(doc, imageMap);
    return <StandardProseRenderer content={rich || fallbackContent} />;
  }

  const nodes: ReactNode[] = [];
  let chatBuffer: ComposerBlockUnion[] = [];
  let caseBuffer: ComposerBlockUnion[] = [];
  let systemBuffer: ComposerBlockUnion[] = [];
  let groupIndex = 0;

  const flushAll = () => {
    flushChatGroup(chatBuffer, nodes, `chat-${groupIndex++}`);
    flushCaseGroup(caseBuffer, nodes, `case-${groupIndex++}`, imageMap);
    flushSystemGroup(systemBuffer, nodes, `system-${groupIndex++}`);
  };

  for (const block of doc.blocks) {
    if (isChatBlock(block)) {
      flushCaseGroup(caseBuffer, nodes, `case-${groupIndex++}`, imageMap);
      flushSystemGroup(systemBuffer, nodes, `system-${groupIndex++}`);
      chatBuffer.push(block);
      continue;
    }
    if (isCaseBlock(block)) {
      flushChatGroup(chatBuffer, nodes, `chat-${groupIndex++}`);
      flushSystemGroup(systemBuffer, nodes, `system-${groupIndex++}`);
      caseBuffer.push(block);
      continue;
    }
    if (isSystemBlock(block)) {
      flushChatGroup(chatBuffer, nodes, `chat-${groupIndex++}`);
      flushCaseGroup(caseBuffer, nodes, `case-${groupIndex++}`, imageMap);
      systemBuffer.push(block);
      continue;
    }

    flushAll();
    const node = renderSingleBlock(block, imageMap, block.id, inlineCtx);
    if (node) {
      nodes.push(node);
    }
  }

  flushAll();

  if (nodes.length === 0) {
    const migrated = migrateLegacyStructuredToComposer(doc.mode as PresentationMode, doc);
    if (migrated) {
      return (
        <ComposerBlocksPublicRenderer
          doc={migrated}
          fallbackContent={fallbackContent}
          imageMap={imageMap}
        />
      );
    }
    return <StandardProseRenderer content={fallbackContent} />;
  }

  return (
    <PresentationReaderShell>
      <div className="space-y-4">{nodes}</div>
    </PresentationReaderShell>
  );
}
