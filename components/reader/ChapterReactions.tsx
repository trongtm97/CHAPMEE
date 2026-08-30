"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import {
  readerSectionDivider,
  readerSectionTitle
} from "@/components/reader/reader-section-styles";
import { SectionHeading } from "@/components/seo/SectionHeading";
import { toggleChapterReactionAction } from "@/lib/reactions/chapter-reaction-actions";
import type { ChapterReactionsSnapshot } from "@/types/reaction";

type ChapterReactionsProps = {
  chapterId: string;
  initialSnapshot: ChapterReactionsSnapshot | null;
  loggedIn: boolean;
  returnTo: string;
};

export function ChapterReactions({
  chapterId,
  initialSnapshot,
  loggedIn,
  returnTo
}: ChapterReactionsProps) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggle = useCallback(
    (reactionTypeKey: string) => {
      if (!loggedIn) {
        router.push(`/login?next=${encodeURIComponent(returnTo)}`);
        return;
      }

      if (!snapshot) {
        return;
      }

      setErrorMessage(null);
      setPendingKey(reactionTypeKey);

      const previous = snapshot;
      const optimistic: ChapterReactionsSnapshot = {
        ...snapshot,
        types: snapshot.types.map((type) => {
          if (type.key !== reactionTypeKey) {
            return type;
          }

          const nextSelected = !type.isSelected;
          const delta = nextSelected ? 1 : -1;
          const nextReal = Math.max(0, type.realCount + delta);
          const nextVisible = Math.max(0, type.visibleCount + delta);

          return {
            ...type,
            isSelected: nextSelected,
            realCount: nextReal,
            visibleCount: nextVisible
          };
        })
      };

      setSnapshot(optimistic);

      startTransition(async () => {
        try {
          const result = await toggleChapterReactionAction(
            chapterId,
            reactionTypeKey,
            returnTo
          );

          if (result.loginRequired) {
            setSnapshot(previous);
            router.push(`/login?next=${encodeURIComponent(returnTo)}`);
            return;
          }

          if (!result.ok || !result.snapshot) {
            setSnapshot(previous);
            setErrorMessage(result.error ?? "Không thể lưu cảm xúc.");
            return;
          }

          setSnapshot(result.snapshot);
        } catch {
          setSnapshot(previous);
          setErrorMessage("Không thể lưu cảm xúc. Vui lòng thử lại.");
        } finally {
          setPendingKey(null);
        }
      });
    },
    [chapterId, loggedIn, returnTo, router, snapshot]
  );

  if (!snapshot || snapshot.types.length === 0) {
    return null;
  }

  return (
    <section aria-busy={isPending} className={readerSectionDivider}>
      <SectionHeading as="h2" className={readerSectionTitle}>
        Bạn thấy chương này thế nào?
      </SectionHeading>
      <div className="mt-3 flex flex-wrap gap-2">
        {snapshot.types.map((type) => {
          const isLoading = pendingKey === type.key && isPending;

          return (
            <button
              key={type.key}
              aria-pressed={type.isSelected}
              className={`tap-highlight inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition disabled:opacity-60 ${
                type.isSelected
                  ? "border-cyan-300/45 bg-cyan-300/12 text-cyan-100"
                  : "border-white/[0.06] bg-white/[0.02] text-zinc-300 hover:bg-white/[0.05]"
              }`}
              disabled={isLoading}
              onClick={() => handleToggle(type.key)}
              title={!loggedIn ? "Đăng nhập để phản ứng" : type.label}
              type="button"
            >
              <span aria-hidden className="shrink-0 text-base leading-none">
                {type.emoji}
              </span>
              <span className="truncate">{type.label}</span>
              {type.realCount > 0 ? (
                <span className="shrink-0 text-[0.625rem] tabular-nums text-zinc-500">
                  {type.realCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {errorMessage ? (
        <p className="mt-2 text-xs text-rose-300" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {!loggedIn ? (
        <p className="mt-2 text-[0.6875rem] text-zinc-600">
          <Link
            className="font-semibold text-cyan-300 hover:text-cyan-200"
            href={`/login?next=${encodeURIComponent(returnTo)}`}
          >
            Đăng nhập
          </Link>{" "}
          để lưu cảm xúc của bạn.
        </p>
      ) : null}
    </section>
  );
}
