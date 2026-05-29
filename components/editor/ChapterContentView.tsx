"use client";

import { ImageBlock } from "@/components/editor/ImageBlock";
import { splitChapterContent } from "@/lib/editor/chapter-image-block";
import { useMemo } from "react";

type ChapterContentViewProps = {
  content: string;
  className?: string;
  paragraphClassName?: string;
  emptyClassName?: string;
};

function renderTextLines(lines: string[]) {
  return lines.map((line, lineIndex) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("> ")) {
      return (
        <blockquote
          className="border-l-2 border-cyan-400/50 pl-4 italic text-zinc-300"
          key={`quote-${lineIndex}`}
        >
          {trimmed.slice(2)}
        </blockquote>
      );
    }

    if (trimmed.startsWith("## ")) {
      return (
        <h3
          className="mb-2 mt-4 text-lg font-bold text-white"
          key={`heading-${lineIndex}`}
        >
          {trimmed.slice(3)}
        </h3>
      );
    }

    if (trimmed === "---") {
      return <hr className="my-8 border-white/10" key={`hr-${lineIndex}`} />;
    }

    const escaped = escapeHtml(trimmed);
    const withInline = escaped
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/_(.+?)_/g, "<em>$1</em>");

    return (
      <span
        dangerouslySetInnerHTML={{ __html: withInline }}
        key={`line-${lineIndex}`}
      />
    );
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function ChapterContentView({
  className = "",
  content,
  emptyClassName = "text-zinc-500",
  paragraphClassName = "mb-[1.15em] last:mb-0 leading-[1.82]"
}: ChapterContentViewProps) {
  const segments = useMemo(() => splitChapterContent(content), [content]);

  if (segments.length === 0) {
    return <p className={emptyClassName}>Chưa có nội dung.</p>;
  }

  return (
    <div className={className}>
      {segments.map((segment, index) => {
        if (segment.type === "image") {
          return <ImageBlock block={segment.block} key={`img-${segment.block.id}-${index}`} />;
        }

        return (
          <p className={paragraphClassName} key={`text-${index}`}>
            {renderTextLines(segment.lines)}
          </p>
        );
      })}
    </div>
  );
}
