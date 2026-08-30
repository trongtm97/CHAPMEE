import type { MonetizationConfigKey, MonetizationSettingsMap } from "@/types/monetization";

/** Keys managed by /admin/monetization-settings dashboard */
export const MONETIZATION_DASHBOARD_KEYS = [
  "monetization.enabled",
  "coin.enabled",
  "coin.purchase_enabled",
  "paid_chapters.enabled",
  "early_access.enabled",
  "tips.enabled",
  "virtual_gifts.enabled",
  "vip_subscription.enabled",
  "fan_club.enabled",
  "creator_monetization.enabled",
  "monetization.show_money_ui_to_creators",
  "payout.enabled",
  "coin.exchange_rate_vnd",
  "coin.min_purchase_coins",
  "coin.max_purchase_coins",
  "paid_chapters.min_coin_price",
  "paid_chapters.max_coin_price",
  "revenue_share.default_creator_percent",
  "revenue_share.default_platform_percent",
  "revenue_share.paid_chapter_creator_percent",
  "revenue_share.paid_chapter_platform_percent",
  "revenue_share.paid_chapter_use_default",
  "revenue_share.tip_creator_percent",
  "revenue_share.tip_platform_percent",
  "revenue_share.tip_use_default",
  "revenue_share.early_access_creator_percent",
  "revenue_share.early_access_platform_percent",
  "revenue_share.early_access_use_default",
  "revenue_share.vip_creator_pool_percent",
  "revenue_share.platform_fee_percent",
  "revenue_share.vip_use_default",
  "revenue_share.fan_club_creator_percent",
  "revenue_share.fan_club_platform_percent",
  "revenue_share.fan_club_use_default",
  "revenue_share.gift_creator_percent",
  "revenue_share.gift_platform_percent",
  "revenue_share.gift_use_default",
  "payout.min_withdraw_amount_vnd",
  "payout.hold_days",
  "payout.processing_days_min",
  "payout.processing_days_max",
  "payout.hold_revenue_enabled",
  "payout.manual_review_required",
  "payout.withdrawal_pin_required",
  "payout.allow_withdraw_quality_warning",
  "payout.allow_restricted_accounts",
  "payout.max_requests_per_day",
  "payout.max_amount_vnd_per_day",
  "fraud.lock_revenue_on_severe_report",
  "fraud.lock_revenue_on_low_quality",
  "fraud.lock_revenue_on_creator_warning",
  "fraud.lock_revenue_on_refund_dispute",
  "fraud.revenue_lock_days",
  "fraud.allow_admin_manual_revenue_unlock"
] as const satisfies readonly MonetizationConfigKey[];

export type MonetizationDashboardKey = (typeof MONETIZATION_DASHBOARD_KEYS)[number];

export type RevenueSourceId =
  | "chapter_unlock"
  | "creator_tip"
  | "early_access"
  | "vip_subscription"
  | "fan_club_subscription"
  | "virtual_gift"
  | "sponsored_challenge"
  | "rewarded_ads";

export type RevenueSourceDefinition = {
  id: RevenueSourceId;
  label: string;
  enabledKey: MonetizationConfigKey;
  creatorPercentKey: MonetizationConfigKey;
  platformPercentKey: MonetizationConfigKey;
  useDefaultKey: MonetizationConfigKey;
  isFuture?: boolean;
};

export const REVENUE_SOURCE_DEFINITIONS: RevenueSourceDefinition[] = [
  {
    id: "chapter_unlock",
    label: "Chương trả phí",
    enabledKey: "paid_chapters.enabled",
    creatorPercentKey: "revenue_share.paid_chapter_creator_percent",
    platformPercentKey: "revenue_share.paid_chapter_platform_percent",
    useDefaultKey: "revenue_share.paid_chapter_use_default"
  },
  {
    id: "creator_tip",
    label: "Tip tác giả",
    enabledKey: "tips.enabled",
    creatorPercentKey: "revenue_share.tip_creator_percent",
    platformPercentKey: "revenue_share.tip_platform_percent",
    useDefaultKey: "revenue_share.tip_use_default"
  },
  {
    id: "early_access",
    label: "Truy cập sớm",
    enabledKey: "early_access.enabled",
    creatorPercentKey: "revenue_share.early_access_creator_percent",
    platformPercentKey: "revenue_share.early_access_platform_percent",
    useDefaultKey: "revenue_share.early_access_use_default"
  },
  {
    id: "vip_subscription",
    label: "Gói VIP",
    enabledKey: "vip_subscription.enabled",
    creatorPercentKey: "revenue_share.vip_creator_pool_percent",
    platformPercentKey: "revenue_share.platform_fee_percent",
    useDefaultKey: "revenue_share.vip_use_default"
  },
  {
    id: "fan_club_subscription",
    label: "Câu lạc bộ fan",
    enabledKey: "fan_club.enabled",
    creatorPercentKey: "revenue_share.fan_club_creator_percent",
    platformPercentKey: "revenue_share.fan_club_platform_percent",
    useDefaultKey: "revenue_share.fan_club_use_default"
  },
  {
    id: "virtual_gift",
    label: "Quà tặng ảo",
    enabledKey: "virtual_gifts.enabled",
    creatorPercentKey: "revenue_share.gift_creator_percent",
    platformPercentKey: "revenue_share.gift_platform_percent",
    useDefaultKey: "revenue_share.gift_use_default",
    isFuture: false
  },
  {
    id: "sponsored_challenge",
    label: "Thử thách tài trợ",
    enabledKey: "sponsored_challenge.enabled",
    creatorPercentKey: "revenue_share.default_creator_percent",
    platformPercentKey: "revenue_share.default_platform_percent",
    useDefaultKey: "revenue_share.paid_chapter_use_default",
    isFuture: true
  },
  {
    id: "rewarded_ads",
    label: "Quảng cáo thưởng",
    enabledKey: "rewarded_ads.enabled",
    creatorPercentKey: "revenue_share.default_creator_percent",
    platformPercentKey: "revenue_share.default_platform_percent",
    useDefaultKey: "revenue_share.paid_chapter_use_default",
    isFuture: true
  }
];

export type EcosystemToggleDefinition = {
  key: MonetizationConfigKey;
  label: string;
  description: string;
  impactNote?: string;
  dangerous?: boolean;
  important?: boolean;
  future?: boolean;
  /** Disabled when monetization.enabled is off (except master toggle) */
  requiresMonetization?: boolean;
};

export const ECOSYSTEM_TOGGLES: EcosystemToggleDefinition[] = [
  {
    key: "monetization.enabled",
    label: "Bật hệ sinh thái tiền",
    description: "Công tắc tổng cho Xu, chương trả phí và kiếm tiền.",
    impactNote: "Tắt sẽ ẩn luồng tiền phía người dùng và tác giả.",
    dangerous: true,
    important: true
  },
  {
    key: "coin.purchase_enabled",
    label: "Cho phép nạp Xu",
    description: "Cho phép người đọc nạp Xu qua kênh thanh toán.",
    impactNote: "Cần bật hệ sinh thái tiền.",
    important: true,
    requiresMonetization: true
  },
  {
    key: "paid_chapters.enabled",
    label: "Cho phép chương trả phí",
    description: "Tác giả có thể đặt giá Xu cho chương.",
    requiresMonetization: true
  },
  {
    key: "tips.enabled",
    label: "Cho phép tip tác giả",
    description: "Người đọc có thể tip Xu cho tác giả.",
    requiresMonetization: true
  },
  {
    key: "virtual_gifts.enabled",
    label: "Cho phép quà tặng ảo",
    description: "Gửi quà ảo trong catalog.",
    requiresMonetization: true
  },
  {
    key: "vip_subscription.enabled",
    label: "Cho phép VIP",
    description: "Gói đăng ký VIP cho người đọc.",
    requiresMonetization: true
  },
  {
    key: "fan_club.enabled",
    label: "Cho phép câu lạc bộ fan",
    description: "Fan club theo truyện hoặc tác giả.",
    requiresMonetization: true
  },
  {
    key: "creator_monetization.enabled",
    label: "Cho phép tác giả kiếm tiền",
    description:
      "Công tắc toàn nền tảng. Mặc định mỗi tác giả được kiếm tiền; chỉ tài khoản bị admin tắt thủ công mới bị chặn.",
    impactNote: "Yêu cầu hệ sinh thái tiền đang bật. Không dùng để chặn từng user vì thiếu điều kiện.",
    important: true,
    requiresMonetization: true
  },
  {
    key: "monetization.show_money_ui_to_creators",
    label: "Hiển thị số tiền cho tác giả trong Studio",
    description:
      "Ẩn số dư/doanh thu trên dashboard; trang Kiếm tiền vẫn hoạt động khi tác giả đã được duyệt.",
    impactNote: "Không chặn duyệt kiếm tiền hay cấu hình chương trả phí.",
    requiresMonetization: true
  },
  {
    key: "payout.enabled",
    label: "Cho phép tác giả rút tiền",
    description:
      "Công tắc toàn nền tảng. Mặc định tác giả có thể rút khi đủ số dư; admin có thể khóa rút riêng từng user.",
    impactNote:
      "Tắt sẽ chặn mọi yêu cầu rút tiền mới trên nền tảng. Không ảnh hưởng số dư đã ghi nhận.",
    dangerous: true,
    important: true,
    requiresMonetization: true
  }
];

export type RiskLevel = "low" | "medium" | "high";

export type DraftSettingChange = {
  key: MonetizationDashboardKey;
  label: string;
  oldValue: string;
  newValue: string;
  riskLevel: RiskLevel;
};

export const FIELD_LABELS: Record<MonetizationDashboardKey, string> = {
  "monetization.enabled": "Hệ sinh thái tiền",
  "coin.enabled": "Bật Xu",
  "coin.purchase_enabled": "Nạp Xu",
  "paid_chapters.enabled": "Chương trả phí",
  "early_access.enabled": "Truy cập sớm",
  "tips.enabled": "Tip tác giả",
  "virtual_gifts.enabled": "Quà tặng ảo",
  "vip_subscription.enabled": "VIP",
  "fan_club.enabled": "Fan club",
  "creator_monetization.enabled": "Tác giả kiếm tiền",
  "monetization.show_money_ui_to_creators": "Hiển thị số tiền (Studio)",
  "payout.enabled": "Rút tiền tác giả",
  "coin.exchange_rate_vnd": "1 VNĐ = 1 Xu",
  "coin.min_purchase_coins": "Xu tối thiểu/lần mua",
  "coin.max_purchase_coins": "Xu tối đa/lần mua",
  "paid_chapters.min_coin_price": "Giá Xu tối thiểu/chương",
  "paid_chapters.max_coin_price": "Giá Xu tối đa/chương",
  "revenue_share.default_creator_percent": "% tác giả mặc định",
  "revenue_share.default_platform_percent": "% nền tảng mặc định",
  "revenue_share.paid_chapter_creator_percent": "% tác giả — chương trả phí",
  "revenue_share.paid_chapter_platform_percent": "% nền tảng — chương trả phí",
  "revenue_share.paid_chapter_use_default": "Chương trả phí dùng mặc định",
  "revenue_share.tip_creator_percent": "% tác giả — tip",
  "revenue_share.tip_platform_percent": "% nền tảng — tip",
  "revenue_share.tip_use_default": "Tip dùng mặc định",
  "revenue_share.early_access_creator_percent": "% tác giả — truy cập sớm",
  "revenue_share.early_access_platform_percent": "% nền tảng — truy cập sớm",
  "revenue_share.early_access_use_default": "Truy cập sớm dùng mặc định",
  "revenue_share.vip_creator_pool_percent": "% pool tác giả — VIP",
  "revenue_share.platform_fee_percent": "% phí nền tảng — VIP",
  "revenue_share.vip_use_default": "VIP dùng mặc định",
  "revenue_share.fan_club_creator_percent": "% tác giả — fan club",
  "revenue_share.fan_club_platform_percent": "% nền tảng — fan club",
  "revenue_share.fan_club_use_default": "Fan club dùng mặc định",
  "revenue_share.gift_creator_percent": "% tác giả — quà tặng",
  "revenue_share.gift_platform_percent": "% nền tảng — quà tặng",
  "revenue_share.gift_use_default": "Quà tặng dùng mặc định",
  "payout.min_withdraw_amount_vnd": "Rút tối thiểu (VND)",
  "payout.hold_days": "Số ngày giữ tiền",
  "payout.processing_days_min": "Xử lý rút — tối thiểu (ngày)",
  "payout.processing_days_max": "Xử lý rút — tối đa (ngày)",
  "payout.hold_revenue_enabled": "Giữ doanh thu trước khi khả dụng",
  "payout.manual_review_required": "Duyệt rút thủ công",
  "payout.withdrawal_pin_required": "Bắt buộc PIN rút tiền",
  "payout.allow_withdraw_quality_warning": "Rút khi cảnh báo chất lượng",
  "payout.allow_restricted_accounts": "Rút khi tài khoản bị hạn chế",
  "payout.max_requests_per_day": "Số yêu cầu rút tối đa/ngày",
  "payout.max_amount_vnd_per_day": "Số tiền rút tối đa/ngày",
  "fraud.lock_revenue_on_severe_report": "Khóa khi report nghiêm trọng",
  "fraud.lock_revenue_on_low_quality": "Khóa khi chất lượng thấp",
  "fraud.lock_revenue_on_creator_warning": "Khóa khi tác giả bị cảnh báo",
  "fraud.lock_revenue_on_refund_dispute": "Khóa khi tranh chấp hoàn Xu",
  "fraud.revenue_lock_days": "Số ngày giữ doanh thu bị khóa",
  "fraud.allow_admin_manual_revenue_unlock": "Admin mở khóa thủ công"
};

const HIGH_RISK_KEYS = new Set<MonetizationDashboardKey>([
  "monetization.enabled",
  "coin.purchase_enabled",
  "paid_chapters.enabled",
  "payout.enabled",
  "coin.exchange_rate_vnd",
  "revenue_share.default_creator_percent",
  "revenue_share.default_platform_percent",
  "payout.hold_days",
  "payout.allow_restricted_accounts",
  "payout.manual_review_required",
  "fraud.lock_revenue_on_severe_report",
  "fraud.lock_revenue_on_low_quality",
  "fraud.lock_revenue_on_creator_warning",
  "fraud.lock_revenue_on_refund_dispute"
]);

const MEDIUM_RISK_KEYS = new Set<MonetizationDashboardKey>([
  "creator_monetization.enabled",
  "payout.min_withdraw_amount_vnd",
  "payout.hold_revenue_enabled",
  "payout.allow_withdraw_quality_warning",
  "fraud.revenue_lock_days"
]);

export const IMPORTANT_FIELD_KEYS = new Set<MonetizationDashboardKey>([
  "monetization.enabled",
  "coin.purchase_enabled",
  "paid_chapters.enabled",
  "coin.exchange_rate_vnd",
  "revenue_share.default_creator_percent",
  "revenue_share.default_platform_percent",
  "payout.enabled",
  "payout.hold_days",
  "fraud.lock_revenue_on_severe_report",
  "fraud.lock_revenue_on_low_quality",
  "fraud.lock_revenue_on_creator_warning",
  "fraud.lock_revenue_on_refund_dispute"
]);

export function getRiskLevelForKey(key: MonetizationDashboardKey): RiskLevel {
  if (HIGH_RISK_KEYS.has(key)) return "high";
  if (MEDIUM_RISK_KEYS.has(key)) return "medium";
  return "low";
}

/** @deprecated Use buildDraftChangeList */
export type SensitiveChange = DraftSettingChange & { warning: string };

function num(value: MonetizationSettingsMap[MonetizationConfigKey]) {
  return typeof value === "number" ? value : Number(value) || 0;
}

function bool(value: MonetizationSettingsMap[MonetizationConfigKey]) {
  return Boolean(value);
}

function formatValue(
  key: MonetizationConfigKey,
  value: MonetizationSettingsMap[MonetizationConfigKey]
) {
  if (typeof value === "boolean") return value ? "Bật" : "Tắt";
  if (key.includes("percent")) return `${value}%`;
  if (key.includes("vnd") || key.includes("rate")) {
    return Number(value).toLocaleString("vi-VN");
  }
  return String(value);
}

export function pickDashboardSettings(
  settings: MonetizationSettingsMap
): Pick<MonetizationSettingsMap, MonetizationDashboardKey> {
  const picked = {} as Pick<MonetizationSettingsMap, MonetizationDashboardKey>;
  for (const key of MONETIZATION_DASHBOARD_KEYS) {
    picked[key] = settings[key];
  }
  return picked;
}

export function mergeDashboardSettings(
  current: MonetizationSettingsMap,
  patch: Partial<MonetizationSettingsMap>
): MonetizationSettingsMap {
  const next = { ...current };
  for (const key of MONETIZATION_DASHBOARD_KEYS) {
    if (key in patch && patch[key] !== undefined) {
      next[key] = patch[key] as MonetizationSettingsMap[typeof key];
    }
  }
  return next;
}

export type ValidationResult = {
  ok: boolean;
  fieldErrors: Partial<Record<MonetizationDashboardKey, string>>;
  fieldWarnings: Partial<Record<MonetizationDashboardKey, string>>;
  formError: string | null;
};

const MAX_CHAPTER_COIN_WARN = 5000;

export function validateMonetizationDashboard(
  settings: MonetizationSettingsMap
): ValidationResult {
  const fieldErrors: Partial<Record<MonetizationDashboardKey, string>> = {};
  const fieldWarnings: Partial<Record<MonetizationDashboardKey, string>> = {};
  let formError: string | null = null;

  const creatorDefault = num(settings["revenue_share.default_creator_percent"]);
  const platformDefault = num(settings["revenue_share.default_platform_percent"]);

  if (creatorDefault < 0 || creatorDefault > 100) {
    fieldErrors["revenue_share.default_creator_percent"] =
      "% phải từ 0 đến 100.";
  }
  if (platformDefault < 0 || platformDefault > 100) {
    fieldErrors["revenue_share.default_platform_percent"] =
      "% phải từ 0 đến 100.";
  }
  if (creatorDefault + platformDefault !== 100) {
    formError = "Tổng % tác giả và % nền tảng mặc định phải bằng 100.";
  }

  const coinRate = num(settings["coin.exchange_rate_vnd"]);
  if (coinRate <= 0) {
    fieldErrors["coin.exchange_rate_vnd"] = "Tỷ giá phải lớn hơn 0.";
  }

  const minCoin = num(settings["paid_chapters.min_coin_price"]);
  const maxCoin = num(settings["paid_chapters.max_coin_price"]);
  if (minCoin > maxCoin) {
    fieldErrors["paid_chapters.max_coin_price"] =
      "Giá tối đa không được nhỏ hơn giá tối thiểu.";
  }
  if (maxCoin > MAX_CHAPTER_COIN_WARN) {
    fieldWarnings["paid_chapters.max_coin_price"] =
      `Giá tối đa ${maxCoin} Xu khá cao — cân nhắc ảnh hưởng trải nghiệm người đọc.`;
  }

  const minPurchase = num(settings["coin.min_purchase_coins"]);
  const maxPurchase = num(settings["coin.max_purchase_coins"]);
  if (minPurchase > maxPurchase) {
    fieldErrors["coin.max_purchase_coins"] = "Xu tối đa mỗi lần mua phải ≥ Xu tối thiểu.";
  }

  const holdDays = num(settings["payout.hold_days"]);
  if (holdDays < 0 || holdDays > 90) {
    fieldErrors["payout.hold_days"] = "Số ngày giữ tiền phải từ 0 đến 90.";
  }

  const processingDaysMin = num(settings["payout.processing_days_min"]);
  const processingDaysMax = num(settings["payout.processing_days_max"]);
  if (processingDaysMin < 1 || processingDaysMin > 30) {
    fieldErrors["payout.processing_days_min"] =
      "Thời gian xử lý rút tối thiểu phải từ 1 đến 30 ngày.";
  }
  if (processingDaysMax < 1 || processingDaysMax > 30) {
    fieldErrors["payout.processing_days_max"] =
      "Thời gian xử lý rút tối đa phải từ 1 đến 30 ngày.";
  }
  if (
    !fieldErrors["payout.processing_days_min"] &&
    !fieldErrors["payout.processing_days_max"] &&
    processingDaysMin > processingDaysMax
  ) {
    fieldErrors["payout.processing_days_max"] =
      "Thời gian xử lý tối đa phải ≥ tối thiểu.";
  }

  const minWithdraw = num(settings["payout.min_withdraw_amount_vnd"]);
  if (bool(settings["payout.enabled"]) && minWithdraw <= 0) {
    fieldErrors["payout.min_withdraw_amount_vnd"] =
      "Rút tối thiểu phải lớn hơn 0 khi bật rút tiền.";
  }

  if (
    bool(settings["creator_monetization.enabled"]) &&
    !bool(settings["monetization.enabled"])
  ) {
    formError =
      "Bật kiếm tiền tác giả yêu cầu hệ sinh thái tiền phải được bật.";
  }

  for (const source of REVENUE_SOURCE_DEFINITIONS) {
    if (source.isFuture) continue;
    if (bool(settings[source.useDefaultKey])) continue;
    const c = num(settings[source.creatorPercentKey]);
    const p = num(settings[source.platformPercentKey]);
    if (c + p !== 100) {
      formError = `${source.label}: tổng % tác giả + nền tảng phải bằng 100.`;
      break;
    }
  }

  return {
    ok: Object.keys(fieldErrors).length === 0 && !formError,
    fieldErrors,
    fieldWarnings,
    formError
  };
}

export function hasUnsavedDraft(
  baseline: MonetizationSettingsMap,
  draft: MonetizationSettingsMap
) {
  return Object.keys(diffDashboardSettings(pickDashboardSettings(baseline), pickDashboardSettings(draft))).length > 0;
}

export function hasImportantDraftChanges(
  baseline: MonetizationSettingsMap,
  draft: MonetizationSettingsMap
) {
  const changed = diffDashboardSettings(
    pickDashboardSettings(baseline),
    pickDashboardSettings(draft)
  );
  return Object.keys(changed).some((k) =>
    IMPORTANT_FIELD_KEYS.has(k as MonetizationDashboardKey)
  );
}

export function buildDraftChangeList(
  before: MonetizationSettingsMap,
  after: MonetizationSettingsMap
): DraftSettingChange[] {
  const changed = diffDashboardSettings(
    pickDashboardSettings(before),
    pickDashboardSettings(after)
  );

  return Object.keys(changed).map((key) => {
    const k = key as MonetizationDashboardKey;
    return {
      key: k,
      label: FIELD_LABELS[k] ?? k,
      oldValue: formatValue(k, before[k]),
      newValue: formatValue(k, after[k]),
      riskLevel: getRiskLevelForKey(k)
    };
  });
}

/** @deprecated Use buildDraftChangeList */
export function detectSensitiveChanges(
  before: MonetizationSettingsMap,
  after: MonetizationSettingsMap
): Array<DraftSettingChange & { warning: string }> {
  return buildDraftChangeList(before, after)
    .filter((c) => c.riskLevel !== "low")
    .map((c) => ({
      ...c,
      warning:
        "Thay đổi này có thể ảnh hưởng giao dịch mới sau khi lưu. Giao dịch cũ không được tính lại."
    }));
}

export type PreviewTransactionType =
  | "chapter_unlock"
  | "tip"
  | "vip"
  | "fan_club";

export type RevenueStatusKind = "available" | "pending" | "locked";

export type SplitPreview = {
  totalCoin: number;
  creatorCoin: number;
  platformCoin: number;
  creatorPercent: number;
  platformPercent: number;
  statusKind: RevenueStatusKind;
  statusLabel: string;
  referenceVnd: number;
};

export function computeSplitPreview(
  settings: MonetizationSettingsMap,
  input: {
    coins: number;
    type: PreviewTransactionType;
    useCustomRate?: boolean;
    customCreatorPercent?: number;
    customPlatformPercent?: number;
    simulateLocked?: boolean;
  }
): SplitPreview {
  const totalCoin = Math.max(0, input.coins);
  const rate = num(settings["coin.exchange_rate_vnd"]);
  const holdDays = num(settings["payout.hold_days"]);
  const holdEnabled = bool(settings["payout.hold_revenue_enabled"]);

  let creatorPercent = num(settings["revenue_share.default_creator_percent"]);
  let platformPercent = num(settings["revenue_share.default_platform_percent"]);

  const map: Record<
    PreviewTransactionType,
    { useDefault: MonetizationConfigKey; creator: MonetizationConfigKey; platform: MonetizationConfigKey }
  > = {
    chapter_unlock: {
      useDefault: "revenue_share.paid_chapter_use_default",
      creator: "revenue_share.paid_chapter_creator_percent",
      platform: "revenue_share.paid_chapter_platform_percent"
    },
    tip: {
      useDefault: "revenue_share.tip_use_default",
      creator: "revenue_share.tip_creator_percent",
      platform: "revenue_share.tip_platform_percent"
    },
    vip: {
      useDefault: "revenue_share.vip_use_default",
      creator: "revenue_share.vip_creator_pool_percent",
      platform: "revenue_share.platform_fee_percent"
    },
    fan_club: {
      useDefault: "revenue_share.fan_club_use_default",
      creator: "revenue_share.fan_club_creator_percent",
      platform: "revenue_share.fan_club_platform_percent"
    }
  };

  const keys = map[input.type];
  if (input.useCustomRate) {
    creatorPercent = input.customCreatorPercent ?? creatorPercent;
    platformPercent = input.customPlatformPercent ?? platformPercent;
  } else if (!bool(settings[keys.useDefault])) {
    creatorPercent = num(settings[keys.creator]);
    platformPercent = num(settings[keys.platform]);
  }

  const creatorCoin = Math.round((totalCoin * creatorPercent) / 100);
  const platformCoin = totalCoin - creatorCoin;

  let statusKind: RevenueStatusKind = "available";
  let statusLabel = "Khả dụng (available)";

  if (input.simulateLocked) {
    statusKind = "locked";
    const lockDays = num(settings["fraud.revenue_lock_days"]);
    statusLabel = `Bị khóa — xử lý trong ${lockDays} ngày`;
  } else if (holdEnabled) {
    statusKind = "pending";
    statusLabel = `Đang chờ (pending) — khả dụng sau ${holdDays} ngày`;
  }

  return {
    totalCoin,
    creatorCoin,
    platformCoin,
    creatorPercent,
    platformPercent,
    statusKind,
    statusLabel,
    referenceVnd: totalCoin * rate
  };
}

export function getEffectiveShareForSource(
  settings: MonetizationSettingsMap,
  source: RevenueSourceDefinition
) {
  const defaultCreator = num(settings["revenue_share.default_creator_percent"]);
  const defaultPlatform = num(settings["revenue_share.default_platform_percent"]);

  if (bool(settings[source.useDefaultKey])) {
    return { creator: defaultCreator, platform: defaultPlatform, usesDefault: true };
  }

  return {
    creator: num(settings[source.creatorPercentKey]),
    platform: num(settings[source.platformPercentKey]),
    usesDefault: false
  };
}

export function diffDashboardSettings(
  before: Pick<MonetizationSettingsMap, MonetizationDashboardKey>,
  after: Pick<MonetizationSettingsMap, MonetizationDashboardKey>
) {
  const changed: Partial<MonetizationSettingsMap> = {};
  for (const key of MONETIZATION_DASHBOARD_KEYS) {
    if (before[key] !== after[key]) {
      changed[key] = after[key];
    }
  }
  return changed;
}
