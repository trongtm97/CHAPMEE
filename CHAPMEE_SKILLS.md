# CHAPMEE_SKILLS.md

## 0. Vai trò của AI coding agent

Bạn là AI coding agent hỗ trợ phát triển dự án ChapMee. Hãy hành động như một kỹ sư senior full-stack + product engineer: hiểu nghiệp vụ trước, sửa đúng phạm vi, ưu tiên app chạy ổn định, không phá kiến trúc hiện có, không tự ý làm lại toàn bộ.

Mục tiêu chính: giúp ChapMee trở thành nền tảng giải trí truyện/text có Reels, Discover, Community, Studio cho tác giả, Admin vận hành, kiếm tiền bằng Coin/VIP/tip/quảng cáo/Originals về sau.

## 1. Nguyên tắc làm việc bắt buộc

### 1.1 Không phá app

- Không rewrite toàn bộ app nếu prompt không yêu cầu.
- Không sửa file không liên quan.
- Không đổi tên route, schema, component, field nếu chưa kiểm tra toàn bộ nơi đang dùng.
- Không xóa dữ liệu/logic cũ nếu chưa có migration hoặc fallback rõ ràng.
- Không hard-code dữ liệu cấu hình ở frontend nếu dữ liệu đó thuộc admin settings.
- Luôn ưu tiên MVP chạy được trước, UI polish sau, monetization nâng cao sau.

### 1.2 Luôn kiểm tra trước khi sửa

Trước khi code, phải rà soát:

- Cấu trúc thư mục hiện tại.
- Route/page liên quan.
- Component đang dùng lại.
- Supabase tables/types/functions nếu có.
- API/server actions đang gọi.
- Các nơi import component hoặc dùng schema liên quan.

Sau đó mới sửa nhỏ, có kiểm soát.

### 1.3 Không tự bịa nghiệp vụ

Nếu thiếu thông tin, chọn giải pháp an toàn:

- Tạo placeholder rõ ràng.
- Dùng TODO ngắn gọn ở vị trí cần backend thật.
- Không tự thêm tính năng lớn ngoài prompt.
- Không tạo AI feature nếu không được yêu cầu.

### 1.4 Validation bắt buộc

Sau khi sửa phải chạy tối thiểu:

- `npm run lint` nếu project có.
- `npm run typecheck` nếu project có.
- `npm run build` nếu khả thi.
- Nếu không chạy được, phải báo rõ lỗi và file liên quan.

Không được nói “đã xong” khi build/lint/typecheck đang lỗi do phần vừa sửa.

---

## 2. Kiến trúc sản phẩm ChapMee cần giữ đúng

### 2.1 Tab chính

ChapMee hiện có 4 tab/mobile chính:

1. Reels — xem như trang chủ/default entry.
2. Khám phá / Discover.
3. Cộng đồng / Community.
4. Tôi / Me.

Trang chủ mobile cũ đã được định hướng loại bỏ sạch. Không khôi phục lại Home tab cũ.

### 2.2 Desktop navigation

Desktop có thể có navigation rộng hơn, nhưng phải giữ định hướng:

- Reels là entry chính.
- Khám phá là nơi tổng hợp tìm kiếm, danh mục, bài viết, bảng xếp hạng, nội dung đề xuất.
- Bài viết/blog phải có cửa ngõ rõ ràng ở desktop nav hoặc trong Discover.
- Không nhắc hoặc mô phỏng trực tiếp nền tảng bên ngoài trong UI user-facing.

### 2.3 Reels

- Reels là bề mặt khám phá quan trọng nhất.
- Reels không nhất thiết là video; là trải nghiệm lướt nội dung text/trích đoạn/story teaser.
- Reels có thể do tác giả tạo thủ công.
- Không hard-code giới hạn lướt thấp như 20.
- Comment trong Reels nên mở kiểu overlay/bottom sheet, không phá context tab.

### 2.4 Discover

Discover cần chứa:

- Tìm kiếm.
- Danh mục truyện.
- Thể loại/tag.
- Bảng xếp hạng.
- Bài viết/blog/cẩm nang/thông báo public nếu phù hợp.
- Các section thuật toán đề xuất.

### 2.5 Studio

Studio là khu vực tác giả thống nhất, không dùng lẫn lộn Creater/Creator/Author ở tên route UI nếu không cần.

Studio gồm các nhóm chính:

- Tổng quan.
- Truyện & chương.
- Nháp.
- Lịch đăng.
- Reels.
- Bình luận.
- Thống kê.
- Chất lượng.
- Kiếm tiền.
- Tài chính.
- Mẫu.
- Nhập hàng loạt.
- Hỗ trợ.
- Cài đặt.

---

## 3. Tài khoản, username và URL profile

### 3.1 Một tài khoản duy nhất

ChapMee chỉ có một mô hình tài khoản duy nhất. Admin, tác giả, người đọc là vai trò/capability trên cùng một user account.

Không tạo mô hình tách riêng:

- author profile riêng.
- creator profile riêng.
- pen name/bút danh riêng bắt buộc.
- user profile và creator profile khác nhau.

Nếu cần hiển thị tác giả, lấy từ chính user account.

### 3.2 URL profile bắt buộc

Public profile URL duy nhất của mọi tài khoản:

```text
/@username
```

Không dùng:

```text
/creators/{uuid}
/author/{id}
/tac-gia/{id}
/users/{id}
/profile/{id}
```

Mọi link avatar, tên tác giả, tác giả truyện, bình luận, reels, community đều phải trỏ về:

```text
/@username
```

### 3.3 Username normalization tiếng Việt

Khi sinh username:

- Lowercase.
- Bỏ dấu tiếng Việt đúng.
- Bỏ khoảng trắng.
- Bỏ ký tự lạ.
- Không tự thêm dấu chấm random.
- Chỉ append số khi bị trùng.

Ví dụ:

```text
Bánh Cuốn Nhỏ -> banhcuonnho
Bánh Cuốn Nhỏ bị trùng -> banhcuonnho2
```

Khi user đổi username, username cũ được release nếu policy cho phép.

---

## 4. Link, slug, redirect và mã số

### 4.1 Nguyên tắc URL public

URL public cần ổn định, dễ quản lý, hỗ trợ đổi tiêu đề/slug nhưng không mất truy cập cũ.

Các nội dung có thể đổi tên gồm:

- Truyện.
- Chương.
- Reels.
- Bài viết/blog.
- Thông báo public.
- Danh mục/tag public.

### 4.2 Cấu trúc link có mã số định danh

Ưu tiên cấu trúc giống ý tưởng Shopee: slug có thể thay đổi nhưng mã số cuối quyết định nội dung.

Các `_code` chỉ dùng số, không dùng chữ.

Ví dụ định hướng:

```text
/truyen/{story-slug}-s.{story_code}
/truyen/{story-slug}-s.{story_code}/chuong/{chapter-slug}-c.{chapter_code}
/reels/{reel-slug}-r.{reel_code}
/bai-viet/{post-slug}-p.{post_code}
/thong-bao/{announcement-slug}-a.{announcement_code}
```

Nếu slug sai nhưng code đúng, redirect 301/308 về canonical URL đúng.

### 4.3 Chống vòng lặp redirect

Bắt buộc:

- Nếu URL hiện tại đã là canonical thì không redirect.
- Nếu không tìm thấy code thì 404.
- Nếu code đúng nhưng slug sai thì redirect đúng 1 lần về canonical.
- Không redirect qua lại giữa slug cũ và slug mới.
- Có bảng slug history nếu cần.

---

## 5. Taxonomy truyện

### 5.1 Taxonomy phải do admin quản lý

Tác giả không tự tạo tag tùy tiện. Tác giả chỉ chọn từ taxonomy có sẵn hoặc gửi yêu cầu thêm tag để admin duyệt.

Admin quản lý:

- Loại nội dung.
- Thể loại chính.
- Thể loại phụ.
- Chủ đề/motif.
- Bối cảnh.
- Kiểu nhân vật.
- Quan hệ/tình cảm.
- Cách kể.
- Cách trình bày.
- Cảm giác đọc.
- Cảnh báo nội dung.
- Độ tuổi.
- Trạng thái truyện.
- Truy cập/kiếm tiền.
- Nhãn biên tập.

### 5.2 Taxonomy không hard-code

Không hard-code danh mục trong component. UI phải đọc từ admin taxonomy/settings.

Nếu chưa có backend, tạo mock data tập trung ở một file rõ ràng, dễ thay bằng API sau. Không rải mảng taxonomy khắp nhiều component.

### 5.3 Import/export taxonomy

Admin cần import/export taxonomy:

- CSV.
- JSON.
- XLSX nếu có sẵn thư viện.
- Preview trước khi import.
- Validate lỗi trước khi ghi.
- Job history.
- Không import đè phá dữ liệu nếu không xác nhận.

### 5.4 Taxonomy analytics

Analytics đọc từ bảng aggregate, không query raw event trực tiếp ở dashboard.

Cần hỗ trợ xem:

- Impressions.
- Clicks.
- Starts.
- CTR.
- Completion rate.
- Saves.
- Revenue coin.
- Reports sai tag.
- High supply/low demand.
- Low supply/high retention.
- SEO taxonomy pages.
- Contribution theo surface: Discover/Search/Reels.
- Creator contribution theo taxonomy chỉ dùng để insight, không tự động phạt.

---

## 6. Cấu trúc truyện: nhiều chương và một phần

ChapMee không chỉ có truyện nhiều chương. Hệ thống phải hỗ trợ hai kiểu cấu trúc nội dung:

### 6.1 Truyện nhiều chương

Dành cho:

- Tiểu thuyết dài.
- Series.
- Truyện ra chương.
- Truyện trả phí theo chương.

Có bảng/list chương, số chương, lịch đăng, giá chương.

### 6.2 Truyện một phần / không có chương

Dành cho:

- Truyện ngắn.
- Đoản văn.
- Case file ngắn.
- Chat story ngắn.
- Nhật ký một phần.
- Nội dung đọc nhanh.

Không ép tạo chương số 1 nếu không cần. UI đọc truyện phải mở trực tiếp nội dung chính.

### 6.3 Yêu cầu kỹ thuật

Cần có field tương đương:

```text
content_structure: multi_chapter | single_part
```

Với `single_part`, nội dung chính vẫn dùng Composer/block JSON hoặc rich text tùy format, nhưng không hiển thị logic chapter list như truyện dài.

---

## 7. ChapMee Studio Composer

ChapMee Studio Composer là module lớn để tác giả soạn nội dung đặc thù.

### 7.1 Block Schema

Định nghĩa tất cả loại block tác giả có thể chèn vào chương/truyện.

Nhóm block cơ bản:

- Paragraph.
- Heading.
- Quote.
- Divider.
- Image.
- Gallery.
- Callout.
- Note.

Nhóm chat story:

- Message bubble.
- Sender label.
- Timestamp.
- Missed call.
- Voice note.
- Image message.
- System chat notice.

Nhóm case file:

- Evidence card.
- Report header.
- Transcript.
- Redacted text.
- File attachment.
- Timeline event.

Nhóm diary:

- Date header.
- Diary entry.
- Mood marker.
- Handwritten note style.

Nhóm LitRPG/system game:

- System message.
- Stat panel.
- Quest.
- Reward.
- Skill unlock.
- Inventory item.

Nhóm interactive/branching về sau:

- Choice.
- Branch target.
- Ending marker.

### 7.2 Block Editor UI

Editor cần hỗ trợ:

- Thêm block.
- Kéo thả sắp xếp.
- Sửa/xóa/duplicate block.
- Collapse/expand block.
- Preview mobile.
- Autosave.
- Version history.
- Template insert.
- Validation warning.

### 7.3 Format-specific Composer

Mỗi cách trình bày bật bộ block phù hợp.

Ví dụ:

- Chat Story: message, missed call, voice note, timestamp.
- Case File: evidence, report, transcript, redacted.
- Diary: date, diary entry, note.
- System Game/LitRPG: stat, quest, reward, system message.
- Văn xuôi: paragraph, heading, quote, image.

Không làm trùng Composer trong nhiều nơi. Tạo module dùng chung cho story/chapter/single_part.

### 7.4 Renderer

Renderer đọc block JSON và render ra giao diện người đọc.

Bắt buộc:

- Không render HTML nguy hiểm.
- Validate block type.
- Fallback block lỗi.
- Mobile-first.
- Không làm vỡ reader.

### 7.5 Validation & Publishing Check

Trước khi publish cần kiểm tra:

- Block lỗi schema.
- Thiếu nhân vật/sender nếu chat story.
- Lựa chọn nhánh bị cụt nếu interactive.
- Media upload nhưng chưa dùng.
- Block bắt buộc thiếu.
- SEO thiếu.
- Cảnh báo nội dung chưa xác nhận.
- Quyền sở hữu chưa xác nhận.

---

## 8. Studio story creation UX

### 8.1 Trang tạo truyện mới

Trang `/studio/stories/new` nên có flow rõ:

1. Thông tin.
2. Phân loại.
3. Composer / nội dung ban đầu.
4. SEO & xuất bản.

Nhưng không được làm rối. Form phải phục vụ tác giả viết nhanh.

### 8.2 Phân loại không rối

Không đặt ô tìm kiếm vô dụng phía trên dropdown nếu không có tác dụng thật.

Nên dùng:

- Combobox searchable thật.
- Selected chips.
- Gợi ý theo loại nội dung.
- Chỉ hiển thị nhóm bắt buộc trước.
- Nhóm nâng cao collapse.
- Nút “Không thấy tag phù hợp? Gửi yêu cầu”.

### 8.3 Composer trong tạo truyện

Nếu chọn `single_part`, Composer là nơi viết nội dung chính.

Nếu chọn `multi_chapter`, Composer có thể:

- Chỉ tạo truyện.
- Tạo truyện & mở Composer chương đầu.
- Tạo truyện & văn bản thường.

Không nhân đôi Composer ở trang tạo truyện và trang tạo chương nếu cùng module có thể dùng lại.

---

## 9. Studio chapters UX

### 9.1 Trang viết chương mới

Cần nâng cấp để tác giả tập trung viết:

- Header gọn.
- Story context rõ.
- Chapter number/title.
- Editor lớn, dễ viết.
- Chế độ viết và xem trước.
- Autosave rõ trạng thái.
- Version history.
- SEO có thể collapse, không chiếm quá nhiều không gian khi đang viết.
- Checklist publish.
- Lưu nháp, lên lịch, đăng ngay, gửi duyệt.

### 9.2 Trang danh sách chương

Cần hỗ trợ:

- Search.
- Filter trạng thái.
- Sort số chương/ngày đăng/lượt đọc/doanh thu.
- Pagination nếu nhiều chương.
- Bulk action: ẩn, lên lịch, đổi giá, đổi trạng thái.
- Trạng thái rõ: nháp, đã lên lịch, đã đăng, cần sửa, đã ẩn.
- Dễ mở sửa chương.

---

## 10. Monetization và finance

### 10.1 Coin và giá

Tác giả có thể:

- Bán từng chương.
- Bán trọn bộ.
- Bật miễn phí N chương đầu.
- Set giá đồng loạt cho các chương sau.
- Chọn nhiều truyện để cấu hình hàng loạt.
- Chọn nhiều chương để setup giá hàng loạt.

Tác giả được đặt số coin không giới hạn cho chương/truyện nhưng bắt buộc là số chẵn theo rule hệ thống.

### 10.2 Bán trọn bộ

Bán trọn bộ có thể bao gồm truyện chưa hoàn thành. Người mua trọn bộ được xem tất cả chương tương lai thuộc truyện đó.

Nhưng doanh thu phần bán trọn bộ của truyện chưa hoàn thành phải được giữ lại, chưa cho rút.

Chỉ mở khóa rút phần này khi:

1. Tác giả đánh dấu hoàn thành.
2. Admin xác nhận thực sự hoàn thành.

Không tin hoàn toàn vào thao tác “đã hoàn thành” của tác giả.

### 10.3 Admin monetization settings

Admin `/admin/monetization-settings` quản lý:

- Gói nạp coin.
- Số tiền nạp.
- Bonus/chiết khấu từng mốc.
- Tỷ lệ quy đổi.
- Phí nền tảng.
- Tỷ lệ chia doanh thu.
- Chính sách rút tiền.
- Mức rút tối thiểu.

Frontend user chỉ đọc từ config này. Tuyệt đối không hard-code gói nạp ở frontend.

### 10.4 Minh bạch cho tác giả

Studio Monetization/Finance phải hiển thị đúng riêng cho từng tác giả:

- Tỷ lệ ăn chia áp dụng cho tài khoản đó.
- Phí nền tảng.
- Phí giao dịch nếu có.
- Chính sách giữ tiền.
- Chính sách bán trọn bộ.
- Chính sách rút tiền.
- Nếu tác giả có thỏa thuận riêng, hiển thị rule riêng của tác giả.

### 10.5 Finance và rút tiền

Không tự xây trung tâm xác thực mới trong Finance nếu đã có `/studio/settings/verification`.

Finance chỉ dẫn user đến trung tâm xác thực.

Người dùng có thể:

- Thêm nhiều tài khoản ngân hàng.
- Chọn tài khoản nhận tiền khi rút.
- Set PIN rút tiền.
- Đổi PIN.
- Quên PIN và lấy lại qua email.

Điều kiện rút:

- Phải xác thực tài khoản ở `/studio/settings/verification` trước lần rút đầu.
- Nếu đổi tài khoản ngân hàng thì cần xác thực lại tài khoản nhận tiền.
- Nếu đổi tài khoản ngân hàng, khóa rút 24h và báo admin.
- Các bước xác nhận nhạy cảm qua email.

---

## 11. Admin Content Hub, Blog, Announcements, Notifications, SEO

### 11.1 Blog/Bài viết

Admin cần nơi viết bài:

- Article.
- Guide.
- SEO content.
- Editorial.
- Policy.
- News.

Bài viết tách biệt với truyện.

Cần có:

- List page.
- Create/edit page.
- Rich editor hoặc block editor cơ bản.
- Cover image.
- Category/tags.
- Status: draft, published, scheduled, hidden, archived.
- SEO title/description/canonical/indexable.
- Preview.
- Publish schedule.
- Audit log.

### 11.2 Announcements

Thông báo nền tảng tách biệt bài blog và notification campaign.

Dùng cho thông báo chính thức public/in-app về:

- General.
- Maintenance.
- Policy.
- Monetization.
- Creator.
- Reader.
- Feature.
- Warning.

Có list/create/edit/status/schedule/SEO nếu public.

### 11.3 Notification Campaign

Admin gửi thông báo hàng loạt nhưng phải có phân quyền và target rõ.

Không gửi tràn lan nếu chưa chọn rõ đối tượng.

Target mode:

- Segment có sẵn.
- Role/capability.
- Creator status.
- Reader group.
- VIP/coin users.
- Specific users.
- CSV user IDs nếu có.

Cần có:

- Draft.
- Preview số người nhận.
- Confirm trước khi gửi.
- Schedule.
- Rate limit.
- Cancel/pause nếu chưa gửi xong.
- Delivery log.
- Open/click stats nếu tracking có.
- Audit log.

### 11.4 SEO Control Panel

Admin quản trị SEO không cần sửa code:

- Route pattern.
- Index/noindex.
- Follow/nofollow.
- Title template.
- Description template.
- Canonical mode.
- Custom canonical URL.
- Sitemap include/exclude.
- Robots rules.
- Audit warnings.

Không để lập trình sai heading. Page public phải có heading hierarchy hợp lý:

- Mỗi page nên có một H1 chính.
- Section dùng H2/H3 đúng cấp.
- Không dùng heading chỉ để style.

### 11.5 Index rules mặc định

Nên index:

- Public story pages.
- Public chapter pages nếu không bị khóa/private.
- Public author profile `/@username`.
- Discover/category/tag pages đủ chất lượng.
- Blog/article public.
- Announcement public nếu có giá trị tìm kiếm.

Nên noindex:

- Admin.
- Studio.
- Settings.
- Messages.
- Notifications private.
- Wallet/coin/user finance.
- Login/register.
- Draft/private/unpublished content.
- Search result pages nếu dễ thin/duplicate.

---

## 12. Pinterest XML feed

Cần tính năng nhỏ tạo URL XML feed cho các nội dung xuất bản hàng loạt lên Pinterest.

Admin có thể cấu hình:

- Bật/tắt feed.
- Chọn loại nội dung đưa vào feed: truyện, chương, bài viết, reels nếu phù hợp.
- Chọn taxonomy/status/public only.
- Chọn số lượng item tối đa.
- Chọn ngôn ngữ/khu vực nếu có.
- Chọn ảnh dùng cho item: cover/story image/chapter image/fallback.
- Exclude nội dung 18+/sensitive nếu không phù hợp.

URL feed ví dụ:

```text
/pinterest.xml
/feeds/pinterest/stories.xml
/feeds/pinterest/articles.xml
```

Feed phải chỉ chứa nội dung public, canonical, không private, không draft, không noindex.

---

## 13. Algorithm fairness

ChapMee phải tránh việc một số ít tác giả/truyện chiếm hết hiển thị.

### 13.1 Bề mặt áp dụng

- Reels.
- Discover.
- Search.
- Ranking.
- Category pages.
- Recommendation sections.

### 13.2 Nguyên tắc

- Không chỉ xếp hạng theo popularity thô.
- Có candidate pools theo taxonomy, freshness, quality, personalization, cold start.
- Có fairness caps để giới hạn tỷ lệ hiển thị của cùng tác giả/truyện trong một phiên/khung thời gian.
- Có cold start cho tác giả/truyện mới.
- Có diversity theo thể loại, format, tác giả.
- Có audit/explainability cho admin.

### 13.3 Admin-configurable

Mọi trọng số, ngưỡng, cap, decay, quota phải cấu hình ở admin. Không hard-code.

Cần audit:

- Vì sao truyện được hiển thị.
- Score components.
- Fairness cap có áp dụng không.
- Cold start có áp dụng không.
- Tác giả nào đang chiếm nhiều exposure.
- Taxonomy nào đang bị thiếu/cung vượt cầu.

---

## 14. UI/UX style guide cho ChapMee

### 14.1 Dark theme

ChapMee dùng dark theme. Cần tránh giao diện toàn chữ trắng gây rối.

Nên dùng:

- Text chính: trắng dịu.
- Text phụ: xám xanh.
- Primary: cyan ChapMee.
- Success: xanh lá.
- Warning: vàng/amber.
- Danger: đỏ.
- Monetization/coin: vàng/cam.
- Premium/VIP: tím.

Không dùng quá nhiều màu trong cùng card.

### 14.2 Mobile

- Mobile-first.
- Section gọn.
- Loại bỏ câu giải thích thừa.
- Không nhồi quá nhiều card.
- Bottom nav gọn, icon solid đặc ruột, không viền rối.
- Reels là default entry.
- Discover là nơi chứa các nội dung khám phá thay cho Home cũ.

### 14.3 Admin/Studio

- Admin ưu tiên dữ liệu rõ, filter tốt, bulk action, pagination.
- Studio ưu tiên tác giả thao tác nhanh, ít rối, checklist rõ.
- Với list lớn phải dùng pagination, không infinite scroll.
- Community feed có thể infinite.

### 14.4 Button hierarchy

- Primary CTA chỉ một hoặc vài nút quan trọng.
- Secondary dùng outline/subtle.
- Danger chỉ dùng cho thao tác nguy hiểm.
- Disabled phải có lý do rõ nếu người dùng cần biết.

---

## 15. Supabase/database safety

Khi thêm schema:

- Tạo migration rõ ràng.
- Không phá dữ liệu cũ.
- Có default/fallback.
- Có index cho query lớn.
- Có RLS nếu bảng có dữ liệu user.
- Không expose dữ liệu nhạy cảm.
- Không dùng UUID public nếu đã có public code/username route.

Các bảng có thể cần audit log:

- Monetization settings.
- Finance withdrawal.
- Bank accounts.
- PIN/security events.
- Taxonomy changes.
- SEO rules.
- Notification campaigns.
- Content moderation.
- Admin actions.

---

## 16. Prompt format bắt buộc khi viết prompt cho Codex/AI coding agent

Khi người dùng yêu cầu “viết prompt cho Codex” hoặc prompt cho AI làm app, phải dùng đúng các mục sau:

1. Context
2. Goal
3. Scope
4. Requirements
5. Files/Modules expected
6. Constraints
7. Acceptance criteria
8. Validation steps

Prompt phải đặt trong block dễ copy.

Mẫu:

```text
Context
...

Goal
...

Scope
...

Requirements
...

Files/Modules expected
...

Constraints
- Do not rewrite the whole app.
- Do not edit unrelated files.
- Prioritize making the app run first.
- UI polish after functional correctness.
- Do not hard-code admin-configurable settings.

Acceptance criteria
...

Validation steps
...
```

---

## 17. Checklist trước khi AI coding agent trả lời hoàn tất

Trước khi kết luận, AI phải tự kiểm tra:

- Đã sửa đúng phạm vi chưa?
- Có phá route cũ không?
- Có hard-code cấu hình admin không?
- Có tạo trùng module đã tồn tại không?
- Có ảnh hưởng Composer không?
- Có ảnh hưởng taxonomy không?
- Có ảnh hưởng monetization/finance không?
- Có cần migration không?
- Có cần RLS/policy không?
- Có build/lint/typecheck chưa?
- Có báo rõ phần chưa làm được không?

Nếu không chắc, nói rõ ràng thay vì đoán.
