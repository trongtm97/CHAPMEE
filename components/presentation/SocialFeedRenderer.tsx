"use client";

import { PresentationReaderShell } from "@/components/presentation/PresentationReaderShell";
import { sanitizeDisplayText } from "@/lib/presentation/sanitize-display-text";
import type { SocialFeedStructuredContent } from "@/types/presentation";

type SocialFeedRendererProps = {
  data: SocialFeedStructuredContent;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function SocialFeedRenderer({ data }: SocialFeedRendererProps) {
  return (
    <PresentationReaderShell>
      {data.platform ? (
        <p className="mb-4 text-center text-xs font-bold uppercase tracking-widest text-zinc-500">
          {sanitizeDisplayText(data.platform)}
        </p>
      ) : null}
      <div className="space-y-4">
        {data.posts.map((post, index) => (
          <article
            className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"
            key={index}
          >
            <div className="flex gap-3">
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-white"
                aria-hidden
              >
                {initials(post.author)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-semibold text-zinc-100">
                    {sanitizeDisplayText(post.author)}
                  </span>
                  {post.handle ? (
                    <span className="text-xs text-zinc-500">
                      {sanitizeDisplayText(post.handle)}
                    </span>
                  ) : null}
                  {post.time ? (
                    <span className="text-xs text-zinc-600">· {post.time}</span>
                  ) : null}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[0.98em] leading-relaxed text-zinc-100/90">
                  {sanitizeDisplayText(post.text)}
                </p>
                <div className="mt-3 flex gap-4 text-xs text-zinc-500">
                  {post.likes != null ? <span>{post.likes} thích</span> : null}
                  {post.comments_count != null ? (
                    <span>{post.comments_count} bình luận</span>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </PresentationReaderShell>
  );
}
