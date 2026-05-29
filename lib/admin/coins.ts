import { assertAnyPermission, assertPermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";
import { fetchWalletTotalsSnapshot } from "@/lib/supabase/admin-finance";
import { getUserCoinBalance } from "@/lib/coins/get-user-coin-balance";
import { getUserCoinLedger } from "@/lib/coins/get-user-coin-ledger";
import { getOrCreateUserWalletRecord } from "@/lib/supabase/wallets";
import {
  ADMIN_COIN_BATCH_MAX_TOTAL,
  ADMIN_COIN_BATCH_MAX_USERS,
  getAdminCoinLimits
} from "@/lib/admin/coin-limits";
import { isValidBulkReasonCode } from "@/lib/admin/coin-reasons";
import type {
  AdminCoinAdjustmentHistoryEntry,
  AdminCoinAdjustmentHistoryFilters,
  AdminCoinDashboardMetrics,
  BulkCoinLinePreview,
  BulkCoinValidateResult,
  CoinAdminUserRow,
  UserCoinWalletDetail
} from "@/types/coins";

const COIN_VIEW_PERMISSIONS = [
  "finance.wallet.view",
  "finance.wallet.adjust",
  "wallet.transaction.view.all"
] as const;

function sourceLabel(source: string) {
  const map: Record<string, string> = {
    admin_adjustment: "Admin điều chỉnh",
    bulk_admin_adjustment: "Cấp hàng loạt",
    refund: "Hoàn coin",
    purchase: "Nạp coin",
    spend: "Chi tiêu",
    system: "Hệ thống"
  };
  return map[source] ?? source;
}

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function todayStartIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function fetchEmailsForUsers(userIds: string[]) {
  const map = new Map<string, string>();
  if (!userIds.length) return map;
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    await Promise.all(
      userIds.slice(0, 50).map(async (id) => {
        const { data } = await admin.auth.admin.getUserById(id);
        if (data.user?.email) map.set(id, data.user.email);
      })
    );
  } catch {
    /* optional */
  }
  return map;
}

export async function getAdminCoinDashboardMetrics(): Promise<{
  data: AdminCoinDashboardMetrics;
  error: string | null;
}> {
  await assertAnyPermission([...COIN_VIEW_PERMISSIONS]);

  const supabase = await createClient();
  const todayStart = todayStartIso();

  const walletSnapshot = await fetchWalletTotalsSnapshot();
  let totalPaid = 0;
  let totalBonus = 0;
  for (const row of walletSnapshot.userWallets) {
    totalPaid += toNumber(row.paid_coin_balance);
    totalBonus += toNumber(row.bonus_coin_balance);
  }

  const [
    purchasesRes,
    spendRes,
    bonusGrantRes,
    txCountRes,
    adminAdjustRes,
    riskRes
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("coin_amount")
      .eq("type", "coin_purchase")
      .eq("status", "completed")
      .gte("created_at", todayStart),
    supabase
      .from("transactions")
      .select("coin_amount")
      .eq("direction", "debit")
      .eq("status", "completed")
      .gt("coin_amount", 0)
      .gte("created_at", todayStart),
    supabase
      .from("transactions")
      .select("bonus_coin_amount, coin_amount")
      .in("type", ["bonus_coin_grant", "admin_coin_adjustment"])
      .eq("direction", "credit")
      .eq("status", "completed")
      .gte("created_at", todayStart),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .gt("coin_amount", 0)
      .gte("created_at", todayStart),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("type", "admin_coin_adjustment")
      .gte("created_at", todayStart),
    supabase
      .from("risk_events")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "reviewing"])
      .not("transaction_id", "is", null)
  ]);

  const coinSoldToday = (purchasesRes.data ?? []).reduce(
    (sum, row) => sum + toNumber(row.coin_amount),
    0
  );
  const coinSpentToday = (spendRes.data ?? []).reduce(
    (sum, row) => sum + toNumber(row.coin_amount),
    0
  );
  const bonusGrantedToday = (bonusGrantRes.data ?? []).reduce((sum, row) => {
    const bonus = toNumber(row.bonus_coin_amount);
    if (bonus > 0) return sum + bonus;
    return sum + toNumber(row.coin_amount);
  }, 0);

  return {
    data: {
      totalPaidCoinInCirculation: totalPaid,
      totalBonusCoinInCirculation: totalBonus,
      coinSoldToday,
      coinSpentToday,
      bonusGrantedToday,
      coinTransactionsToday: txCountRes.count ?? 0,
      adminAdjustmentsToday: adminAdjustRes.count ?? 0,
      coinRiskAlerts: riskRes.count ?? 0
    },
    error:
      walletSnapshot.error ??
      purchasesRes.error?.message ??
      spendRes.error?.message ??
      null
  };
}

export async function searchUsersForCoinAdmin(input: {
  query?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ users: CoinAdminUserRow[]; error: string | null }> {
  await assertAnyPermission([...COIN_VIEW_PERMISSIONS]);

  const supabase = await createClient();
  const trimmed = (input.query ?? "").trim();
  if (!trimmed) {
    return { users: [], error: null };
  }
  const pageSize = Math.min(25, Math.max(1, input.pageSize ?? 10));
  const from = ((input.page ?? 1) - 1) * pageSize;
  const to = from + pageSize - 1;

  let builder = supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, status", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (trimmed) {
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(trimmed)) {
      builder = builder.eq("id", trimmed);
    } else if (trimmed.includes("@")) {
      const emailMap = await resolveUserIdByEmail(trimmed);
      const userId = emailMap.get(trimmed.toLowerCase());
      if (!userId) {
        return { users: [], error: null };
      }
      builder = builder.eq("id", userId);
    } else {
      builder = builder.or(
        `username.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%`
      );
    }
  }

  const { data, error } = await builder;
  if (error) {
    return { users: [], error: error.message };
  }

  const profiles = data ?? [];
  const userIds = profiles.map((p) => p.id);
  const [walletsRes, emailMap] = await Promise.all([
    userIds.length
      ? supabase
          .from("user_wallets")
          .select("user_id, paid_coin_balance, bonus_coin_balance")
          .in("user_id", userIds)
      : Promise.resolve({ data: [], error: null }),
    fetchEmailsForUsers(userIds)
  ]);

  const walletByUser = new Map(
    (walletsRes.data ?? []).map((row) => [row.user_id as string, row])
  );

  const users: CoinAdminUserRow[] = profiles.map((profile) => {
    const wallet = walletByUser.get(profile.id);
    const paid = toNumber(wallet?.paid_coin_balance);
    const bonus = toNumber(wallet?.bonus_coin_balance);
    return {
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      email: emailMap.get(profile.id) ?? null,
      status: profile.status ?? "active",
      paidCoin: paid,
      bonusCoin: bonus,
      totalCoin: paid + bonus
    };
  });

  return { users, error: null };
}

async function resolveUserIdByEmail(email: string) {
  const map = new Map<string, string>();
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    for (const user of data.users ?? []) {
      if (user.email) map.set(user.email.toLowerCase(), user.id);
    }
  } catch {
    /* optional */
  }
  return map;
}

export async function getUserCoinWalletDetail(
  userId: string
): Promise<{ data: UserCoinWalletDetail | null; error: string | null }> {
  await assertAnyPermission([...COIN_VIEW_PERMISSIONS]);

  const [balance, walletResult, ledger] = await Promise.all([
    getUserCoinBalance(userId),
    getOrCreateUserWalletRecord(userId),
    getUserCoinLedger({ userId, limit: 200 })
  ]);

  if (!balance.data) {
    return { data: null, error: balance.error ?? "Không tải được ví coin." };
  }

  let totalPurchased = 0;
  let totalBonusReceived = 0;
  let totalRevoked = 0;

  for (const entry of ledger.entries) {
    if (entry.direction === "credit" && entry.type === "purchase") {
      totalPurchased += entry.coinAmount;
    }
    if (
      entry.direction === "credit" &&
      ["promo_bonus", "admin_grant"].includes(entry.type) &&
      ["bonus", "promo", "admin_grant"].includes(entry.coinType)
    ) {
      totalBonusReceived += entry.coinAmount;
    }
    if (entry.type === "admin_debit" || (entry.direction === "debit" && entry.type === "adjustment")) {
      totalRevoked += entry.coinAmount;
    }
  }

  const wallet = walletResult.data;

  return {
    data: {
      ...balance.data,
      totalPurchased,
      totalBonusReceived,
      totalSpent: wallet?.total_spent_coin ?? 0,
      totalRevoked,
      totalGifted: totalBonusReceived,
      totalRefundedOrDebited: totalRevoked
    },
    error: null
  };
}

export async function resolveUserByUsernameOrEmail(
  identifier: string
): Promise<{ userId: string | null; label: string | null; error: string | null }> {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return { userId: null, label: null, error: "Thiếu username hoặc email." };
  }

  const supabase = await createClient();

  if (trimmed.includes("@")) {
    const emailMap = await resolveUserIdByEmail(trimmed);
    const userId = emailMap.get(trimmed.toLowerCase());
    if (!userId) {
      return { userId: null, label: null, error: "Không tìm thấy user theo email." };
    }
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .eq("id", userId)
      .maybeSingle();
    return {
      userId,
      label: data?.display_name ?? data?.username ?? trimmed,
      error: null
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, status")
    .eq("username", trimmed)
    .maybeSingle();

  if (error || !data) {
    return { userId: null, label: null, error: "Không tìm thấy user." };
  }

  if (data.status === "banned" || data.status === "deleted") {
    return {
      userId: data.id,
      label: data.display_name ?? data.username,
      error: `Tài khoản đang ở trạng thái: ${data.status}.`
    };
  }

  return {
    userId: data.id,
    label: data.display_name ?? data.username,
    error: null
  };
}

export async function validateBulkCoinLines(raw: string): Promise<BulkCoinValidateResult> {
  await assertAnyPermission(["finance.wallet.bulk_adjust", "finance.wallet.adjust"]);

  const limits = await getAdminCoinLimits();
  const rows = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length === 0) {
    return { lines: [], error: "Danh sách trống.", totals: { paid: 0, bonus: 0 }, hasPaidCoin: false };
  }

  if (rows.length > limits.maxBatchUsers) {
    return {
      lines: [],
      error: `Tối đa ${limits.maxBatchUsers} dòng mỗi lần cấp hàng loạt.`,
      totals: { paid: 0, bonus: 0 },
      hasPaidCoin: false
    };
  }

  const previews: BulkCoinLinePreview[] = [];
  let totalCoins = 0;
  let paidTotal = 0;
  let bonusTotal = 0;

  for (let index = 0; index < rows.length; index += 1) {
    const lineNumber = index + 1;
    const rawLine = rows[index];
    const parts = rawLine.split(",").map((part) => part.trim());
    const base: BulkCoinLinePreview = {
      line: lineNumber,
      raw: rawLine,
      usernameOrEmail: parts[0] ?? "",
      userId: null,
      userLabel: null,
      coinType: null,
      amount: null,
      reasonCode: null,
      valid: false,
      error: null
    };

    if (parts.length !== 4) {
      previews.push({
        ...base,
        error: "Định dạng: username_or_email,coin_type,amount,reason"
      });
      continue;
    }

    const [identifier, coinTypeRaw, amountRaw, reasonCode] = parts;
    const coinType =
      coinTypeRaw === "paid" || coinTypeRaw === "bonus" ? coinTypeRaw : null;
    const amount = Number(amountRaw);
    const amountValid = Number.isInteger(amount) && amount > 0;

    if (!coinType) {
      previews.push({ ...base, error: "coin_type phải là paid hoặc bonus." });
      continue;
    }

    if (!amountValid) {
      previews.push({ ...base, error: "amount phải là số nguyên dương." });
      continue;
    }

    if (amount > limits.maxPerUserPerAction) {
      previews.push({
        ...base,
        coinType,
        amount,
        reasonCode,
        error: `Vượt giới hạn ${limits.maxPerUserPerAction.toLocaleString("vi-VN")} coin/lần.`
      });
      continue;
    }

    if (!isValidBulkReasonCode(reasonCode)) {
      previews.push({
        ...base,
        coinType,
        amount,
        reasonCode,
        error: "reason không hợp lệ."
      });
      continue;
    }

    const resolved = await resolveUserByUsernameOrEmail(identifier);
    if (!resolved.userId || resolved.error) {
      previews.push({
        ...base,
        usernameOrEmail: identifier,
        coinType,
        amount,
        reasonCode,
        error: resolved.error ?? "Không tìm thấy user."
      });
      continue;
    }

    totalCoins += amount;
    if (coinType === "paid") paidTotal += amount;
    else bonusTotal += amount;
    previews.push({
      line: lineNumber,
      raw: rawLine,
      usernameOrEmail: identifier,
      userId: resolved.userId,
      userLabel: resolved.label,
      coinType,
      amount,
      reasonCode,
      valid: true,
      error: null
    });
  }

  if (totalCoins > ADMIN_COIN_BATCH_MAX_TOTAL) {
    return {
      lines: previews.map((row) =>
        row.valid
          ? {
              ...row,
              valid: false,
              error: `Tổng batch vượt ${ADMIN_COIN_BATCH_MAX_TOTAL.toLocaleString("vi-VN")} coin.`
            }
          : row
      ),
      error: `Tổng coin batch vượt ${ADMIN_COIN_BATCH_MAX_TOTAL.toLocaleString("vi-VN")}.`,
      totals: { paid: paidTotal, bonus: bonusTotal },
      hasPaidCoin: paidTotal > 0
    };
  }

  return {
    lines: previews,
    error: null,
    totals: { paid: paidTotal, bonus: bonusTotal },
    hasPaidCoin: paidTotal > 0
  };
}

function mapHistoryRow(
  row: Record<string, unknown>,
  profileMap: Map<string, { label: string }>,
  adminMap: Map<string, { label: string }>
): AdminCoinAdjustmentHistoryEntry {
  const metadata = (row.metadata as Record<string, unknown>) ?? {};
  const userId = String(row.user_id ?? "");
  const adminId = (metadata.admin_id as string | null) ?? null;
  const paid = toNumber(row.paid_coin_amount);
  const bonus = toNumber(row.bonus_coin_amount);
  const coinType: "paid" | "bonus" =
    (metadata.coin_type as string) === "paid" || paid > 0 && bonus === 0
      ? "paid"
      : "bonus";

  const balanceBefore =
    metadata.balance_before_paid != null || metadata.balance_before_bonus != null
      ? coinType === "paid"
        ? toNumber(metadata.balance_before_paid)
        : toNumber(metadata.balance_before_bonus)
      : null;
  const balanceAfter =
    metadata.balance_after_paid != null || metadata.balance_after_bonus != null
      ? coinType === "paid"
        ? toNumber(metadata.balance_after_paid)
        : toNumber(metadata.balance_after_bonus)
      : null;

  const bulk = metadata.bulk_admin_adjustment === true;
  const txType = String(row.type ?? "");
  let source = bulk ? "bulk_admin_adjustment" : "admin_adjustment";
  if (txType === "refund") source = "refund";
  else if (txType === "coin_purchase") source = "purchase";
  else if (row.direction === "debit" && txType !== "admin_coin_adjustment") source = "spend";
  else if (String(row.source ?? "") === "system" && txType !== "admin_coin_adjustment") {
    source = "system";
  }

  return {
    id: String(row.id),
    createdAt: String(row.created_at),
    userId,
    userLabel: profileMap.get(userId)?.label ?? userId.slice(0, 8),
    coinType,
    direction: row.direction as "credit" | "debit",
    amount: toNumber(row.coin_amount),
    balanceBefore,
    balanceAfter,
    reason: String(metadata.reason ?? row.type ?? ""),
    reasonCode: (metadata.reason_code as string | null) ?? null,
    adminId,
    adminLabel: adminId
      ? (adminMap.get(adminId)?.label ?? adminId.slice(0, 8))
      : "Hệ thống",
    referenceId: (metadata.reference_id as string | null) ?? null,
    source,
    sourceLabel: sourceLabel(source),
    status: String(row.status ?? "completed"),
    transactionId: String(row.id)
  };
}

export async function getAdminCoinAdjustmentHistory(
  filters: AdminCoinAdjustmentHistoryFilters
): Promise<{
  entries: AdminCoinAdjustmentHistoryEntry[];
  total: number;
  page: number;
  pageSize: number;
  error: string | null;
}> {
  await assertAnyPermission([...COIN_VIEW_PERMISSIONS]);

  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));

  let resolvedUserId = filters.userId;
  if (filters.userQuery?.trim() && !resolvedUserId) {
    const resolved = await resolveUserByUsernameOrEmail(filters.userQuery.trim());
    if (resolved.userId) resolvedUserId = resolved.userId;
  }
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("transactions")
    .select("*", { count: "exact" })
    .gt("coin_amount", 0)
    .order("created_at", { ascending: false });

  if (filters.source === "admin_adjustment") {
    query = query.eq("type", "admin_coin_adjustment");
  } else if (filters.source === "bulk_admin_adjustment") {
    query = query.eq("type", "admin_coin_adjustment");
  } else if (filters.source === "refund") {
    query = query.eq("type", "refund");
  } else if (filters.source === "purchase") {
    query = query.eq("type", "coin_purchase");
  } else if (filters.source === "spend") {
    query = query.eq("direction", "debit").neq("type", "admin_coin_adjustment");
  } else if (filters.source === "system") {
    query = query.eq("source", "system").neq("type", "admin_coin_adjustment");
  }

  if (filters.direction === "credit") {
    query = query.eq("direction", "credit");
  } else if (filters.direction === "debit") {
    query = query.eq("direction", "debit");
  }

  if (resolvedUserId) {
    query = query.eq("user_id", resolvedUserId);
  }

  if (filters.from) {
    query = query.gte("created_at", filters.from);
  }
  if (filters.to) {
    query = query.lte("created_at", filters.to);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    return { entries: [], total: 0, page, pageSize, error: error.message };
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const userIds = [...new Set(rows.map((r) => String(r.user_id)).filter(Boolean))];
  const adminIds = [
    ...new Set(
      rows
        .map((r) => (r.metadata as Record<string, unknown>)?.admin_id)
        .filter((id): id is string => typeof id === "string")
    )
  ];

  const profileMap = new Map<string, { label: string }>();
  const adminMap = new Map<string, { label: string }>();
  const lookupIds = [...new Set([...userIds, ...adminIds])];

  if (lookupIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", lookupIds);
    for (const profile of profiles ?? []) {
      const label = profile.display_name ?? profile.username ?? profile.id;
      profileMap.set(profile.id, { label });
      adminMap.set(profile.id, { label });
    }
  }

  let entries = rows.map((row) => mapHistoryRow(row, profileMap, adminMap));

  if (filters.source === "admin_adjustment") {
    entries = entries.filter((e) => e.source === "admin_adjustment");
  } else if (filters.source === "bulk_admin_adjustment") {
    entries = entries.filter((e) => e.source === "bulk_admin_adjustment");
  }

  if (filters.coinType === "paid") {
    entries = entries.filter((e) => e.coinType === "paid");
  } else if (filters.coinType === "bonus") {
    entries = entries.filter((e) => e.coinType === "bonus");
  }

  if (filters.adminId) {
    entries = entries.filter((e) => e.adminId === filters.adminId);
  }

  return {
    entries,
    total: count ?? entries.length,
    page,
    pageSize,
    error: null
  };
}

export async function exportAdminCoinAdjustmentCsv(
  filters: AdminCoinAdjustmentHistoryFilters
): Promise<{ csv: string; error: string | null }> {
  const { entries, error } = await getAdminCoinAdjustmentHistory({
    ...filters,
    page: 1,
    pageSize: 100
  });

  if (error) {
    return { csv: "", error };
  }

  const headers = [
    "created_at",
    "user",
    "coin_type",
    "direction",
    "amount",
    "balance_before",
    "balance_after",
    "reason",
    "admin",
    "reference_id",
    "source"
  ];

  const lines = [
    headers.join(","),
    ...entries.map((row) =>
      [
        row.createdAt,
        `"${row.userLabel.replace(/"/g, '""')}"`,
        row.coinType,
        row.direction,
        row.amount,
        row.balanceBefore ?? "",
        row.balanceAfter ?? "",
        `"${row.reason.replace(/"/g, '""')}"`,
        `"${row.adminLabel.replace(/"/g, '""')}"`,
        row.referenceId ?? "",
        row.source
      ].join(",")
    )
  ];

  return { csv: lines.join("\n"), error: null };
}
