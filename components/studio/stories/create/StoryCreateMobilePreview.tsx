"use client";

import { getProfileUrl } from "@/lib/profile/profile-url";

type StoryCreateMobilePreviewProps = {
  authorDisplayName: string | null;
  authorUsername: string | null;
  categoryLabel: string | null;
  coverPreviewUrl: string | null;
  hook: string;
  title: string;
};

export function StoryCreateMobilePreview({
  authorDisplayName,
  authorUsername,
  categoryLabel,
  coverPreviewUrl,
  hook,
  title
}: StoryCreateMobilePreviewProps) {
  const authorHref = getProfileUrl(authorUsername);
  const displayTitle = title.trim() || "Tiêu đề truyện";

  return (
    <div className="mx-auto w-full max-w-[220px]">
      <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Xem trước thẻ truyện
      </p>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-lg">
        <div className="aspect-[3/4] bg-zinc-900">
          {coverPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              className="h-full w-full object-cover"
              src={coverPreviewUrl}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-zinc-600">
              Bìa
            </div>
          )}
        </div>
        <div className="space-y-1 p-3">
          <p className="line-clamp-2 text-sm font-bold leading-snug text-white">
            {displayTitle}
          </p>
          {authorDisplayName ? (
            authorHref ? (
              <p className="truncate text-xs text-cyan-300/90">@{authorUsername}</p>
            ) : (
              <p className="truncate text-xs text-zinc-400">{authorDisplayName}</p>
            )
          ) : null}
          {categoryLabel ? (
            <p className="text-[10px] text-zinc-500">{categoryLabel}</p>
          ) : null}
          {hook.trim() ? (
            <p className="line-clamp-2 text-[10px] leading-relaxed text-zinc-500">
              {hook.trim()}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
