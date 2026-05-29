"use client";

import { useState } from "react";
import {
  readerSectionDivider,
  readerSectionTitle
} from "@/components/reader/reader-section-styles";
import {
  READER_PRIMARY_REACTION_KEYS,
  READER_REACTION_OPTIONS,
  READER_SECONDARY_REACTION_KEYS
} from "@/lib/reader/reader-reaction-options";
import { readerReactToChapterAction } from "@/lib/reader/reader-reaction-actions";
import type { ChapterReactionKey, ChapterReactionView } from "@/types/reaction";

type ReaderReactionPanelProps = {
  reaction: ChapterReactionView | null;
  loggedIn: boolean;
  returnTo: string;
  chapterId: string;
  storyId: string;
};

const primaryOptions = READER_REACTION_OPTIONS.filter((item) =>
  READER_PRIMARY_REACTION_KEYS.includes(item.key)
);
const secondaryOptions = READER_REACTION_OPTIONS.filter((item) =>
  READER_SECONDARY_REACTION_KEYS.includes(item.key)
);

export function ReaderReactionPanel({
  chapterId,
  loggedIn,
  reaction,
  returnTo,
  storyId
}: ReaderReactionPanelProps) {
  const selectedKey = reaction?.userReactionKey ?? null;
  const selectedOption = selectedKey
    ? READER_REACTION_OPTIONS.find((item) => item.key === selectedKey)
    : null;
  const selectedCount =
    selectedKey && reaction
      ? (reaction.options.find((item) => item.key === selectedKey)?.count ?? 0)
      : 0;
  const hasSecondarySelected = Boolean(
    selectedKey && READER_SECONDARY_REACTION_KEYS.includes(selectedKey)
  );
  const [showMore, setShowMore] = useState(hasSecondarySelected);

  return (
    <section className={readerSectionDivider}>
      <h3 className={readerSectionTitle}>Bạn thấy chương này thế nào?</h3>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {primaryOptions.map((option) => (
          <ReactionChip
            chapterId={chapterId}
            isSelected={selectedKey === option.key}
            key={option.key}
            loggedIn={loggedIn}
            option={option}
            returnTo={returnTo}
            storyId={storyId}
          />
        ))}
      </div>
      {showMore ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {secondaryOptions.map((option) => (
            <ReactionChip
              chapterId={chapterId}
              isSelected={selectedKey === option.key}
              key={option.key}
              loggedIn={loggedIn}
              option={option}
              returnTo={returnTo}
              storyId={storyId}
            />
          ))}
        </div>
      ) : (
        <button
          className="mt-2 text-xs font-semibold text-zinc-500 hover:text-cyan-200/90"
          onClick={() => setShowMore(true)}
          type="button"
        >
          Thêm cảm xúc
        </button>
      )}
      {selectedOption && selectedCount > 0 ? (
        <p className="mt-2.5 text-xs text-zinc-500">
          <span className="font-medium text-zinc-300">{selectedCount}</span> người cũng chọn{" "}
          <span className="font-medium text-zinc-200">{selectedOption.label}</span>
        </p>
      ) : null}
      {!loggedIn ? (
        <p className="mt-2 text-[0.6875rem] text-zinc-600">Đăng nhập để lưu cảm xúc của bạn.</p>
      ) : null}
    </section>
  );
}

function ReactionChip({
  chapterId,
  isSelected,
  loggedIn,
  option,
  returnTo,
  storyId
}: {
  chapterId: string;
  isSelected: boolean;
  loggedIn: boolean;
  option: { key: ChapterReactionKey; label: string; emoji: string };
  returnTo: string;
  storyId: string;
}) {
  return (
    <form action={readerReactToChapterAction}>
      <input name="chapterId" type="hidden" value={chapterId} />
      <input name="storyId" type="hidden" value={storyId} />
      <input name="reactionKey" type="hidden" value={option.key} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <button
        className={`tap-highlight inline-flex h-9 max-w-full items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition disabled:opacity-50 ${
          isSelected
            ? "border-cyan-300/45 bg-cyan-300/12 text-cyan-100"
            : "border-white/[0.06] bg-white/[0.02] text-zinc-300 hover:bg-white/[0.05]"
        }`}
        disabled={!loggedIn}
        title={!loggedIn ? "Đăng nhập để phản ứng" : option.label}
        type="submit"
      >
        <span aria-hidden className="shrink-0 text-sm">
          {option.emoji}
        </span>
        <span className="truncate">{option.label}</span>
      </button>
    </form>
  );
}
