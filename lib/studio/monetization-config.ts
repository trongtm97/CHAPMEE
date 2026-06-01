import { getMonetizationConfig, getRevenueShareConfig } from "@/lib/monetization/config";
import {
  readPayoutProcessingDaysLabel,
  readPayoutProcessingDaysRange
} from "@/lib/finance/payout-processing-display";
import type { StudioMonetizationConfigView } from "@/types/studio-monetization";
import type { PayoutMethod } from "@/types/payout";

const DEFAULT_POLICY_LINES = [
  "Kiếm tiền được mở mặc định cho tác giả trên ChapMee.",
  "Bạn có thể rút tiền khi đạt số dư tối thiểu và tài khoản không bị admin khóa rút tiền.",
  "Xác thực tài khoản giúp tăng độ tin cậy, không bắt buộc để kiếm tiền.",
  "ChapMee có thể tạm tắt quyền kiếm tiền/rút tiền riêng cho tài khoản khi cần.",
  "Tỷ lệ ăn chia và mức rút tối thiểu có thể thay đổi theo chính sách nền tảng."
];

export type StudioMonetizationConfigBuildOptions = {
  includePrivate?: boolean;
};

/** Module kiếm tiền Studio (duyệt tác giả, cấu hình trả phí) — không phụ thuộc cờ ẩn/hiện số tiền. */
export function isStudioMonetizationModuleEnabled(config: {
  ecosystemEnabled: boolean;
  creatorMonetizationEnabled: boolean;
}): boolean {
  return config.ecosystemEnabled && config.creatorMonetizationEnabled;
}

function numberSetting(
  settings: Record<string, unknown>,
  key: string,
  fallback = 0
) {
  const value = settings[key];
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parsePayoutMethods(settings: Record<string, unknown>): PayoutMethod[] {
  const raw = String(settings["payout.allowed_methods"] ?? "manual");
  const methods = raw
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is PayoutMethod =>
      ["bank_transfer", "momo", "zalopay", "manual"].includes(item)
    );

  return methods.length > 0 ? methods : ["manual"];
}

export async function buildStudioMonetizationConfigView(
  options: StudioMonetizationConfigBuildOptions = {}
): Promise<StudioMonetizationConfigView> {
  const [{ settings }, defaultShare, paidChapterShare, tipShare] = await Promise.all([
    getMonetizationConfig({ includePrivate: options.includePrivate ?? true }),
    getRevenueShareConfig("default"),
    getRevenueShareConfig("paid_chapter"),
    getRevenueShareConfig("tip")
  ]);

  const processingNote = String(settings["payout.processing_note"] ?? "").trim();
  const policyText = processingNote
    ? `${DEFAULT_POLICY_LINES.join("\n")}\n\n${processingNote}`
    : DEFAULT_POLICY_LINES.join("\n");

  const processingRange = readPayoutProcessingDaysRange(settings as Record<string, unknown>);
  const payoutProcessingDaysLabel = readPayoutProcessingDaysLabel(
    settings as Record<string, unknown>
  );

  return {
    ecosystemEnabled: Boolean(settings["monetization.enabled"]),
    creatorMonetizationEnabled: Boolean(settings["creator_monetization.enabled"]),
    showMoneyUiToCreators: Boolean(settings["monetization.show_money_ui_to_creators"]),
    paidChaptersEnabled: Boolean(settings["paid_chapters.enabled"]),
    tipsEnabled: Boolean(settings["tips.enabled"]),
    payoutsEnabled: Boolean(settings["payout.enabled"]),
    coinEnabled: Boolean(settings["coin.enabled"]),
    coinDisplayName: String(settings["coin.display_name"] ?? "Coin"),
    coinExchangeRateVnd: numberSetting(settings, "coin.exchange_rate_vnd", 1000),
    minWithdrawAmountVnd: numberSetting(settings, "payout.min_withdraw_amount_vnd", 0),
    payoutHoldDays: numberSetting(settings, "payout.hold_days", 0),
    payoutProcessingDaysMin: processingRange.min,
    payoutProcessingDaysMax: processingRange.max,
    payoutProcessingDaysLabel,
    payoutKycRequired: Boolean(settings["payout.kyc_required"]),
    payoutAllowedMethods: parsePayoutMethods(settings as Record<string, unknown>),
    payoutProcessingNote: processingNote,
    paidChapterMinCoinPrice: numberSetting(settings, "paid_chapters.min_coin_price", 1),
    paidChapterMaxCoinPrice: numberSetting(settings, "paid_chapters.max_coin_price", 200),
    paidChapterDefaultCoinPrice: numberSetting(
      settings,
      "paid_chapters.default_coin_price",
      10
    ),
    paidChapterFreeChaptersRequired: numberSetting(
      settings,
      "paid_chapters.free_chapters_required",
      0
    ),
    paidChapterAllowCustomPrice: Boolean(
      settings["paid_chapters.allow_creator_custom_price"]
    ),
    revenueShareCreatorPercent: defaultShare.creatorPercent,
    revenueSharePlatformPercent: defaultShare.platformPercent,
    revenueSharePaidChapterCreatorPercent: paidChapterShare.creatorPercent,
    revenueShareTipCreatorPercent: tipShare.creatorPercent,
    policyText
  };
}
