"use client";

import { useContext, useMemo } from "react";
import { InlineCommentBlockShell } from "@/components/reader/inline-comments/InlineCommentBlockShell";
import { InlineCommentReaderContext } from "@/components/reader/inline-comments/InlineCommentReaderContext";
import { ImageBlock } from "@/components/editor/ImageBlock";
import { buildLegacyParagraphBlockId } from "@/lib/reader/block-ids";
import { splitChapterContent } from "@/lib/editor/chapter-image-block";
import { renderContentPostToSafeHtml } from "@/lib/content-posts/content-post-html";
import { isLikelyHtmlContent } from "@/lib/content-posts/content-post-editor-html";

type ChapterContentViewProps = {
  content: string;
  className?: string;
  paragraphClassName?: string;
  emptyClassName?: string;
  /** Single anchor for the whole block (composer prose). */
  anchorBlockId?: string | null;
  anchorBlockIndex?: number | null;
};

function renderTextLines(lines: string[]) {
  const nodes: React.ReactNode[] = [];

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();

    if (lineIndex > 0) {
      nodes.push(<br key={`br-${lineIndex}`} />);
    }

    if (!trimmed) {
      return;
    }

    if (trimmed.startsWith("> ")) {
      nodes.push(
        <blockquote
          className="border-l-2 border-cyan-400/50 pl-4 italic text-zinc-300"
          key={`quote-${lineIndex}`}
        >
          {trimmed.slice(2)}
        </blockquote>
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      nodes.push(
        <h3
          className="mb-2 mt-4 text-lg font-bold text-white"
          key={`heading-${lineIndex}`}
        >
          {trimmed.slice(3)}
        </h3>
      );
      return;
    }

    if (trimmed === "---") {
      nodes.push(<hr className="my-8 border-white/10" key={`hr-${lineIndex}`} />);
      return;
    }

    const escaped = escapeHtml(trimmed);
    const withInline = escaped
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/_(.+?)_/g, "<em>$1</em>");

    nodes.push(
      <span
        dangerouslySetInnerHTML={{ __html: withInline }}
        key={`line-${lineIndex}`}
      />
    );
  });

  return nodes;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function ChapterContentView({
  anchorBlockId = null,
  anchorBlockIndex = null,
  className = "",
  content,
  emptyClassName = "text-zinc-500",
  paragraphClassName = "mb-[1.15em] last:mb-0 leading-[1.82]"
}: ChapterContentViewProps) {
  const inlineCtx = useContext(InlineCommentReaderContext);
  const segments = useMemo(() => splitChapterContent(content), [content]);
  let textBlockIndex = 0;

  if (segments.length === 0) {
    return <p className={emptyClassName}>Chưa có nội dung.</p>;
  }

  const body = (
    <>
      {segments.map((segment, index) => {
        if (segment.type === "image") {
          return <ImageBlock block={segment.block} key={`img-${segment.block.id}-${index}`} />;
        }

        const blockId =
          anchorBlockId ??
          (inlineCtx?.enabled && inlineCtx.chapterId
            ? buildLegacyParagraphBlockId(
                inlineCtx.chapterId,
                textBlockIndex,
                inlineCtx.contentHash
              )
            : null);
        const blockIndex = anchorBlockId ? anchorBlockIndex : textBlockIndex;

        if (!anchorBlockId) {
          textBlockIndex += 1;
        }

        const segmentText = segment.lines.join("\n").trim();
        const paragraph = isLikelyHtmlContent(segmentText) ? (
          <div
            className={`chapter-content-html ${paragraphClassName} [&_em]:italic [&_strong]:font-bold [&_u]:underline`}
            dangerouslySetInnerHTML={{
              __html: renderContentPostToSafeHtml(segmentText)
            }}
            key={`text-${index}`}
          />
        ) : (
          <p className={paragraphClassName} key={`text-${index}`}>
            {renderTextLines(segment.lines)}
          </p>
        );

        if (blockId) {
          return (
            <InlineCommentBlockShell
              blockId={blockId}
              blockIndex={blockIndex}
              className={anchorBlockId ? className : undefined}
              key={`text-${index}`}
            >
              {paragraph}
            </InlineCommentBlockShell>
          );
        }

        return paragraph;
      })}
    </>
  );

  if (anchorBlockId) {
    return body;
  }

  return <div className={className}>{body}</div>;
}
