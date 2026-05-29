import { studioPath } from "@/lib/studio/constants";

export type StudioHelpLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type StudioHelpItem = {
  title: string;
  body: string;
  links?: StudioHelpLink[];
};

export type StudioHelpSection = {
  id: string;
  title: string;
  summary: string;
  items: StudioHelpItem[];
};

export type StudioHelpFaqItem = {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
};

export const STUDIO_HELP_PAGE = {
  title: "Trung tâm hỗ trợ",
  subtitle: "Hướng dẫn, quy định và thông tin cần biết dành cho tác giả.",
  disclaimer:
    "Trang này là hướng dẫn thao tác và tóm tắt chính sách cho tác giả. Nó không thay thế điều khoản pháp lý đầy đủ của nền tảng."
} as const;

export const STUDIO_HELP_LEGAL_LINKS: StudioHelpLink[] = [
  { label: "Điều khoản sử dụng", href: "/terms", external: true },
  { label: "Quy tắc cộng đồng", href: "/community-guidelines", external: true },
  { label: "Chính sách nội dung", href: "/content-policy", external: true }
];

export const STUDIO_HELP_SECTIONS: StudioHelpSection[] = [
  {
    id: "getting-started",
    summary: "Luồng cơ bản từ tạo truyện đến khi đăng công khai.",
    title: "Bắt đầu viết trên ChapMee",
    items: [
      {
        body: "Vào Truyện → Tạo truyện mới, điền tiêu đề, mô tả, danh mục và thể loại.",
        links: [{ href: studioPath("/stories/new"), label: "Tạo truyện mới" }],
        title: "Tạo truyện"
      },
      {
        body: "Mở truyện → thêm chương, viết nội dung trong trình soạn. Có thể lưu nháp bất cứ lúc nào.",
        links: [{ href: studioPath("/stories"), label: "Danh sách truyện" }],
        title: "Tạo chương"
      },
      {
        body: "Nội dung tự lưu định kỳ. Bạn cũng có thể bấm lưu để đồng bộ trước khi đăng hoặc lên lịch.",
        title: "Lưu nháp"
      },
      {
        body: "Chọn ngày giờ đăng (múi giờ Việt Nam). Hệ thống sẽ xuất bản khi đến giờ nếu đủ điều kiện checklist.",
        links: [{ href: studioPath("/calendar"), label: "Lịch đăng" }],
        title: "Lên lịch đăng"
      },
      {
        body: "Khi truyện đủ tiêu đề, mô tả, ảnh bìa, danh mục và không bị chặn trạng thái, bạn có thể đăng ngay từ mục Lịch đăng.",
        title: "Đăng truyện"
      }
    ]
  },
  {
    id: "bulk-import",
    summary: "Nhập nhiều chương từ file hoặc mẫu có sẵn.",
    title: "Nhập truyện hàng loạt",
    items: [
      {
        body: "Tải mẫu trong Studio Import, điền số chương, tiêu đề và nội dung theo đúng cấu trúc.",
        links: [{ href: studioPath("/import"), label: "Mở nhập hàng loạt" }],
        title: "Dùng template mẫu"
      },
      {
        body: "Dán nội dung từ Word/Google Docs vào ô import; hệ thống tách chương theo quy tắc trong hướng dẫn trên trang.",
        title: "Dán nội dung"
      },
      {
        body: "Upload file .txt theo định dạng mẫu. Kiểm tra preview trước khi xác nhận import.",
        title: "Tải file .txt"
      }
    ]
  },
  {
    id: "content-management",
    summary: "Tối ưu truyện cho người đọc và công cụ tìm kiếm.",
    title: "Quản lý nội dung",
    items: [
      {
        body: "Chọn đúng danh mục chính và ít nhất một thể loại (tag) để độc giả dễ tìm truyện.",
        title: "Danh mục / thể loại"
      },
      {
        body: "Ảnh bìa giúp truyện nổi bật trên feed và kết quả tìm kiếm. Nên dùng ảnh rõ, đúng tỷ lệ gợi ý.",
        title: "Ảnh bìa"
      },
      {
        body: "Dùng trợ lý SEO trong form truyện/chương để chỉnh tiêu đề và mô tả hiển thị trên Google.",
        title: "SEO"
      },
      {
        body: "Swipe là đoạn quảng bá ngắn gắn truyện/chương. Tạo trong mục Swipe để thu hút độc giả.",
        links: [{ href: studioPath("/swipe"), label: "Quản lý Swipe" }],
        title: "Swipe"
      }
    ]
  },
  {
    id: "community",
    summary: "Tương tác với độc giả quanh truyện và bài cộng đồng.",
    title: "Cộng đồng",
    items: [
      {
        body: "Xem và trả lời bình luận trên truyện, chương hoặc bài cộng đồng trong mục Bình luận.",
        links: [{ href: studioPath("/comments"), label: "Hộp thư bình luận" }],
        title: "Bình luận"
      },
      {
        body: "Tham gia hoặc tạo nhóm truyện trên trang Cộng đồng (nếu tính năng đã bật cho tài khoản của bạn).",
        links: [{ href: "/community", external: true, label: "Cộng đồng ChapMee" }],
        title: "Nhóm truyện"
      },
      {
        body: "Bạn có thể ghim bình luận hữu ích, ẩn spam và báo cáo nội dung vi phạm để đội ngũ xem xét.",
        title: "Ghim / ẩn / báo cáo"
      }
    ]
  },
  {
    id: "monetization",
    summary: "Kiếm tiền từ truyện khi đủ điều kiện nền tảng.",
    title: "Kiếm tiền",
    items: [
      {
        body: "Cần hồ sơ tác giả hợp lệ, tuân thủ quy định và được ChapMee bật kiếm tiền (theo cấu hình admin).",
        links: [{ href: studioPath("/monetization"), label: "Trang kiếm tiền" }],
        title: "Điều kiện bật kiếm tiền"
      },
      {
        body: "Đặt chương trả phí bằng coin trong cài đặt từng chương/truyện, trong khung giá cho phép.",
        title: "Chương trả phí"
      },
      {
        body: "Bật nhận tip nếu được phép; cảm ơn độc giả bằng tin nhắn tuỳ chọn.",
        title: "Tip"
      },
      {
        body: "Gửi yêu cầu rút tiền khi đủ số dư và đạt ngưỡng tối thiểu. Thời gian xử lý có thể có kỳ chờ.",
        title: "Rút tiền"
      },
      {
        body: "Tỷ lệ chia sẻ, mức rút tối thiểu và quy tắc thanh toán có thể thay đổi theo cấu hình admin — xem trang Kiếm tiền để biết giá trị hiện tại.",
        title: "Chính sách có thể thay đổi"
      }
    ]
  },
  {
    id: "content-rules",
    summary: "Những điều không được phép trên ChapMee.",
    title: "Quy định nội dung",
    items: [
      { body: "Không đăng trùng lặp, quảng cáo ồ ạt hoặc nội dung rác.", title: "Không spam" },
      {
        body: "Chỉ đăng nội dung bạn có quyền. Không sao chép truyện/người khác mà không phép.",
        title: "Không đạo nhái"
      },
      {
        body: "Không nội dung vi phạm pháp luật Việt Nam hoặc quy định nền tảng.",
        title: "Không vi phạm pháp luật"
      },
      {
        body: "Không quấy rối, đe dọa, phân biệt hay thù ghét cá nhân/nhóm.",
        title: "Không quấy rối / thù ghét"
      },
      { body: "Không lừa đảo, giả mạo hoặc hướng dẫn gian lận.", title: "Không lừa đảo" },
      {
        body: "Không nhồi từ khóa vô nghĩa hoặc gây hiểu nhầm về thể loại/nội dung.",
        title: "Không lạm dụng keyword"
      }
    ]
  },
  {
    id: "enforcement",
    summary: "Các bước xử lý khi phát hiện vi phạm.",
    title: "Xử lý vi phạm",
    items: [
      { body: "Lần đầu hoặc vi phạm nhẹ: ChapMee có thể nhắc và yêu cầu chỉnh sửa.", title: "Nhắc nhở" },
      { body: "Nội dung vi phạm có thể bị ẩn khỏi công khai.", title: "Ẩn nội dung" },
      { body: "Tạm thời không cho đăng mới hoặc lên lịch.", title: "Hạn chế đăng" },
      { body: "Tạm khóa rút tiền / kiếm tiền trong thời gian điều tra.", title: "Tạm khóa kiếm tiền" },
      {
        body: "Vi phạm nghiêm trọng hoặc tái phạm nhiều lần có thể dẫn tới khóa tài khoản tác giả.",
        title: "Khóa tài khoản"
      }
    ]
  }
];

/** FAQ tĩnh; câu hỏi có số liệu động được bổ sung trong `buildStudioHelpFaq`. */
export const STUDIO_HELP_FAQ_STATIC: Omit<StudioHelpFaqItem, "answer">[] = [
  {
    id: "create-story",
    keywords: ["tạo", "truyện", "mới", "story"],
    question: "Làm sao để tạo truyện mới?"
  },
  {
    id: "bulk-chapters",
    keywords: ["nhập", "hàng loạt", "import", "nhiều chương"],
    question: "Làm sao để nhập nhiều chương cùng lúc?"
  },
  {
    id: "not-public",
    keywords: ["hiển thị", "công khai", "duyệt", "ẩn"],
    question: "Vì sao truyện của tôi chưa hiển thị công khai?"
  },
  {
    id: "schedule-chapter",
    keywords: ["lên lịch", "đăng", "chương", "giờ"],
    question: "Làm sao để lên lịch đăng chương?"
  },
  {
    id: "create-swipe",
    keywords: ["swipe", "quảng bá", "hook"],
    question: "Làm sao để tạo nội dung Swipe?"
  },
  {
    id: "change-genre",
    keywords: ["đổi", "thể loại", "danh mục", "genre"],
    question: "Tôi có thể đổi thể loại truyện không?"
  },
  {
    id: "new-tag",
    keywords: ["thể loại mới", "tag", "đề xuất"],
    question: "Tôi muốn thêm thể loại mới thì làm thế nào?"
  },
  {
    id: "monetization-when",
    keywords: ["kiếm tiền", "bật", "monetization"],
    question: "Khi nào tôi được bật kiếm tiền?"
  },
  {
    id: "min-withdraw",
    keywords: ["rút", "tối thiểu", "tiền", "payout"],
    question: "Rút tiền tối thiểu là bao nhiêu?"
  },
  {
    id: "contact",
    keywords: ["liên hệ", "email", "hỗ trợ", "fanpage"],
    question: "Tôi cần liên hệ ChapMee ở đâu?"
  }
];

export function buildStudioHelpFaq(input: {
  minWithdrawAmountVnd: number;
  payoutsEnabled: boolean;
}): StudioHelpFaqItem[] {
  const withdrawLabel =
    input.minWithdrawAmountVnd > 0
      ? `${input.minWithdrawAmountVnd.toLocaleString("vi-VN")} VND`
      : "theo cấu hình hiện tại trên trang Kiếm tiền";

  const answers: Record<string, string> = {
    "create-story": `Vào ${studioPath("/stories/new")} (menu Truyện → tạo mới), điền thông tin cơ bản và lưu. Sau đó thêm chương từ trang truyện.`,
    "bulk-chapters": `Dùng ${studioPath("/import")}: tải mẫu, dán hoặc upload file .txt, xem preview rồi xác nhận import vào truyện đã chọn.`,
    "not-public":
      "Truyện có thể đang ở trạng thái nháp, chờ duyệt, bị ẩn hoặc chưa đủ checklist đăng (thiếu bìa, mô tả, danh mục…). Kiểm tra trạng thái trong Studio và mục Lịch đăng.",
    "schedule-chapter": `Mở chương → Đăng hoặc lên lịch, hoặc dùng ${studioPath("/calendar")}. Chọn ngày giờ tương lai (giờ Việt Nam).`,
    "create-swipe": `Vào ${studioPath("/swipe")} → tạo Swipe, chọn truyện/chương liên kết, viết hook và nội dung ngắn, rồi đăng hoặc lên lịch.`,
    "change-genre":
      "Có — chỉnh danh mục/thể loại trong form sửa truyện. Thay đổi có thể ảnh hưởng cách truyện xuất hiện trên feed; nên chọn đúng từ đầu.",
    "new-tag":
      "Thể loại do ChapMee quản lý. Nếu thiếu tag phù hợp, liên hệ đội ngũ qua kênh bên dưới và mô tả đề xuất.",
    "monetization-when":
      "Khi hồ sơ tác giả active, nội dung tuân thủ quy định và admin đã bật kiếm tiền cho bạn. Xem trạng thái tại trang Kiếm tiền.",
    "min-withdraw": input.payoutsEnabled
      ? `Ngưỡng rút tối thiểu hiện tại: ${withdrawLabel}. Số liệu có thể thay đổi — luôn kiểm tra trên ${studioPath("/monetization")}.`
      : "Tính năng rút tiền có thể chưa bật trên nền tảng. Xem trang Kiếm tiền để biết trạng thái mới nhất.",
    contact:
      "Dùng mục Liên hệ ChapMee ở cuối trang này (email, fanpage, Telegram theo cấu hình admin)."
  };

  return STUDIO_HELP_FAQ_STATIC.map((item) => ({
    ...item,
    answer: answers[item.id] ?? ""
  }));
}
