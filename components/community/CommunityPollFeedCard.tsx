"use client";

import { useEffect, useMemo, useState } from "react";
import { readFeedPollVote, writeFeedPollVote } from "@/lib/brand/storage";
import type { CommunityFeedItem, PollOption } from "@/types/community";

type CommunityPollFeedCardProps = {
  item: CommunityFeedItem;
};

export function CommunityPollFeedCard({ item }: CommunityPollFeedCardProps) {
  const allOptions = item.pollOptions ?? [];
  const [options, setOptions] = useState<PollOption[]>(allOptions);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const stored = readFeedPollVote(item.id);

    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as {
        selectedId: string;
        options: PollOption[];
      };
      setSelectedId(parsed.selectedId);
      setOptions(parsed.options);
    } catch {
      setSelectedId(stored);
    }
  }, [item.id]);

  const totalVotes = useMemo(
    () => options.reduce((sum, option) => sum + option.votes, 0),
    [options]
  );

  const voted = Boolean(selectedId);
  const visibleOptions = voted ? options : options.slice(0, 3);
  const hiddenCount = voted ? 0 : Math.max(0, options.length - 3);

  function handleVote(optionId: string) {
    if (selectedId) {
      return;
    }

    const nextOptions = options.map((option) =>
      option.id === optionId ? { ...option, votes: option.votes + 1 } : option
    );

    setOptions(nextOptions);
    setSelectedId(optionId);
    writeFeedPollVote(
      item.id,
      JSON.stringify({ selectedId: optionId, options: nextOptions })
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-zinc-100">
        {item.title ?? "Bạn chọn gì?"}
      </p>
      {visibleOptions.map((option) => {
        const percent =
          totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;

        return (
          <button
            className={`relative w-full overflow-hidden rounded-lg border px-2.5 py-1.5 text-left text-xs transition ${
              voted
                ? "cursor-default border-white/8"
                : "border-white/10 hover:border-cyan-300/25"
            }`}
            disabled={voted}
            key={option.id}
            onClick={() => handleVote(option.id)}
            type="button"
          >
            {voted ? (
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 bg-cyan-300/10"
                style={{ width: `${percent}%` }}
              />
            ) : null}
            <span className="relative flex justify-between gap-2 text-zinc-200">
              <span className="line-clamp-1">{option.label}</span>
              {voted ? (
                <span className="shrink-0 font-bold text-cyan-200">{percent}%</span>
              ) : null}
            </span>
          </button>
        );
      })}
      {!voted && hiddenCount > 0 ? (
        <p className="text-[0.65rem] text-zinc-500">+{hiddenCount} lựa chọn</p>
      ) : null}
      <p className="text-[0.65rem] text-zinc-500">
        {totalVotes} lượt · {voted ? "Đã bình chọn" : "Chạm để bình chọn"}
      </p>
    </div>
  );
}
