# Content Origin & Monetization Policy (ChapMee)

Tài liệu này audit hiện trạng và thiết kế hệ thống **Content Origin** (Truyện Sáng Tác vs Truyện Dịch) cùng **Monetization Policy Gate** nhằm đảm bảo:

1. Truyện Sáng Tác có thể bán theo đầy đủ module monetization nếu creator đủ điều kiện và admin không khóa.
2. Truyện Dịch **bắt buộc miễn phí đọc 100%**, không bán chương/full bundle, không coin-lock; chỉ cho ads/tips nếu **quyền khai thác đã được admin xác minh** (hoặc admin policy cho phép).
3. Không rewrite app diện rộng: chỉ thiết kế schema, policy rules và “điểm gác” cần cập nhật runtime sau này.

## Current State Audit
## Prompt 6 Update: Fairness for Ranking/Discover/Reels

Đã bổ sung layer fairness theo `content_origin` để tránh truyện dịch chiếm toàn bộ exposure:

- Candidate pools mở rộng: `original_pool`, `translation_pool`, `mixed_pool`.
- Feed candidates mang thêm metadata origin để explainability: `contentOrigin`, `rightsStatus`, `scoreBase`, `boostScore`, `selectionReason`.
- Reels/Discover áp dụng quota bằng `content_origin` mix settings, có fallback khi thiếu candidate.
- Discover có thêm các section phân tách:
  - Truyện Sáng Tác nổi bật
  - Truyện Dịch miễn phí
  - Top Truyện Sáng Tác
  - Top Truyện Dịch
  - Được Đề Cử
- Search thêm filter origin (`all`, `original`, `translation`) và có balance top results khi fairness bật.
- Algorithm settings được đảm bảo có default keys cho content-origin fairness để admin có thể điều chỉnh trên trang quản trị thuật toán.

### Prompt 6 Acceptance Audit (1→9)

1. **Separate candidate pools for original/translation**: **PASS**
   - `original_pool`, `translation_pool`, `mixed_pool` đã được thêm trong feed mixer và có weight mặc định theo surface.
2. **Discover/Reels fairness quota để tránh translation monopoly**: **PASS**
   - Quota mix theo `content_origin` đã được áp dụng ở pipeline chọn candidate và page slicing Reels.
3. **Discover sections tách rõ 2 xương sống nội dung**: **PASS**
   - Có section riêng cho originals/translations/top-by-origin, và đã thêm badge hiển thị rõ “Sáng tác / Dịch miễn phí / Boost”.
4. **Search có filter + origin balancing**: **PASS**
   - Search đã hỗ trợ filter origin và re-balance top results theo config fairness.
5. **Explainability (selection reason) lưu theo item**: **PASS**
   - Feed request logs đã lưu `selection_reason`, `content_origin`, `rights_status` cho từng selected item.
6. **Admin auditability cho origin mix**: **PASS**
   - Dashboard fairness có panel “Origin mix logs gần đây” hiển thị tỉ lệ original/translation + notes/reason aggregate theo request.
7. **UI công khai không đẩy CTA paid cho translation**: **PASS (đã tăng cường thêm)**
   - Story cards/Discover cards cho translation hiển thị CTA đọc miễn phí và badge nguồn gốc rõ ràng.
8. **Admin-configurable settings cho origin fairness**: **PASS**
   - Keys fairness origin đã được seed/default trong algorithm settings để chỉnh runtime.
9. **Build/typecheck toàn bộ sau khi hoàn thiện**: **PASS**
   - `npm run build` thành công sau toàn bộ chỉnh sửa Prompt 6.

## Prompt 7 Update: Backfill, Validation & Safety Test

Đã bổ sung lớp kiểm chứng cuối để tránh lỗ hổng monetization cho truyện dịch:

- Script backfill: `scripts/backfill-content-origin.ts`
  - Dry-run mặc định, chỉ ghi khi có `--apply`.
  - Chỉ cập nhật stories thiếu `content_origin`, không overwrite record đã hợp lệ.
- Script validation: `scripts/validate-content-origin-policy.ts`
  - Assert đầy đủ case original/translation cho chapters/bundle/tips/ads và reason codes.
- Local seed tăng coverage demo:
  - Đảm bảo có 3 original + 3 translation với state rights/policy khác nhau.
  - Dùng metadata nguồn giả lập an toàn (demo), không dùng nội dung copyrighted thật.
- Báo cáo xác thực: `docs/CONTENT_ORIGIN_VALIDATION_REPORT.md`.


### 1) Cơ chế monetization hiện tại đang gate như thế nào?

Trong codebase hiện tại, “trả phí / mở khóa” được quyết định chủ yếu bởi:

1. **Monetization feature toggles (config)**: `lib/monetization/config.ts` → `getMonetizationConfig()`
2. **Cài đặt monetization theo truyện**:
   - Bảng `story_monetization_settings`
   - Mapping ở `lib/data/story-monetization.ts`
3. **Cài đặt monetization theo chương (episode)**:
   - Bảng `chapter_monetization_settings`
   - Mapping ở `lib/data/chapter-monetization.ts`
4. **Unlock records**:
   - `chapter_unlocks` (mở khóa chương)
   - `story_full_access_unlocks` (mở khóa trọn bộ)
   - `early_access_unlocks` (đọc sớm)
5. **Điều kiện “creator có được phép kiếm tiền không”**: `isCreatorMonetizationAllowed()` (import nhiều nơi trong lib/monetization/* và lib/creator-access/*).

#### a) Paid chapters (mở khóa từng chương)

- UI/Reader gate nằm ở trang chapter reader:
  - `app/stories/[slug]/episodes/[episodeNumber]/page.tsx`
- Logic quyết định `locked/free` nằm ở:
  - `lib/monetization/paid-chapters.ts`
    - `getPaidChapterReaderState()` → trả về `locked`, `coinPrice`, `purchaseEnabled/purchaseMode`, `walletBalance`
    - `unlockPaidChapterAction()` → trừ coin + tạo unlock record + ghi nhận revenue
- UI gate component:
  - `components/monetization/PaidChapterGate.tsx`
  - `components/monetization/UnlockChapterButton.tsx`

Điểm quan trọng: `getPaidChapterReaderState()` hiện kiểm tra:
- `paid_chapters.enabled` (config)
- `chapter_monetization_settings.is_paid` + free chapters floor (`paid_chapters.free_chapters_required`)
- unlock status (`story_full_access_unlocks`, `chapter_unlocks`)
- `isCreatorMonetizationAllowed()`

**Hiện tại chưa có check “content origin = translation”**.

#### b) Full story / bundle (mua trọn bộ)

- Logic mở khóa trọn bộ:
  - `lib/monetization/unlock-story-full-access.ts` → `unlockStoryFullAccessAction()`
- Gating hiện tại:
  - monetization + coin + creator_monetization + `paid_chapters.enabled`
  - `story_monetization_settings.full_access_enabled` và `full_access_price_coin`
  - `isCreatorMonetizationAllowed(creatorUserId)`

**Hiện tại cũng chưa check “content origin = translation”**.

#### c) Early access (đọc sớm)

- Gate và logic:
  - `lib/monetization/early-access.ts`
    - `getEarlyAccessReaderState()` quyết định locked/free preview
    - `unlockEarlyAccessAction()` trừ coin + tạo unlock record
- UI gate:
  - `components/monetization/EarlyAccessGate.tsx`
  - `components/monetization/UnlockEarlyAccessButton.tsx`

**Hiện tại cũng chưa có kiểm tra content origin**.

#### d) Tips (ủng hộ tác giả)

- Action:
  - `lib/monetization/tips.ts` → `sendSupportAction()`
- Kiểm tra gating hiện tại:
  - config: `tips.enabled` / `virtual_gifts.enabled`
  - `isCreatorMonetizationAllowed(toCreatorUserId)`
  - validate “nội dung có ẩn/reject không” (hidden/rejected) thông qua `validateContentMonetizable()`

**Hiện tại chưa có policy “translation rights verified mới cho tips/ads”**.

#### e) Rewarded ads (quảng cáo thưởng coin)

- Action & gate:
  - `lib/monetization/rewarded-ads.ts`
  - config: `rewarded_ads.enabled`, `rewarded_ads.allowed_use_for_paid_chapters`, `rewarded_ads.allowed_use_for_tips`

**Hiện tại không gắn với origin/rights per story**.

#### f) Ads revenue share (chia doanh thu quảng cáo cho creator)

Codebase có module `lib/creator-ad-revenue/*` và các entrypoint liên quan reconciliation/audit. Trong thiết kế policy, cần gate ở:
- lúc xác định creator đủ điều kiện nhận share
- lúc ghi nhận/settle revenue theo module quảng cáo

Vì audit này tập trung vào policy gate, tài liệu chỉ “chỉ ra điểm cần gác”; runtime cụ thể sẽ được triển khai sau.

#### g) “Originals / IP Deals” (đối tượng đã có verification hiện tại)

Hiện tại có module riêng để admin xác nhận “Originals / IP deals”:
- Config toggle:
  - `monetization.enabled` + `originals_enabled` (xử lý bởi `lib/monetization/originals.ts`)
- Admin UI:
  - `app/admin/originals/page.tsx`
- Data model:
  - `story_originals_status`, `ip_deals`, `ip_deal_financials`

Module này hiện **không thay thế** requirement cho “Truyện Dịch”; tài liệu đề xuất tách logic translation rights để tránh nhầm lẫn giữa 2 khái niệm pháp lý/kiểm chứng.

### 2) Discover/Catalog đang dùng monetization settings như nào?

Trong discover/catalog, access filter phụ thuộc vào:

- `lib/discovery/resolve-catalog-story-ids.ts`
  - `filterByAccess()`
    - đọc `story_monetization_settings` (full_access_enabled, free_first_chapters_count, auto_pricing_enabled)
    - đọc `chapter_monetization_settings` để suy ra “có paid chapters không”

Hệ quả: nếu một story “translation” đang còn `story_monetization_settings`/`chapter_monetization_settings` ở trạng thái paid thì catalog có thể coi đó là “paid story”. Vì vậy thiết kế policy bắt buộc:

1. translation content **không được phép** bật paid_chapters/full_access ở studio (server-side gate)
2. và/hoặc catalog runtime cần check thêm `content_origin/monetization_policy` để tránh sai phân loại hiển thị.

## Route / Module Audit (những điểm liên quan bắt buộc)

### Studio tạo/sửa truyện & cài monetization
- `app/studio/(workspace)/monetization/page.tsx`
- `components/studio/monetization/StoryMonetizationSettingsSheet.tsx` (UI bật/tắt trả phí & bán trọn bộ)
- `lib/studio/save-story-monetization-settings.ts`
- `lib/studio/monetization-stories-query.ts`
- `components/studio/monetization/MonetizationFullAccessTab.tsx` (bulk enable/disable trọn bộ)

### Story detail
- `app/stories/[slug]/page.tsx`
  - hiện tại dùng `getMonetizationConfig()` để hiển thị badge/feature (ví dụ Originals badge)

### Chapter reader / pay gate
- `app/stories/[slug]/episodes/[episodeNumber]/page.tsx`
  - gọi:
    - `lib/monetization/paid-chapters.ts` → `getPaidChapterReaderState()`
    - `lib/monetization/early-access.ts` → `getEarlyAccessReaderState()`
  - render:
    - `components/monetization/PaidChapterGate.tsx`
    - `components/monetization/EarlyAccessGate.tsx`

### Discover / catalog
- `lib/discovery/resolve-catalog-story-ids.ts` (lọc theo access monetization: free/paid/full_access/free_chapters)
- `components/discover/DiscoverFeed.tsx` (UI phần feed)

### Ranking / BXH
- Routes: `app/rankings/page.tsx`
- Core ranking libs: `lib/ranking/*`, và một phần metrics/pipeline

Lưu ý: ranking “revenue-based” phụ thuộc vào transactions/revenue được tạo ra từ các module monetization (paid chapters/full access/tips/ads share). Vì translation phải bị chặn monetization, ranking nhờ đó sẽ không bị “có revenue” cho translation.

### Reels
- Routes: `app/reels/page.tsx`
- Components: `components/reels/*`

Reels chủ yếu là feed surface; không thấy một gate monetization “paid/unpaid” rõ ràng trong reels components từ audit từ khóa. Policy translation chủ yếu xử lý pay gate ở reader và monetization earning modules.

### Admin: monetization settings / creator monetization / originals
- `app/admin/monetization-settings/page.tsx`
- `app/admin/monetization/page.tsx`
- `app/admin/creators/monetization/page.tsx`
- `lib/admin/monetization.ts`
- `app/admin/originals/page.tsx` (module verification hiện có)
- `lib/monetization/originals.ts`, `lib/data/originals.ts`

### Audit log cho thay đổi nhạy cảm
- `lib/audit/log-admin-action.ts` (ghi `admin_audit_logs`)

Trong thiết kế translation rights, mọi thay đổi rights_status / monetization_policy cần tạo audit entry tương ứng.

## Proposed Schema (tách “Truyện Sáng Tác” và “Truyện Dịch”)

### 1) Mục tiêu schema

1. Mỗi story có thể được phân loại: `original` hoặc `translation`.
2. Với translation: lưu đủ metadata phục vụ admin verification và quyết định monetization policy.
3. Tránh phá vỡ monetization hiện tại: giữ `story_monetization_settings` và `chapter_monetization_settings` cho paid/or free modules; nhưng gate mới sẽ ngăn translation không thể “bật paid”.

### 2) Đề xuất fields

#### A. Đề xuất thêm vào `stories` (hoặc bảng liên quan 1-1)

- `content_origin` (enum/alias):
  - `original`
  - `translation`
- `original_language` (nullable, ISO language code hoặc tự do theo business)
- `translated_language` (nullable)
- `translator_profile_id` (nullable, FK tới profile nếu đã có)

> Lý do: `content_origin` cần có ở truy vấn nhanh để gate reader/catalog.

#### B. Đề xuất bảng riêng cho rights metadata

`story_translation_rights` (1-1 với story, chỉ dùng khi `content_origin = translation`)

- `translation_type`:
  - `official_license`
  - `creator_authorized`
  - `public_domain`
  - `creative_commons`
  - `fan_translation`
  - `unknown`
- `rights_status`:
  - `verified`
  - `pending_review`
  - `unverified`
  - `rejected`
  - `expired`
- `monetization_policy`:
  - `full` (phù hợp nếu admin cho phép tất cả module)
  - `free_only` (khóa mọi monetization trực tiếp)
  - `ads_tips_allowed` (cho ads/tips nhưng không cho paid chapters/bundle)
  - `no_monetization` (default an toàn)
- Metadata bổ sung:
  - `source_title`
  - `source_author_name`
  - `source_url`
  - `source_platform`
  - `license_note`
  - `license_document_media_id` (file ở media_assets)
  - `rights_verified_by_admin_id`
  - `rights_verified_at`
  - `rights_expires_at`
  - `rights_review_note`

#### C. Các cờ tính toán / lưu rõ

Để tránh phụ thuộc vào việc “tính policy” mỗi request phức tạp, có thể lưu thêm các cờ dẫn xuất (hoặc cache/materialized):

- `can_sell_chapters`
- `can_sell_story_bundle`
- `can_receive_tips`
- `can_share_ads_revenue`
- `can_join_boost_campaign` (tuỳ policy)
- `must_be_free_to_read`

**Khuyến nghị triển khai**: bắt đầu bằng computed-from-rights_status + admin toggle (không cần runtime phức tạp), và sau đó có thể materialize/caching nếu performance cần.

### 3) Mapping policy ↔ gate hiện tại

Các gate hiện tại đang dựa trên:
- `story_monetization_settings.full_access_enabled`
- `chapter_monetization_settings.is_paid`

Với thiết kế mới, cần thêm lớp gate:

1. Nếu `content_origin = translation` và `monetization_policy ∈ {free_only, no_monetization}`:
   - `must_be_free_to_read = true`
   - force `getPaidChapterReaderState.locked = false`
   - force `getEarlyAccessReaderState.locked = false`
   - chặn các unlock actions: `unlockPaidChapterAction`, `unlockStoryFullAccessAction`, `unlockEarlyAccessAction` trả error/policy denied
2. Nếu `monetization_policy = ads_tips_allowed`:
   - ads/tips có thể được bật theo `rights_status = verified` và admin toggle
   - nhưng vẫn `can_sell_chapters = false`, `can_sell_story_bundle = false`

## Policy Matrix (Original vs Translation)

| Operation | Truyện Sáng Tác (`original`) | Truyện Dịch (`translation`) |
|---|---|---|
| Bán chương (paid chapters) | Cho phép nếu creator đã bật ở Studio + config paid_chapters bật + admin không khóa | **Không cho phép** (`can_sell_chapters = false`) |
| Bán full story / bundle | Cho phép nếu `story_monetization_settings.full_access_enabled` bật + config cho phép + creator đủ điều kiện | **Không cho phép** (`can_sell_story_bundle = false`) |
| Coin unlock (mở khóa bằng coin) | Cho phép theo đúng paid_chapter/full_access/early_access unlock actions | **Bắt buộc chặn** (`must_be_free_to_read = true`) |
| Tips | Cho phép theo `tips.enabled` + creator đủ điều kiện (và module bật) | Chỉ cho phép khi `rights_status = verified` và `monetization_policy = ads_tips_allowed` (hoặc admin policy cho phép) |
| Ads revenue share | Cho phép theo rewarded ads / ad revenue share + creator eligibility | Chỉ cho phép khi `rights_status = verified` và admin policy cho phép; default **no revenue share** |
| Boost / đề cử | Cho phép theo boost settings nếu admin bật | Tuỳ thiết kế: có thể cho boost nếu không tạo monetization revenue; nếu admin muốn thận trọng thì default off cho translation |

## Proposed Policy Gate Points (server-side)

### 1) Reader pay gate

Enforce tại:
- `lib/monetization/paid-chapters.ts`
  - `getPaidChapterReaderState()` → nếu translation + must_be_free_to_read thì return `{ locked: false }` bất chấp `chapter_monetization_settings.is_paid`
  - `unlockPaidChapterAction()` → policy deny (không trừ coin)
- `lib/monetization/unlock-story-full-access.ts`
  - policy deny nếu translation và monetization không được phép
- `lib/monetization/early-access.ts`
  - policy deny / return unlocked nếu translation

### 2) Tips/Support

Enforce tại:
- `lib/monetization/tips.ts` → `validateContentMonetizable()`
  - thêm check translation rights:
    - nếu `content_origin=translation` và rights_status không verified hoặc monetization_policy không cho phép tips → chặn

### 3) Ads revenue share

Enforce tại module chia sẻ/eligibility:
- `lib/creator-ad-revenue/*` (điểm xác định eligibility + ghi nhận revenue)
  - policy deny cho translation khi rights_status không verified / monetization_policy không cho phép

### 4) Studio & Admin

Enforce tại save/update:
- `lib/studio/save-story-monetization-settings.ts`
- `lib/studio/*` actions liên quan:
  - bật/ tắt `paidEnabled`, `bundleEnabled`, và cập nhật `story_monetization_settings`/`chapter_monetization_settings`

Quy tắc:
- Nếu `content_origin=translation`:
  - UI có thể ẩn/disable, nhưng **backend bắt buộc chặn** mọi update monetization settings liên quan paid chapters/full access.

## Studio Flow (đề xuất)

1. Creator tạo story:
   - chọn `content_origin`
   - nếu chọn `translation` → bắt buộc nhập đủ metadata translation rights (xem docs policy bên dưới)
2. Khi `rights_status = pending_review`:
   - Studio UI cho phép lưu draft translation metadata
   - nhưng monetization toggles (paid chapters/full access) **không được phép bật** (server-side deny)
3. Admin review:
   - cập nhật `rights_status` và `monetization_policy`
4. Sau khi `verified`:
   - nếu `monetization_policy = ads_tips_allowed`: cho phép bật ads/tips (tuỳ module)
   - nếu admin chọn `free_only`: vẫn chỉ miễn phí đọc (ads/tips bị chặn)

## Admin Flow (đề xuất)

1. Danh sách translation stories cần review:
   - filter `rights_status in (pending_review, unverified)` (tuỳ workflow)
2. Actions:
   - `approve → verified` (ghi rights_expires_at nếu có)
   - `reject → rejected` (ghi rights_review_note)
   - `expire → expired`
   - optional: `reset → unverified`
3. Admin setting/toggle điều khiển policy:
   - admin decide khi nào translation cho phép `ads_tips_allowed` (hoặc “always no monetization until verified” làm default an toàn)
4. Audit log:
   - mọi thay đổi rights_status/monetization_policy gọi `lib/audit/log-admin-action.ts`

## Public UI Flow

Với `content_origin = translation`:

1. Chapter reader:
   - không hiển thị PaidChapterGate/EarlyAccessGate
   - reader luôn lấy `readerSource.episode.content` (no pay preview)
2. Full story/bundle:
   - không hiển thị UI mở khóa trọn bộ; các action unlock trả policy deny
3. Support/tips:
   - hiển thị button tips chỉ khi policy cho phép (ads_tips_allowed + rights verified)
4. Ads:
   - placement có thể hiển thị theo module ads, nhưng doanh thu chia sẻ cho creator chỉ khi policy cho phép.

## Ranking / Discover Flow

1. Discover/catalog access filter:
   - hiện `filterByAccess()` dựa trên `story_monetization_settings` & `chapter_monetization_settings`
   - với thiết kế mới, cần đảm bảo:
     - translation không thể bật paid settings từ Studio
     - và/hoặc runtime `resolve-catalog-story-ids` check `content_origin/monetization_policy` để không đưa translation vào nhóm “paid”
2. BXH:
   - revenue-based ranking sẽ tự “không có revenue” nếu translation bị chặn tips/ads revenue share và paid unlock actions

## Migration Plan (an toàn, không phá dữ liệu)

Mục tiêu migration là **không “tự gán sai”** toàn bộ existing stories, tránh làm mất monetization trước đây.

### Giai đoạn 1: Add fields/table nullable + default an toàn

1. Thêm cột `stories.content_origin` nullable (hoặc default `'original'` tùy cách triển khai)
2. Thêm bảng `story_translation_rights` nullable (hoặc tạo nhưng để trống cho original)
3. Default cho existing stories:
   - `content_origin = original`
   - monetization behavior giữ nguyên (backward compatibility)

> Không tự gán translation cho dữ liệu hiện tại, vì chưa có metadata origin/rights để phân loại đáng tin.

### Giai đoạn 2: Backfill cho demo/local (tuỳ môi trường)

- Nếu seed/demo data chỉ phục vụ local dev, có thể thêm script classify theo “bên nguồn” trong data seed.
- Nhưng cần ghi rõ trong docs/seed: data origin là demo, không dùng cho policy thật.

### Giai đoạn 3: Admin review &逐步 chuyển đổi

- Admin đánh dấu và xác minh từng story translation.
- Khi story chuyển sang translation:
  - server-side gate sẽ chặn mọi monetization paid actions trong tương lai
  - không xoá unlock records cũ để tránh mất dữ liệu; có thể thêm logic revoke/hold theo chính sách (được đề xuất ở phần “Risk notes”).

### Giai đoạn 4: Bổ sung audit actions & validation

- Thêm action types audit cho translation rights updates
- Bổ sung validation checklist (xem bên dưới)

## Risk Notes

1. **Risk “đang bán rồi mới chuyển thành translation”**:
   - Nếu chuyển origin từ original → translation, cần quyết định policy cho unlocks/revenue đã phát sinh.
   - Khuyến nghị: không xoá unlocks đã tồn tại; chỉ chặn monetization cho future transactions.
2. **Catalog sai nhóm paid**:
   - Do `resolve-catalog-story-ids` đang dựa vào paid settings tables.
   - Cần đảm bảo translation không thể bật paid settings + bổ sung check tại filter runtime.
3. **Legal/DMCA mismatch**:
   - “Free to read” không đồng nghĩa “được monetize”.
   - Default policy phải là `no_monetization` hoặc `free_only` cho translation khi `rights_status != verified`.
4. **Performance**:
   - Reader gate gọi nhiều query (monetization config + setting + unlock record).
   - Nên cache policy lookup theo `storyId` (ít nhất trong request).

## Validation Checklist

1. `pnpm build` pass.
2. Policy helper (sẽ implement sau) đảm bảo:
   - translation `pending/unverified/rejected/expired` → reader locked=false, và unlock actions bị policy deny
   - translation `verified + ads_tips_allowed` → tips/ads revenue share được phép, nhưng paid chapters/bundle vẫn bị chặn
3. Regression:
   - existing original stories vẫn hoạt động monetization như trước
4. Discover:
   - translation không xuất hiện trong nhóm paid access filter
5. Admin:
   - thay đổi rights_status/monetization_policy tạo entry trong `admin_audit_logs`
6. Security:
   - tất cả chặn monetization phải ở server-side (không chỉ frontend disable UI)

## Prompt 2 Implementation Notes

### Implemented schema fields

Migration `drizzle/0020_content_origin_policy.sql` đã thêm vào `public.stories`:

- `content_origin`
- `translation_type`
- `rights_status`
- `monetization_policy`
- `original_language`
- `translated_language`
- `source_title`
- `source_author_name`
- `source_url`
- `source_platform`
- `translator_profile_id`
- `license_note`
- `license_document_media_id`
- `rights_verified_by_admin_id`
- `rights_verified_at`
- `rights_expires_at`
- `rights_review_note`
- `must_be_free_to_read`
- `can_sell_chapters`
- `can_sell_story_bundle`
- `can_receive_tips`
- `can_share_ads_revenue`
- `can_join_boost_campaign`

Đồng thời migration thêm check constraints cho enum-like values và seed default `app_settings.key = content_origin_policy_settings`.

### Policy engine functions implemented

Đã thêm module:

- `lib/content-origin/content-origin-types.ts`
- `lib/content-origin/content-origin-policy.ts`
- `lib/content-origin/load-story-origin-policy.ts`
- `lib/settings/content-origin-policy-settings.ts`

Các hàm chính:

- `getStoryContentOrigin`
- `isOriginalStory`
- `isTranslatedStory`
- `getStoryMonetizationCapabilities`
- `assertCanSellChapter`
- `assertCanSellStoryBundle`
- `assertCanReceiveTips`
- `assertCanShareAdsRevenue`
- `assertCanUseCoinUnlock`
- `assertCanJoinBoostCampaign`
- `getStoryOriginBadge`
- `getStoryFreeReadLabel`

### Server-side guard hooks added

Đã gắn policy guard vào:

- `lib/monetization/paid-chapters.ts`
- `lib/monetization/early-access.ts`
- `lib/monetization/unlock-story-full-access.ts`
- `lib/monetization/tips.ts`
- `lib/boost/get-boost-eligibility.ts`
- `lib/studio/save-story-monetization-settings.ts`
- `lib/studio/update-story-monetization.ts`

Các guard này chặn trường hợp translation cố bật paid chapters / bundle / coin unlock hoặc nhận tips khi policy không cho phép.

### Validation examples script

Đã thêm script test nhanh policy:

- `scripts/test-content-origin-policy.ts`

Cases gồm:

- original story
- translation unverified
- translation verified + ads_tips_allowed
- translation rejected


