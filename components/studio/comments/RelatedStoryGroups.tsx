"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, Textarea } from "@/components/ui";
import { studioQuickGroupPostAction } from "@/lib/studio/studio-comments-actions";
import { commentsBtnSecondary } from "@/components/studio/comments/shared/styles";
import type { StudioStoryGroupShortcut } from "@/types/comments";

type RelatedStoryGroupsProps = {
  groups: StudioStoryGroupShortcut[];
};

export function RelatedStoryGroups({ groups }: RelatedStoryGroupsProps) {
  const [openStoryId, setOpenStoryId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (groups.length === 0) {
    return null;
  }

  function submitPost(storyId: string) {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await studioQuickGroupPostAction({
        storyId,
        title: title || "Cập nhật từ tác giả",
        content
      });

      if (!result.ok) {
        setError(result.error ?? "Không đăng được bài.");
        return;
      }

      setMessage(result.success ?? "Đã gửi bài vào nhóm truyện.");
      setTitle("");
      setContent("");
      setOpenStoryId(null);
    });
  }

  return (
    <section className="rounded-xl border border-white/10 bg-[#111820]/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-white">Cộng đồng truyện</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Nhóm liên quan — tối đa {groups.length} gần đây
          </p>
        </div>
        <Link className="text-xs font-semibold text-cyan-300 hover:text-cyan-200" href="/community">
          Xem tất cả nhóm
        </Link>
      </div>

      <ul className="mt-3 space-y-2">
        {groups.map((group) => (
          <li
            className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-2.5 sm:flex-row sm:items-center sm:justify-between"
            key={group.id}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-100">{group.name}</p>
              <p className="text-xs text-zinc-500">
                {group.postCount > 0
                  ? `${group.postCount} bài trong nhóm`
                  : "Chưa có bài duyệt"}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Link
                className={`${commentsBtnSecondary} min-h-9 px-3 py-1.5 text-xs`}
                href={group.groupHref}
              >
                Vào nhóm
              </Link>
              <Button
                className="min-h-9 text-xs"
                onClick={() => {
                  setOpenStoryId((current) =>
                    current === group.storyId ? null : group.storyId
                  );
                  setError(null);
                  setMessage(null);
                }}
                type="button"
                variant="secondary"
              >
                Đăng bài
              </Button>
            </div>

            {openStoryId === group.storyId ? (
              <div className="col-span-full mt-2 w-full space-y-2 border-t border-white/10 pt-2 sm:col-span-2">
                <input
                  className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Tiêu đề (tùy chọn)"
                  value={title}
                />
                <Textarea
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Nội dung bài đăng..."
                  rows={2}
                  value={content}
                />
                <Button
                  disabled={isPending || !content.trim()}
                  onClick={() => submitPost(group.storyId)}
                  type="button"
                  variant="primary"
                >
                  {isPending ? "Đang gửi..." : "Đăng"}
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
      {message ? <p className="mt-2 text-xs text-emerald-300">{message}</p> : null}
    </section>
  );
}
