# Translation Rights Policy (ChapMee)

Tài liệu này mô tả policy “bản quyền/quyền khai thác” cho **Truyện Dịch** nhằm:

1. Đảm bảo **translation luôn miễn phí đọc 100%** (không coin lock / không bán chương / không bán bundle).
2. Tránh nhầm lẫn: “được đọc miễn phí” không đồng nghĩa “được phép monetize”.
3. Chỉ bật **ads revenue share** và **tips** cho translation khi **quyền khai thác đã được admin xác minh** (hoặc admin cấu hình policy cho phép theo business).
4. Mọi thay đổi nhạy cảm về rights/policy cần audit log.

## 1) Khái niệm

### Truyện Dịch (translation)
Là story bản dịch/chuyển ngữ từ nguồn nước ngoài hoặc tác phẩm khác.

### Rights metadata
Thông tin về:
- nguồn (source) và phạm vi quyền dịch/quyền khai thác
- tình trạng xác minh (rights_status)
- giới hạn thời gian (rights_expires_at)
- ghi chú pháp lý/đối chiếu

Trong codebase hiện tại chưa có khái niệm translation rights riêng; vì vậy tài liệu này là thiết kế đề xuất để tránh “hard-code” ở frontend và để runtime gate có đủ dữ liệu.

## 2) Nguyên tắc cốt lõi

1. **Free-to-read là quyền truy cập trải nghiệm, không phải quyền bản quyền.**
   - Translation luôn được đọc miễn phí để giảm rào cản người dùng.
2. **Monetization là quyền khai thác.**
   - Ads/tips chỉ bật khi admin xác minh quyền khai thác đủ điều kiện.
3. **Default safe là “no monetization”.**
   - Nếu rights chưa đủ bằng chứng (pending/unverified) hoặc bị từ chối (rejected/expired) → bắt buộc `no_monetization`.
4. **Admin xác minh là nguồn sự thật.**
   - Policy gate luôn dựa vào DB fields (rights_status + monetization_policy + admin toggles), không dựa vào logic hard-coded ở UI.

## 3) Các loại quyền translation (translation_type)

Đề xuất các giá trị:
- `official_license`: có giấy phép/thoả thuận chính thức
- `creator_authorized`: được tác giả/đơn vị quyền tác giả cho phép
- `public_domain`: tác phẩm thuộc public domain
- `creative_commons`: dùng theo CC (cần check đúng điều khoản thương mại/diễn giải)
- `fan_translation`: fan translation (chỉ dùng khi quyền dịch/quyền khai thác được xác nhận)
- `unknown`: không rõ nguồn/không đủ bằng chứng

## 4) Rights status lifecycle (rights_status)

Đề xuất:
- `unverified`: mặc định mới tạo/nhập metadata nhưng chưa review
- `pending_review`: admin đang xem xét bằng chứng
- `verified`: quyền khai thác đã đủ để bật ads/tips theo policy
- `rejected`: admin từ chối (thiếu bằng chứng hoặc không đủ quyền)
- `expired`: quyền hết hạn → chuyển lại `no_monetization` (tuỳ business có thể tiếp tục free-only)

### Khi nào “verified” mới cho ads/tips?

`verified` chỉ cho phép ads/tips khi **monetization_policy** (được lưu rõ ở DB) có giá trị:
- `ads_tips_allowed`

Không tự động coi `verified` = “cho bán chương/bundle”. Bản dịch luôn không bán chương/bundle theo requirement.

## 5) Khi nào translation bị bắt buộc “free-only/no monetization”

Translation bắt buộc:
- `must_be_free_to_read = true`
- `can_sell_chapters = false`
- `can_sell_story_bundle = false`
- coin unlock = false
- paid bundle = false

Và:
- `can_receive_tips = false` nếu `rights_status != verified` hoặc `monetization_policy != ads_tips_allowed`
- `can_share_ads_revenue = false` tương tự

Kết luận: **pending/unverified/rejected/expired không bao giờ được monetize trực tiếp**.

## 6) Admin verification workflow (đề xuất)

### 6.1. Tạo/submit yêu cầu rights

Nguồn metadata (tối thiểu) admin cần để review:
- `source_title`
- `source_author_name`
- `source_url` (hoặc bằng chứng nguồn công khai)
- `source_platform` (where the source came from / access channel)
- ít nhất 1 trong:
  - `license_note` (mô tả điều khoản)
  - `license_document_media_id` (tài liệu/ảnh scan hợp lệ trong media_assets)
- `rights_review_note` (ghi chú nội bộ)

Nếu không đủ dữ liệu:
- rights_status không bao giờ chuyển sang `verified`.

### 6.2. Quy trình review

1. Admin kiểm tra tính hợp lệ của bằng chứng (giấy phép/thư cho phép/CC terms)
2. Admin xác định phạm vi quyền:
   - có cho phép “dịch” không?
   - có cho phép “monetize/ads revenue/tips” không?
   - có giới hạn lãnh thổ/kiểu khai thác không?
3. Admin quyết định:
   - `rights_status = verified` hoặc `pending_review` hoặc `rejected`
4. Nếu có ngày hết hạn → set `rights_expires_at`

### 6.3. Sau khi approved/verified

- `rights_verified_by_admin_id`, `rights_verified_at`
- `monetization_policy`:
  - nếu cho phép ads/tips: `ads_tips_allowed`
  - nếu không: `no_monetization`

### 6.4. Từ chối/expire

- `rejected`: lưu `rights_review_note` nêu lý do
- `expired`: lưu lý do/ghi chú, set `rights_expires_at`

Trong cả 2 case:
- tips/ads revenue share bị tắt cho future monetization
- nhưng policy phải cân nhắc “đã có unlock trước đó” (xem phần Risk Notes trong tài liệu chính)

## 7) Required metadata fields (bắt buộc cho translation)

Đề xuất tối thiểu:
- `original_language`, `translated_language`
- `source_title`, `source_author_name`
- `source_url`, `source_platform`
- `translator_profile_id` (nếu có lưu người dịch trong hệ thống)
- `license_note` hoặc `license_document_media_id`
- `rights_status` (do admin)
- `rights_verified_by_admin_id`, `rights_verified_at`
- `monetization_policy` (do admin config/approval quyết định)

## 8) Copyright / reporting / takedown hooks

Business yêu cầu:
- Có cơ chế báo cáo vi phạm
- Có thể takedown theo quyền thực thi pháp lý.

Đề xuất:
1. Khi có report vi phạm bản quyền:
   - admin có thể đặt `rights_status = rejected` hoặc `expired`
   - hoặc đặt `rights_status = pending_review` trong thời gian xử lý
2. Đồng bộ với policy gate:
   - ngay lập tức tắt tips/ads revenue share (cho các giao dịch mới)
   - bắt buộc reader vẫn free-only (không coin-lock)

Về audit:
- mọi thay đổi rights_status/monetization_policy cần ghi `admin_audit_logs`.
- hiện codebase đã có `lib/audit/log-admin-action.ts` và hệ thống audit log cho actions admin (cần mở rộng type action cho translation rights).

## 9) Policy enforcement points (để runtime gate không “lọt”)

Để đảm bảo requirement “không để truyện dịch bị bán chương/bán bộ”:

1. Reader gates:
   - `lib/monetization/paid-chapters.ts`
   - `lib/monetization/early-access.ts`
2. Unlock actions:
   - `lib/monetization/unlock-story-full-access.ts`
   - `lib/monetization/paid-chapters.ts` (unlockPaidChapterAction)
   - `lib/monetization/early-access.ts` (unlockEarlyAccessAction)
3. Tips:
   - `lib/monetization/tips.ts` (sendSupportAction)
4. Ads revenue share eligibility:
   - module `lib/creator-ad-revenue/*` (eligibility/policy-validation + reconciliation)
5. Studio update:
   - `lib/studio/save-story-monetization-settings.ts` (chặn bật paid/bundle nếu translation)

## 10) Checklist vận hành cho admin

1. Không approve `verified` nếu không có bằng chứng hợp lệ cho:
   - quyền dịch (dịch được)
   - quyền monetize ads/tips (nếu muốn bật)
2. Mọi quyết định approve/reject phải có:
   - ghi `rights_review_note`
   - ghi `rights_verified_by_admin_id` + `rights_verified_at`
3. Nếu quyền hết hạn:
   - cập nhật `rights_expires_at` và chuyển policy về `no_monetization`
4. Audit log phải bắt kịp theo thay đổi nhạy cảm.

## 11) Admin Translation Rights Management (Prompt 4)

Đã bổ sung admin flow quản lý content origin/quyền dịch:

- `/admin/content-origins`
  - tổng quan cards: original/translation/pending/verified/rejected-expired/missing metadata
  - bảng có filter + pagination theo `content_origin`, `rights_status`, `monetization_policy`, trạng thái publish, thiếu metadata
- `/admin/translations`
  - hàng đợi truyện dịch để xử lý quyền
- `/admin/translations/[storyId]`
  - xem metadata nguồn + capabilities từ policy engine
  - action admin: `verified`, `pending_review`, `rejected`, `expired`, `request_more_info`
  - cập nhật `monetization_policy` cho translation (`free_only`, `ads_tips_allowed`, `no_monetization`)
- `/admin/monetization-policies`
  - quản lý `content_origin_policy_settings`
  - khóa cứng `translation_paid_chapters_allowed=false`, `translation_story_bundle_allowed=false`, `translation_coin_unlock_allowed=false`

Mọi action cập nhật ở trên đều ghi `admin_audit_logs` với payload trước/sau (`before_json`, `after_json`) trong `metadata`.

