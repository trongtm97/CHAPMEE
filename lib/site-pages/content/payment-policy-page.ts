import type { PlatformPageContentMeta } from "@/lib/site-pages/platform-page-types";
import { PART2_UPDATED_LINE } from "@/lib/site-pages/content/part2-updated-line";

export const paymentPolicyPage: PlatformPageContentMeta = {
  slug: "payment-policy",
  title: "Chính sách thanh toán",
  summary: "Quy định xử lý giao dịch thanh toán, nạp coin và mua nội dung số trên ChapMee.",
  content: `${PART2_UPDATED_LINE}Chính sách thanh toán này quy định cách ChapMee xử lý các giao dịch thanh toán phát sinh trên nền tảng, bao gồm nạp coin, mua nội dung số, mua chương truyện, mua gói truyện, tip, gói đọc hoặc các tính năng trả phí khác nếu được ChapMee triển khai.

Người dùng cần đọc kỹ Chính sách thanh toán, Chính sách hoàn tiền, Chính sách cung ứng dịch vụ số và Điều khoản sử dụng trước khi thực hiện giao dịch.

## 1. Phạm vi áp dụng

Chính sách này áp dụng cho:

1. Người dùng nạp coin vào tài khoản ChapMee.
2. Người dùng mua chương truyện, gói truyện, nội dung số hoặc tính năng trả phí.
3. Người dùng tip, ủng hộ tác giả hoặc thực hiện giao dịch khác nếu ChapMee triển khai.
4. Tác giả nhận doanh thu từ giao dịch nội dung nếu chương trình kiếm tiền được kích hoạt.
5. Các giao dịch được thực hiện qua website ChapMee hoặc kênh thanh toán chính thức do ChapMee công bố.

Chính sách này không áp dụng cho giao dịch được thực hiện ngoài ChapMee, giao dịch tự phát giữa người dùng với nhau hoặc giao dịch qua kênh không chính thức.

## 2. Đơn vị tiền tệ và coin

ChapMee có thể sử dụng coin như một đơn vị quy đổi nội bộ để người dùng truy cập một số nội dung hoặc tính năng.

Coin không phải là tiền điện tử, tài sản đầu tư, chứng khoán, công cụ thanh toán ngoài ChapMee hoặc phương tiện tích trữ giá trị độc lập. Coin chỉ có giá trị sử dụng trong phạm vi dịch vụ của ChapMee theo chính sách được công bố.

ChapMee có thể quy định:

* Gói nạp coin.
* Số coin nhận được.
* Bonus coin nếu có.
* Thời hạn sử dụng nếu có.
* Điều kiện sử dụng coin.
* Các trường hợp hoàn coin, thu hồi coin hoặc điều chỉnh số dư.

Mọi thông tin về gói nạp phải được hiển thị rõ trước khi người dùng xác nhận thanh toán.

## 3. Phương thức thanh toán

ChapMee có thể hỗ trợ một hoặc nhiều phương thức thanh toán sau, tùy từng thời điểm:

1. Chuyển khoản ngân hàng.
2. Thanh toán bằng mã QR.
3. Cổng thanh toán hoặc đối tác thanh toán.
4. Ví điện tử hoặc phương thức khác nếu được ChapMee công bố.
5. Phương thức thanh toán phù hợp với nền tảng web/PWA hoặc ứng dụng nếu ChapMee triển khai trong tương lai.

Các phương thức thanh toán cụ thể sẽ được hiển thị tại trang nạp tiền hoặc trang thanh toán trước khi người dùng xác nhận giao dịch.

Người dùng chỉ nên thanh toán qua các kênh chính thức được công bố trên ChapMee. ChapMee không chịu trách nhiệm đối với giao dịch thực hiện qua tài khoản cá nhân, link lạ, người mạo danh hoặc kênh không chính thức.

## 4. Quy trình thanh toán cơ bản

Quy trình thanh toán có thể bao gồm các bước sau:

1. Người dùng đăng nhập tài khoản ChapMee.
2. Người dùng chọn gói coin, nội dung, chương, gói truyện hoặc tính năng muốn mua.
3. Hệ thống hiển thị thông tin giao dịch, bao gồm tên gói/nội dung, số tiền, số coin, quyền lợi và điều kiện áp dụng.
4. Người dùng kiểm tra lại thông tin giao dịch.
5. Người dùng xác nhận đồng ý với Điều khoản sử dụng, Chính sách thanh toán, Chính sách hoàn tiền và các chính sách liên quan.
6. Người dùng thực hiện thanh toán theo hướng dẫn.
7. Hệ thống hoặc đối tác thanh toán xác nhận kết quả.
8. ChapMee ghi nhận giao dịch và cung ứng coin/nội dung/tính năng tương ứng nếu thanh toán hợp lệ.
9. Người dùng có thể kiểm tra lịch sử giao dịch trong tài khoản nếu tính năng này được hỗ trợ.

## 5. Xác nhận và rà soát giao dịch

Trước khi thanh toán, người dùng cần tự kiểm tra:

* Tài khoản đang đăng nhập.
* Gói hoặc nội dung được chọn.
* Số tiền cần thanh toán.
* Số coin hoặc quyền lợi nhận được.
* Mã thanh toán hoặc nội dung chuyển khoản nếu có.
* Chính sách hoàn tiền áp dụng.
* Điều kiện sử dụng nội dung hoặc dịch vụ.

Sau khi người dùng xác nhận và thực hiện thanh toán, giao dịch sẽ được xử lý theo hệ thống của ChapMee và đối tác thanh toán liên quan.

Nếu người dùng phát hiện thông tin sai trước khi thanh toán, người dùng nên dừng giao dịch và tạo lại đơn thanh toán mới.

## 6. Thanh toán bằng chuyển khoản hoặc mã QR

Nếu ChapMee hỗ trợ thanh toán bằng chuyển khoản hoặc mã QR, người dùng cần thực hiện đúng:

1. Đúng số tiền.
2. Đúng nội dung chuyển khoản hoặc mã thanh toán.
3. Đúng tài khoản nhận tiền được ChapMee công bố tại thời điểm giao dịch.
4. Trong thời hạn hiệu lực của đơn thanh toán nếu có.

Hệ thống có thể chỉ tự động ghi nhận giao dịch khi số tiền và mã thanh toán khớp chính xác.

Các trường hợp chuyển sai số tiền, sai nội dung, thiếu mã, thừa mã, chuyển sau khi đơn hết hạn hoặc chuyển vào tài khoản không chính thức có thể cần xử lý thủ công và mất thêm thời gian.

## 7. Thời điểm ghi nhận thanh toán

Một giao dịch chỉ được xem là thành công khi ChapMee hoặc đối tác thanh toán xác nhận đã nhận thanh toán hợp lệ.

Thời gian ghi nhận có thể phụ thuộc vào:

* Phương thức thanh toán.
* Tốc độ xử lý của ngân hàng hoặc đối tác thanh toán.
* Tình trạng hệ thống.
* Mức độ chính xác của nội dung thanh toán.
* Quy trình kiểm tra chống gian lận.

Nếu thanh toán thành công nhưng tài khoản chưa được cộng coin hoặc chưa mở quyền truy cập nội dung, người dùng cần liên hệ [support@chapmee.com](mailto:support@chapmee.com) và cung cấp mã giao dịch, thời gian thanh toán, số tiền, tài khoản ChapMee và ảnh chụp bằng chứng thanh toán nếu có.

## 8. Lịch sử giao dịch

ChapMee có thể cung cấp mục lịch sử giao dịch để người dùng kiểm tra:

* Giao dịch nạp coin.
* Giao dịch mua nội dung.
* Giao dịch hoàn coin hoặc hoàn tiền.
* Điều chỉnh số dư.
* Trạng thái giao dịch.
* Thời gian giao dịch.
* Mã giao dịch nếu có.

Người dùng nên kiểm tra lịch sử giao dịch và thông báo sớm cho ChapMee nếu phát hiện sai lệch.

## 9. Giao dịch không hợp lệ

ChapMee có quyền từ chối, tạm giữ, hủy hoặc kiểm tra thủ công giao dịch trong các trường hợp:

1. Thanh toán sai số tiền hoặc sai nội dung.
2. Mã thanh toán không khớp.
3. Giao dịch có dấu hiệu gian lận.
4. Giao dịch bị ngân hàng hoặc đối tác thanh toán cảnh báo.
5. Người dùng lợi dụng lỗi hệ thống để nhận coin hoặc nội dung không hợp lệ.
6. Giao dịch phát sinh từ tài khoản bị khóa, bị hạn chế hoặc có dấu hiệu vi phạm.
7. Có yêu cầu từ cơ quan có thẩm quyền hoặc bên thanh toán.

## 10. Bảo mật thanh toán

Người dùng không nên cung cấp mật khẩu, mã OTP, mã xác minh, thông tin ngân hàng nhạy cảm hoặc thông tin thanh toán cho bất kỳ cá nhân nào tự xưng là ChapMee.

ChapMee không yêu cầu người dùng gửi mật khẩu hoặc mã OTP qua email, tin nhắn, bình luận hoặc mạng xã hội.

Nếu phát hiện nghi vấn lừa đảo, người dùng cần dừng giao dịch và liên hệ [support@chapmee.com](mailto:support@chapmee.com).

## 11. Thanh toán ngoài nền tảng

Người dùng không nên giao dịch coin, mua bán tài khoản, mua bán chương truyện, mua nội dung hoặc thanh toán cho tác giả qua kênh ngoài ChapMee nếu giao dịch đó không được ChapMee cho phép.

ChapMee không chịu trách nhiệm đối với:

* Giao dịch tự phát giữa người dùng với nhau.
* Giao dịch qua tài khoản cá nhân không chính thức.
* Link thanh toán giả mạo.
* Mua bán coin hoặc tài khoản ngoài nền tảng.
* Tranh chấp phát sinh từ thỏa thuận bên ngoài ChapMee.

## 12. Liên hệ về thanh toán

Đối với vấn đề thanh toán, người dùng liên hệ:

* Email: [support@chapmee.com](mailto:support@chapmee.com)
* Tiêu đề gợi ý: “Hỗ trợ thanh toán - [mã giao dịch nếu có]”

Thông tin nên cung cấp:

1. Email tài khoản ChapMee.
2. Username nếu có.
3. Mã đơn hàng hoặc mã giao dịch.
4. Số tiền đã thanh toán.
5. Thời gian thanh toán.
6. Phương thức thanh toán.
7. Ảnh chụp bằng chứng thanh toán nếu có.
8. Mô tả vấn đề.`
};
