import type {
  CreatorFeePolicyInput,
  CreatorFeePolicyRow,
  CreatorFeePolicyStatus,
  CreatorFeeRevenueSourceId,
  CreatorFeeSourceRate,
  CreatorFeeSourceRates
} from "@/types/creator-fee-policy";
import { CREATOR_FEE_REVENUE_SOURCES } from "@/lib/admin/creator-fee-policies/constants";

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

/** Đảm bảo tỉ lệ tác giả + nền tảng luôn cộng đủ 100% để hiển thị và tính tiền nhất quán. */
export function normalizeRevenueSharePercents(
  authorPercent: number,
  platformPercent?: number | null
): { authorPercent: number; platformPercent: number } {
  const author = clampPercent(authorPercent);

  if (platformPercent != null && Number.isFinite(platformPercent)) {
    const platform = clampPercent(platformPercent);
    if (Math.abs(author + platform - 100) <= 0.01) {
      return { authorPercent: author, platformPercent: platform };
    }
  }

  return { authorPercent: author, platformPercent: clampPercent(100 - author) };
}

export function normalizeSourceRate(rate: CreatorFeeSourceRate): CreatorFeeSourceRate {
  const normalized = normalizeRevenueSharePercents(
    rate.author_percent,
    rate.platform_percent
  );
  return {
    author_percent: normalized.authorPercent,
    platform_percent: normalized.platformPercent
  };
}

export function parseSourceRates(raw: unknown): CreatorFeeSourceRates | null {
  if (!raw || typeof raw !== "object") return null;
  const result: CreatorFeeSourceRates = {};
  for (const source of CREATOR_FEE_REVENUE_SOURCES) {
    const entry = (raw as Record<string, unknown>)[source.id];
    if (!entry || typeof entry !== "object") continue;
    const author = num((entry as Record<string, unknown>).author_percent);
    const platform = num((entry as Record<string, unknown>).platform_percent);
    if (author == null || platform == null) continue;
    result[source.id] = normalizeSourceRate({
      author_percent: author,
      platform_percent: platform
    });
  }
  return Object.keys(result).length > 0 ? result : null;
}

export function mapCreatorFeePolicyRow(row: Record<string, unknown>): CreatorFeePolicyRow {
  return {
    id: String(row.id),
    creator_id: String(row.creator_id),
    policy_name: String(row.policy_name),
    creator_revenue_share_percent: num(row.creator_revenue_share_percent),
    platform_fee_percent: num(row.platform_fee_percent),
    payment_processing_fee_percent: num(row.payment_processing_fee_percent),
    payment_processing_fixed_fee: num(row.payment_processing_fixed_fee),
    tip_platform_fee_percent: num(row.tip_platform_fee_percent),
    min_withdraw_amount_override: num(row.min_withdraw_amount_override),
    allowed_price_steps_override: Array.isArray(row.allowed_price_steps_override)
      ? row.allowed_price_steps_override.map((v) => Number(v)).filter((v) => Number.isFinite(v))
      : null,
    source_rates: parseSourceRates(row.source_rates),
    creator_type: (row.creator_type as CreatorFeePolicyRow["creator_type"]) ?? null,
    contract_ref: (row.contract_ref as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    public_note: (row.public_note as string | null) ?? null,
    show_details_to_creator: row.show_details_to_creator !== false,
    status: row.status as CreatorFeePolicyStatus,
    starts_at: String(row.starts_at),
    ends_at: row.ends_at ? String(row.ends_at) : null,
    created_by: row.created_by ? String(row.created_by) : null,
    updated_by: row.updated_by ? String(row.updated_by) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    revoked_at: row.revoked_at ? String(row.revoked_at) : null,
    revoked_by: row.revoked_by ? String(row.revoked_by) : null,
    revoked_reason: (row.revoked_reason as string | null) ?? null
  };
}

export function getSourceRate(
  policy: CreatorFeePolicyRow,
  sourceId: CreatorFeeRevenueSourceId
): CreatorFeeSourceRate | null {
  const fromJson = policy.source_rates?.[sourceId];
  if (fromJson) return fromJson;

  if (
    policy.creator_revenue_share_percent != null ||
    policy.platform_fee_percent != null
  ) {
    return normalizeSourceRate({
      author_percent: policy.creator_revenue_share_percent ?? 0,
      platform_percent:
        policy.platform_fee_percent ??
        Math.max(0, 100 - (policy.creator_revenue_share_percent ?? 0))
    });
  }

  return null;
}

export function resolveInitialPolicyStatus(
  startsAt: Date,
  requested?: CreatorFeePolicyStatus
): CreatorFeePolicyStatus {
  if (
    requested === "draft" ||
    requested === "disabled" ||
    requested === "paused" ||
    requested === "revoked"
  ) {
    return requested;
  }
  if (startsAt.getTime() > Date.now()) {
    return "scheduled";
  }
  return requested === "scheduled" ? "scheduled" : "active";
}

export function sanitizeSourceRates(
  rates: CreatorFeeSourceRates | null | undefined
): CreatorFeeSourceRates | null {
  if (!rates) return null;
  const cleaned: CreatorFeeSourceRates = {};
  for (const [key, value] of Object.entries(rates)) {
    if (!value) continue;
    const author = Number(value.author_percent);
    const platform = Number(value.platform_percent);
    if (!Number.isFinite(author) || !Number.isFinite(platform)) continue;
    cleaned[key as CreatorFeeRevenueSourceId] = normalizeSourceRate({
      author_percent: author,
      platform_percent: platform
    });
  }
  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

export function buildPolicyInsertPayload(
  input: CreatorFeePolicyInput,
  createdBy: string
): Record<string, unknown> {
  const startsAt = input.startsAt ? new Date(input.startsAt) : new Date();
  const status = resolveInitialPolicyStatus(startsAt, input.status);
  const sourceRates = sanitizeSourceRates(input.sourceRates);

  return {
    creator_id: input.creatorId,
    policy_name: input.policyName.trim(),
    creator_revenue_share_percent: input.creatorRevenueSharePercent ?? null,
    platform_fee_percent: input.platformFeePercent ?? null,
    payment_processing_fee_percent: input.paymentProcessingFeePercent ?? null,
    payment_processing_fixed_fee: input.paymentProcessingFixedFee ?? null,
    tip_platform_fee_percent: input.tipPlatformFeePercent ?? null,
    min_withdraw_amount_override: input.minWithdrawAmountOverride ?? null,
    allowed_price_steps_override: input.allowedPriceStepsOverride?.length
      ? input.allowedPriceStepsOverride
      : null,
    source_rates: sourceRates,
    creator_type: input.creatorType ?? null,
    contract_ref: input.contractRef?.trim() || null,
    note: input.note?.trim() || null,
    public_note: input.publicNote?.trim() || null,
    show_details_to_creator: input.showDetailsToCreator !== false,
    status,
    starts_at: startsAt.toISOString(),
    ends_at: input.endsAt ? new Date(input.endsAt).toISOString() : null,
    created_by: createdBy,
    updated_by: createdBy
  };
}

export function buildPolicyUpdatePayload(
  input: CreatorFeePolicyInput,
  updatedBy: string
): Record<string, unknown> {
  const payload = buildPolicyInsertPayload(input, updatedBy);
  delete payload.created_by;
  payload.updated_by = updatedBy;
  return payload;
}

function validateSourceRatePair(
  sourceId: string,
  rate: CreatorFeeSourceRate
): string | null {
  const { author_percent: author, platform_percent: platform } = rate;
  if (author < 0 || platform < 0 || author > 100 || platform > 100) {
    return `Tỷ lệ ${sourceId} phải từ 0 đến 100.`;
  }
  if (Math.abs(author + platform - 100) > 0.01) {
    return `Tỷ lệ ${sourceId}: tác giả + nền tảng phải bằng 100.`;
  }
  return null;
}

export function validateCreatorFeePolicyInput(input: CreatorFeePolicyInput): string | null {
  if (!input.policyName.trim()) {
    return "Vui lòng nhập tên chính sách.";
  }
  if (!input.creatorId) {
    return "Vui lòng chọn tác giả.";
  }
  if (!input.note?.trim()) {
    return "Ghi chú nội bộ là bắt buộc.";
  }

  const percentFields = [
    input.creatorRevenueSharePercent,
    input.platformFeePercent,
    input.paymentProcessingFeePercent,
    input.tipPlatformFeePercent
  ];

  for (const value of percentFields) {
    if (value != null && (value < 0 || value > 100)) {
      return "Tỷ lệ phần trăm phải từ 0 đến 100.";
    }
  }

  if (input.sourceRates) {
    for (const [sourceId, rate] of Object.entries(input.sourceRates)) {
      if (!rate) continue;
      const err = validateSourceRatePair(sourceId, rate);
      if (err) return err;
    }
  }

  const hasSourceRates =
    input.sourceRates && Object.keys(sanitizeSourceRates(input.sourceRates) ?? {}).length > 0;
  const hasLegacyOverride =
    input.creatorRevenueSharePercent != null ||
    input.platformFeePercent != null ||
    input.paymentProcessingFeePercent != null ||
    input.tipPlatformFeePercent != null ||
    input.minWithdrawAmountOverride != null;

  if (!hasSourceRates && !hasLegacyOverride) {
    return "Cần ít nhất một nguồn doanh thu có tỷ lệ riêng hoặc override chung.";
  }

  if (input.startsAt && input.endsAt) {
    if (new Date(input.endsAt).getTime() <= new Date(input.startsAt).getTime()) {
      return "Ngày kết thúc phải sau ngày bắt đầu.";
    }
  }

  return null;
}

export function hasNonDefaultRates(
  sourceRates: CreatorFeeSourceRates | null,
  defaults: CreatorFeeSourceRates
): boolean {
  if (!sourceRates) return false;
  for (const [key, rate] of Object.entries(sourceRates)) {
    const def = defaults[key as CreatorFeeRevenueSourceId];
    if (!def || !rate) continue;
    if (
      Math.abs(rate.author_percent - def.author_percent) > 0.01 ||
      Math.abs(rate.platform_percent - def.platform_percent) > 0.01
    ) {
      return true;
    }
  }
  return false;
}
