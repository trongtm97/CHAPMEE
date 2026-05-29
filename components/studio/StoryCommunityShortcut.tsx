"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, Textarea } from "@/components/ui";
import { studioQuickGroupPostAction } from "@/lib/studio/studio-comments-actions";
import type { StudioStoryGroupShortcut } from "@/types/comments";

type StoryCommunityShortcutProps = {
  groups: StudioStoryGroupShortcut[];
};

export function StoryCommunityShortcut({ groups }: StoryCommunityShortcutProps) {
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
    <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5">
      <div>
        <h2 className="text-base font-bold text-white">Nhóm truyện của bạn</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Vào nhóm fan hoặc đăng bài nhanh — gắn với truyện, không tách khỏi cộng đồng ChapMee.
        </p>
      </div>

      <ul className="space-y-3">
        {groups.map((group) => (
          <li
            className="rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4"
            key={group.id}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-zinc-100">{group.name}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {group.postCount > 0
                    ? `${group.postCount} bài trong nhóm`
                    : "Chưa có bài duyệt — hãy là người mở đầu"}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-zinc-200 hover:bg-white/10"
                  href={group.groupHref}
                >
                  Vào nhóm
                </Link>
                <Button
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
            </div>

            {openStoryId === group.storyId ? (
              <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                <input
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Tiêu đề (tùy chọn)"
                  value={title}
                />
                <Textarea
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Nội dung bài đăng..."
                  rows={3}
                  value={content}
                />
                <Button
                  disabled={isPending || !content.trim()}
                  onClick={() => submitPost(group.storyId)}
                  type="button"
                  variant="primary"
                >
                  {isPending ? "Đang gửi..." : "Đăng vào nhóm"}
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
    </section>
  );
}
