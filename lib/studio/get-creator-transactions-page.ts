import { createClient } from "@/lib/supabase/server";
import {
  resolveTransactionKind,
  type MonetizationTxKind
} from "@/lib/studio/monetization-display-utils";
import type { StudioMonetizationRecentTransaction } from "@/types/studio-monetization";
import type {
  StudioMonetizationTransactionsPage,
  StudioTransactionFilter
} from "@/types/studio-monetization-dashboard";

function formatVnd(value: number) {
  return Math.max(0, Math.round(value * 100) / 100);
}

function transactionTypeLabel(type: string, source: string) {
  if (type === "chapter_unlock" || type === "story_unlock" || source === "unlock") {
    return type === "story_unlock" ? "Mua trọn bộ" : "Mở khóa chương";
  }
  if (type === "author_tip" || type === "virtual_gift" || source === "tip") {
    return "Tip / ủng hộ";
  }
  if (type === "reversal" || type === "refund") {
    return "Hoàn tiền";
  }
  if (type === "payout" || source === "payout") {
    return "Rút tiền";
  }
  if (
    type === "admin_coin_adjustment" ||
    type === "creator_revenue_adjustment" ||
    source === "admin"
  ) {
    return "Điều chỉnh";
  }
  return "Giao dịch";
}

function transactionStatusLabel(status: string) {
  if (status === "completed" || status === "settled") return "Hoàn tất";
  if (status === "pending") return "Đang xử lý";
  if (status === "failed" || status === "reversed") return "Không thành công";
  return status;
}

function matchesFilter(
  filter: StudioTransactionFilter,
  type: string,
  source: string,
  kind: MonetizationTxKind
): boolean {
  if (filter === "all") return true;
  if (filter === "paid_chapter") return kind === "chapter";
  if (filter === "full_story_purchase") return kind === "bundle";
  if (filter === "tip") return kind === "tip";
  if (filter === "refund") return kind === "refund";
  if (filter === "payout") return type === "payout" || source === "payout";
  if (filter === "adjustment") {
    return (
      type === "admin_coin_adjustment" ||
      type === "creator_revenue_adjustment" ||
      source === "admin"
    );
  }
  if (filter === "chargeback") return type === "chargeback";
  if (
    filter === "ad_estimated" ||
    filter === "ad_finalized" ||
    filter === "reserve_hold" ||
    filter === "reserve_release"
  ) {
    return false;
  }
  return true;
}

export async function getCreatorTransactionsPage(
  creatorUserId: string,
  options: {
    page: number;
    pageSize: number;
    filter: StudioTransactionFilter;
    search?: string;
  }
): Promise<StudioMonetizationTransactionsPage> {
  const page = Math.max(1, options.page);
  const pageSize = Math.min(50, Math.max(5, options.pageSize));
  const supabase = await createClient();

  const { data: txRows, error } = await supabase
    .from("transactions")
    .select(
      "id, story_id, chapter_id, type, source, net_amount_vnd, creator_gross_vnd, platform_fee_vnd, status, created_at, coin_amount",
      { count: "exact" }
    )
    .eq("creator_user_id", creatorUserId)
    .order("created_at", { ascending: false })
    .range(0, 499);

  if (error) {
    return {
      rows: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 1,
      error: error.message
    };
  }

  const storyIds = [
    ...new Set((txRows ?? []).map((row) => row.story_id).filter(Boolean) as string[])
  ];
  const chapterIds = [
    ...new Set((txRows ?? []).map((row) => row.chapter_id).filter(Boolean) as string[])
  ];

  const [{ data: stories }, { data: chapters }] = await Promise.all([
    storyIds.length > 0
      ? supabase.from("stories").select("id, title").in("id", storyIds)
      : Promise.resolve({ data: [] }),
    chapterIds.length > 0
      ? supabase.from("episodes").select("id, title, episode_number").in("id", chapterIds)
      : Promise.resolve({ data: [] })
  ]);

  const storyTitle = new Map((stories ?? []).map((row) => [row.id as string, String(row.title)]));
  const episodeTitle = new Map(
    (chapters ?? []).map((row) => [
      row.id as string,
      row.title ? String(row.title) : `Chương ${row.episode_number ?? "?"}`
    ])
  );

  const searchLower = options.search?.trim().toLowerCase() ?? "";

  const mapped: StudioMonetizationRecentTransaction[] = (txRows ?? []).map((tx) => {
    const storyId = tx.story_id as string | null;
    const chapterId = tx.chapter_id as string | null;
    const contentParts = [
      storyId ? storyTitle.get(storyId) : null,
      chapterId ? episodeTitle.get(chapterId) : null
    ].filter(Boolean);
    const kind = resolveTransactionKind(String(tx.type), String(tx.source ?? ""));

    return {
      id: String(tx.id),
      typeLabel: transactionTypeLabel(String(tx.type), String(tx.source ?? "")),
      amountVnd: formatVnd(Number(tx.net_amount_vnd ?? tx.creator_gross_vnd ?? 0)),
      coinAmount:
        tx.coin_amount != null && Number.isFinite(Number(tx.coin_amount))
          ? Number(tx.coin_amount)
          : null,
      contentLabel: contentParts.join(" · ") || "—",
      createdAt: String(tx.created_at),
      status: String(tx.status),
      statusLabel: transactionStatusLabel(String(tx.status)),
      kind
    };
  });

  const filtered = mapped.filter((tx) => {
    const type = (txRows ?? []).find((r) => String(r.id) === tx.id);
    const rawType = String(type?.type ?? "");
    const rawSource = String(type?.source ?? "");
    if (!matchesFilter(options.filter, rawType, rawSource, tx.kind ?? "other")) {
      return false;
    }
    if (!searchLower) return true;
    return (
      tx.contentLabel.toLowerCase().includes(searchLower) ||
      tx.typeLabel.toLowerCase().includes(searchLower)
    );
  });

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);

  return {
    rows,
    totalCount,
    page: safePage,
    pageSize,
    totalPages,
    error: null
  };
}
