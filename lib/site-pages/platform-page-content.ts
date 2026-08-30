/**
 * Nội dung trang nền tảng (footer / pháp lý).
 * Thay [Tên chủ sở hữu], [Địa chỉ], [Mã số thuế]… bằng thông tin thật trước khi công bố BCT.
 */

import {
  PLATFORM_PAGE_CONTENT_PART2,
  PLATFORM_PAGE_CONTENT_PART3,
  PLATFORM_PAGE_CONTENT_PART4
} from "@/lib/site-pages/content";
import { PLATFORM_CONTENT_UPDATED_AT } from "@/lib/site-pages/platform-page-updated";
import { TERMS_PAGE_CONTENT } from "@/lib/site-pages/platform-page-content-terms";

export { PLATFORM_CONTENT_UPDATED_AT };

export type { PlatformPageContentMeta } from "@/lib/site-pages/platform-page-types";
import type { PlatformPageContentMeta } from "@/lib/site-pages/platform-page-types";

const UPDATED_LINE = `**Cập nhật lần cuối:** ${PLATFORM_CONTENT_UPDATED_AT}\n\n`;

export const PLATFORM_PAGE_CONTENT: Record<string, PlatformPageContentMeta> = {
  "/about": {
    slug: "about",
    title: "Giới thiệu ChapMee",
    summary:
      "ChapMee là nền tảng giải trí text/story dành cho người đọc và tác giả.",
    content: `${UPDATED_LINE}ChapMee là nền tảng giải trí text/story dành cho người đọc và tác giả. ChapMee tập trung vào trải nghiệm đọc, khám phá, theo dõi và tương tác với các nội dung truyện, chương truyện, bài viết sáng tạo và các hình thức giải trí bằng văn bản.

ChapMee hướng tới việc xây dựng một không gian đọc hiện đại, nơi người dùng có thể khám phá nội dung theo nhiều cách khác nhau như Reels, Discover, Community và hồ sơ cá nhân. Người đọc có thể theo dõi tác giả, lưu nội dung yêu thích, tiếp tục đọc, tham gia cộng đồng và tương tác với các nội dung phù hợp với sở thích.

Đối với tác giả, ChapMee cung cấp khu vực Studio để đăng tải, quản lý, chỉnh sửa và phát triển nội dung của mình. Một số tính năng dành cho tác giả có thể bao gồm quản lý truyện, chương, bản nháp, bình luận, thống kê, xác minh, kiếm tiền và các công cụ hỗ trợ xuất bản nội dung, tùy theo từng giai đoạn phát triển của nền tảng.

## Dịch vụ của ChapMee

ChapMee có thể cung cấp các nhóm dịch vụ sau:

1. Dịch vụ đọc và khám phá nội dung text/story.
2. Dịch vụ tài khoản người dùng, hồ sơ cá nhân và thư viện đọc.
3. Dịch vụ cộng đồng, bình luận, theo dõi và tương tác.
4. Dịch vụ Studio dành cho tác giả.
5. Dịch vụ nội dung số có thể miễn phí hoặc có điều kiện truy cập.
6. Dịch vụ nạp coin, mua chương, mua gói nội dung, tip hoặc các hình thức thanh toán khác nếu được ChapMee triển khai.
7. Dịch vụ quảng cáo hoặc hiển thị nội dung được tài trợ nếu được ChapMee triển khai.

Các tính năng cụ thể có thể thay đổi theo từng thời điểm. ChapMee sẽ cập nhật thông tin trên website khi có thay đổi quan trọng liên quan đến dịch vụ, quyền lợi người dùng hoặc chính sách sử dụng.

## Đối tượng sử dụng

ChapMee dành cho:

* Người đọc yêu thích truyện và nội dung giải trí dạng văn bản.
* Tác giả, người sáng tác, người dịch hoặc người đăng tải nội dung hợp pháp.
* Người dùng tham gia cộng đồng thảo luận về truyện, tác giả, thể loại và nội dung liên quan.
* Đối tác, nhà quảng cáo hoặc bên hợp tác phù hợp với định hướng của ChapMee.

Người dùng cần tuân thủ Điều khoản sử dụng, Chính sách nội dung, Nguyên tắc cộng đồng và các chính sách liên quan khi sử dụng ChapMee.

## Nguyên tắc hoạt động

ChapMee hướng tới các nguyên tắc sau:

* Tôn trọng người đọc, tác giả và cộng đồng.
* Khuyến khích nội dung hợp pháp, sáng tạo và có trách nhiệm.
* Bảo vệ quyền riêng tư và dữ liệu cá nhân của người dùng.
* Minh bạch trong các giao dịch, chính sách thanh toán, hoàn tiền và kiếm tiền nếu có.
* Tôn trọng quyền sở hữu trí tuệ và xử lý nghiêm nội dung vi phạm bản quyền.
* Không khuyến khích gian lận, spam, thao túng tương tác hoặc lợi dụng nền tảng.

## Thông tin liên hệ

Người dùng có thể liên hệ ChapMee qua các kênh sau:

* Hỗ trợ chung: [support@chapmee.com](mailto:support@chapmee.com)
* Quyền riêng tư: [privacy@chapmee.com](mailto:privacy@chapmee.com)
* Bản quyền: [copyright@chapmee.com](mailto:copyright@chapmee.com)
* Hợp tác kinh doanh: [business@chapmee.com](mailto:business@chapmee.com)

Các thông tin pháp lý chi tiết hơn được công bố tại trang [Chính sách & pháp lý](/legal) của ChapMee.`
  },

  "/contact": {
    slug: "contact",
    title: "Liên hệ ChapMee",
    summary: "Kênh hỗ trợ, phản hồi, khiếu nại và hợp tác chính thức của ChapMee.",
    content: `${UPDATED_LINE}ChapMee tiếp nhận yêu cầu hỗ trợ, phản hồi, khiếu nại, báo cáo vi phạm và đề nghị hợp tác thông qua các kênh liên hệ chính thức được công bố trên trang này.

Để việc xử lý được nhanh hơn, người dùng nên gửi đúng nhóm email phù hợp với nội dung cần liên hệ.

## Kênh hỗ trợ chính thức

### Hỗ trợ người dùng

Email: [support@chapmee.com](mailto:support@chapmee.com)

Dùng cho các vấn đề:

* Hỗ trợ tài khoản.
* Lỗi đăng nhập hoặc lỗi sử dụng website.
* Lỗi đọc truyện, lưu truyện, theo dõi, bình luận.
* Góp ý trải nghiệm sản phẩm.
* Các yêu cầu hỗ trợ chung khác.

### Quyền riêng tư và dữ liệu cá nhân

Email: [privacy@chapmee.com](mailto:privacy@chapmee.com)

Dùng cho các vấn đề:

* Yêu cầu liên quan đến dữ liệu cá nhân.
* Câu hỏi về Chính sách quyền riêng tư.
* Yêu cầu chỉnh sửa, cập nhật hoặc xử lý dữ liệu cá nhân theo quy định áp dụng.
* Báo cáo nghi ngờ rò rỉ hoặc sử dụng sai dữ liệu cá nhân.

### Bản quyền và sở hữu trí tuệ

Email: [copyright@chapmee.com](mailto:copyright@chapmee.com)

Dùng cho các vấn đề:

* Báo cáo nội dung vi phạm bản quyền.
* Yêu cầu gỡ nội dung vi phạm quyền sở hữu trí tuệ.
* Khiếu nại về việc nội dung bị gỡ do báo cáo bản quyền.
* Vấn đề liên quan đến quyền tác giả, quyền liên quan hoặc quyền sử dụng nội dung.

### Hợp tác kinh doanh

Email: [business@chapmee.com](mailto:business@chapmee.com)

Dùng cho các vấn đề:

* Hợp tác nội dung.
* Hợp tác quảng cáo.
* Hợp tác thương hiệu.
* Đề xuất chiến dịch truyền thông hoặc đối tác.

## Thông tin cần cung cấp khi liên hệ

Để ChapMee xử lý yêu cầu hiệu quả hơn, người dùng nên cung cấp:

1. Họ tên hoặc tên tài khoản ChapMee nếu có.
2. Email liên hệ.
3. Đường dẫn liên quan, ví dụ link truyện, chương, hồ sơ, bình luận hoặc giao dịch.
4. Mô tả rõ vấn đề cần hỗ trợ.
5. Ảnh chụp màn hình hoặc bằng chứng liên quan nếu có.
6. Mã giao dịch hoặc mã thanh toán nếu yêu cầu liên quan đến thanh toán.

Không gửi mật khẩu, mã OTP, mã xác minh, thông tin thẻ thanh toán hoặc thông tin nhạy cảm không cần thiết qua email.

## Thời gian phản hồi

ChapMee sẽ cố gắng phản hồi các yêu cầu hợp lệ trong thời gian sớm nhất. Thời gian xử lý có thể thay đổi tùy theo mức độ phức tạp của yêu cầu, lượng yêu cầu đang tiếp nhận và loại vấn đề cần xác minh.

Các yêu cầu liên quan đến thanh toán, bản quyền, dữ liệu cá nhân hoặc vi phạm nghiêm trọng có thể cần thêm thời gian để kiểm tra.

## Kênh mạng xã hội chính thức

Các kênh mạng xã hội chính thức của ChapMee, nếu đã được công bố, có thể được truy cập qua:

* Facebook: https://chapmee.com/facebook
* TikTok: https://chapmee.com/tiktok
* YouTube: https://chapmee.com/youtube

Nếu các kênh này chưa hoạt động, ChapMee sẽ cập nhật khi có thông tin chính thức. Người dùng nên kiểm tra link được công bố trên website ChapMee để tránh các trang giả mạo.`
  },

  "/legal": {
    slug: "legal-index",
    title: "Chính sách & pháp lý",
    summary:
      "Tổng hợp điều khoản, chính sách giao dịch và quy định dành cho tác giả trên ChapMee.",
    content: `${UPDATED_LINE}Trang này tổng hợp các chính sách, điều khoản và thông tin pháp lý liên quan đến việc sử dụng ChapMee. Người dùng nên đọc kỹ các nội dung này trước khi sử dụng dịch vụ, đăng tải nội dung, thực hiện giao dịch hoặc tham gia các chương trình dành cho tác giả.

Việc tiếp tục truy cập hoặc sử dụng ChapMee có thể được hiểu là người dùng đã đọc, hiểu và đồng ý tuân thủ các điều khoản, chính sách được công bố, trong phạm vi pháp luật cho phép.

## Thông tin chung

* [Giới thiệu ChapMee](/about)
* [Liên hệ ChapMee](/contact)
* [Thông tin chủ sở hữu website](/legal/business-info)

## Pháp lý chung

* [Điều khoản sử dụng](/legal/terms)
* [Chính sách quyền riêng tư](/legal/privacy)
* [Chính sách cookie](/legal/cookies)
* [Chính sách nội dung](/legal/content-policy)
* [Nguyên tắc cộng đồng](/legal/community-guidelines)
* [Chính sách bản quyền](/legal/copyright)
* [Chính sách DMCA](/legal/dmca)
* [Chính sách quảng cáo](/legal/advertising-policy)

## Giao dịch & Bộ Công Thương

* [Chính sách thanh toán](/legal/payment-policy)
* [Chính sách hoàn tiền](/legal/refund-policy)
* [Chính sách cung ứng dịch vụ số](/legal/service-delivery)
* [Khiếu nại & giải quyết tranh chấp](/legal/complaints-disputes)

## Tác giả & nền tảng

* [Quy chế hoạt động nền tảng/sàn](/legal/marketplace-regulation)
* [Điều khoản dành cho tác giả](/legal/creator-terms)
* [Chính sách kiếm tiền tác giả](/legal/creator-monetization-policy)
* [Chính sách xác minh tác giả](/legal/creator-verification-policy)

## Trạng thái thông báo/đăng ký Bộ Công Thương

Thông tin thông báo hoặc đăng ký với cơ quan quản lý thương mại điện tử sẽ được ChapMee cập nhật khi có xác nhận chính thức.

ChapMee không hiển thị biểu tượng “Đã thông báo” hoặc “Đã đăng ký” khi chưa được xác nhận hợp lệ. Nếu biểu tượng hoặc đường dẫn xác nhận được hiển thị trong tương lai, người dùng có thể bấm vào để kiểm tra thông tin tương ứng trên cổng thông tin chính thức.

## Thay đổi chính sách

ChapMee có thể cập nhật các chính sách và điều khoản theo nhu cầu vận hành, thay đổi sản phẩm, thay đổi quy định pháp luật hoặc yêu cầu quản lý. Khi có thay đổi quan trọng, ChapMee sẽ cố gắng thông báo bằng phương thức phù hợp, ví dụ thông báo trên website, trong tài khoản người dùng hoặc qua email nếu cần.

Người dùng nên kiểm tra trang Chính sách & pháp lý định kỳ để nắm thông tin mới nhất.`
  },

  "/legal/business-info": {
    slug: "business-info",
    title: "Thông tin chủ sở hữu website",
    summary:
      "Thông tin chủ sở hữu và đơn vị vận hành website ChapMee tại chapmee.com.",
    content: `${UPDATED_LINE}Trang này công bố thông tin về chủ sở hữu và đơn vị vận hành website ChapMee tại tên miền chapmee.com. Các thông tin dưới đây cần được cập nhật theo thông tin pháp lý thực tế của chủ sở hữu website trước khi ChapMee thực hiện thủ tục thông báo hoặc đăng ký với cơ quan quản lý có thẩm quyền.

## Thông tin website

* Tên website: ChapMee
* Tên miền chính: chapmee.com
* Loại hình website: Nền tảng giải trí text/story, cung cấp nội dung số, công cụ đọc, đăng tải, quản lý và tương tác với nội dung truyện/văn bản.
* Đối tượng sử dụng: Người đọc, tác giả, người đăng tải nội dung, cộng đồng người dùng và các bên hợp tác phù hợp.

## Thông tin chủ sở hữu

* Tên chủ sở hữu/đơn vị vận hành: [Tên chủ sở hữu hoặc tên doanh nghiệp/hộ kinh doanh]
* Loại hình: [Cá nhân / Hộ kinh doanh / Doanh nghiệp / Tổ chức]
* Địa chỉ đăng ký/trụ sở: [Địa chỉ thật]
* Mã số thuế hoặc số đăng ký kinh doanh: [Mã số thuế / số đăng ký kinh doanh nếu có]
* Ngày cấp: [ngày cấp nếu có]
* Nơi cấp: [nơi cấp nếu có]
* Người đại diện nếu là tổ chức/doanh nghiệp: [Họ tên người đại diện]
* Email liên hệ chính: [support@chapmee.com](mailto:support@chapmee.com)
* Email liên hệ về quyền riêng tư: [privacy@chapmee.com](mailto:privacy@chapmee.com)
* Email liên hệ về bản quyền: [copyright@chapmee.com](mailto:copyright@chapmee.com)
* Email liên hệ kinh doanh: [business@chapmee.com](mailto:business@chapmee.com)
* Số điện thoại liên hệ: [Số điện thoại nếu công bố]

## Phạm vi hoạt động của ChapMee

ChapMee cung cấp môi trường trực tuyến để người dùng đọc, khám phá, lưu, theo dõi, bình luận và tương tác với nội dung text/story.

Tùy theo từng giai đoạn phát triển, ChapMee có thể cung cấp thêm các tính năng như:

1. Tài khoản người dùng và hồ sơ cá nhân.
2. Công cụ Studio dành cho tác giả.
3. Đăng tải, quản lý và xuất bản nội dung.
4. Cộng đồng thảo luận xoay quanh truyện, tác giả, thể loại hoặc chủ đề liên quan.
5. Nạp coin, mua chương, mua gói nội dung, tip hoặc các hình thức giao dịch nội dung số khác nếu được triển khai.
6. Chính sách kiếm tiền dành cho tác giả nếu được ChapMee kích hoạt.
7. Hiển thị quảng cáo hoặc nội dung được tài trợ nếu được ChapMee triển khai.

## Thông tin Bộ Công Thương

Thông tin thông báo hoặc đăng ký website thương mại điện tử với cơ quan quản lý có thẩm quyền sẽ được cập nhật tại trang này sau khi ChapMee hoàn tất thủ tục và nhận được xác nhận chính thức.

Hiện tại, ChapMee không tự công bố trạng thái “Đã thông báo” hoặc “Đã đăng ký” nếu chưa có xác nhận hợp lệ.

## Cam kết minh bạch thông tin

ChapMee cam kết công bố thông tin trung thực, rõ ràng và cập nhật khi có thay đổi quan trọng liên quan đến chủ sở hữu website, kênh liên hệ, chính sách giao dịch, điều khoản sử dụng và các thông tin cần thiết khác.

Người dùng có thể liên hệ ChapMee qua [support@chapmee.com](mailto:support@chapmee.com) nếu phát hiện thông tin chưa chính xác hoặc cần yêu cầu làm rõ.`
  },

  "/legal/terms": {
    slug: "terms",
    title: "Điều khoản sử dụng ChapMee",
    summary:
      "Điều kiện áp dụng khi truy cập, sử dụng tài khoản, nội dung và giao dịch trên ChapMee.",
    content: TERMS_PAGE_CONTENT
  },

  ...PLATFORM_PAGE_CONTENT_PART2,
  ...PLATFORM_PAGE_CONTENT_PART3,
  ...PLATFORM_PAGE_CONTENT_PART4
};
