"use client";

import { ReelsTextScene } from "@/components/reels/ReelsTextScene";
import type { ReelsItem } from "@/lib/reels/getReelsItems";
import { resolveReelsReadHref } from "@/lib/reels/resolve-reels-cta";

type ReelsPreviewProps = {
  hook: string;
  body: string;
  cta: string;
  contentSource?: "chapter" | "story";
  storyTitle: string;
  storySlug: string;
  storyPublicCode?: string;
  episodeNumber: number | null;
  episodeTitle: string;
  creatorName: string;
  genreName?: string | null;
  backgroundImageUrl: string | null;
};

export function ReelsPreview({
  hook,
  body,
  cta,
  contentSource,
  storyTitle,
  storySlug,
  storyPublicCode = "preview",
  episodeNumber,
  episodeTitle,
  creatorName,
  genreName,
  backgroundImageUrl
}: ReelsPreviewProps) {
  const resolvedContentSource = contentSource ?? (episodeNumber ? "chapter" : "story");
  const previewItem: ReelsItem = {
    backgroundImageUrl,
    chapterId: resolvedContentSource === "chapter" ? "preview-chapter" : null,
    commentCount: 0,
    contentSource: resolvedContentSource,
    creatorAvatarUrl: null,
    creatorHandle: null,
    creatorId: null,
    creatorUserId: null,
    creatorVerification: null,
    creatorName,
    ctaLabel: cta || "Đọc tiếp",
    episodeNumber: episodeNumber ?? 0,
    episodeTitle,
    excerpt: body || "Nội dung Reels sẽ hiển thị ở đây.",
    genreName: genreName ?? null,
    hookTitle: hook || "Hook",
    id: "preview",
    reelItemId: null,
    isFollowingCreator: false,
    isLiked: false,
    isSaved: false,
    kind: "manual",
    likeCount: 0,
    publishedAt: null,
    readMoreHref: resolveReelsReadHref({
      episodeNumber,
      storySlug: storySlug || "preview",
      storyPublicCode
    }),
    storyPublicCode,
    storyHref: `/reels`,
    reelPublicCode: null,
    reelSlug: null,
    reelHref: null,
    saveCount: 0,
    shareCount: 0,
    storyId: "preview",
    storySlug: storySlug || "preview",
    storyTitle: storyTitle || "Tên truyện"
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-zinc-200">Xem trước trên Reels</p>
      <div className="relative h-[32rem] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
        <ReelsTextScene item={previewItem} />
      </div>
    </div>
  );
}
