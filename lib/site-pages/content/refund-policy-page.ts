import type { PlatformPageContentMeta } from "@/lib/site-pages/platform-page-types";
import { PART2_UPDATED_LINE } from "@/lib/site-pages/content/part2-updated-line";

export const refundPolicyPage: PlatformPageContentMeta = {
  slug: "refund-policy",
  title: "Chính sách hoàn tiền",
  summary: "Điều kiện hoàn tiền, hoàn coin và xử lý giao dịch lỗi trên ChapMee.",
  content: `${PART2_UPDATED_LINE}Chính sách hoàn tiền này quy định các trường hợp ChapMee có thể hoàn tiền, hoàn coin, từ chối hoàn tiền hoặc xử lý giao dịch lỗi đối với các dịch vụ số trên ChapMee.

Do ChapMee cung cấp nội dung số và quyền truy cập trực tuyến, một số giao dịch có thể được kích hoạt ngay sau khi thanh toán thành công. Người dùng cần đọc kỹ thông tin giao dịch trước khi xác nhận thanh toán.

## 1. Phạm vi áp dụng

Chính sách này áp dụng cho:

1. Giao dịch nạp coin.
2. Giao dịch mua chương truyện, gói truyện hoặc nội dung số.
3. Giao dịch tip hoặc ủng hộ tác giả nếu ChapMee triển khai.
4. Giao dịch mua tính năng trả phí hoặc gói dịch vụ nếu có.
5. Giao dịch lỗi, giao dịch trùng, giao dịch sai số tiền hoặc giao dịch cần xử lý thủ công.

Chính sách này không áp dụng cho giao dịch ngoài nền tảng hoặc thanh toán qua kênh không chính thức.

## 2. Nguyên tắc chung

ChapMee xử lý hoàn tiền và hoàn coin theo các nguyên tắc:

1. Minh bạch, có căn cứ và dựa trên dữ liệu giao dịch.
2. Bảo vệ quyền lợi hợp lý của người dùng.
3. Ngăn chặn gian lận, lợi dụng chính sách hoàn tiền hoặc lạm dụng hệ thống.
4. Tôn trọng đặc thù của nội dung số, trong đó một số nội dung có thể được cung cấp ngay sau khi mua.
5. Tuân thủ quy định pháp luật và chính sách của đối tác thanh toán nếu có.

## 3. Các trường hợp có thể được hoàn tiền hoặc hoàn coin

ChapMee có thể xem xét hoàn tiền hoặc hoàn coin trong các trường hợp sau:

### 3.1. Thanh toán thành công nhưng không nhận được coin hoặc quyền truy cập

Nếu người dùng đã thanh toán hợp lệ nhưng hệ thống không cộng coin, không mở nội dung hoặc không kích hoạt quyền lợi tương ứng do lỗi hệ thống, ChapMee sẽ kiểm tra và xử lý.

Tùy trường hợp, ChapMee có thể:

* Cộng coin hoặc mở quyền truy cập còn thiếu.
* Hoàn coin.
* Hoàn tiền qua phương thức phù hợp nếu không thể cung cấp dịch vụ.

### 3.2. Giao dịch bị trừ tiền nhiều lần

Nếu người dùng bị trừ tiền nhiều lần cho cùng một đơn thanh toán hoặc cùng một giao dịch do lỗi hệ thống, ChapMee sẽ kiểm tra và xử lý phần giao dịch trùng.

Tùy trường hợp, ChapMee có thể hoàn tiền, hoàn coin hoặc ghi nhận số dư tương ứng.

### 3.3. Nội dung trả phí bị gỡ do lỗi từ ChapMee hoặc vi phạm từ bên đăng tải

Nếu người dùng đã mua nội dung nhưng nội dung bị gỡ, khóa hoặc không thể truy cập vì lý do không xuất phát từ lỗi của người dùng, ChapMee có thể xem xét hoàn coin hoặc áp dụng biện pháp bù trừ phù hợp.

Trường hợp nội dung bị gỡ vì vi phạm bản quyền, vi phạm pháp luật, vi phạm chính sách nội dung hoặc tranh chấp nghiêm trọng, ChapMee sẽ xử lý theo từng trường hợp cụ thể.

### 3.4. Người dùng chuyển khoản sai số tiền hoặc sai nội dung

Nếu người dùng chuyển khoản sai số tiền, sai nội dung hoặc thiếu mã thanh toán, ChapMee có thể xử lý thủ công khi xác minh được giao dịch.

Tùy trường hợp, ChapMee có thể:

* Ghi nhận giao dịch sau khi đối soát.
* Hoàn lại tiền nếu có thể.
* Yêu cầu người dùng cung cấp thêm thông tin xác minh.
* Từ chối xử lý nếu không đủ căn cứ xác minh.

### 3.5. Lỗi kỹ thuật nghiêm trọng

Nếu lỗi kỹ thuật từ ChapMee khiến người dùng không thể sử dụng dịch vụ đã thanh toán trong thời gian bất thường, ChapMee có thể xem xét hoàn coin, gia hạn quyền lợi hoặc phương án bù trừ phù hợp.

## 4. Các trường hợp thường không được hoàn tiền

ChapMee có thể từ chối hoàn tiền hoặc hoàn coin trong các trường hợp:

1. Người dùng đã nhận và sử dụng coin/nội dung/quyền lợi đúng như mô tả.
2. Người dùng đã mở khóa, đọc hoặc sử dụng nội dung số sau khi mua, trừ trường hợp có lỗi nghiêm trọng từ ChapMee.
3. Người dùng mua nhầm do không đọc kỹ thông tin trước khi xác nhận.
4. Người dùng thay đổi ý định sau khi giao dịch đã hoàn tất.
5. Người dùng vi phạm Điều khoản sử dụng hoặc chính sách của ChapMee.
6. Giao dịch phát sinh từ hành vi gian lận, lợi dụng lỗi, dùng tài khoản bất hợp pháp hoặc thanh toán không hợp lệ.
7. Giao dịch ngoài nền tảng hoặc qua kênh không chính thức.
8. Người dùng không cung cấp đủ thông tin để xác minh giao dịch.
9. Người dùng yêu cầu hoàn tiền sau thời hạn tiếp nhận khiếu nại hợp lý được ChapMee công bố.
10. Nội dung không phù hợp với sở thích cá nhân nhưng vẫn được cung cấp đúng mô tả cơ bản và không vi phạm chính sách.

## 5. Hoàn tiền và hoàn coin khác nhau như thế nào?

### 5.1. Hoàn coin

Hoàn coin là việc ChapMee cộng lại coin vào ví nội bộ của người dùng trên ChapMee.

Hoàn coin có thể được áp dụng khi:

* Người dùng đã dùng tiền nạp coin thành công.
* Giao dịch mua nội dung bằng coin gặp lỗi.
* ChapMee cần bù trừ trong phạm vi nền tảng.
* Việc hoàn tiền về phương thức thanh toán ban đầu không phù hợp hoặc không khả thi.

### 5.2. Hoàn tiền

Hoàn tiền là việc trả lại tiền qua phương thức phù hợp, có thể là tài khoản ngân hàng, phương thức thanh toán ban đầu hoặc phương thức khác theo quy trình của ChapMee và đối tác thanh toán.

Hoàn tiền có thể mất thêm thời gian do phụ thuộc vào ngân hàng, đối tác thanh toán hoặc quá trình xác minh.

## 6. Quy trình yêu cầu hoàn tiền hoặc hoàn coin

Người dùng gửi yêu cầu về [support@chapmee.com](mailto:support@chapmee.com) với tiêu đề:

“Yêu cầu hoàn tiền/hoàn coin - [mã giao dịch nếu có]”

Thông tin cần cung cấp:

1. Email tài khoản ChapMee.
2. Username nếu có.
3. Mã giao dịch hoặc mã đơn hàng.
4. Số tiền hoặc số coin liên quan.
5. Thời gian giao dịch.
6. Nội dung đã mua hoặc gói đã nạp.
7. Lý do yêu cầu hoàn tiền/hoàn coin.
8. Ảnh chụp màn hình hoặc bằng chứng liên quan nếu có.

ChapMee có thể yêu cầu thêm thông tin để xác minh.

## 7. Thời gian xử lý

ChapMee sẽ cố gắng tiếp nhận và phản hồi yêu cầu trong thời gian sớm nhất.

Thời gian xử lý có thể phụ thuộc vào:

* Mức độ phức tạp của giao dịch.
* Việc xác minh thanh toán.
* Phản hồi từ ngân hàng hoặc đối tác thanh toán.
* Việc kiểm tra nội dung, tài khoản, lịch sử sử dụng hoặc dấu hiệu gian lận.
* Yêu cầu pháp lý hoặc tranh chấp liên quan.

Các trường hợp đơn giản có thể được xử lý nhanh hơn. Các trường hợp liên quan đến bản quyền, gian lận, tranh chấp hoặc đối soát ngân hàng có thể cần thêm thời gian.

## 8. Giao dịch liên quan đến tác giả

Nếu giao dịch liên quan đến nội dung của tác giả, việc hoàn coin hoặc hoàn tiền có thể ảnh hưởng đến doanh thu của tác giả.

ChapMee có thể điều chỉnh doanh thu, tạm giữ khoản thanh toán, trừ lại khoản đã ghi nhận hoặc áp dụng biện pháp phù hợp theo Chính sách kiếm tiền tác giả và Quy chế hoạt động nền tảng/sàn.

## 9. Lạm dụng chính sách hoàn tiền

ChapMee có quyền từ chối xử lý, giới hạn tài khoản, khóa tính năng thanh toán hoặc áp dụng biện pháp khác nếu phát hiện người dùng lạm dụng chính sách hoàn tiền, ví dụ:

* Liên tục mua rồi yêu cầu hoàn tiền không có căn cứ.
* Cố tình khai báo sai.
* Lợi dụng lỗi hệ thống.
* Tạo nhiều tài khoản để nhận hoàn tiền.
* Thực hiện tranh chấp thanh toán gian lận.
* Đã sử dụng nội dung nhưng vẫn yêu cầu hoàn tiền với lý do không trung thực.

## 10. Liên hệ

Yêu cầu hoàn tiền hoặc hoàn coin gửi về:

* Email hỗ trợ: [support@chapmee.com](mailto:support@chapmee.com)`
};
