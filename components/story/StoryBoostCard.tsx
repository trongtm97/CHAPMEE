"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { spendStoryBoostAction } from "@/lib/boost/story-boost-actions";
import type { StoryBoostEligibility } from "@/types/story-boost";

type StoryBoostCardProps = {
  storyId: string;
  returnTo: string;
  eligibility: StoryBoostEligibility;
  loggedIn: boolean;
};

const UNIT_OPTIONS = [1, 2, 3, 5] as const;

export function StoryBoostCard({ eligibility, loggedIn, returnTo, storyId }: StoryBoostCardProps) {
  const router = useRouter();
  const [units, setUnits] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!eligibility.enabled) {
    return null;
  }

  const spendAmount = eligibility.pointsPerUnit * units;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-zinc-100">Đề cử truyện</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Ủng hộ truyện bằng điểm thưởng. Giúp truyện có thêm cơ hội xuất hiện ở bảng Được đề cử
            — tách biệt với BXH organic.
          </p>
        </div>
        {loggedIn ? (
          <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-300">
            {eligibility.balance} điểm
          </span>
        ) : null}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
          <dt className="text-zinc-500">Điểm đề cử tuần</dt>
          <dd className="font-bold text-zinc-100">{eligibility.weeklyBoostPoints}</dd>
        </div>
        <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
          <dt className="text-zinc-500">Người ủng hộ (7 ngày)</dt>
          <dd className="font-bold text-zinc-100">{eligibility.weeklyUniqueBoosters}</dd>
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
      ) : eligibility.canBoost ? (
        <div className="mt-3 space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-zinc-500">Số lần đề cử</span>
            <select
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-100"
              onChange={(event) => setUnits(Number(event.target.value))}
              value={units}
            >
              {UNIT_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}× ({eligibility.pointsPerUnit * value} điểm)
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-zinc-500">Lời nhắn (tuỳ chọn)</span>
            <input
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-100"
              maxLength={200}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ủng hộ tác giả…"
              value={message}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full bg-amber-300 px-4 text-sm font-bold text-zinc-950 disabled:opacity-60"
              disabled={isPending}
              onClick={() => {
                setError(null);
                setSuccess(null);
                startTransition(async () => {
                  const result = await spendStoryBoostAction(
                    storyId,
                    returnTo,
                    units,
                    message || null
                  );
                  if (result.loginRequired) {
                    router.push(`/login?next=${encodeURIComponent(returnTo)}`);
                    return;
                  }
                  if (!result.ok) {
                    setError(result.error ?? "Không thể đề cử.");
                    return;
                  }
                  setSuccess(
                    `Đã đề cử +${result.boostPoints} điểm boost (đã dùng ${spendAmount} điểm thưởng).`
                  );
                  setMessage("");
                  router.refresh();
                });
              }}
              type="button"
            >
              {isPending ? "Đang xử lý…" : `Đề cử (${spendAmount} điểm)`}
            </button>
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-semibold text-zinc-300 hover:bg-white/[0.04]"
              href="/bang-xep-hang/duoc-de-cu"
            >
              Bảng đề cử
            </Link>
          </div>
          <p className="text-[11px] text-zinc-500">
            Còn {eligibility.userDailyRemaining} điểm boost/ngày (bạn) ·{" "}
            {eligibility.storyDailyRemaining} (truyện)
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-400">{eligibility.reason ?? "Không thể đề cử."}</p>
      )}
    </div>
  );
}
