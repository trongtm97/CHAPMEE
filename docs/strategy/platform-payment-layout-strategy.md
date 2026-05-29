# ChapMee Platform / Payment / Layout Strategy

## Product Direction

- ChapMee uu tien Web/PWA trong giai doan dau.
- Mobile PWA giu trai nghiem app-like, tap trung doc truyen va tac vu nhanh.
- Desktop web duoc toi uu cho SEO, reading va dieu huong tren man hinh lon.
- Android/iOS native app la huong phat hanh tiep theo len Google Play va Apple App Store.

## Platform Modes

ChapMee chuan hoa 4 platform modes:

- `web_desktop`
- `web_mobile_pwa`
- `android_app_future`
- `ios_app_future`

Moi platform mode can co strategy config gom:

- `platform_key`
- `layout_mode`
- `payment_mode`
- `payment_provider`
- `show_bottom_nav`
- `show_desktop_header`
- `allow_external_web_payment`
- `allow_in_app_purchase`
- `notes`

## Default Layout + Payment Strategy

- `web_desktop`
  - `layout_mode = desktop_website`
  - `payment_mode = web_payment`
  - `payment_provider = sepay`
  - `show_desktop_header = true`
  - `show_bottom_nav = false`
- `web_mobile_pwa`
  - `layout_mode = mobile_app_like`
  - `payment_mode = web_payment`
  - `payment_provider = sepay`
  - `show_bottom_nav = true`
  - `show_desktop_header = false`
- `android_app_future`
  - `layout_mode = native_or_pwa_app_like`
  - `payment_mode = store_billing` (co the chuyen `consumption_only` theo policy)
  - `payment_provider = google_play_billing`
  - `show_bottom_nav = true`
- `ios_app_future`
  - `layout_mode = native_or_pwa_app_like`
  - `payment_mode = store_billing` (co the chuyen `consumption_only` theo policy)
  - `payment_provider = apple_iap`
  - `show_bottom_nav = true`

## Payment Channels Foundation

Nen tang payment channels gom:

- `web_sepay`
- `google_play_billing`
- `apple_iap`
- `manual_admin`

Payment mode foundation:

- `web_payment`
- `store_billing`
- `consumption_only`
- `external_link_eligible`

## Unified Backend and Wallet/Ledger

- Tat ca platforms dung chung backend, user, wallet, ledger, story, chapter va creator revenue.
- Khong tach 2 he thong user/coin rieng cho web va app.
- Channel payment khac nhau nhung dong bo ve chung giao dich noi bo cua ChapMee.

## Admin Config Foundation

Admin config can quan ly nhat quan:

- `platform.web.payment_provider`
- `platform.web_mobile.payment_provider`
- `platform.android.payment_mode`
- `platform.ios.payment_mode`
- `payments.provider_sepay_enabled`
- `payments.provider_google_play_billing_enabled`
- `payments.provider_apple_iap_enabled`
- `revenue_share.calculate_on_net_after_channel_fee`

## Implementation Notes

- Prompt nay chi dat nen type/config/documentation.
- Khong tich hop thanh toan that trong giai doan nay.
- Khong rewrite business logic hien tai.
- Cac prompt tiep theo se trien khai chi tiet layout, SEO, payment flow, va compliance cho app stores.
