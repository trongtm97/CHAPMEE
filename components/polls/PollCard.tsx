import { votePollAction } from "@/lib/data/polls";
import type { PollView } from "@/types/poll";
import { Button, Card } from "@/components/ui";

type PollCardProps = {
  poll: PollView;
  returnTo: string;
  storyId?: string | null;
  authorId?: string | null;
  loggedIn?: boolean;
};

function formatPercent(value: number) {
  return `${Math.max(0, Math.min(100, value))}%`;
}

export function PollCard({
  authorId,
  loggedIn = true,
  poll,
  returnTo,
  storyId
}: PollCardProps) {
  const closed = !poll.canVote;

  return (
    <Card className="space-y-4 border-cyan-300/15 bg-[linear-gradient(180deg,rgba(12,18,28,0.96),rgba(11,16,22,0.98))] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
      <div className="space-y-1">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cyan-200">
          Poll
        </p>
        <h3 className="text-lg font-black leading-tight text-white">{poll.question}</h3>
        <p className="text-sm leading-6 text-zinc-400">
          Bạn chọn hướng nào tiếp theo cho câu chuyện?
        </p>
      </div>

      <div className="space-y-3">
        {poll.options.map((option) => {
          const showResults = poll.hasVoted || closed;

          return (
            <form action={votePollAction} key={option.id}>
              <input name="optionId" type="hidden" value={option.id} />
              <input name="pollId" type="hidden" value={poll.id} />
              <input name="returnTo" type="hidden" value={returnTo} />
              <input name="storyId" type="hidden" value={storyId ?? poll.storyId} />
              <input name="authorId" type="hidden" value={authorId ?? poll.authorId} />
              <Button
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left normal-case tracking-normal ${
                  option.isSelected
                    ? "border-cyan-300/30 bg-cyan-300/12 text-white"
                    : "border-white/10 bg-white/[0.04] text-zinc-100"
                }`}
                disabled={closed || !loggedIn}
                type="submit"
                variant="secondary"
              >
                <span className="pr-3 text-sm font-semibold">{option.optionText}</span>
                {showResults ? (
                  <span className="shrink-0 text-right text-sm font-black text-cyan-200">
                    {formatPercent(option.percent)}
                  </span>
                ) : (
                  <span className="shrink-0 text-right text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
                    Vote
                  </span>
                )}
              </Button>
              {showResults ? (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className={`h-full rounded-full ${option.isSelected ? "bg-cyan-300" : "bg-cyan-400/70"}`}
                    style={{ width: `${option.percent}%` }}
                  />
                </div>
              ) : null}
            </form>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-zinc-500">
          {poll.totalVotes > 0
            ? `${poll.totalVotes} lượt vote`
            : "Chưa có lượt vote nào"}
        </p>
        {closed ? (
          <span className="chap-pill px-3 py-1 text-[0.72rem] font-bold text-zinc-200">
            Poll đã đóng
          </span>
        ) : poll.hasVoted ? (
          <span className="chap-pill px-3 py-1 text-[0.72rem] font-bold text-cyan-200">
            Bạn đã vote
          </span>
        ) : (
          <span className="chap-pill px-3 py-1 text-[0.72rem] font-bold text-zinc-200">
            Chọn 1 đáp án
          </span>
        )}
      </div>

      {!loggedIn ? (
        <p className="text-sm leading-6 text-zinc-400">
          Đăng nhập để vote và xem lựa chọn của bạn được ghi nhận.
        </p>
      ) : poll.hasVoted ? (
        <p className="text-sm leading-6 text-zinc-400">
          Bạn chọn hướng này vì sao? Hãy để lại bình luận để tác giả biết lý do.
        </p>
      ) : null}
    </Card>
  );
}
