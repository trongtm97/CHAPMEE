"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AvatarFallback } from "@/components/ui/AvatarFallback";
import {
  COMMUNITY_AUTHORS_SECTION_ID,
  getCommunityAuthorsSectionHref
} from "@/lib/community/community-author-url";
import type { CommunityStoryOption } from "@/lib/community/getStoriesForCommunityPost";

const postTypeOptions = [
  { label: "Review", type: "review" },
  { label: "Bình chọn", type: "poll_placeholder" },
  { label: "Thử thách", type: "challenge" },
  { label: "Hỏi tác giả", type: "discussion" }
] as const;

type CommunityStatusComposerProps = {
  avatarUrl?: string | null;
  displayName?: string | null;
  isLoggedIn: boolean;
  onPosted?: () => void;
  stories?: CommunityStoryOption[];
};

function scrollToAuthorsSection() {
  document.getElementById(COMMUNITY_AUTHORS_SECTION_ID)?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

export function CommunityStatusComposer({
  avatarUrl,
  displayName,
  isLoggedIn,
  onPosted,
  stories = []
}: CommunityStatusComposerProps) {
  const pathname = usePathname();
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("discussion");
  const [showTags, setShowTags] = useState(false);
  const [storyId, setStoryId] = useState("");
  const [episodeNumber, setEpisodeNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const avatarLabel = displayName?.trim() || "Bạn";
  const canSubmit = isLoggedIn && content.trim().length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/community/posts", {
        body: JSON.stringify({
          content: content.trim(),
          episodeNumber: episodeNumber ? Number(episodeNumber) : null,
          storyId: storyId || null,
          type: postType
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Không thể đăng bài.");
        return;
      }

      setContent("");
      setStoryId("");
      setEpisodeNumber("");
      setShowTags(false);
      setPostType("discussion");
      setSuccess("Đã đăng bài.");
      onPosted?.();
    } catch {
      setError("Mất kết nối khi đăng bài.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      aria-label="Soạn bài cộng đồng"
      className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface-soft)]"
    >
      <div className="flex items-start gap-2.5 p-3 sm:gap-3 sm:p-3.5">
        <AvatarFallback
          className="mt-0.5 shrink-0 ring-1 ring-white/10"
          name={avatarLabel}
          size="md"
          src={avatarUrl ?? undefined}
        />

        <div className="min-w-0 flex-1">
          {isLoggedIn ? (
            <textarea
              className="min-h-[4.5rem] w-full resize-none rounded-xl border-0 bg-transparent px-0 py-1 text-sm leading-6 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:ring-0"
              maxLength={5000}
              onChange={(event) => {
                setContent(event.target.value);
                if (error) {
                  setError(null);
                }
                if (success) {
                  setSuccess(null);
                }
              }}
              placeholder="Bạn đang nghĩ gì về truyện hôm nay?"
              rows={2}
              value={content}
            />
          ) : (
            <Link
              className="flex min-h-[3rem] items-center text-sm text-zinc-500 transition hover:text-zinc-300"
              href={`/login?next=${encodeURIComponent("/community")}`}
            >
              Đăng nhập để chia sẻ với cộng đồng...
            </Link>
          )}

          {showTags ? (
            <div className="mt-2 grid gap-2 rounded-lg border border-white/8 bg-black/20 p-2 sm:grid-cols-2">
              <label className="space-y-0.5">
                <span className="text-[0.65rem] text-zinc-500">Truyện</span>
                <select
                  className="h-8 w-full rounded-md border border-white/10 bg-white/[0.04] px-2 text-xs text-white outline-none focus:border-cyan-300/40"
                  disabled={!isLoggedIn || submitting}
                  onChange={(event) => {
                    setStoryId(event.target.value);
                    if (!event.target.value) {
                      setEpisodeNumber("");
                    }
                  }}
                  value={storyId}
                >
                  <option value="">Không gắn</option>
                  {stories.map((story) => (
                    <option key={story.id} value={story.id}>
                      {story.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-0.5">
                <span className="text-[0.65rem] text-zinc-500">Chương</span>
                <input
                  className="h-8 w-full rounded-md border border-white/10 bg-white/[0.04] px-2 text-xs text-white outline-none focus:border-cyan-300/40 disabled:opacity-50"
                  disabled={!isLoggedIn || submitting || !storyId}
                  inputMode="numeric"
                  onChange={(event) => setEpisodeNumber(event.target.value.replace(/\D/g, ""))}
                  placeholder="Số chương"
                  type="text"
                  value={episodeNumber}
                />
              </label>
            </div>
          ) : null}

          {error ? (
            <p className="mt-2 text-xs text-rose-300">{error}</p>
          ) : null}
          {success ? (
            <p className="mt-2 text-xs text-emerald-300">{success}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-white/8 px-3 py-2 sm:px-3.5">
        <button
          className="tap-highlight shrink-0 text-xs font-medium text-cyan-200/90 hover:text-cyan-100"
          onClick={() => setShowTags((value) => !value)}
          type="button"
        >
          {showTags ? "Ẩn thẻ" : "Gắn truyện"}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[0.65rem] tabular-nums text-zinc-600">{content.length}/5000</span>
          {isLoggedIn ? (
            <button
              className="tap-highlight h-8 shrink-0 rounded-lg bg-cyan-400 px-3.5 text-xs font-semibold text-zinc-950 transition enabled:hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canSubmit}
              onClick={() => void handleSubmit()}
              type="button"
            >
              {submitting ? "..." : "Đăng"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-t border-white/6 px-3 py-2 [scrollbar-width:none] sm:px-3.5 [&::-webkit-scrollbar]:hidden">
        {postTypeOptions.map((item) => (
          <button
            className={`tap-highlight shrink-0 rounded-md px-2 py-1 text-[0.7rem] font-medium transition ${
              postType === item.type
                ? "bg-cyan-300/15 text-cyan-100"
                : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
            }`}
            disabled={!isLoggedIn || submitting}
            key={item.label}
            onClick={() => setPostType(item.type)}
            type="button"
          >
            {item.label}
          </button>
        ))}
        <span className="mx-1 h-3 w-px shrink-0 bg-white/10" />
        <Link
          className="shrink-0 text-[0.7rem] font-medium text-zinc-500 hover:text-zinc-300"
          href="/community/groups"
        >
          Nhóm truyện
        </Link>
        <Link
          className="shrink-0 text-[0.7rem] font-medium text-zinc-500 hover:text-zinc-300"
          href={getCommunityAuthorsSectionHref()}
          onClick={(event) => {
            if (pathname === "/community") {
              event.preventDefault();
              scrollToAuthorsSection();
            }
          }}
        >
          Tác giả
        </Link>
      </div>
    </section>
  );
}
