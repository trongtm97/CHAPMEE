"use client";

import { useActionState, useState } from "react";
import {
  grantRecommendationTicketsAction,
  lookupRecommendationTicketBalanceAction
} from "@/lib/admin/recommendation-ticket-actions";
import type { RecommendationTicketsConfig } from "@/lib/recommendations/config";

type RecentGrant = {
  id: string;
  userId: string;
  amount: number;
  note: string | null;
  createdAt: string;
  username: string | null;
  displayName: string | null;
};

type RecommendationTicketsAdminPanelProps = {
  config: RecommendationTicketsConfig;
  recentGrants: RecentGrant[];
};

export function RecommendationTicketsAdminPanel({
  config,
  recentGrants
}: RecommendationTicketsAdminPanelProps) {
  const [grantState, grantAction, grantPending] = useActionState(
    async (_prev: { ok: boolean; message: string } | null, formData: FormData) => {
      return grantRecommendationTicketsAction(formData);
    },
    null
  );

  const [lookupBalance, setLookupBalance] = useState<number | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupPending, setLookupPending] = useState(false);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <h2 className="text-lg font-bold text-zinc-100">Cấu hình Phiếu đề cử (MVP)</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Chỉnh trong <code className="text-zinc-400">lib/recommendations/config.ts</code>. TODO:
          chuyển sang admin sau.
        </p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Xu → Phiếu</dt>
            <dd className="font-semibold text-zinc-200">
              1 Xu = {config.ticketsPerPaidCoin} phiếu
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Hoàn thành chương</dt>
            <dd className="font-semibold text-zinc-200">
              {config.enableChapterCompletionTickets
                ? `+${config.ticketsPerCompletedChapter} phiếu`
                : "Tắt"}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Mốc đọc truyện</dt>
            <dd className="font-semibold text-zinc-200">
              {config.enableStoryReadingMilestoneTickets
                ? `${config.storyMilestoneChapterCount} chương → +${config.ticketsPerStoryMilestone}`
                : "Tắt"}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Bình luận truyện</dt>
            <dd className="font-semibold text-zinc-200">
              {config.enableCommentTickets
                ? `+${config.ticketsPerValidComment} phiếu / comment`
                : "Tắt"}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Hoạt động hằng ngày</dt>
            <dd className="font-semibold text-zinc-200">
              {config.enableDailyActivityTickets
                ? `+${config.ticketsPerDailyActivity} phiếu / ngày`
                : "Tắt"}
            </dd>
          </div>
        </dl>
      </section>

      <form
        action={grantAction}
        className="space-y-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4"
      >
        <h2 className="text-lg font-bold text-zinc-100">Cấp Phiếu đề cử (admin)</h2>
        <p className="text-sm text-zinc-500">
          Nhập profile UUID của độc giả. Ghi ledger <code className="text-zinc-400">admin_bonus</code>.
        </p>
        <input
          className="w-full rounded-lg border border-white/[0.08] bg-[#0b1016] px-3 py-2 text-sm text-white"
          name="userId"
          placeholder="User profile UUID"
          required
        />
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/[0.04] disabled:opacity-50"
            disabled={lookupPending}
            onClick={async (event) => {
              event.preventDefault();
              const form = event.currentTarget.closest("form");
              const input = form?.querySelector<HTMLInputElement>('input[name="userId"]');
              const userId = input?.value?.trim() ?? "";
              if (!userId) return;
              setLookupPending(true);
              setLookupError(null);
              const result = await lookupRecommendationTicketBalanceAction(userId);
              setLookupPending(false);
              if (!result.ok) {
                setLookupBalance(null);
                setLookupError(result.error ?? "Không tra được số dư.");
                return;
              }
              setLookupBalance(result.balance);
            }}
            type="button"
          >
            {lookupPending ? "Đang tra…" : "Tra số dư"}
          </button>
          {lookupBalance !== null ? (
            <span className="text-sm text-amber-300">
              Số dư hiện tại: {lookupBalance.toLocaleString("vi-VN")} phiếu
            </span>
          ) : null}
          {lookupError ? <span className="text-sm text-rose-300">{lookupError}</span> : null}
        </div>
        <input
          className="w-full rounded-lg border border-white/[0.08] bg-[#0b1016] px-3 py-2 text-sm text-white"
          defaultValue={100}
          min={1}
          name="amount"
          required
          type="number"
        />
        <input
          className="w-full rounded-lg border border-white/[0.08] bg-[#0b1016] px-3 py-2 text-sm text-white"
          maxLength={200}
          name="note"
          placeholder="Ghi chú (tuỳ chọn) — sự kiện, bù phiếu…"
        />
        <button
          className="rounded-full bg-amber-300 px-4 py-2 text-sm font-bold text-zinc-950 disabled:opacity-60"
          disabled={grantPending}
          type="submit"
        >
          {grantPending ? "Đang cấp…" : "Cấp Phiếu đề cử"}
        </button>
        {grantState?.message ? (
          <p className={`text-sm ${grantState.ok ? "text-emerald-300" : "text-rose-300"}`}>
            {grantState.message}
          </p>
        ) : null}
      </form>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <h2 className="text-lg font-bold text-zinc-100">Cấp phiếu gần đây</h2>
        {recentGrants.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Chưa có lần cấp admin nào.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {recentGrants.map((row) => (
              <li className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2" key={row.id}>
                <span className="font-semibold text-amber-200">
                  +{row.amount.toLocaleString("vi-VN")} phiếu
                </span>
                {row.username ? (
                  <span className="text-zinc-400"> · @{row.username}</span>
                ) : (
                  <span className="text-zinc-500"> · {row.userId.slice(0, 8)}…</span>
                )}
                {row.note ? <span className="text-zinc-500"> · {row.note}</span> : null}
                <span className="block text-xs text-zinc-600">
                  {new Date(row.createdAt).toLocaleString("vi-VN")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

