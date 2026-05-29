export type MonetizationSettingValue = boolean | number | string;

export type MonetizationSettingInputType = "boolean" | "number" | "text";

export type MonetizationSettingGroup =
  | "overview"
  | "coin"
  | "payments"
  | "creator"
  | "revenue_share"
  | "modules"
  | "payout"
  | "fraud";

export type RevenueShareType =
  | "default"
  | "tip"
  | "paid_chapter"
  | "early_access"
  | "gift"
  | "fan_club"
  | "vip_pool";

export type MonetizationConfigKey =
  | "monetization.enabled"
  | "monetization.test_mode"
  | "monetization.show_money_ui_to_users"
  | "monetization.show_money_ui_to_creators"
  | "coin.enabled"
  | "coin.purchase_enabled"
  | "coin.reward_enabled"
  | "coin.display_name"
  | "coin.exchange_rate_vnd"
  | "coin.min_purchase_amount_vnd"
  | "coin.min_purchase_coins"
  | "coin.max_purchase_coins"
  | "payments.enabled"
  | "payments.test_mode"
  | "payments.provider_sepay_enabled"
  | "payments.sepay.default_fee_percent"
  | "payments.provider_vnpay_enabled"
  | "payments.provider_momo_enabled"
  | "payments.provider_zalopay_enabled"
  | "payments.provider_vietqr_enabled"
  | "payments.provider_apple_iap_enabled"
  | "payments.provider_app_store_iap_enabled"
  | "payments.provider_google_play_billing_enabled"
  | "payments.google_play.test_mode"
  | "payments.google_play.default_store_fee_percent"
  | "payments.google_play.standard_fee_percent"
  | "payments.google_play.use_reduced_fee_estimate"
  | "payments.google_play.package_name"
  | "payments.google_play.credentials_configured"
  | "payments.apple_iap.default_store_fee_percent"
  | "payments.store.standard_fee_percent"
  | "platform.web.payment_provider"
  | "platform.web_mobile.payment_provider"
  | "platform.web_desktop.purchase_mode"
  | "platform.web_mobile_pwa.purchase_mode"
  | "platform.android.purchase_mode"
  | "platform.ios.purchase_mode"
  | "platform.android.payment_mode"
  | "platform.ios.payment_mode"
  | "platform.android.external_link_eligible_enabled"
  | "platform.ios.external_link_eligible_enabled"
  | "creator_monetization.enabled"
  | "creator_monetization.auto_approval_enabled"
  | "creator_monetization.min_followers"
  | "creator_monetization.min_reads"
  | "creator_monetization.min_chapters"
  | "creator_monetization.requires_manual_review"
  | "revenue_share.default_creator_percent"
  | "revenue_share.default_platform_percent"
  | "revenue_share.tip_creator_percent"
  | "revenue_share.tip_platform_percent"
  | "revenue_share.gift_creator_percent"
  | "revenue_share.early_access_creator_percent"
  | "revenue_share.fan_club_creator_percent"
  | "revenue_share.paid_chapter_creator_percent"
  | "revenue_share.paid_chapter_platform_percent"
  | "revenue_share.vip_creator_pool_percent"
  | "revenue_share.platform_fee_percent"
  | "revenue_share.paid_chapter_use_default"
  | "revenue_share.tip_use_default"
  | "revenue_share.early_access_use_default"
  | "revenue_share.vip_use_default"
  | "revenue_share.fan_club_use_default"
  | "revenue_share.gift_use_default"
  | "revenue_share.early_access_platform_percent"
  | "revenue_share.gift_platform_percent"
  | "revenue_share.fan_club_platform_percent"
  | "revenue_share.calculate_on_net_after_channel_fee"
  | "revenue_share.bonus_withdrawable_factor.coin_pack"
  | "revenue_share.bonus_withdrawable_factor.rewarded_ads"
  | "revenue_share.bonus_withdrawable_factor.referral_bonus"
  | "revenue_share.bonus_withdrawable_factor.admin_grant"
  | "tips.enabled"
  | "virtual_gifts.enabled"
  | "paid_chapters.enabled"
  | "paid_chapters.default_coin_price"
  | "paid_chapters.min_coin_price"
  | "paid_chapters.max_coin_price"
  | "paid_chapters.free_chapters_required"
  | "paid_chapters.allow_creator_custom_price"
  | "paid_chapters.default_free_preview_percent"
  | "early_access.enabled"
  | "early_access.default_coin_price"
  | "early_access.default_free_after_hours"
  | "early_access.min_coin_price"
  | "early_access.max_coin_price"
  | "early_access.allow_creator_custom_price"
  | "early_access.max_early_access_days"
  | "vip_subscription.enabled"
  | "vip_subscription.default_price_vnd"
  | "vip_subscription.default_duration_days"
  | "vip_subscription.default_coin_bonus_amount"
  | "vip_subscription.mock_purchase_enabled"
  | "fan_club.enabled"
  | "fan_club.min_coin_price"
  | "fan_club.max_coin_price"
  | "fan_club.default_duration_days"
  | "fan_club.creator_percent"
  | "fan_club.allow_story_specific_club"
  | "fan_club.requires_creator_approval"
  | "rewarded_ads.enabled"
  | "rewarded_ads.provider_mock_enabled"
  | "rewarded_ads.reward_coin_amount"
  | "rewarded_ads.daily_limit_per_user"
  | "rewarded_ads.cooldown_minutes"
  | "rewarded_ads.min_watch_seconds"
  | "rewarded_ads.bonus_coin_expires_days"
  | "rewarded_ads.allowed_use_for_paid_chapters"
  | "rewarded_ads.allowed_use_for_tips"
  | "supporter_ranking.enabled"
  | "earning_author_ranking.enabled"
  | "creator_bonus_pool.enabled"
  | "sponsored_challenge.enabled"
  | "brand_campaigns.enabled"
  | "originals_enabled"
  | "payout.enabled"
  | "payout.hold_revenue_enabled"
  | "payout.manual_review_required"
  | "payout.min_withdraw_amount_vnd"
  | "payout.hold_days"
  | "payout.kyc_required"
  | "payout.allowed_methods"
  | "payout.processing_note"
  | "payout.withdrawal_fee_enabled"
  | "payout.withdrawal_fee_percent"
  | "payout.withdrawal_fee_fixed_vnd"
  | "payout.withdrawal_pin_required"
  | "payout.allow_restricted_accounts"
  | "payout.allow_withdraw_quality_warning"
  | "payout.max_requests_per_day"
  | "payout.max_amount_vnd_per_day"
  | "finance.payment_processing_fee_percent"
  | "finance.payment_processing_fixed_fee_vnd"
  | "finance.tax_percent"
  | "fraud.enabled"
  | "fraud.delay_creator_revenue_enabled"
  | "fraud.block_bonus_coin_withdrawal"
  | "fraud.max_daily_tip_amount_per_user"
  | "fraud.max_daily_unlock_amount_per_user"
  | "fraud.lock_revenue_on_severe_report"
  | "fraud.lock_revenue_on_low_quality"
  | "fraud.lock_revenue_on_creator_warning"
  | "fraud.lock_revenue_on_refund_dispute"
  | "fraud.revenue_lock_days"
  | "fraud.allow_admin_manual_revenue_unlock";

export type MonetizationSettingDefinition = {
  key: MonetizationConfigKey;
  label: string;
  description: string;
  group: MonetizationSettingGroup;
  defaultValue: MonetizationSettingValue;
  inputType: MonetizationSettingInputType;
  isPublic: boolean;
  min?: number;
  max?: number;
  step?: number;
};

export type MonetizationSettingsMap = Record<
  MonetizationConfigKey,
  MonetizationSettingValue
>;

export type MonetizationConfig = {
  settings: MonetizationSettingsMap;
  updatedAt: string | null;
};

export type MonetizationSettingRow = {
  id: string;
  key: string;
  value: MonetizationSettingValue;
  description: string | null;
  is_public: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type RevenueShareConfig = {
  creatorPercent: number;
  platformPercent: number;
  platformFeePercent: number;
};
