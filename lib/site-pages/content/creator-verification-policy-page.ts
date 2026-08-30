import type { PlatformPageContentMeta } from "@/lib/site-pages/platform-page-types";
import { PART2_UPDATED_LINE } from "@/lib/site-pages/content/part2-updated-line";

export const creatorVerificationPolicyPage: PlatformPageContentMeta = {
  slug: "creator-verification-policy",
  title: "Chính sách xác minh tác giả",
  summary:
    "Mục đích, điều kiện và quy trình xác minh tác giả trên ChapMee.",
  content: `${PART2_UPDATED_LINE}Chính sách xác minh tác giả này quy định mục đích, điều kiện, thông tin cần cung cấp, quy trình xử lý và các trường hợp ChapMee có thể yêu cầu xác minh đối với tác giả hoặc người dùng tham gia chương trình kiếm tiền.

Xác minh giúp ChapMee bảo vệ người đọc, tác giả, giao dịch, quyền sở hữu trí tuệ, chương trình kiếm tiền và an toàn nền tảng.

## 1. Khi nào cần xác minh?

ChapMee có thể yêu cầu xác minh trong các trường hợp:

1. Tác giả muốn tham gia chương trình kiếm tiền.
2. Tác giả muốn rút tiền.
3. Tác giả đạt ngưỡng doanh thu, lượt đọc hoặc mức độ ảnh hưởng nhất định.
4. Tài khoản có dấu hiệu rủi ro, gian lận hoặc bất thường.
5. Tác giả thay đổi thông tin nhận tiền.
6. Tác giả có tranh chấp bản quyền.
7. Tác giả yêu cầu huy hiệu xác minh.
8. Tác giả tham gia chương trình đặc biệt, hợp đồng riêng hoặc nội dung độc quyền.
9. ChapMee cần tuân thủ yêu cầu pháp lý, thuế, thanh toán hoặc chống gian lận.
10. Có yêu cầu hợp lệ từ cơ quan có thẩm quyền.

## 2. Xác minh không đồng nghĩa với bảo đảm nội dung

Việc một tài khoản được xác minh không có nghĩa là:

1. Mọi nội dung của tài khoản đều được ChapMee bảo đảm là hợp pháp.
2. Tác giả được miễn kiểm duyệt.
3. Tác giả được ưu tiên hiển thị vĩnh viễn.
4. Tác giả được miễn trách nhiệm bản quyền.
5. Tác giả chắc chắn có doanh thu.
6. Tác giả được quyền vi phạm chính sách.

Tác giả đã xác minh vẫn phải tuân thủ đầy đủ Điều khoản sử dụng, Chính sách nội dung, Chính sách bản quyền, Điều khoản dành cho tác giả và các chính sách liên quan.

## 3. Các loại xác minh có thể có

ChapMee có thể triển khai một hoặc nhiều loại xác minh:

### 3.1. Xác minh email

Dùng để xác nhận người dùng kiểm soát địa chỉ email đăng ký.

### 3.2. Xác minh tài khoản tác giả

Dùng để xác nhận tài khoản có quyền sử dụng Studio hoặc tham gia các chương trình dành cho tác giả.

### 3.3. Xác minh danh tính

Dùng trong trường hợp tác giả muốn rút tiền, tham gia kiếm tiền, nhận doanh thu lớn, có tranh chấp hoặc khi ChapMee cần bảo vệ nền tảng.

### 3.4. Xác minh tài khoản nhận tiền

Dùng để xác nhận thông tin ngân hàng hoặc phương thức nhận tiền thuộc quyền sử dụng hợp pháp của tác giả.

### 3.5. Xác minh quyền sở hữu nội dung

Dùng khi có tranh chấp bản quyền, nội dung độc quyền, chương trình đặc biệt hoặc khi ChapMee yêu cầu chứng minh quyền đăng tải/khai thác nội dung.

### 3.6. Huy hiệu xác minh

ChapMee có thể cấp huy hiệu xác minh cho một số tài khoản đáp ứng điều kiện nhất định. Huy hiệu xác minh có thể nhằm giúp người đọc nhận biết tài khoản chính thức hoặc tài khoản đã được ChapMee xác nhận theo tiêu chí nội bộ.

## 4. Thông tin có thể được yêu cầu

Tùy loại xác minh, ChapMee có thể yêu cầu một hoặc nhiều thông tin:

1. Họ tên.
2. Email.
3. Username ChapMee.
4. Số điện thoại nếu cần và nếu ChapMee triển khai.
5. Ngày sinh hoặc thông tin độ tuổi nếu cần.
6. Thông tin giấy tờ tùy thân trong trường hợp cần xác minh danh tính.
7. Thông tin tài khoản ngân hàng hoặc phương thức nhận tiền.
8. Ảnh chụp hoặc tài liệu chứng minh quyền sử dụng tài khoản nhận tiền.
9. Tài liệu chứng minh quyền sở hữu nội dung.
10. Hợp đồng, giấy phép, văn bản ủy quyền hoặc bằng chứng được phép đăng tải nội dung.
11. Thông tin thuế hoặc thông tin pháp lý khác nếu cần cho thanh toán.
12. Thông tin bổ sung phục vụ chống gian lận hoặc tuân thủ quy định.

ChapMee chỉ nên yêu cầu thông tin phù hợp với mục đích xác minh và xử lý theo [Chính sách quyền riêng tư](/legal/privacy).

## 5. Quy trình xác minh

Quy trình xác minh có thể bao gồm:

### Bước 1: Gửi yêu cầu

Tác giả gửi yêu cầu xác minh trong Studio hoặc theo hướng dẫn của ChapMee.

### Bước 2: Cung cấp thông tin

Tác giả cung cấp thông tin và tài liệu cần thiết theo loại xác minh.

### Bước 3: Kiểm tra

ChapMee kiểm tra tính đầy đủ, hợp lệ và nhất quán của thông tin.

### Bước 4: Yêu cầu bổ sung nếu cần

Nếu thông tin chưa rõ, ChapMee có thể yêu cầu tác giả bổ sung hoặc chỉnh sửa.

### Bước 5: Kết quả

ChapMee có thể:

1. Phê duyệt xác minh.
2. Từ chối xác minh.
3. Yêu cầu bổ sung.
4. Tạm dừng xử lý.
5. Hạn chế một số tính năng trong thời gian xác minh.
6. Chuyển sang kiểm tra nâng cao nếu có dấu hiệu rủi ro.

## 6. Thời gian xử lý

Thời gian xác minh phụ thuộc vào:

1. Loại xác minh.
2. Độ đầy đủ của thông tin.
3. Mức độ phức tạp của tài liệu.
4. Số lượng yêu cầu đang chờ xử lý.
5. Việc cần kiểm tra tranh chấp, bản quyền, thanh toán hoặc gian lận.
6. Yêu cầu từ đối tác thanh toán hoặc cơ quan có thẩm quyền nếu có.

ChapMee sẽ cố gắng xử lý trong thời gian hợp lý, nhưng không bảo đảm mọi yêu cầu đều được xử lý ngay lập tức.

## 7. Từ chối xác minh

ChapMee có thể từ chối xác minh nếu:

1. Thông tin không đầy đủ.
2. Thông tin không chính xác hoặc không nhất quán.
3. Tài liệu mờ, giả, hết hạn hoặc không hợp lệ.
4. Người gửi không chứng minh được quyền sử dụng tài khoản nhận tiền.
5. Người gửi không chứng minh được quyền đăng tải nội dung khi được yêu cầu.
6. Tài khoản có dấu hiệu gian lận, spam, vi phạm hoặc rủi ro.
7. Tài khoản đang bị tranh chấp hoặc khiếu nại nghiêm trọng.
8. ChapMee không thể xác minh thông tin với mức độ tin cậy hợp lý.

Việc bị từ chối xác minh có thể khiến tác giả không được bật kiếm tiền, không được rút tiền hoặc không được nhận huy hiệu xác minh.

## 8. Thu hồi xác minh

ChapMee có thể thu hồi trạng thái xác minh nếu:

1. Tác giả cung cấp thông tin sai.
2. Tác giả vi phạm chính sách.
3. Tài khoản bị chuyển nhượng, bán hoặc cho người khác sử dụng trái phép.
4. Tài khoản bị chiếm đoạt hoặc có dấu hiệu không còn thuộc quyền kiểm soát của chủ tài khoản.
5. Tác giả thay đổi thông tin quan trọng nhưng không cập nhật.
6. Tác giả vi phạm bản quyền hoặc gian lận doanh thu.
7. Có yêu cầu hợp lệ từ cơ quan có thẩm quyền.
8. ChapMee thay đổi tiêu chí xác minh.

## 9. Thay đổi thông tin xác minh

Tác giả cần cập nhật thông tin nếu có thay đổi quan trọng, ví dụ:

1. Email.
2. Tên hiển thị hoặc username.
3. Thông tin nhận tiền.
4. Tài khoản ngân hàng.
5. Thông tin pháp lý hoặc thuế.
6. Quyền sở hữu hoặc quyền sử dụng nội dung.
7. Người đại diện hoặc ủy quyền nếu có.

ChapMee có thể yêu cầu xác minh lại sau khi thông tin thay đổi.

## 10. Bảo mật thông tin xác minh

Thông tin xác minh có thể là thông tin nhạy cảm. ChapMee sẽ xử lý thông tin này theo [Chính sách quyền riêng tư](/legal/privacy) và chỉ sử dụng cho các mục đích phù hợp như:

1. Xác minh tài khoản.
2. Xử lý thanh toán.
3. Chống gian lận.
4. Bảo vệ nền tảng.
5. Giải quyết tranh chấp.
6. Tuân thủ nghĩa vụ pháp lý.
7. Phối hợp với cơ quan có thẩm quyền khi có yêu cầu hợp lệ.

Tác giả không nên gửi thông tin xác minh qua kênh không chính thức.

## 11. Huy hiệu xác minh

Nếu ChapMee cấp huy hiệu xác minh, huy hiệu này có thể hiển thị trên hồ sơ công khai, trang truyện, bình luận hoặc khu vực liên quan.

Huy hiệu xác minh có thể nhằm thể hiện rằng tài khoản đã được ChapMee xác nhận theo tiêu chí nhất định, nhưng không phải là bảo đảm tuyệt đối về chất lượng nội dung, tính chính xác của mọi tuyên bố hoặc quyền sở hữu của mọi tác phẩm.

ChapMee có quyền cấp, từ chối, ẩn hoặc thu hồi huy hiệu xác minh theo tiêu chí và chính sách của mình.

## 12. Xác minh quyền sở hữu nội dung

Trong một số trường hợp, ChapMee có thể yêu cầu tác giả cung cấp bằng chứng quyền sở hữu hoặc quyền sử dụng nội dung.

Điều này đặc biệt quan trọng đối với:

1. Truyện dịch.
2. Truyện chuyển thể.
3. Nội dung độc quyền.
4. Nội dung có tranh chấp.
5. Nội dung có doanh thu cao.
6. Nội dung bị báo cáo bản quyền.
7. Nội dung có nguồn gốc từ bên thứ ba.

Nếu tác giả không chứng minh được quyền sử dụng, ChapMee có thể ẩn, gỡ, tắt kiếm tiền, tạm giữ doanh thu hoặc xử lý tài khoản.

## 13. Xác minh và rút tiền

ChapMee có thể yêu cầu tác giả hoàn tất xác minh trước khi rút tiền.

Yêu cầu này nhằm:

1. Bảo vệ tác giả khỏi rủi ro tài khoản bị chiếm đoạt.
2. Bảo đảm tiền được chuyển đúng người.
3. Giảm gian lận.
4. Hỗ trợ đối soát.
5. Tuân thủ nghĩa vụ pháp lý, thuế hoặc thanh toán nếu có.

Nếu tác giả không hoàn tất xác minh, ChapMee có thể tạm dừng rút tiền cho đến khi yêu cầu được xử lý.

## 14. Khiếu nại kết quả xác minh

Nếu tác giả không đồng ý với kết quả xác minh, tác giả có thể gửi yêu cầu xem xét lại qua [support@chapmee.com](mailto:support@chapmee.com) hoặc kênh hỗ trợ trong Studio nếu có.

Thông tin nên cung cấp:

1. Tài khoản tác giả.
2. Loại xác minh bị từ chối.
3. Lý do không đồng ý.
4. Tài liệu bổ sung nếu có.
5. Thông tin liên hệ.

ChapMee sẽ xem xét trong phạm vi hợp lý và có thể giữ nguyên hoặc thay đổi kết quả.

## 15. Thay đổi Chính sách xác minh tác giả

ChapMee có thể cập nhật Chính sách này để phù hợp với thay đổi sản phẩm, chương trình kiếm tiền, thanh toán, an toàn nền tảng, quy định pháp luật hoặc yêu cầu vận hành.

Phiên bản mới nhất sẽ được công bố tại trang này.

## 16. Liên hệ

* Hỗ trợ chung: [support@chapmee.com](mailto:support@chapmee.com)
* Quyền riêng tư: [privacy@chapmee.com](mailto:privacy@chapmee.com)
* Bản quyền: [copyright@chapmee.com](mailto:copyright@chapmee.com)`
};
