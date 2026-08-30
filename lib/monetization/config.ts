import { unstable_cache, revalidateTag } from "next/cache";
import type {
  MonetizationConfig,
  MonetizationConfigKey,
  MonetizationSettingDefinition,
  MonetizationSettingValue,
  MonetizationSettingsMap,
  RevenueShareConfig,
  RevenueShareType
} from "@/types/monetization";
import { fetchMonetizationSettings } from "@/lib/data/monetization-settings";
import { normalizeRevenueSharePercents } from "@/lib/admin/creator-fee-policy-shared";

export const MONETIZATION_CACHE_TAG = "monetization-settings";

export const MONETIZATION_SETTING_DEFINITIONS = [
  {
    key: "monetization.enabled",
    label: "Bật hệ sinh thái tiền",
    description: "Công tắc tổng. Tắt = toàn bộ money UI user-facing bị ẩn.",
    group: "overview",
    defaultValue: false,
    inputType: "boolean",
    isPublic: true
  },
  {
    key: "monetization.test_mode",
    label: "Test mode",
    description: "Chỉ dùng thử nội bộ, không xử lý tiền thật.",
    group: "overview",
    defaultValue: false,
    inputType: "boolean",
    isPublic: false
  },
  {
    key: "monetization.show_money_ui_to_users",
    label: "Hiện money UI cho reader",
    description: "Cho phép người đọc nhìn thấy module tiền đã bật.",
    group: "overview",
    defaultValue: false,
    inputType: "boolean",
    isPublic: true
  },
  {
    key: "monetization.show_money_ui_to_creators",
    label: "Hiện money UI cho creator",
    description: "Cho phép creator nhìn thấy dashboard kiếm tiền sau này.",
    group: "overview",
    defaultValue: false,
    inputType: "boolean",
    isPublic: true
  },
  {
    key: "coin.enabled",
    label: "Bật Xu",
    description: "Bật nền tảng Xu nội bộ, chưa bao gồm nạp Xu.",
    group: "coin",
    defaultValue: false,
    inputType: "boolean",
    isPublic: true
  },
  {
    key: "coin.purchase_enabled",
    label: "Cho nạp Xu",
    description: "Chỉ bật sau khi payment thật sẵn sàng.",
    group: "coin",
    defaultValue: false,
    inputType: "boolean",
    isPublic: true
  },
  {
    key: "coin.reward_enabled",
    label: "Cho thưởng Xu",
    description: "Bật Xu thưởng/non-withdrawable.",
    group: "coin",
    defaultValue: false,
    inputType: "boolean",
    isPublic: true
  },
  {
    key: "coin.display_name",
    label: "Tên hiển thị Xu",
    description: "Tên Xu hiển thị trong UI nếu Xu được bật.",
    group: "coin",
    defaultValue: "Xu",
    inputType: "text",
    isPublic: true
  },
  {
    key: "coin.exchange_rate_vnd",
    label: "Tỷ giá VND/Xu",
    description: "Số VND tương ứng 1 Xu.",
    group: "coin",
    defaultValue: 1,
    inputType: "number",
    isPublic: true,
    min: 1,
    step: 100
  },
  {
    key: "coin.min_purchase_amount_vnd",
    label: "Mức mua tối thiểu (VND)",
    description: "Ngưỡng tối thiểu khi mua Xu sau này.",
    group: "coin",
    defaultValue: 10000,
    inputType: "number",
    isPublic: true,
    min: 0,
    step: 1000
  },
  {
    key: "coin.min_purchase_coins",
    label: "Xu tối thiểu mỗi lần mua",
    description: "Số Xu tối thiểu trong một giao dịch mua.",
    group: "coin",
    defaultValue: 10,
    inputType: "number",
    isPublic: true,
    min: 1,
    step: 1
  },
  {
    key: "coin.max_purchase_coins",
    label: "Xu tối đa mỗi lần mua",
    description: "Số Xu tối đa trong một giao dịch mua.",
    group: "coin",
    defaultValue: 100000,
    inputType: "number",
    isPublic: true,
    min: 1,
    step: 100
  },
  {
    key: "payments.enabled",
    label: "Bật payment",
    description: "Công tắc tổng cho payment providers.",
    group: "payments" as const,
    defaultValue: false,
    inputType: "boolean" as const,
    isPublic: true
  },
  {
    key: "payments.test_mode",
    label: "Payment test mode",
    description: "Test mode riêng cho payment providers.",
    group: "payments" as const,
    defaultValue: false,
    inputType: "boolean" as const,
    isPublic: false
  },
  {
    key: "payments.provider_sepay_enabled",
    label: "Bật SePay",
    description: "Provider thanh toán web ưu tiên cho web desktop/mobile PWA.",
    group: "payments" as const,
    defaultValue: true,
    inputType: "boolean" as const,
    isPublic: true
  },
  ...[
    ["payments.provider_vnpay_enabled", "VNPay"],
    ["payments.provider_momo_enabled", "MoMo"],
    ["payments.provider_zalopay_enabled", "ZaloPay"],
    ["payments.provider_vietqr_enabled", "VietQR"],
    ["payments.provider_apple_iap_enabled", "Apple IAP"],
    ["payments.provider_app_store_iap_enabled", "App Store IAP"],
    ["payments.provider_google_play_billing_enabled", "Google Play Billing"]
  ].map(([key, label]) => ({
    key: key as MonetizationConfigKey,
    label: `Bật ${label}`,
    description: `Cho phép provider ${label} khi payment tổng đã bật.`,
    group: "payments" as const,
    defaultValue: false,
    inputType: "boolean" as const,
    isPublic: true
  })),
  {
    key: "payments.sepay.default_fee_percent",
    label: "SePay fee mặc định (%)",
    description: "Phí kênh web SePay dùng để tính net amount.",
    group: "payments" as const,
    defaultValue: 2,
    inputType: "number" as const,
    isPublic: false,
    min: 0,
    max: 100,
    step: 0.1
  },
  {
    key: "payments.google_play.default_store_fee_percent",
    label: "Google Play fee mặc định (%)",
    description: "Phí store cho Android purchases trong app.",
    group: "payments" as const,
    defaultValue: 15,
    inputType: "number" as const,
    isPublic: false,
    min: 0,
    max: 100,
    step: 0.1
  },
  {
    key: "payments.google_play.standard_fee_percent",
    label: "Google Play standard fee (%)",
    description: "Mức phí chuẩn của Google Play khi không dùng ưu đãi.",
    group: "payments" as const,
    defaultValue: 30,
    inputType: "number" as const,
    isPublic: false,
    min: 0,
    max: 100,
    step: 0.1
  },
  {
    key: "payments.google_play.use_reduced_fee_estimate",
    label: "Ước tính reduced fee",
    description: "Dùng default fee thay cho standard fee khi ước tính net.",
    group: "payments" as const,
    defaultValue: true,
    inputType: "boolean" as const,
    isPublic: false
  },
  {
    key: "payments.google_play.test_mode",
    label: "Google Play test mode",
    description: "Bật để dùng luồng test/sandbox cho Google Play Billing.",
    group: "payments" as const,
    defaultValue: true,
    inputType: "boolean" as const,
    isPublic: false
  },
  {
    key: "payments.google_play.package_name",
    label: "Android package name",
    description: "Package name app Android dùng để verify purchase token.",
    group: "payments" as const,
    defaultValue: "com.chapchap.app",
    inputType: "text" as const,
    isPublic: false
  },
  {
    key: "payments.google_play.credentials_configured",
    label: "Google credentials configured",
    description: "Đánh dấu đã cấu hình service account/secret verify Google Play.",
    group: "payments" as const,
    defaultValue: false,
    inputType: "boolean" as const,
    isPublic: false
  },
  {
    key: "payments.apple_iap.default_store_fee_percent",
    label: "Apple IAP fee mặc định (%)",
    description: "Phí store cho iOS in-app purchases.",
    group: "payments" as const,
    defaultValue: 15,
    inputType: "number" as const,
    isPublic: false,
    min: 0,
    max: 100,
    step: 0.1
  },
  {
    key: "payments.store.standard_fee_percent",
    label: "Store fallback fee (%)",
    description: "Fallback fee khi không xác định được mức store fee cụ thể.",
    group: "payments" as const,
    defaultValue: 30,
    inputType: "number" as const,
    isPublic: false,
    min: 0,
    max: 100,
    step: 0.1
  },
  {
    key: "platform.web.payment_provider",
    label: "Web desktop payment provider",
    description: "Provider thanh toán cho desktop website.",
    group: "payments" as const,
    defaultValue: "sepay",
    inputType: "text" as const,
    isPublic: false
  },
  {
    key: "platform.web_mobile.payment_provider",
    label: "Web mobile/PWA payment provider",
    description: "Provider thanh toán cho mobile web/PWA.",
    group: "payments" as const,
    defaultValue: "sepay",
    inputType: "text" as const,
    isPublic: false
  },
  {
    key: "platform.web_desktop.purchase_mode",
    label: "Web desktop purchase mode",
    description: "Purchase mode cho desktop web (mac dinh web_payment).",
    group: "payments" as const,
    defaultValue: "web_payment",
    inputType: "text" as const,
    isPublic: false
  },
  {
    key: "platform.web_mobile_pwa.purchase_mode",
    label: "Web mobile/PWA purchase mode",
    description: "Purchase mode cho mobile web/PWA (mac dinh web_payment).",
    group: "payments" as const,
    defaultValue: "web_payment",
    inputType: "text" as const,
    isPublic: false
  },
  {
    key: "platform.android.purchase_mode",
    label: "Android purchase mode",
    description:
      "consumption_only | store_billing | external_link_eligible cho Android app.",
    group: "payments" as const,
    defaultValue: "consumption_only",
    inputType: "text" as const,
    isPublic: false
  },
  {
    key: "platform.ios.purchase_mode",
    label: "iOS purchase mode",
    description:
      "consumption_only | store_billing | external_link_eligible cho iOS app.",
    group: "payments" as const,
    defaultValue: "consumption_only",
    inputType: "text" as const,
    isPublic: false
  },
  {
    key: "platform.android.payment_mode",
    label: "Android payment mode",
    description: "Legacy key. Dung platform.android.purchase_mode.",
    group: "payments" as const,
    defaultValue: "consumption_only",
    inputType: "text" as const,
    isPublic: false
  },
  {
    key: "platform.ios.payment_mode",
    label: "iOS payment mode",
    description: "Legacy key. Dung platform.ios.purchase_mode.",
    group: "payments" as const,
    defaultValue: "consumption_only",
    inputType: "text" as const,
    isPublic: false
  },
  {
    key: "platform.android.external_link_eligible_enabled",
    label: "Android external link eligibility confirmed",
    description:
      "Admin xac nhan app Android du dieu kien external link truoc khi hien link.",
    group: "payments" as const,
    defaultValue: false,
    inputType: "boolean" as const,
    isPublic: false
  },
  {
    key: "platform.ios.external_link_eligible_enabled",
    label: "iOS external link eligibility confirmed",
    description:
      "Admin xac nhan app iOS du dieu kien external link truoc khi hien link.",
    group: "payments" as const,
    defaultValue: false,
    inputType: "boolean" as const,
    isPublic: false
  },
  {
    key: "creator_monetization.enabled",
    label: "Bật kiếm tiền cho creator",
    description: "Công tắc tổng cho creator monetization.",
    group: "creator",
    defaultValue: false,
    inputType: "boolean",
    isPublic: true
  },
  {
    key: "creator_monetization.auto_approval_enabled",
    label: "Tự động duyệt creator",
    description: "Nên giữ tắt trước khi có anti-fraud đầy đủ.",
    group: "creator",
    defaultValue: false,
    inputType: "boolean",
    isPublic: false
  },
  ...[
    ["creator_monetization.min_followers", "Follower tối thiểu"],
    ["creator_monetization.min_reads", "Lượt đọc tối thiểu"],
    ["creator_monetization.min_chapters", "Chapter tối thiểu"]
  ].map(([key, label]) => ({
    key: key as MonetizationConfigKey,
    label,
    description: "Điều kiện tối thiểu để creator được xét bật kiếm tiền.",
    group: "creator" as const,
    defaultValue: 0,
    inputType: "number" as const,
    isPublic: false,
    min: 0,
    step: 1
  })),
  {
    key: "creator_monetization.requires_manual_review",
    label: "Bắt buộc duyệt thủ công",
    description: "Khuyến nghị bật để admin kiểm soát chất lượng và rủi ro.",
    group: "creator",
    defaultValue: true,
    inputType: "boolean",
    isPublic: false
  },
  ...[
    ["revenue_share.default_creator_percent", "Creator mặc định (%)", 70],
    ["revenue_share.default_platform_percent", "Platform mặc định (%)", 30],
    ["revenue_share.tip_creator_percent", "Creator nhận tip (%)", 70],
    ["revenue_share.tip_platform_percent", "Platform từ tip (%)", 10],
    ["revenue_share.gift_creator_percent", "Creator nhận gift (%)", 70],
    ["revenue_share.paid_chapter_creator_percent", "Creator paid chapter (%)", 60],
    ["revenue_share.early_access_creator_percent", "Creator early access (%)", 60],
    ["revenue_share.fan_club_creator_percent", "Creator fan club (%)", 70],
    ["revenue_share.paid_chapter_platform_percent", "Platform paid chapter (%)", 30],
    ["revenue_share.vip_creator_pool_percent", "VIP creator pool (%)", 50],
    ["revenue_share.platform_fee_percent", "Platform fee chung (%)", 30],
    ["revenue_share.early_access_platform_percent", "Platform early access (%)", 40],
    ["revenue_share.gift_platform_percent", "Platform gift (%)", 30],
    ["revenue_share.fan_club_platform_percent", "Platform fan club (%)", 30]
  ].map(([key, label, defaultValue]) => ({
    key: key as MonetizationConfigKey,
    label: String(label),
    description: "Tỷ lệ cấu hình bởi admin, không hardcode trong UI/module.",
    group: "revenue_share" as const,
    defaultValue: Number(defaultValue),
    inputType: "number" as const,
    isPublic: false,
    min: 0,
    max: 100,
    step: 1
  })),
  ...[
    ["revenue_share.paid_chapter_use_default", "Paid chapter dùng mặc định"],
    ["revenue_share.tip_use_default", "Tip dùng mặc định"],
    ["revenue_share.early_access_use_default", "Early access dùng mặc định"],
    ["revenue_share.vip_use_default", "VIP dùng mặc định"],
    ["revenue_share.fan_club_use_default", "Fan club dùng mặc định"],
    ["revenue_share.gift_use_default", "Quà tặng dùng mặc định"]
  ].map(([key, label]) => ({
    key: key as MonetizationConfigKey,
    label: String(label),
    description: "Khi bật, dùng % chia mặc định thay vì % riêng của nguồn.",
    group: "revenue_share" as const,
    defaultValue: true,
    inputType: "boolean" as const,
    isPublic: false
  })),
  {
    key: "revenue_share.calculate_on_net_after_channel_fee",
    label: "Tính revenue share sau channel fee",
    description: "Bật để revenue share được tính trên net sau phí kênh thanh toán.",
    group: "revenue_share" as const,
    defaultValue: true,
    inputType: "boolean" as const,
    isPublic: false
  },
  ...[
    [
      "revenue_share.bonus_withdrawable_factor.coin_pack",
      "Bonus từ gói Xu có thể rút (%)",
      30
    ],
    [
      "revenue_share.bonus_withdrawable_factor.rewarded_ads",
      "Bonus từ rewarded ads có thể rút (%)",
      0
    ],
    [
      "revenue_share.bonus_withdrawable_factor.referral_bonus",
      "Bonus từ referral có thể rút (%)",
      0
    ],
    [
      "revenue_share.bonus_withdrawable_factor.admin_grant",
      "Bonus từ admin grant/test Xu có thể rút (%)",
      0
    ]
  ].map(([key, label, defaultValue]) => ({
    key: key as MonetizationConfigKey,
    label: String(label),
    description:
      "Hệ số rút được áp dụng cho doanh thu phát sinh từ bonus Xu theo nguồn thưởng.",
    group: "revenue_share" as const,
    defaultValue: Number(defaultValue),
    inputType: "number" as const,
    isPublic: false,
    min: 0,
    max: 100,
    step: 1
  })),
  {
    key: "paid_chapters.enabled",
    label: "Paid chapters",
    description: "Bật/tắt module chương trả phí.",
    group: "modules",
    defaultValue: false,
    inputType: "boolean",
    isPublic: true
  },
  {
    key: "paid_chapters.default_coin_price",
    label: "Giá Xu mặc định chapter",
    description: "Giá mặc định khi creator không set giá riêng.",
    group: "modules",
    defaultValue: 10,
    inputType: "number",
    isPublic: false,
    min: 1,
    step: 1
  },
  {
    key: "paid_chapters.min_coin_price",
    label: "Giá Xu tối thiểu",
    description: "Giới hạn giá tối thiểu cho paid chapter.",
    group: "modules",
    defaultValue: 1,
    inputType: "number",
    isPublic: false,
    min: 1,
    step: 1
  },
  {
    key: "paid_chapters.max_coin_price",
    label: "Giá Xu tối đa",
    description: "Giới hạn giá tối đa cho paid chapter.",
    group: "modules",
    defaultValue: 200,
    inputType: "number",
    isPublic: false,
    min: 1,
    step: 1
  },
  {
    key: "paid_chapters.free_chapters_required",
    label: "Số chapter đầu miễn phí",
    description: "Số chapter đầu bắt buộc miễn phí trong mỗi story.",
    group: "modules",
    defaultValue: 0,
    inputType: "number",
    isPublic: false,
    min: 0,
    step: 1
  },
  {
    key: "paid_chapters.allow_creator_custom_price",
    label: "Cho creator tự set giá",
    description: "Tắt để toàn bộ chapter dùng giá mặc định admin.",
    group: "modules",
    defaultValue: true,
    inputType: "boolean",
    isPublic: false
  },
  {
    key: "paid_chapters.default_free_preview_percent",
    label: "Tỷ lệ preview mặc định (%)",
    description: "Mặc định phần nội dung hiển thị trước pay gate.",
    group: "modules",
    defaultValue: 20,
    inputType: "number",
    isPublic: false,
    min: 1,
    max: 100,
    step: 1
  },
  {
    key: "early_access.default_coin_price",
    label: "Giá Xu mặc định đọc sớm",
    description: "Giá đọc sớm mặc định khi creator không set.",
    group: "modules",
    defaultValue: 8,
    inputType: "number",
    isPublic: false,
    min: 1,
    step: 1
  },
  {
    key: "early_access.default_free_after_hours",
    label: "Mặc định miễn phí sau (giờ)",
    description: "Sau bao nhiêu giờ chapter đọc sớm sẽ free.",
    group: "modules",
    defaultValue: 24,
    inputType: "number",
    isPublic: false,
    min: 1,
    step: 1
  },
  {
    key: "early_access.min_coin_price",
    label: "Giá đọc sớm tối thiểu",
    description: "Giới hạn giá Xu tối thiểu của đọc sớm.",
    group: "modules",
    defaultValue: 1,
    inputType: "number",
    isPublic: false,
    min: 1,
    step: 1
  },
  {
    key: "early_access.max_coin_price",
    label: "Giá đọc sớm tối đa",
    description: "Giới hạn giá Xu tối đa của đọc sớm.",
    group: "modules",
    defaultValue: 200,
    inputType: "number",
    isPublic: false,
    min: 1,
    step: 1
  },
  {
    key: "early_access.allow_creator_custom_price",
    label: "Cho creator tự set giá đọc sớm",
    description: "Tắt để dùng giá mặc định admin cho đọc sớm.",
    group: "modules",
    defaultValue: true,
    inputType: "boolean",
    isPublic: false
  },
  {
    key: "early_access.max_early_access_days",
    label: "Tối đa số ngày đọc sớm",
    description: "Giới hạn thời gian đọc sớm tối đa cho một chapter.",
    group: "modules",
    defaultValue: 30,
    inputType: "number",
    isPublic: false,
    min: 1,
    step: 1
  },
  {
    key: "vip_subscription.default_price_vnd",
    label: "VIP giá mặc định (VND)",
    description: "Giá mặc định cho gói VIP mới.",
    group: "modules",
    defaultValue: 49000,
    inputType: "number",
    isPublic: false,
    min: 0,
    step: 1000
  },
  {
    key: "vip_subscription.default_duration_days",
    label: "VIP số ngày mặc định",
    description: "Thời lượng mặc định cho gói VIP.",
    group: "modules",
    defaultValue: 30,
    inputType: "number",
    isPublic: false,
    min: 1,
    step: 1
  },
  {
    key: "vip_subscription.default_coin_bonus_amount",
    label: "Xu bonus mặc định cho VIP",
    description: "Xu bonus mặc định khi mua VIP.",
    group: "modules",
    defaultValue: 0,
    inputType: "number",
    isPublic: false,
    min: 0,
    step: 1
  },
  {
    key: "vip_subscription.mock_purchase_enabled",
    label: "Cho phép mock VIP purchase",
    description: "Dùng cho test mode trước khi tích hợp billing thật.",
    group: "modules",
    defaultValue: true,
    inputType: "boolean",
    isPublic: false
  },
  {
    key: "fan_club.min_coin_price",
    label: "Fan club giá Xu tối thiểu",
    description: "Giới hạn giá tối thiểu cho plan fan club.",
    group: "modules",
    defaultValue: 10,
    inputType: "number",
    isPublic: false,
    min: 1,
    step: 1
  },
  {
    key: "fan_club.max_coin_price",
    label: "Fan club giá Xu tối đa",
    description: "Giới hạn giá tối đa cho plan fan club.",
    group: "modules",
    defaultValue: 1000,
    inputType: "number",
    isPublic: false,
    min: 1,
    step: 1
  },
  {
    key: "fan_club.default_duration_days",
    label: "Fan club thời hạn mặc định (ngày)",
    description: "Số ngày mặc định của một fan club membership.",
    group: "modules",
    defaultValue: 30,
    inputType: "number",
    isPublic: false,
    min: 1,
    step: 1
  },
  {
    key: "fan_club.creator_percent",
    label: "Fan club creator percent (%)",
    description: "Tỷ lệ doanh thu fan club cho creator.",
    group: "modules",
    defaultValue: 70,
    inputType: "number",
    isPublic: false,
    min: 0,
    max: 100,
    step: 1
  },
  {
    key: "fan_club.allow_story_specific_club",
    label: "Cho phép fan club theo truyện",
    description: "Bật để creator tạo fan club gắn theo story.",
    group: "modules",
    defaultValue: true,
    inputType: "boolean",
    isPublic: false
  },
  {
    key: "fan_club.requires_creator_approval",
    label: "Yêu cầu creator approved",
    description: "Bật để chỉ creator approved mới tạo fan club.",
    group: "modules",
    defaultValue: true,
    inputType: "boolean",
    isPublic: false
  },
  ...[
    ["tips.enabled", "Tip"],
    ["virtual_gifts.enabled", "Quà ảo"],
    ["early_access.enabled", "Early access"],
    ["vip_subscription.enabled", "VIP subscription"],
    ["fan_club.enabled", "Fan club"],
    ["rewarded_ads.enabled", "Rewarded ads"],
    ["supporter_ranking.enabled", "Supporter ranking"],
    ["earning_author_ranking.enabled", "Earning author ranking"],
    ["creator_bonus_pool.enabled", "Creator bonus pool"],
    ["sponsored_challenge.enabled", "Sponsored challenge"],
    ["brand_campaigns.enabled", "Brand campaigns"],
    ["originals_enabled", "Originals"]
  ].map(([key, label]) => ({
    key: key as MonetizationConfigKey,
    label,
    description: `Bật/tắt module ${label}. Mặc định OFF.`,
    group: "modules" as const,
    defaultValue: false,
    inputType: "boolean" as const,
    isPublic: true
  })),
  {
    key: "rewarded_ads.provider_mock_enabled",
    label: "Rewarded ads mock provider",
    description: "Bật mock provider cho MVP/test mode khi chưa có ad network thật.",
    group: "modules",
    defaultValue: true,
    inputType: "boolean",
    isPublic: false
  },
  {
    key: "rewarded_ads.reward_coin_amount",
    label: "Xu thưởng mỗi lượt",
    description: "Số Xu bonus nhận được sau khi xem quảng cáo xong.",
    group: "modules",
    defaultValue: 10,
    inputType: "number",
    isPublic: true,
    min: 1,
    step: 1
  },
  {
    key: "rewarded_ads.daily_limit_per_user",
    label: "Giới hạn lượt/ngày/user",
    description: "Số lần tối đa user nhận thưởng rewarded ad trong 1 ngày.",
    group: "modules",
    defaultValue: 3,
    inputType: "number",
    isPublic: false,
    min: 1,
    step: 1
  },
  {
    key: "rewarded_ads.cooldown_minutes",
    label: "Cooldown (phút)",
    description: "Thời gian chờ giữa hai lượt rewarded ad của cùng user.",
    group: "modules",
    defaultValue: 5,
    inputType: "number",
    isPublic: false,
    min: 0,
    step: 1
  },
  {
    key: "rewarded_ads.min_watch_seconds",
    label: "Thời lượng xem tối thiểu (giây)",
    description: "Số giây tối thiểu cần xem trước khi nhận thưởng.",
    group: "modules",
    defaultValue: 15,
    inputType: "number",
    isPublic: false,
    min: 1,
    step: 1
  },
  {
    key: "rewarded_ads.bonus_coin_expires_days",
    label: "Xu bonus hết hạn sau (ngày)",
    description: "Để 0 nghĩa là không hết hạn. Nếu > 0 sẽ lưu metadata để xử lý sau.",
    group: "modules",
    defaultValue: 0,
    inputType: "number",
    isPublic: false,
    min: 0,
    step: 1
  },
  {
    key: "rewarded_ads.allowed_use_for_paid_chapters",
    label: "Cho dùng Xu bonus mở khóa chapter",
    description: "Cho phép Xu bonus từ rewarded ad được dùng cho paid chapter.",
    group: "modules",
    defaultValue: true,
    inputType: "boolean",
    isPublic: true
  },
  {
    key: "rewarded_ads.allowed_use_for_tips",
    label: "Cho dùng Xu bonus để tip",
    description: "Cho phép Xu bonus từ rewarded ad được dùng cho tips.",
    group: "modules",
    defaultValue: true,
    inputType: "boolean",
    isPublic: true
  },
  {
    key: "payout.enabled",
    label: "Bật payout",
    description: "Công tắc tổng cho rút tiền creator.",
    group: "payout",
    defaultValue: false,
    inputType: "boolean",
    isPublic: false
  },
  {
    key: "payout.hold_revenue_enabled",
    label: "Giữ doanh thu trước khi available",
    description: "Bật để credit doanh thu về pending thay vì available.",
    group: "payout",
    defaultValue: false,
    inputType: "boolean",
    isPublic: false
  },
  {
    key: "payout.manual_review_required",
    label: "Duyệt payout thủ công",
    description: "Khuyến nghị luôn bật khi payout được triển khai.",
    group: "payout",
    defaultValue: true,
    inputType: "boolean",
    isPublic: false
  },
  {
    key: "payout.withdrawal_pin_required",
    label: "Bắt buộc mã PIN rút tiền",
    description: "Tác giả phải nhập PIN khi tạo yêu cầu rút.",
    group: "payout",
    defaultValue: true,
    inputType: "boolean",
    isPublic: false
  },
  {
    key: "payout.allow_restricted_accounts",
    label: "Cho phép rút khi tài khoản bị hạn chế",
    description: "Nguy hiểm: chỉ bật khi có quy trình kiểm soát rủi ro.",
    group: "payout",
    defaultValue: false,
    inputType: "boolean",
    isPublic: false
  },
  {
    key: "payout.allow_withdraw_quality_warning",
    label: "Cho phép rút khi có cảnh báo chất lượng",
    description: "Cho phép rút dù nội dung đang bị cảnh báo chất lượng.",
    group: "payout",
    defaultValue: false,
    inputType: "boolean",
    isPublic: false
  },
  {
    key: "payout.max_requests_per_day",
    label: "Số yêu cầu rút tối đa/ngày",
    description: "Giới hạn số lần tạo yêu cầu rút trong 24h.",
    group: "payout",
    defaultValue: 3,
    inputType: "number",
    isPublic: false,
    min: 1,
    max: 50,
    step: 1
  },
  {
    key: "payout.max_amount_vnd_per_day",
    label: "Số tiền rút tối đa/ngày (VND)",
    description: "0 = không giới hạn theo ngày.",
    group: "payout",
    defaultValue: 0,
    inputType: "number",
    isPublic: false,
    min: 0,
    step: 100000
  },
  {
    key: "payout.min_withdraw_amount_vnd",
    label: "Rút tối thiểu (VND)",
    description: "Ngưỡng rút tiền tối thiểu.",
    group: "payout",
    defaultValue: 100000,
    inputType: "number",
    isPublic: false,
    min: 0,
    step: 10000
  },
  {
    key: "payout.hold_days",
    label: "Số ngày giữ tiền",
    description: "Delay doanh thu trước khi được rút.",
    group: "payout",
    defaultValue: 14,
    inputType: "number",
    isPublic: false,
    min: 0,
    step: 1
  },
  {
    key: "payout.processing_days_min",
    label: "Xử lý rút tiền — tối thiểu (ngày)",
    description: "Số ngày làm việc tối thiểu hiển thị cho tác giả khi rút tiền.",
    group: "payout",
    defaultValue: 1,
    inputType: "number",
    isPublic: true,
    min: 1,
    max: 30,
    step: 1
  },
  {
    key: "payout.processing_days_max",
    label: "Xử lý rút tiền — tối đa (ngày)",
    description: "Số ngày làm việc tối đa hiển thị cho tác giả khi rút tiền.",
    group: "payout",
    defaultValue: 5,
    inputType: "number",
    isPublic: true,
    min: 1,
    max: 30,
    step: 1
  },
  {
    key: "payout.processing_days",
    label: "Xử lý rút tiền (ngày — legacy)",
    description: "Giá trị đơn cũ; ưu tiên min/max nếu đã cấu hình.",
    group: "payout",
    defaultValue: 5,
    inputType: "number",
    isPublic: true,
    min: 1,
    max: 30,
    step: 1
  },
  {
    key: "payout.kyc_required",
    label: "Yêu cầu KYC",
    description: "Bật khi có quy trình KYC.",
    group: "payout",
    defaultValue: true,
    inputType: "boolean",
    isPublic: false
  },
  {
    key: "payout.allowed_methods",
    label: "Phương thức payout cho phép",
    description: "Danh sách phương thức cách nhau bởi dấu phẩy: bank_transfer,momo,zalopay,manual.",
    group: "payout",
    defaultValue: "manual",
    inputType: "text",
    isPublic: false
  },
  {
    key: "payout.processing_note",
    label: "Ghi chú xử lý payout",
    description: "Thông điệp nội bộ hiển thị cho creator/admin khi xử lý payout.",
    group: "payout",
    defaultValue: "",
    inputType: "text",
    isPublic: false
  },
  {
    key: "payout.withdrawal_fee_enabled",
    label: "Bật phí rút tiền riêng",
    description: "Khi bật, hiển thị phí rút trước khi tác giả xác nhận.",
    group: "payout",
    defaultValue: false,
    inputType: "boolean",
    isPublic: false
  },
  {
    key: "payout.withdrawal_fee_percent",
    label: "Phí rút (%)",
    description: "Phần trăm trên số tiền yêu cầu rút.",
    group: "payout",
    defaultValue: 0,
    inputType: "number",
    isPublic: false,
    min: 0,
    max: 100,
    step: 0.1
  },
  {
    key: "payout.withdrawal_fee_fixed_vnd",
    label: "Phí rút cố định (VND)",
    description: "Phí cố định cộng thêm khi rút (nếu bật phí rút).",
    group: "payout",
    defaultValue: 0,
    inputType: "number",
    isPublic: false,
    min: 0,
    step: 1000
  },
  {
    key: "finance.payment_processing_fee_percent",
    label: "Phí xử lý bổ sung (%)",
    description: "Phần trăm trên gross, bổ sung ngoài phí kênh thanh toán.",
    group: "payout",
    defaultValue: 0,
    inputType: "number",
    isPublic: false,
    min: 0,
    max: 100,
    step: 0.1
  },
  {
    key: "finance.payment_processing_fixed_fee_vnd",
    label: "Phí xử lý cố định (VND)",
    description: "Phí VND cố định mỗi giao dịch doanh thu tác giả.",
    group: "payout",
    defaultValue: 0,
    inputType: "number",
    isPublic: false,
    min: 0,
    step: 100
  },
  {
    key: "finance.tax_percent",
    label: "Thuế / điều chỉnh (%)",
    description: "MVP: thường để 0; trừ trên gross khi tính NET.",
    group: "payout",
    defaultValue: 0,
    inputType: "number",
    isPublic: false,
    min: 0,
    max: 100,
    step: 0.1
  },
  {
    key: "fraud.enabled",
    label: "Bật fraud protection",
    description: "Công tắc tổng cho giới hạn chống gian lận.",
    group: "fraud",
    defaultValue: false,
    inputType: "boolean",
    isPublic: false
  },
  {
    key: "fraud.delay_creator_revenue_enabled",
    label: "Delay doanh thu creator",
    description: "Không ghi nhận/rút ngay doanh thu mới.",
    group: "fraud",
    defaultValue: true,
    inputType: "boolean",
    isPublic: false
  },
  {
    key: "fraud.block_bonus_coin_withdrawal",
    label: "Chặn rút Xu thưởng",
    description: "Xu thưởng không được quy đổi/rút tiền.",
    group: "fraud",
    defaultValue: true,
    inputType: "boolean",
    isPublic: false
  },
  {
    key: "fraud.lock_revenue_on_severe_report",
    label: "Khóa doanh thu khi report nghiêm trọng",
    description: "Tự khóa khi truyện/chương bị report mức nghiêm trọng.",
    group: "fraud",
    defaultValue: true,
    inputType: "boolean",
    isPublic: false
  },
  {
    key: "fraud.lock_revenue_on_low_quality",
    label: "Khóa doanh thu khi chất lượng thấp",
    description: "Tự khóa khi nội dung bị đánh dấu chất lượng thấp.",
    group: "fraud",
    defaultValue: true,
    inputType: "boolean",
    isPublic: false
  },
  {
    key: "fraud.lock_revenue_on_creator_warning",
    label: "Khóa doanh thu khi tác giả bị cảnh báo",
    description: "Tự khóa khi tài khoản tác giả nhận cảnh báo.",
    group: "fraud",
    defaultValue: true,
    inputType: "boolean",
    isPublic: false
  },
  {
    key: "fraud.lock_revenue_on_refund_dispute",
    label: "Khóa doanh thu khi tranh chấp hoàn Xu",
    description: "Tự khóa khi có khiếu nại hoàn Xu đang xử lý.",
    group: "fraud",
    defaultValue: true,
    inputType: "boolean",
    isPublic: false
  },
  {
    key: "fraud.revenue_lock_days",
    label: "Số ngày giữ doanh thu bị khóa",
    description: "Thời gian giữ doanh thu ở trạng thái khóa trước khi xem xét mở.",
    group: "fraud",
    defaultValue: 30,
    inputType: "number",
    isPublic: false,
    min: 0,
    max: 365,
    step: 1
  },
  {
    key: "fraud.allow_admin_manual_revenue_unlock",
    label: "Cho phép admin mở khóa thủ công",
    description: "Admin có thể mở khóa doanh thu sau khi rà soát.",
    group: "fraud",
    defaultValue: true,
    inputType: "boolean",
    isPublic: false
  },
  ...[
    ["fraud.max_daily_tip_amount_per_user", "Giới hạn tip/ngày/user", 500000],
    ["fraud.max_daily_unlock_amount_per_user", "Giới hạn unlock/ngày/user", 500000]
  ].map(([key, label, defaultValue]) => ({
    key: key as MonetizationConfigKey,
    label: String(label),
    description: "Trần chống abuse tính theo VND hoặc giá trị quy đổi tương đương.",
    group: "fraud" as const,
    defaultValue: Number(defaultValue),
    inputType: "number" as const,
    isPublic: false,
    min: 0,
    step: 10000
  }))
] satisfies MonetizationSettingDefinition[];

export const DEFAULT_MONETIZATION_SETTINGS =
  MONETIZATION_SETTING_DEFINITIONS.reduce((acc, definition) => {
    acc[definition.key] = definition.defaultValue;
    return acc;
  }, {} as MonetizationSettingsMap);

export function getSettingDefinition(key: MonetizationConfigKey) {
  return MONETIZATION_SETTING_DEFINITIONS.find(
    (definition) => definition.key === key
  );
}

function sanitizeValue(
  definition: MonetizationSettingDefinition,
  value: unknown
): MonetizationSettingValue {
  if (definition.inputType === "boolean") {
    return typeof value === "boolean" ? value : Boolean(definition.defaultValue);
  }

  if (definition.inputType === "number") {
    const numericValue = typeof value === "number" ? value : Number(value);

    if (!Number.isFinite(numericValue)) {
      return definition.defaultValue;
    }

    const min = definition.min ?? Number.NEGATIVE_INFINITY;
    const max = definition.max ?? Number.POSITIVE_INFINITY;
    return Math.min(Math.max(numericValue, min), max);
  }

  return typeof value === "string" ? value : String(definition.defaultValue);
}

async function loadMonetizationConfig(options?: {
  includePrivate?: boolean;
}): Promise<MonetizationConfig> {
  const rows = await fetchMonetizationSettings({
    includePrivate: options?.includePrivate === true
  });
  const settings = { ...DEFAULT_MONETIZATION_SETTINGS };
  let updatedAt: string | null = null;

  for (const row of rows) {
    const definition = getSettingDefinition(row.key as MonetizationConfigKey);

    if (!definition) {
      continue;
    }

    settings[definition.key] = sanitizeValue(definition, row.value);

    if (!updatedAt || row.updated_at > updatedAt) {
      updatedAt = row.updated_at;
    }
  }

  return { settings, updatedAt };
}

const getCachedMonetizationConfig = unstable_cache(
  () => loadMonetizationConfig(),
  ["monetization-settings"],
  { revalidate: 60, tags: [MONETIZATION_CACHE_TAG] }
);

const getCachedPrivateMonetizationConfig = unstable_cache(
  () => loadMonetizationConfig({ includePrivate: true }),
  ["monetization-settings-private"],
  { revalidate: 60, tags: [MONETIZATION_CACHE_TAG] }
);

export async function getMonetizationConfig(options?: {
  includePrivate?: boolean;
  useCache?: boolean;
}): Promise<MonetizationConfig> {
  const shouldIncludePrivate = options?.includePrivate === true;
  const config = options?.useCache === false
    ? await loadMonetizationConfig({ includePrivate: shouldIncludePrivate })
    : shouldIncludePrivate
      ? await getCachedPrivateMonetizationConfig()
      : await getCachedMonetizationConfig();

  if (options?.includePrivate) {
    return config;
  }

  const publicSettings = { ...DEFAULT_MONETIZATION_SETTINGS };

  for (const definition of MONETIZATION_SETTING_DEFINITIONS) {
    if (definition.isPublic) {
      publicSettings[definition.key] = config.settings[definition.key];
    }
  }

  return { ...config, settings: publicSettings };
}

export async function getMonetizationFlag(
  key: MonetizationConfigKey,
  options?: { includePrivate?: boolean; useCache?: boolean }
) {
  const config = await getMonetizationConfig(options);
  return Boolean(config.settings[key]);
}

export async function requireMonetizationEnabled(
  moduleKey?: MonetizationConfigKey
) {
  const config = await getMonetizationConfig();

  if (!config.settings["monetization.enabled"]) {
    return false;
  }

  if (!moduleKey) {
    return true;
  }

  return Boolean(config.settings[moduleKey]);
}

export async function shouldShowMoneyUiToUsers() {
  const { settings } = await getMonetizationConfig();
  return (
    Boolean(settings["monetization.enabled"]) &&
    Boolean(settings["monetization.show_money_ui_to_users"])
  );
}

export async function shouldShowMoneyUiToCreators() {
  const { settings } = await getMonetizationConfig();
  return (
    Boolean(settings["monetization.enabled"]) &&
    Boolean(settings["monetization.show_money_ui_to_creators"])
  );
}

export async function isMoneyModuleEnabledForUsers(
  moduleKey: MonetizationConfigKey
) {
  const { settings } = await getMonetizationConfig();
  return (
    Boolean(settings["monetization.enabled"]) &&
    Boolean(settings["monetization.show_money_ui_to_users"]) &&
    Boolean(settings[moduleKey])
  );
}

function numberSetting(
  settings: MonetizationSettingsMap,
  key: MonetizationConfigKey
) {
  const value = settings[key];
  return typeof value === "number" ? value : Number(value) || 0;
}

export async function getRevenueShareConfig(
  type: RevenueShareType = "default"
): Promise<RevenueShareConfig> {
  const { settings } = await getMonetizationConfig({ includePrivate: true });

  const sourceKeys: Record<
    RevenueShareType,
    {
      creator: MonetizationConfigKey;
      platform: MonetizationConfigKey;
      useDefault?: MonetizationConfigKey;
    }
  > = {
    default: {
      creator: "revenue_share.default_creator_percent",
      platform: "revenue_share.default_platform_percent"
    },
    tip: {
      creator: "revenue_share.tip_creator_percent",
      platform: "revenue_share.tip_platform_percent",
      useDefault: "revenue_share.tip_use_default"
    },
    paid_chapter: {
      creator: "revenue_share.paid_chapter_creator_percent",
      platform: "revenue_share.paid_chapter_platform_percent",
      useDefault: "revenue_share.paid_chapter_use_default"
    },
    early_access: {
      creator: "revenue_share.early_access_creator_percent",
      platform: "revenue_share.early_access_platform_percent",
      useDefault: "revenue_share.early_access_use_default"
    },
    gift: {
      creator: "revenue_share.gift_creator_percent",
      platform: "revenue_share.gift_platform_percent",
      useDefault: "revenue_share.gift_use_default"
    },
    fan_club: {
      creator: "revenue_share.fan_club_creator_percent",
      platform: "revenue_share.fan_club_platform_percent",
      useDefault: "revenue_share.fan_club_use_default"
    },
    vip_pool: {
      creator: "revenue_share.vip_creator_pool_percent",
      platform: "revenue_share.platform_fee_percent",
      useDefault: "revenue_share.vip_use_default"
    }
  };

  const defaultKeys = sourceKeys.default;
  const keys = sourceKeys[type];
  const useDefault =
    type !== "default" && keys.useDefault ? Boolean(settings[keys.useDefault]) : false;
  const creatorKey = useDefault ? defaultKeys.creator : keys.creator;
  const platformKey = useDefault ? defaultKeys.platform : keys.platform;
  const creatorPercent = numberSetting(settings, creatorKey);
  const platformPercent = numberSetting(settings, platformKey);
  const normalized = normalizeRevenueSharePercents(creatorPercent, platformPercent);

  return {
    creatorPercent: normalized.authorPercent,
    platformPercent: normalized.platformPercent,
    platformFeePercent: normalized.platformPercent
  };
}

export function refreshMonetizationConfig() {
  revalidateTag(MONETIZATION_CACHE_TAG, "max");
}
