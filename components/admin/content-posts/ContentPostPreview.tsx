"use client";

import { forwardRef } from "react";
import { renderContentPostToSafeHtml } from "@/lib/content-posts/content-post-html";

type Props = {
  title: string;
  slug: string;
  excerpt: string;
  coverUrl: string;
  seoTitle: string;
  seoDescription: string;
  content: string;
};

export const ContentPostPreview = forwardRef<HTMLDivElement, Props>(function ContentPostPreview(
  { title, slug, excerpt, coverUrl, seoTitle, seoDescription, content },
  ref
) {
  const displayTitle = title || "Tiêu đề bài viết";
  const snippetTitle = seoTitle.trim() || displayTitle;
  const snippetDesc = seoDescription.trim() || excerpt.trim() || content.slice(0, 140);
  const trimmedContent = content.trim();
  const previewHtml = trimmedContent ? renderContentPostToSafeHtml(content) : "";
  const isHtmlContent = /<[a-z][\s\S]*>/i.test(trimmedContent);

  return (
    <div ref={ref} className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">Preview bài viết</p>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-500">
            {isHtmlContent ? "HTML" : "Markdown"}
          </span>
        </div>
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" className="mt-3 w-full rounded-xl object-cover" src={coverUrl} />
        ) : null}
        <h3 className="mt-3 text-lg font-semibold text-white">{displayTitle}</h3>
        {excerpt ? <p className="mt-1 text-sm text-zinc-400">{excerpt}</p> : null}
        {previewHtml ? (
          <div
            className="content-post-body mt-3 max-h-[60vh] space-y-3 overflow-y-auto rounded-lg bg-white/[0.02] p-3 text-sm text-zinc-300 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_img]:max-w-full [&_img]:rounded-lg"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : (
          <p className="mt-3 rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-3 text-xs italic text-zinc-500">
            Chưa có nội dung. Bắt đầu gõ trong khung soạn thảo để xem preview ở đây.
          </p>
        )}
      </div>
      <div className="rounded-xl border border-white/10 bg-zinc-950/80 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">SEO snippet</p>
        <p className="mt-2 text-sm text-cyan-300">{snippetTitle}</p>
        <p className="text-xs text-emerald-400">chapmee.vn › bai-viet › {slug || "slug"}</p>
        <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{snippetDesc}</p>
      </div>
    </div>
  );
});
