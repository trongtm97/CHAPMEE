"use client";

import Link from "next/link";
import { useActionState } from "react";
import { moderateStoryReviewAction } from "@/lib/admin/story-review-moderation-actions";
import type { AdminStoryReviewRow } from "@/types/story-review";

type StoryReviewModerationListProps = {
  items: AdminStoryReviewRow[];
};

export function StoryReviewModerationList({ items }: StoryReviewModerationListProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
        Không có đánh giá nào trong bộ lọc này.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-white/[0.08] bg-white/[0.02] text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-3 py-2.5">Truyện</th>
            <th className="px-3 py-2.5">Người đánh giá</th>
            <th className="px-3 py-2.5">Điểm</th>
            <th className="px-3 py-2.5">Tiêu chí</th>
            <th className="px-3 py-2.5">Trạng thái</th>
            <th className="px-3 py-2.5">Báo cáo</th>
            <th className="px-3 py-2.5">Ngày</th>
            <th className="px-3 py-2.5">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {items.map((item) => (
            <StoryReviewModerationRow item={item} key={item.id} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StoryReviewModerationRow({ item }: { item: AdminStoryReviewRow }) {
  const [state, action, pending] = useActionState(
    async (_prev: { ok: boolean; message: string } | null, formData: FormData) => {
      return moderateStoryReviewAction(formData);
    },
    null
  );

  const criteria = `C${item.characterScore} P${item.plotScore} V${item.writingStyleScore} W${item.worldbuildingScore}`;

  return (
    <tr className="align-top text-zinc-300">
      <td className="max-w-[10rem] px-3 py-3">
        <Link className="font-semibold text-cyan-300 hover:text-cyan-200" href={`/truyen/${item.storySlug}`}>
          {item.storyTitle}
        </Link>
      </td>
      <td className="px-3 py-3">
        {item.displayName ?? item.username ?? "—"}
        {item.username ? (
          <span className="block text-xs text-zinc-500">@{item.username}</span>
        ) : null}
      </td>
      <td className="px-3 py-3 font-bold text-cyan-300">{item.overallRating}/5</td>
      <td className="px-3 py-3 text-xs text-zinc-500">{criteria}</td>
      <td className="px-3 py-3">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            item.status === "visible"
              ? "bg-emerald-400/10 text-emerald-300"
              : item.status === "pending"
                ? "bg-amber-400/10 text-amber-300"
                : "bg-zinc-500/20 text-zinc-400"
          }`}
        >
          {item.status}
        </span>
      </td>
      <td className="px-3 py-3">{item.reportCount}</td>
      <td className="px-3 py-3 text-xs text-zinc-500">
        {new Date(item.createdAt).toLocaleString("vi-VN")}
      </td>
      <td className="px-3 py-3">
        <form action={action} className="flex flex-col gap-1">
          <input name="reviewId" type="hidden" value={item.id} />
          {item.status !== "hidden" ? (
            <button
              className="text-left text-xs font-semibold text-amber-300 hover:text-amber-200"
              disabled={pending}
              name="status"
              type="submit"
              value="hidden"
            >
              Ẩn
            </button>
          ) : null}
          {item.status !== "visible" ? (
            <button
              className="text-left text-xs font-semibold text-emerald-300 hover:text-emerald-200"
              disabled={pending}
              name="status"
              type="submit"
              value="visible"
            >
              Hiện
            </button>
          ) : null}
          {item.status !== "pending" ? (
            <button
              className="text-left text-xs font-semibold text-zinc-400 hover:text-zinc-200"
              disabled={pending}
              name="status"
              type="submit"
              value="pending"
            >
              Chờ duyệt
            </button>
          ) : null}
        </form>
        {state?.message ? (
          <p className={`mt-1 text-xs ${state.ok ? "text-emerald-400" : "text-rose-400"}`}>
            {state.message}
          </p>
        ) : null}
        {item.body ? (
          <details className="mt-2 text-xs text-zinc-500">
            <summary className="cursor-pointer text-cyan-400/80">Nội dung</summary>
            <p className="mt-1 max-w-xs whitespace-pre-wrap">{item.body}</p>
          </details>
        ) : null}
      </td>
    </tr>
  );
}
