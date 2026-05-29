# ChapMee Monetization Config

Monetization foundation cho ChapMee theo nguyên tắc:

- Mặc định `OFF`.
- Chỉ `admin/founder` được bật/tắt và chỉnh cấu hình.
- Không hardcode tỉ lệ chia tiền trong UI/module.
- User-facing chỉ hiển thị money UI khi flag được bật.

## Config keys

### Global

- `monetization.enabled`
- `monetization.test_mode`
- `monetization.show_money_ui_to_users`
- `monetization.show_money_ui_to_creators`

### Coin

- `coin.enabled`
- `coin.purchase_enabled`
- `coin.reward_enabled`
- `coin.display_name`
- `coin.exchange_rate_vnd`
- `coin.min_purchase_amount_vnd`

### Payments

- `payments.enabled`
- `payments.provider_vnpay_enabled`
- `payments.provider_momo_enabled`
- `payments.provider_zalopay_enabled`
- `payments.provider_vietqr_enabled`
- `payments.provider_app_store_iap_enabled`
- `payments.provider_google_play_billing_enabled`

### Creator monetization

- `creator_monetization.enabled`
- `creator_monetization.auto_approval_enabled`
- `creator_monetization.min_followers`
- `creator_monetization.min_reads`
- `creator_monetization.min_chapters`
- `creator_monetization.requires_manual_review`

### Revenue share

- `revenue_share.default_creator_percent`
- `revenue_share.default_platform_percent`
- `revenue_share.tip_creator_percent`
- `revenue_share.tip_platform_percent`
- `revenue_share.paid_chapter_creator_percent`
- `revenue_share.paid_chapter_platform_percent`
- `revenue_share.vip_creator_pool_percent`
- `revenue_share.platform_fee_percent`

### Modules

- `tips.enabled`
- `virtual_gifts.enabled`
- `paid_chapters.enabled`
- `early_access.enabled`
- `vip_subscription.enabled`
- `fan_club.enabled`
- `rewarded_ads.enabled`
- `supporter_ranking.enabled`
- `earning_author_ranking.enabled`
- `creator_bonus_pool.enabled`
- `originals_enabled`

### Payout

- `payout.enabled`
- `payout.manual_review_required`
- `payout.min_withdraw_amount_vnd`
- `payout.hold_days`
- `payout.kyc_required`

### Fraud

- `fraud.enabled`
- `fraud.delay_creator_revenue_enabled`
- `fraud.block_bonus_coin_withdrawal`
- `fraud.max_daily_tip_amount_per_user`
- `fraud.max_daily_unlock_amount_per_user`

## Đọc config an toàn

Sử dụng helper trong `lib/monetization/config.ts`:

- `getMonetizationConfig()` để đọc map config.
- `getMonetizationFlag(key)` để đọc một flag.
- `requireMonetizationEnabled(moduleKey)` để check global/module gate.
- `getRevenueShareConfig(type)` để đọc tỉ lệ chia tiền.
- `shouldShowMoneyUiToUsers()` và `shouldShowMoneyUiToCreators()` cho UI gate.

Tất cả helper có fallback default an toàn nếu DB chưa có row.

## Cách thêm module tiền mới

1. Thêm key mới vào `types/monetization.ts` (`MonetizationConfigKey`).
2. Thêm definition vào `MONETIZATION_SETTING_DEFINITIONS`.
3. Seed default trong migration mới (không sửa migration cũ đã chạy).
4. Gate UI bằng `requireMonetizationEnabled()` hoặc `isMoneyModuleEnabledForUsers()`.
5. Không hardcode tỉ lệ/flag trong component; luôn đọc qua helper.

## Nguyên tắc bắt buộc

- Default OFF cho module monetization.
- Admin controlled, không public tự động.
- Không pay-to-rank.
- Không làm ảnh hưởng trải nghiệm đọc hiện tại khi `monetization.enabled = false`.
