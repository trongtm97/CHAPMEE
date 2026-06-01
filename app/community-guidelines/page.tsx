import Link from "next/link";
import type { Metadata } from "next";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Quy định cộng đồng | ChapMee",
  description:
    "Quy định cộng đồng và xử lý vi phạm trên nền tảng truyện ChapMee."
};

const sections = [
  {
    id: "ton-trong",
    title: "A. Tôn trọng cộng đồng",
    items: [
      "Không quấy rối, xúc phạm, đe dọa hoặc bắt nạt thành viên khác.",
      "Không kéo hội công kích, tấn công có tổ chức hoặc khích động thù hận.",
      "Không tiết lộ thông tin cá nhân của người khác (số điện thoại, địa chỉ, CMND, v.v.) mà không có sự đồng ý."
    ]
  },
  {
    id: "noi-dung",
    title: "B. Nội dung truyện",
    items: [
      "Mọi truyện phải chọn phân loại độ tuổi phù hợp (Mọi lứa tuổi, 13+, 16+, 18+).",
      "Nội dung nhạy cảm (bạo lực, kinh dị, ngôn ngữ mạnh, chủ đề tình dục, v.v.) phải gắn nhãn cảnh báo khi đăng.",
      "Cấm nội dung bất hợp pháp theo pháp luật Việt Nam.",
      "Cấm tuyệt đối nội dung tình dục liên quan trẻ vị thành niên.",
      "Cấm hướng dẫn tự hại, tự tử hoặc khuyến khích phạm tội."
    ]
  },
  {
    id: "ban-quyen",
    title: "C. Bản quyền",
    items: [
      "Chỉ đăng truyện bạn sở hữu hoặc có quyền sử dụng hợp pháp.",
      "Không sao chép nguyên văn truyện từ nền tảng khác mà không được phép.",
      "Không dùng ảnh bìa, nhân vật hoặc tài sản có bản quyền nếu chưa được cấp phép."
    ]
  },
  {
    id: "spam",
    title: "D. Spam và gian lận",
    items: [
      "Không spam link quảng cáo hoặc nội dung lặp vô hạn.",
      "Không tạo nhiều tài khoản để tăng view, like, comment giả.",
      "Không dùng bot hoặc công cụ tự động thao túng tương tác.",
      "Không kéo thanh toán, tip hoặc giao dịch ra ngoài app khi vi phạm quy định monetization."
    ]
  },
  {
    id: "tac-gia",
    title: "E. Quy định tác giả",
    items: [
      "Không đăng chương rác, filler hoặc nội dung không có giá trị đọc.",
      "Không đánh sai phân loại tuổi để lách cảnh báo nội dung nhạy cảm.",
      "Không dùng mô tả hoặc ảnh bìa gây hiểu nhầm nội dung truyện.",
      "Không thao túng doanh thu, tip hoặc số liệu kiếm tiền."
    ]
  },
  {
    id: "xu-ly",
    title: "F. Xử lý vi phạm",
    items: [
      "Nhắc nhở: thông báo nhẹ cho lần vi phạm nhỏ hoặc nhầm lẫn.",
      "Cảnh cáo: ghi nhận vi phạm, có thể kèm strike tùy mức độ.",
      "Gỡ nội dung: ẩn hoặc gỡ truyện, chương, bình luận, bài cộng đồng vi phạm.",
      "Hạn chế tính năng: tạm chặn bình luận, đăng bài, đăng truyện hoặc kiếm tiền.",
      "Khóa tài khoản: tạm khóa hoặc khóa vĩnh viễn với vi phạm nghiêm trọng.",
      "Khiếu nại: bạn có thể gửi khiếu nại tại trang trạng thái tài khoản nếu cho rằng quyết định nhầm."
    ]
  }
];

export default function CommunityGuidelinesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <header className="space-y-3">
        <p className="page-kicker">Cộng đồng ChapMee</p>
        <h1 className="page-title">Quy định cộng đồng</h1>
        <p className="text-sm leading-7 text-zinc-400">
          ChapMee là nền tảng giải trí truyện chữ dành cho cộng đồng Việt Nam.
          Quy định này giúp không gian đọc và sáng tác an toàn, tôn trọng và
          công bằng cho độc giả lẫn tác giả.
        </p>
        <p className="text-xs text-zinc-500">
          Cập nhật: tháng 5/2026 · Liên hệ hỗ trợ qua mục Góp ý trong app.
        </p>
      </header>

      {sections.map((section) => (
        <Card className="space-y-3 p-5" id={section.id} key={section.id}>
          <h2 className="text-lg font-bold text-white">{section.title}</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-zinc-300">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      ))}

      <Card className="space-y-3 p-5">
        <h2 className="text-lg font-bold text-white">Trạng thái tài khoản</h2>
        <p className="text-sm leading-7 text-zinc-400">
          Nếu tài khoản của bạn bị cảnh cáo hoặc hạn chế, hãy xem chi tiết và
          gửi khiếu nại (nếu có) tại{" "}
          <Link className="text-cyan-300 hover:text-cyan-200" href="/me/account-status">
            Trạng thái tài khoản
          </Link>
          .
        </p>
      </Card>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link className="text-cyan-300 hover:text-cyan-200" href="/">
          Về Reels
        </Link>
        <Link className="text-cyan-300 hover:text-cyan-200" href="/me">
          Trang của tôi
        </Link>
      </div>
    </div>
  );
}
