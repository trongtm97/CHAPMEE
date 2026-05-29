"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readPollVote, writePollVote } from "@/lib/brand/storage";
import type { DailyPoll, PollOption } from "@/types/community";

type CommunityPollCardProps = {
  poll: DailyPoll;
  compact?: boolean;
};

export function CommunityPollCard({ compact = false, poll }: CommunityPollCardProps) {
  const [options, setOptions] = useState<PollOption[]>(poll.options);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const stored = readPollVote(poll.id);

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
  }, [poll.id]);

  const totalVotes = useMemo(
    () => options.reduce((sum, option) => sum + option.votes, 0),
    [options]
  );

  function handleVote(optionId: string) {
    if (selectedId) {
      return;
    }

    const nextOptions = options.map((option) =>
      option.id === optionId ? { ...option, votes: option.votes + 1 } : option
    );

    setOptions(nextOptions);
    setSelectedId(optionId);

    writePollVote(
      poll.id,
      JSON.stringify({ selectedId: optionId, options: nextOptions })
    );

    // TODO: persist poll vote to backend.
  }

  return (
    <article className={`chap-card space-y-3 ${compact ? "p-3.5" : "p-4"}`}>
      <p className="text-xs font-bold text-violet-200">🗳 Poll hôm nay</p>
      <h3 className="text-sm font-bold leading-6 text-white">{poll.question}</h3>

      <div className="space-y-2">
        {options.map((option) => {
          const percent =
            totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
          const voted = Boolean(selectedId);
          const isSelected = selectedId === option.id;

          return (
            <button
              className={`relative w-full overflow-hidden rounded-2xl border px-3 py-2.5 text-left transition ${
                isSelected
                  ? "border-cyan-300/40 bg-cyan-300/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
              } ${voted ? "cursor-default" : "cursor-pointer"}`}
              disabled={voted}
              key={option.id}
              onClick={() => handleVote(option.id)}
              type="button"
            >
              {voted ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 bg-cyan-300/12"
                  style={{ width: `${percent}%` }}
                />
              ) : null}
              <span className="relative flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-zinc-100">{option.label}</span>
                {voted ? (
                  <span className="shrink-0 text-xs font-bold text-cyan-200">
                    {percent}%
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
        <span>{totalVotes} lượt bình chọn</span>
        {poll.postId ? (
          <Link
            className="font-bold text-cyan-300 hover:text-cyan-200"
            href={`/community/${poll.postId}`}
          >
            {selectedId ? "Xem chi tiết" : "Bình chọn"}
          </Link>
        ) : (
          <span className="font-bold text-cyan-300">
            {selectedId ? "Đã bình chọn" : "Bình chọn"}
          </span>
        )}
      </div>
    </article>
  );
}
