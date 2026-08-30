"use client";

import Link from "next/link";
import { useState } from "react";
import { CommunityPollFeedCard } from "@/components/community/CommunityPollFeedCard";
import { CommunityPostMenu } from "@/components/community/CommunityPostMenu";
import {
  buildContextLine,
  ctaForItem,
  authorMetaSuffix,
  kindLabel,
  primaryBody,
  shouldShowSecondaryComment,
  showTitle,
  threadHref
} from "@/components/community/feed-card-utils";
import { SpoilerContent } from "@/components/community/SpoilerContent";
import { AuthorNameLink } from "@/components/profile/AuthorNameLink";
import { AvatarFallback } from "@/components/ui";
import { getCreatorPublicHref } from "@/lib/profile/profile-url";
import type { CommunityFeedItem } from "@/types/community";

type CommunityFeedCardProps = {
  item: CommunityFeedItem;
  onHide?: (itemId: string) => void;
};

export function CommunityFeedCard({ item, onHide }: CommunityFeedCardProps) {
  const [voteCount, setVoteCount] = useState(item.voteCount);
  const [hasVoted, setHasVoted] = useState(false);
  const cta = ctaForItem(item);
  const contextLine = buildContextLine(item);
  const href = threadHref(item);
  const showSecondaryComment = shouldShowSecondaryComment(item);
  const authorProfileHref = getCreatorPublicHref({
    username: item.authorUsername,
    userId: item.authorUserId
  });

  return (
    <article className="chap-card space-y-2 p-3">
      <header className="flex items-start gap-2.5">
        {authorProfileHref ? (
          <Link className="shrink-0" href={authorProfileHref}>
            <AvatarFallback className="size-9" name={item.authorName} size="sm" src={item.authorAvatarUrl} />
          </Link>
        ) : (
          <AvatarFallback className="size-9 shrink-0" name={item.authorName} size="sm" src={item.authorAvatarUrl} />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-zinc-400">
            <AuthorNameLink
              className="text-zinc-400"
              name={item.authorName}
              nameClassName="font-medium text-zinc-300"
              userId={item.authorUserId}
              username={item.authorUsername}
            />
            <span className="text-zinc-500"> · {authorMetaSuffix(item)}</span>
          </p>
          <p className="mt-0.5 text-[0.65rem] font-medium text-zinc-500">
            {kindLabel[item.kind]}
            {item.isSpoiler ? " · Spoiler" : null}
          </p>
        </div>
        <CommunityPostMenu
          onHide={() => onHide?.(item.id)}
          postId={item.threadPostId}
        />
      </header>

      {contextLine ? (
        <Link
          className="block truncate text-xs text-cyan-200/90 hover:text-cyan-100"
          href={href}
        >
          {contextLine}
        </Link>
      ) : null}

      <Link className="block space-y-1" href={href}>
        {showTitle(item) && item.title ? (
          <h3 className="line-clamp-2 text-[0.95rem] font-bold leading-5 text-white">
            {item.title}
          </h3>
        ) : null}

        {item.kind === "poll" ? (
          <CommunityPollFeedCard item={item} />
        ) : item.kind === "challenge" && item.challengeMeta ? (
          <div className="space-y-1.5">
            <SpoilerContent isSpoiler={item.isSpoiler}>
              <p className="line-clamp-2 text-sm leading-5 text-zinc-400">
                {primaryBody(item)}
              </p>
            </SpoilerContent>
            <p className="text-[0.65rem] text-zinc-500">
              {item.challengeMeta.deadlineLabel} · {item.challengeMeta.entryCount}{" "}
              bài
            </p>
          </div>
        ) : (
          <SpoilerContent isSpoiler={item.isSpoiler}>
            <p
              className={`line-clamp-3 text-sm leading-5 ${
                item.kind === "story_comment_highlight"
                  ? "text-zinc-100"
                  : "text-zinc-400"
              }`}
            >
              {primaryBody(item)}
            </p>
          </SpoilerContent>
        )}
      </Link>

      {showSecondaryComment ? (
        <p className="line-clamp-2 border-l-2 border-white/10 pl-2 text-xs leading-5 text-zinc-500">
          {item.featuredCommentPreview}
        </p>
      ) : null}

      <footer className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
          <button
            className={`font-semibold ${hasVoted ? "text-cyan-200" : ""}`}
            onClick={() => {
              setHasVoted((value) => !value);
              setVoteCount((count) => (hasVoted ? Math.max(0, count - 1) : count + 1));
            }}
            type="button"
          >
            Hay {voteCount}
          </button>
          <span>·</span>
          <Link className="hover:text-zinc-300" href={`${href}#comments`}>
            {item.commentCount} bình luận
          </Link>
          <span>·</span>
          <button
            className="hover:text-zinc-300"
            onClick={() => {
              const url =
                typeof window !== "undefined"
                  ? `${window.location.origin}${href}`
                  : href;
              void navigator.share?.({ title: item.title ?? "ChapMee", url });
            }}
            type="button"
          >
            Chia sẻ
          </button>
        </div>
        {item.kind === "challenge" ? (
          <Link
            className="text-xs font-bold text-zinc-400 hover:text-zinc-200"
            href={href}
          >
            Xem bài
          </Link>
        ) : (
          <Link
            className="text-xs font-bold text-cyan-300/90 hover:text-cyan-200"
            href={cta.href}
          >
            {cta.label}
          </Link>
        )}
      </footer>
    </article>
  );
}
