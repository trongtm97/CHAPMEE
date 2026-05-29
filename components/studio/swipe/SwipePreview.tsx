"use client";

import { SwipeTextScene } from "@/components/swipe/SwipeTextScene";
import type { SwipeItem } from "@/lib/swipe/getSwipeItems";
import { resolveSwipeReadHref } from "@/lib/swipe/resolve-swipe-cta";

type SwipePreviewProps = {
  hook: string;
  body: string;
  cta: string;
  storyTitle: string;
  storySlug: string;
  episodeNumber: number | null;
  episodeTitle: string;
  creatorName: string;
  genreName?: string | null;
  backgroundImageUrl: string | null;
};

export function SwipePreview({
  hook,
  body,
  cta,
  storyTitle,
  storySlug,
  episodeNumber,
  episodeTitle,
  creatorName,
  genreName,
  backgroundImageUrl
}: SwipePreviewProps) {
  const previewItem: SwipeItem = {
    backgroundImageUrl,
    commentCount: 0,
    creatorAvatarUrl: null,
    creatorHandle: null,
    creatorId: null,
    creatorUserId: null,
    creatorVerification: null,
    creatorName,
    ctaLabel: cta || "Đọc tiếp",
    episodeNumber: episodeNumber ?? 0,
    episodeTitle,
    excerpt: body || "Nội dung Swipe sẽ hiển thị ở đây.",
    genreName: genreName ?? null,
    hookTitle: hook || "Hook",
    id: "preview",
    isFollowingCreator: false,
    isLiked: false,
    isSaved: false,
    kind: "manual",
    likeCount: 0,
    publishedAt: null,
    readMoreHref: resolveSwipeReadHref({
      episodeNumber,
      storySlug: storySlug || "preview"
    }),
    saveCount: 0,
    shareCount: 0,
    storyId: "preview",
    storySlug: storySlug || "preview",
    storyTitle: storyTitle || "Tên truyện"
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-zinc-200">Xem trước trên Swipe</p>
      <div className="relative h-[32rem] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
        <SwipeTextScene item={previewItem} />
      </div>
    </div>
  );
}
