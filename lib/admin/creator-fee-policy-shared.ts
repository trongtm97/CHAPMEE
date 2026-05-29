import type {
  CreatorFeePolicyInput,
  CreatorFeePolicyRow,
  CreatorFeePolicyStatus
} from "@/types/creator-fee-policy";

export function mapCreatorFeePolicyRow(row: Record<string, unknown>): CreatorFeePolicyRow {
  const num = (v: unknown) => {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

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
    note: (row.note as string | null) ?? null,
    public_note: (row.public_note as string | null) ?? null,
    show_details_to_creator: row.show_details_to_creator !== false,
    status: row.status as CreatorFeePolicyStatus,
    starts_at: String(row.starts_at),
    ends_at: row.ends_at ? String(row.ends_at) : null,
    created_by: row.created_by ? String(row.created_by) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

export function resolveInitialPolicyStatus(
  startsAt: Date,
  requested?: CreatorFeePolicyStatus
): CreatorFeePolicyStatus {
  if (requested === "draft" || requested === "disabled") {
    return requested;
  }
  if (startsAt.getTime() > Date.now()) {
    return "scheduled";
  }
  return requested === "scheduled" ? "scheduled" : "active";
}

export function buildPolicyInsertPayload(
  input: CreatorFeePolicyInput,
  createdBy: string
): Record<string, unknown> {
  const startsAt = input.startsAt ? new Date(input.startsAt) : new Date();
  const status = resolveInitialPolicyStatus(startsAt, input.status);

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
    note: input.note?.trim() || null,
    public_note: input.publicNote?.trim() || null,
    show_details_to_creator: input.showDetailsToCreator !== false,
    status,
    starts_at: startsAt.toISOString(),
    ends_at: input.endsAt ? new Date(input.endsAt).toISOString() : null,
    created_by: createdBy
  };
}

export function validateCreatorFeePolicyInput(input: CreatorFeePolicyInput): string | null {
  if (!input.policyName.trim()) {
    return "Vui lòng nhập tên chính sách.";
  }
  if (!input.creatorId) {
    return "Vui lòng chọn tác giả.";
  }

  const percentFields = [
    ["creatorRevenueSharePercent", input.creatorRevenueSharePercent],
    ["platformFeePercent", input.platformFeePercent],
    ["paymentProcessingFeePercent", input.paymentProcessingFeePercent],
    ["tipPlatformFeePercent", input.tipPlatformFeePercent]
  ] as const;

  for (const [, value] of percentFields) {
    if (value != null && (value < 0 || value > 100)) {
      return "Tỷ lệ phần trăm phải từ 0 đến 100.";
    }
  }

  if (
    input.creatorRevenueSharePercent == null &&
    input.platformFeePercent == null &&
    input.paymentProcessingFeePercent == null &&
    input.tipPlatformFeePercent == null &&
    input.minWithdrawAmountOverride == null
  ) {
    return "Cần ít nhất một trường override (tỷ lệ hoặc min rút).";
  }

  if (input.startsAt && input.endsAt) {
    if (new Date(input.endsAt).getTime() <= new Date(input.startsAt).getTime()) {
      return "Ngày kết thúc phải sau ngày bắt đầu.";
    }
  }

  return null;
}
