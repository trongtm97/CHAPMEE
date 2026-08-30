"use client";

import Link from "next/link";
import { useActionState } from "react";
import { moderateInlineCommentAction } from "@/lib/admin/inline-comment-moderation-actions";
import type { AdminInlineThreadRow } from "@/types/inline-comment";

type InlineCommentModerationListProps = {
  items: AdminInlineThreadRow[];
};

export function InlineCommentModerationList({ items }: InlineCommentModerationListProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
        Không có luồng bình luận nào trong bộ lọc này.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-white/[0.08] bg-white/[0.02] text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-3 py-2.5">Truyện / chương</th>
            <th className="px-3 py-2.5">Đoạn trích</th>
            <th className="px-3 py-2.5">Tác giả</th>
            <th className="px-3 py-2.5">Trạng thái</th>
            <th className="px-3 py-2.5">BL</th>
            <th className="px-3 py-2.5">BC</th>
            <th className="px-3 py-2.5">Ngày</th>
            <th className="px-3 py-2.5">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {items.map((item) => (
            <InlineThreadModerationRow item={item} key={item.threadId} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InlineThreadModerationRow({ item }: { item: AdminInlineThreadRow }) {
  const [state, action, pending] = useActionState(
    async (_prev: { ok: boolean; message: string } | null, formData: FormData) => {
      return moderateInlineCommentAction(formData);
    },
    null
  );

  const chapterLabel =
    item.episodeNumber != null
      ? `Ch. ${item.episodeNumber}${item.chapterTitle ? ` — ${item.chapterTitle}` : ""}`
      : item.chapterTitle ?? "Chương";

  return (
    <tr className="align-top text-zinc-300">
      <td className="max-w-[11rem] px-3 py-3">
        <Link
          className="font-semibold text-cyan-300 hover:text-cyan-200"
          href={`/truyen/${item.storySlug}`}
        >
          {item.storyTitle}
        </Link>
        <p className="mt-0.5 text-xs text-zinc-500">{chapterLabel}</p>
        {item.anchorStatus === "orphaned" ? (
          <span className="mt-1 inline-block rounded bg-rose-500/10 px-1.5 py-0.5 text-xs text-rose-300">
            Mồ côi
          </span>
        ) : null}
      </td>
      <td className="max-w-xs px-3 py-3">
        <p className="line-clamp-3 text-xs italic text-zinc-400">&ldquo;{item.quoteText}&rdquo;</p>
        <p className="mt-1 font-mono text-[10px] text-zinc-600">{item.blockId}</p>
      </td>
      <td className="px-3 py-3 text-xs">
        {item.authorDisplayName ?? item.authorUsername ?? "—"}
      </td>
      <td className="px-3 py-3 text-xs">{item.threadStatus}</td>
      <td className="px-3 py-3">{item.commentCount}</td>
      <td className="px-3 py-3">{item.reportCount}</td>
      <td className="px-3 py-3 text-xs text-zinc-500">
        {new Date(item.createdAt).toLocaleString("vi-VN")}
      </td>
      <td className="px-3 py-3">
        {item.episodeNumber != null ? (
          <Link
            className="mb-1 block text-left text-xs font-semibold text-cyan-300 hover:text-cyan-200"
            href={`/truyen/${item.storySlug}/chuong/${item.episodeNumber}`}
          >
            Xem ngữ cảnh
          </Link>
        ) : (
          <Link
            className="mb-1 block text-left text-xs font-semibold text-cyan-300 hover:text-cyan-200"
            href={`/truyen/${item.storySlug}`}
          >
            Xem ngữ cảnh
          </Link>
        )}
        <form action={action} className="flex flex-col gap-1">
          <input name="threadId" type="hidden" value={item.threadId} />
          <button
            className="text-left text-xs font-semibold text-amber-300"
            disabled={pending}
            name="action"
            type="submit"
            value="hide"
          >
            Ẩn luồng
          </button>
          <button
            className="text-left text-xs font-semibold text-zinc-400"
            disabled={pending}
            name="action"
            type="submit"
            value="resolve"
          >
            Xử lý
          </button>
          <button
            className="text-left text-xs font-semibold text-emerald-300"
            disabled={pending}
            name="action"
            type="submit"
            value="restore"
          >
            Khôi phục
          </button>
        </form>
        {state?.message ? (
          <p className={`mt-1 text-xs ${state.ok ? "text-emerald-400" : "text-rose-400"}`}>
            {state.message}
          </p>
        ) : null}
      </td>
    </tr>
  );
}
