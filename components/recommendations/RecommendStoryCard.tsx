"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RecommendStoryDialog } from "@/components/recommendations/RecommendStoryDialog";
import { recommendStoryAction } from "@/lib/actions/recommend-story";
import type { StoryRecommendationContext } from "@/lib/recommendations/story-context";

type RecommendStoryCardProps = {
  storyId: string;
  returnTo: string;
  context: StoryRecommendationContext;
  loggedIn: boolean;
};

export function RecommendStoryCard({
  context,
  loggedIn,
  returnTo,
  storyId
}: RecommendStoryCardProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!context.enabled) {
    return null;
  }

  return (
    <>
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-zinc-100">Đề cử truyện</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Dùng Phiếu đề cử để ủng hộ truyện bạn yêu thích — tách biệt với BXH organic.
            </p>
          </div>
          {loggedIn ? (
            <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-300">
              {context.balance.toLocaleString("vi-VN")} phiếu
            </span>
          ) : null}
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
            <dt className="text-zinc-500">Tổng Phiếu đề cử</dt>
            <dd className="font-bold text-zinc-100">
              {context.totalTicketsReceived.toLocaleString("vi-VN")}
            </dd>
          </div>
          <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
            <dt className="text-zinc-500">Người ủng hộ</dt>
            <dd className="font-bold text-zinc-100">{context.supporterCount}</dd>
          </div>
        </dl>

        {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
        {success ? <p className="mt-2 text-sm text-emerald-300">{success}</p> : null}

        {!loggedIn ? (
          <div className="mt-3">
            <Link
              className="inline-flex min-h-10 w-full items-center justify-center rounded-full bg-amber-300 px-4 text-sm font-bold text-zinc-950"
              href={`/login?next=${encodeURIComponent(returnTo)}`}
            >
              Đăng nhập để đề cử
            </Link>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full bg-amber-300 px-4 text-sm font-bold text-zinc-950 disabled:opacity-60"
              disabled={isPending}
              onClick={() => {
                setError(null);
                setSuccess(null);
                setDialogOpen(true);
              }}
              type="button"
            >
              Đề cử
            </button>
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-semibold text-zinc-300 hover:bg-white/[0.04]"
              href="/bang-xep-hang/duoc-de-cu"
            >
              Bảng đề cử
            </Link>
          </div>
        )}
      </div>

      <RecommendStoryDialog
        balance={context.balance}
        isPending={isPending}
        minTickets={context.minTickets}
        onClose={() => setDialogOpen(false)}
        onConfirm={(tickets) => {
          startTransition(async () => {
            const result = await recommendStoryAction(storyId, tickets, returnTo);
            if (result.loginRequired) {
              router.push(`/login?next=${encodeURIComponent(returnTo)}`);
              return;
            }
            if (!result.ok) {
              setError(result.error ?? "Không thể đề cử.");
              return;
            }
            setDialogOpen(false);
            setSuccess(
              `Đã dùng ${result.ticketsSpent?.toLocaleString("vi-VN")} Phiếu đề cử. Cảm ơn bạn đã ủng hộ!`
            );
            router.refresh();
          });
        }}
        open={dialogOpen}
      />
    </>
  );
}
