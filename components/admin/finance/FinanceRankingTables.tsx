"use client";

import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui";
import type {
  FinanceCreatorRow,
  FinanceRefundedStoryRow,
  FinanceStoryChapterRow,
  FinanceSupporterRow
} from "@/types/finance";

type TabId = "authors" | "supporters" | "stories" | "chapters" | "refunded";

type FinanceRankingTablesProps = {
  authors: FinanceCreatorRow[];
  supporters: FinanceSupporterRow[];
  topPaidStories: FinanceStoryChapterRow[];
  topPaidChapters: FinanceStoryChapterRow[];
  topRefundedStories: FinanceRefundedStoryRow[];
  isEmpty: boolean;
};

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "authors", label: "Tác giả doanh thu cao" },
  { id: "supporters", label: "Người ủng hộ nhiều" },
  { id: "stories", label: "Truyện trả phí cao" },
  { id: "chapters", label: "Chương trả phí cao" },
  { id: "refunded", label: "Truyện bị hoàn nhiều" }
];

export function FinanceRankingTables({
  authors,
  supporters,
  topPaidStories,
  topPaidChapters,
  topRefundedStories,
  isEmpty
}: FinanceRankingTablesProps) {
  const [tab, setTab] = useState<TabId>("authors");

  return (
    <Card className="space-y-4">
      <h3 className="text-base font-black text-white">Xếp hạng tài chính</h3>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              tab === t.id
                ? "bg-cyan-300 text-zinc-950"
                : "border border-white/10 text-zinc-300"
            }`}
            key={t.id}
            onClick={() => setTab(t.id)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "authors" ? <AuthorsTable rows={authors} isEmpty={isEmpty} /> : null}
      {tab === "supporters" ? <SupportersTable rows={supporters} isEmpty={isEmpty} /> : null}
      {tab === "stories" ? <StoriesTable rows={topPaidStories} isEmpty={isEmpty} mode="story" /> : null}
      {tab === "chapters" ? (
        <StoriesTable rows={topPaidChapters} isEmpty={isEmpty} mode="chapter" />
      ) : null}
      {tab === "refunded" ? (
        <RefundedStoriesTable rows={topRefundedStories} isEmpty={isEmpty} />
      ) : null}
    </Card>
  );
}

function AuthorsTable({ rows, isEmpty }: { rows: FinanceCreatorRow[]; isEmpty: boolean }) {
  if (isEmpty || rows.length === 0) {
    return <p className="text-sm text-zinc-400">Chưa có dữ liệu tác giả trong kỳ.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="text-xs text-zinc-500">
            <th className="py-2">Tác giả</th>
            <th>Studio</th>
            <th>Doanh thu gộp</th>
            <th>Thu nhập ròng</th>
            <th>Lượt mua</th>
            <th>Người ủng hộ</th>
            <th>Đã rút</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr className="border-t border-white/5" key={r.creatorUserId}>
              <td className="py-2 text-zinc-200">{r.creatorName}</td>
              <td className="text-zinc-400">{r.studioName ?? "—"}</td>
              <td>{r.grossRevenueVnd.toLocaleString("vi-VN")} đ</td>
              <td>{r.netRevenueVnd.toLocaleString("vi-VN")} đ</td>
              <td>{r.purchaseCount}</td>
              <td>{r.supporterCount}</td>
              <td>{r.withdrawnVnd.toLocaleString("vi-VN")} đ</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SupportersTable({ rows, isEmpty }: { rows: FinanceSupporterRow[]; isEmpty: boolean }) {
  if (isEmpty || rows.length === 0) {
    return <p className="text-sm text-zinc-400">Chưa có người ủng hộ trong kỳ.</p>;
  }
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="text-xs text-zinc-500">
          <th className="py-2">Độc giả</th>
          <th>Coin ủng hộ</th>
          <th>Lượt tip</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr className="border-t border-white/5" key={r.userId}>
            <td className="py-2 text-zinc-200">{r.displayName}</td>
            <td>{r.totalCoin.toLocaleString("vi-VN")}</td>
            <td>{r.tipCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StoriesTable({
  rows,
  isEmpty,
  mode
}: {
  rows: FinanceStoryChapterRow[];
  isEmpty: boolean;
  mode: "story" | "chapter";
}) {
  if (isEmpty || rows.length === 0) {
    return (
      <p className="text-sm text-zinc-400">
        {mode === "story" ? "Chưa có truyện trả phí trong kỳ." : "Chưa có chương trả phí trong kỳ."}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="text-xs text-zinc-500">
            <th className="py-2">{mode === "story" ? "Truyện" : "Chương"}</th>
            <th>Tác giả</th>
            <th>Doanh thu (coin)</th>
            <th>Lượt mở khóa</th>
            <th>Tỷ lệ hoàn</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr className="border-t border-white/5" key={r.id}>
              <td className="py-2 text-zinc-200">{r.label}</td>
              <td className="text-zinc-400">{r.authorName ?? "—"}</td>
              <td>{r.totalCoin.toLocaleString("vi-VN")}</td>
              <td>{r.unlockCount}</td>
              <td>{r.refundRate}%</td>
              <td>
                {r.storyId ? (
                  <Link
                    className="text-cyan-300"
                    href={`/admin/content/stories/${r.storyId}`}
                  >
                    Xem
                  </Link>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RefundedStoriesTable({
  rows,
  isEmpty
}: {
  rows: FinanceRefundedStoryRow[];
  isEmpty: boolean;
}) {
  if (isEmpty || rows.length === 0) {
    return <p className="text-sm text-zinc-400">Chưa có truyện bị hoàn nhiều trong kỳ.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="text-xs text-zinc-500">
            <th className="py-2">Truyện</th>
            <th>Tác giả</th>
            <th>Lần hoàn</th>
            <th>Coin hoàn</th>
            <th>Tiền hoàn</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr className="border-t border-white/5" key={r.storyId}>
              <td className="py-2 text-zinc-200">{r.storyTitle}</td>
              <td className="text-zinc-400">{r.authorName ?? "—"}</td>
              <td>{r.refundCount}</td>
              <td>{r.refundCoin.toLocaleString("vi-VN")}</td>
              <td>{r.refundAmountVnd.toLocaleString("vi-VN")} đ</td>
              <td>
                <Link className="text-cyan-300" href="/admin/refunds">
                  Xem
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
