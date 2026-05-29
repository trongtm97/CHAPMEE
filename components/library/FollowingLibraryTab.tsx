"use client";

import Link from "next/link";
import { StoryImageThumb } from "@/components/common/StoryImageView";
import { useMemo } from "react";
import { LibraryEmptyState } from "@/components/library/LibraryEmptyState";
import type {
  LibraryFollowedAuthor,
  LibraryFollowedGroup,
  LibraryFollowedStory
} from "@/types/library";

type FollowingLibraryTabProps = {
  authors: LibraryFollowedAuthor[];
  stories: LibraryFollowedStory[];
  groups: LibraryFollowedGroup[];
  searchQuery: string;
};

const PREVIEW_LIMIT = 3;

function SectionHeader({
  title,
  href,
  showAll
}: {
  title: string;
  href: string;
  showAll: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-400">{title}</h3>
      {showAll ? (
        <Link className="text-[0.65rem] font-semibold text-cyan-200" href={href}>
          Xem tất cả
        </Link>
      ) : null}
    </div>
  );
}

export function FollowingLibraryTab({
  authors,
  groups,
  searchQuery,
  stories
}: FollowingLibraryTabProps) {
  const query = searchQuery.trim().toLowerCase();

  const filteredAuthors = useMemo(() => {
    if (!query) return authors;
    return authors.filter((a) => a.penName.toLowerCase().includes(query));
  }, [authors, query]);

  const filteredStories = useMemo(() => {
    if (!query) return stories;
    return stories.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        (s.authorName?.toLowerCase().includes(query) ?? false)
    );
  }, [stories, query]);

  const filteredGroups = useMemo(() => {
    if (!query) return groups;
    return groups.filter((g) => g.title.toLowerCase().includes(query));
  }, [groups, query]);

  const isEmpty =
    filteredAuthors.length === 0 &&
    filteredStories.length === 0 &&
    filteredGroups.length === 0;

  if (isEmpty && !query) {
    return (
      <LibraryEmptyState
        action={
          <Link
            className="inline-flex min-h-8 items-center justify-center rounded-full bg-cyan-300 px-3.5 text-xs font-bold text-zinc-950"
            href="/discover"
          >
            Khám phá truyện
          </Link>
        }
        description="Theo dõi tác giả, truyện hoặc nhóm để cập nhật nhanh hơn."
        title="Bạn chưa theo dõi nội dung nào."
      />
    );
  }

  if (isEmpty && query) {
    return (
      <p className="py-4 text-center text-xs text-zinc-500">Không tìm thấy kết quả phù hợp.</p>
    );
  }

  const authorPreview = filteredAuthors.slice(0, PREVIEW_LIMIT);
  const storyPreview = filteredStories.slice(0, PREVIEW_LIMIT);
  const groupPreview = filteredGroups.slice(0, PREVIEW_LIMIT);

  return (
    <div className="space-y-4">
      {filteredAuthors.length > 0 ? (
        <section className="space-y-2">
          <SectionHeader
            href="/discover"
            showAll={filteredAuthors.length > PREVIEW_LIMIT}
            title="Tác giả đang theo dõi"
          />
          <div className="space-y-2">
            {authorPreview.map((author) => (
              <Link
                className="flex items-center gap-2.5 rounded-xl border border-white/6 bg-white/[0.02] p-2"
                href={`/creators/${author.id}`}
                key={author.id}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-sm font-bold text-white">
                  {author.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={author.penName}
                      className="h-full w-full object-cover"
                      src={author.avatarUrl}
                    />
                  ) : (
                    author.penName.charAt(0)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{author.penName}</p>
                  <p className="text-[0.65rem] text-zinc-500">{author.storyCount} truyện</p>
                </div>
                {author.hasNewChapter ? (
                  <span className="shrink-0 text-[0.6rem] font-bold text-amber-200">
                    Có chương mới
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {filteredGroups.length > 0 ? (
        <section className="space-y-2">
          <SectionHeader
            href="/community?tab=following&from=me"
            showAll={filteredGroups.length > PREVIEW_LIMIT}
            title="Nhóm truyện đang theo dõi"
          />
          <div className="space-y-2">
            {groupPreview.map((group) => (
              <Link
                className="flex items-center gap-2.5 rounded-xl border border-white/6 bg-white/[0.02] p-2"
                href={`/community/story/${group.id}`}
                key={group.id}
              >
                <StoryImageThumb
                  className="h-9 w-7 shrink-0 overflow-hidden rounded-md border border-white/8 bg-white/5"
                  story={{ title: group.title, coverUrl: group.coverUrl }}
                  usage="catalogRow"
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold text-white">{group.title}</p>
                  <p className="text-[0.65rem] text-zinc-500">
                    {group.postCount} thảo luận mới
                  </p>
                </div>
                {group.isHot ? (
                  <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[0.58rem] font-bold text-red-200">
                    HOT
                  </span>
                ) : group.isNew ? (
                  <span className="rounded-full bg-cyan-300/15 px-1.5 py-0.5 text-[0.58rem] font-bold text-cyan-100">
                    Mới
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {filteredStories.length > 0 ? (
        <section className="space-y-2">
          <SectionHeader
            href="/me/library?tab=following"
            showAll={filteredStories.length > PREVIEW_LIMIT}
            title="Truyện đang theo dõi"
          />
          <div className="space-y-2">
            {storyPreview.map((story) => (
              <Link
                className={`flex items-center gap-2.5 rounded-xl border p-2 ${
                  story.hasNewChapter
                    ? "border-amber-400/20 bg-amber-400/[0.04]"
                    : "border-white/6 bg-white/[0.02]"
                }`}
                href={`/stories/${story.slug}`}
                key={story.id}
              >
                <StoryImageThumb
                  className="h-9 w-7 shrink-0 overflow-hidden rounded-md border border-white/8 bg-white/5"
                  story={story}
                  usage="catalogRow"
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold text-white">{story.title}</p>
                  {story.authorName ? (
                    <p className="truncate text-[0.65rem] text-zinc-500">{story.authorName}</p>
                  ) : null}
                </div>
                {story.hasNewChapter ? (
                  <span className="shrink-0 text-[0.6rem] font-bold text-amber-200">
                    Có chương mới
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
