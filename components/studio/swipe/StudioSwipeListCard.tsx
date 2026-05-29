"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import {
  deleteSwipeDraftAction,
  duplicateSwipeItemAction,
  hideSwipeItemAction
} from "@/lib/swipe/swipe-actions";
import { studioPath } from "@/lib/studio/constants";
import type { SwipeItemListItem } from "@/types/swipe";

const STATUS_LABELS: Record<string, string> = {
  draft: "Nháp",
  hidden: "Đã ẩn",
  published: "Đã đăng",
  rejected: "Cần sửa",
  scheduled: "Đã lên lịch"
};

type StudioSwipeListCardProps = {
  item: SwipeItemListItem;
};

export function StudioSwipeListCard({ item }: StudioSwipeListCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function runAction(action: () => Promise<{ error?: string; ok?: boolean } | void>) {
    startTransition(async () => {
      try {
        const result = await action();

        if (result && "error" in result && result.error) {
          window.alert(result.error);
          return;
        }

        router.refresh();
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "digest" in error &&
          String((error as { digest?: string }).digest).includes("NEXT_REDIRECT")
        ) {
          return;
        }

        window.alert(error instanceof Error ? error.message : "Thao tác thất bại.");
      }
    });
  }

  const linkedLabel = item.chapterNumber
    ? `${item.storyTitle} · Ch.${item.chapterNumber}`
    : item.storyTitle;

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-start">
      <div
        className="h-28 w-full shrink-0 rounded-xl bg-cover bg-center sm:w-36"
        style={
          item.backgroundImageUrl
            ? { backgroundImage: `url(${item.backgroundImageUrl})` }
            : {
                backgroundImage:
                  "linear-gradient(145deg, rgba(8,47,73,0.96), rgba(4,7,12,0.98))"
              }
        }
      />

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-zinc-400">
            {STATUS_LABELS[item.status] ?? item.status}
          </span>
          {item.scheduledAt ? (
            <span className="text-xs text-zinc-500">
              Lịch: {new Date(item.scheduledAt).toLocaleString("vi-VN")}
            </span>
          ) : null}
        </div>

        <h3 className="line-clamp-2 text-lg font-semibold text-white">{item.hook}</h3>
        <p className="line-clamp-2 text-sm text-zinc-400">{item.body}</p>
        <p className="text-xs text-zinc-500">{linkedLabel}</p>

        <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
          <span>{item.viewCount.toLocaleString("vi-VN")} lượt xem</span>
          <span>{item.ctaClickCount.toLocaleString("vi-VN")} lượt bấm CTA</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-zinc-100"
          href={studioPath(`/swipe/${item.id}/edit`)}
        >
          Sửa
        </Link>
        <div className="relative">
          <Button
            disabled={pending}
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
            variant="secondary"
          >
            ⋯
          </Button>
          {menuOpen ? (
            <div className="absolute right-0 z-10 mt-2 min-w-[10rem] rounded-xl border border-white/10 bg-zinc-950 p-1 shadow-lg">
              <Link
                className="block rounded-lg px-3 py-2 text-sm text-zinc-200 hover:bg-white/5"
                href={studioPath(`/swipe/${item.id}/edit?preview=1`)}
                onClick={() => setMenuOpen(false)}
              >
                Xem trước
              </Link>
              <button
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/5"
                onClick={() => {
                  setMenuOpen(false);
                  runAction(() => duplicateSwipeItemAction(item.id));
                }}
                type="button"
              >
                Nhân bản
              </button>
              {item.status === "published" ? (
                <button
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/5"
                  onClick={() => {
                    setMenuOpen(false);
                    runAction(() => hideSwipeItemAction(item.id));
                  }}
                  type="button"
                >
                  Ẩn
                </button>
              ) : null}
              {item.status === "draft" ? (
                <button
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-300 hover:bg-white/5"
                  onClick={() => {
                    setMenuOpen(false);
                    runAction(() => deleteSwipeDraftAction(item.id));
                  }}
                  type="button"
                >
                  Xóa nháp
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
