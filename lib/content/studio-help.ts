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

export type HelpModuleBadge = "important" | "new" | "monetization" | "attention";

export type StudioHelpGuideModule = {
  id: string;
  title: string;
  summary: string;
  whenToUse: string;
  capabilities: string[];
  items: StudioHelpItem[];
  badge?: HelpModuleBadge;
  keywords: string[];
  primaryAction?: StudioHelpLink;
};

/** @deprecated Dùng StudioHelpGuideModule */
export type StudioHelpSection = StudioHelpGuideModule;

export type StudioHelpFaqItem = {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
};

export type HelpQuickNavItem = {
  id: string;
  label: string;
  sectionId: string;
};

export type HelpActionCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  keywords: string[];
};

export type HelpOnboardingStep = {
  step: number;
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
};

export const STUDIO_HELP_PAGE = {
  title: "Trung tâm hỗ trợ",
  subtitle:
    "Hướng dẫn viết, quản lý, đăng truyện, Reels và kiếm tiền trên ChapMee Studio.",
  disclaimer:
    "Trang này giúp bạn thao tác nhanh và hiểu chính sách vận hành. Không thay thế điều khoản chính thức của nền tảng."
} as const;

export const STUDIO_HELP_LEGAL_LINKS: StudioHelpLink[] = [
  { label: "Chính sách & điều khoản", href: "/chinh-sach" },
  { label: "Chính sách tác giả", href: "/chinh-sach/chinh-sach-tac-gia" },
  { label: "Chính sách kiếm tiền", href: "/chinh-sach/chinh-sach-kiem-tien" },
  { label: "Chính sách rút tiền", href: "/chinh-sach/chinh-sach-rut-tien" },
  { label: "Quy tắc cộng đồng", href: "/chinh-sach/quy-dinh-cong-dong" },
  { label: "Kiếm tiền (Studio)", href: studioPath("/monetization") }
];

export const STUDIO_HELP_QUICK_NAV: HelpQuickNavItem[] = [
  { id: "getting-started", label: "Bắt đầu viết", sectionId: "getting-started" },
  { id: "stories-chapters", label: "Truyện & chương", sectionId: "stories-chapters" },
  { id: "composer", label: "Studio Composer", sectionId: "composer" },
  { id: "bulk-import-export", label: "Nhập / xuất hàng loạt", sectionId: "bulk-import-export" },
  { id: "reels", label: "Reels", sectionId: "reels" },
  { id: "calendar", label: "Lịch đăng", sectionId: "calendar" },
  { id: "comments", label: "Bình luận & cộng đồng", sectionId: "comments" },
  { id: "monetization", label: "Kiếm tiền", sectionId: "monetization" },
  { id: "content-quality", label: "Chất lượng nội dung", sectionId: "content-quality" },
  { id: "content-rules", label: "Vi phạm & xử lý", sectionId: "enforcement" },
  { id: "faq", label: "FAQ", sectionId: "faq" },
  { id: "contact", label: "Liên hệ", sectionId: "lien-he-chapmee" }
];

export const STUDIO_HELP_ACTION_CARDS: HelpActionCard[] = [
  {
    description: "Tạo hồ sơ truyện, tiêu đề và mô tả ban đầu.",
    href: studioPath("/stories/new"),
    id: "create-story",
    keywords: ["tạo", "truyện", "mới", "bắt đầu"],
    title: "Tạo truyện đầu tiên"
  },
  {
    description: "Chọn truyện rồi thêm chương mới trong Studio.",
    href: studioPath("/stories"),
    id: "write-chapter",
    keywords: ["viết", "chương", "thêm", "episode"],
    title: "Viết chương mới"
  },
  {
    description: "Xuất, chỉnh sửa offline và nhập lại nhiều chương cùng lúc.",
    href: studioPath("/import"),
    id: "bulk-import",
    keywords: ["nhập", "xuất", "csv", "hàng loạt", "import"],
    title: "Nhập / xuất hàng loạt"
  },
  {
    description: "Tạo hook ngắn kéo độc giả vào truyện hoặc chương.",
    href: studioPath("/reels"),
    id: "create-reels",
    keywords: ["reels", "hook", "quảng bá"],
    title: "Tạo Reels kéo độc giả"
  },
  {
    description: "Theo dõi và trả lời bình luận mới từ độc giả.",
    href: studioPath("/comments"),
    id: "comments",
    keywords: ["bình luận", "comment", "phản hồi"],
    title: "Xem bình luận mới"
  },
  {
    description: "Cấu hình chương trả phí, doanh thu và rút tiền (mặc định đã mở cho tác giả).",
    href: studioPath("/monetization"),
    id: "monetization",
    keywords: ["kiếm tiền", "rút tiền", "tip", "coin"],
    title: "Kiểm tra kiếm tiền"
  },
  {
    description: "Xem cảnh báo chất lượng và hướng xử lý nội dung.",
    href: studioPath("/content-health"),
    id: "content-health",
    keywords: ["chất lượng", "cảnh báo", "vi phạm", "quality"],
    title: "Xem cảnh báo chất lượng"
  }
];

export const STUDIO_HELP_ONBOARDING_STEPS: HelpOnboardingStep[] = [
  {
    actionLabel: "Tạo truyện",
    description: "Đặt tiêu đề, chọn thể loại và lưu nháp.",
    href: studioPath("/stories/new"),
    step: 1,
    title: "Tạo truyện"
  },
  {
    actionLabel: "Sửa truyện",
    description: "Ảnh bìa và mô tả giúp truyện dễ được tìm thấy hơn.",
    href: studioPath("/stories"),
    step: 2,
    title: "Thêm ảnh bìa + mô tả"
  },
  {
    actionLabel: "Viết chương",
    description: "Nên có ít nhất 3 chương đầu trước khi đăng công khai.",
    href: studioPath("/stories"),
    step: 3,
    title: "Viết 3 chương đầu"
  },
  {
    actionLabel: "Tạo Reels",
    description: "Chọn đoạn nổi bật, twist hoặc câu thoại để kéo độc giả.",
    href: studioPath("/reels"),
    step: 4,
    title: "Tạo 1–3 Reels kéo độc giả"
  },
  {
    actionLabel: "Mở lịch đăng",
    description: "Đăng đều giúp giữ nhịp đọc và tăng tương tác.",
    href: studioPath("/calendar"),
    step: 5,
    title: "Lên lịch đăng đều"
  },
  {
    actionLabel: "Xem thống kê",
    description: "Theo dõi lượt đọc, bình luận và phản hồi để điều chỉnh nội dung.",
    href: studioPath("/analytics"),
    step: 6,
    title: "Theo dõi bình luận và số liệu"
  }
];

export const STUDIO_HELP_GUIDE_MODULES: StudioHelpGuideModule[] = [
  {
    badge: "important",
    capabilities: [
      "Tạo truyện với tiêu đề, mô tả, thể loại, ảnh bìa",
      "Thêm chương, lưu nháp hoặc đăng",
      "Lên lịch đăng chương/truyện",
      "Kiểm tra checklist trước khi công khai"
    ],
    id: "getting-started",
    items: [
      {
        body: "Vào Truyện & chương → Tạo truyện mới → nhập tiêu đề, mô tả, danh mục/thể loại, ảnh bìa.",
        links: [{ href: studioPath("/stories/new"), label: "Tạo truyện mới" }],
        title: "Tạo truyện"
      },
      {
        body: "Mở truyện → thêm chương → viết nội dung → lưu nháp hoặc đăng.",
        links: [{ href: studioPath("/stories"), label: "Truyện & chương" }],
        title: "Tạo chương"
      },
      {
        body: "Nội dung chưa hoàn tất được lưu trong Nháp. Bạn có thể quay lại chỉnh bất cứ lúc nào.",
        links: [{ href: studioPath("/drafts"), label: "Mở Nháp" }],
        title: "Lưu nháp"
      },
      {
        body: "Chọn ngày giờ đăng (múi giờ Việt Nam). Hệ thống xuất bản khi đến giờ nếu đủ điều kiện.",
        links: [{ href: studioPath("/calendar"), label: "Lịch đăng" }],
        title: "Lên lịch đăng"
      },
      {
        body: "Truyện cần đủ tiêu đề, mô tả, ảnh bìa, danh mục và không vi phạm nội dung trước khi hiển thị công khai.",
        title: "Đăng truyện"
      }
    ],
    keywords: ["bắt đầu", "tạo", "truyện", "chương", "nháp", "đăng", "lên lịch"],
    primaryAction: { href: studioPath("/stories/new"), label: "Tạo truyện mới" },
    summary: "Luồng cơ bản từ tạo truyện đến khi đăng công khai.",
    title: "Bắt đầu viết trên ChapMee",
    whenToUse: "Khi bạn mới vào Studio hoặc cần nhắc lại quy trình tạo nội dung."
  },
  {
    capabilities: [
      "Tìm kiếm, lọc theo trạng thái, thể loại, sắp xếp",
      "Theo dõi truyện thiếu bìa, thiếu mô tả, chưa có chương",
      "Thao tác hàng loạt: ẩn, hiện, xóa mềm (có xác nhận)",
      "Quản lý từng chương trong truyện"
    ],
    id: "stories-chapters",
    items: [
      {
        body: "Quản lý toàn bộ truyện của bạn tại Truyện & chương — trạng thái, số chương, cập nhật gần nhất.",
        links: [{ href: studioPath("/stories"), label: "Mở Truyện & chương" }],
        title: "Danh sách truyện"
      },
      {
        body: "Dùng tìm kiếm, lọc trạng thái, thể loại và phân trang để tìm nhanh truyện cần xử lý.",
        title: "Tìm kiếm & lọc"
      },
      {
        body: "Chọn nhiều truyện để ẩn, hiện lại hoặc xóa mềm. Thao tác xóa luôn cần xác nhận.",
        title: "Thao tác hàng loạt"
      },
      {
        body: "Studio nhắc khi thiếu ảnh bìa, thiếu mô tả hoặc chưa có chương — nên xử lý trước khi đăng.",
        title: "Theo dõi thiếu sót"
      }
    ],
    keywords: ["truyện", "chương", "quản lý", "lọc", "ẩn", "xóa", "bulk"],
    primaryAction: { href: studioPath("/stories"), label: "Quản lý truyện" },
    summary: "Quản lý truyện, chương và trạng thái xuất bản.",
    title: "Truyện & chương",
    whenToUse: "Khi bạn có nhiều truyện cần theo dõi, sửa hoặc thao tác hàng loạt."
  },
  {
    badge: "new",
    capabilities: [
      "Soạn chương theo block (Chat, Hồ sơ, Nhật ký, LitRPG…)",
      "Thêm/sắp xếp block, upload ảnh media_id nội bộ",
      "Preview mobile và Publishing Check trước gửi duyệt",
      "Import/export structured_content_json qua Nhập/xuất hàng loạt"
    ],
    id: "composer",
    items: [
      {
        body: "Composer là trình soạn chương theo block thay cho JSON thuần. Mỗi chương lưu structured_content (Composer v1) với content_format = structured_blocks.",
        title: "Composer là gì?"
      },
      {
        body: "Chat story: hội thoại tin nhắn. Hồ sơ vụ án: timeline, bằng chứng, nghi phạm. Nhật ký: mục diary. Hệ thống/game: stats, quest, reward. Văn xuôi: heading, prose, ảnh.",
        title: "Chọn mode phù hợp"
      },
      {
        body: "Bấm + Thêm block hoặc Chèn mẫu. Kéo thứ tự bằng nút ↑↓. Ảnh chỉ qua upload Studio (media_id), không dán URL ngoài.",
        title: "Thêm & sắp xếp block"
      },
      {
        body: "Tab Xem trước hoặc Xem trước mobile. Publishing Check liệt kê lỗi (chặn gửi duyệt) và cảnh báo (cần tick xác nhận).",
        title: "Preview & kiểm tra trước publish"
      },
      {
        body: "Block trống · thiếu nhân vật chat · ảnh thiếu media_id · chưa xác nhận cảnh báo nội dung truyện · JSON import sai — xem chi tiết trong Publishing Check.",
        title: "Lỗi thường gặp"
      }
    ],
    keywords: ["composer", "block", "chat", "hồ sơ", "nhật ký", "validation", "publish"],
    primaryAction: { href: studioPath("/stories"), label: "Mở truyện để soạn" },
    summary: "Soạn chương cấu trúc bằng block, kiểm tra trước khi gửi duyệt.",
    title: "ChapMee Studio Composer",
    whenToUse: "Khi truyện dùng định dạng chat, hồ sơ, nhật ký, hệ thống hoặc structured_blocks."
  },
  {
    badge: "new",
    capabilities: [
      "Tải mẫu CSV trống hoặc xuất nội dung hiện có",
      "Chỉnh sửa offline theo cột chuẩn",
      "Upload → preview → validate → xác nhận nhập",
      "Tải file lỗi nếu có dòng không hợp lệ"
    ],
    id: "bulk-import-export",
    items: [
      {
        body: "Nhập hàng loạt giúp tạo/cập nhật nhiều chương bằng file CSV UTF-8 theo mẫu chuẩn.",
        links: [{ href: studioPath("/import"), label: "Mở Nhập / xuất hàng loạt" }],
        title: "Nhập hàng loạt"
      },
      {
        body: "Xuất hàng loạt tải nội dung hiện có (truyện, chương, Reels) để chỉnh sửa offline rồi nhập lại.",
        title: "Xuất hàng loạt"
      },
      {
        body: "Quy trình đề xuất: (1) Chọn loại dữ liệu → (2) Xuất mẫu hoặc nội dung hiện có → (3) Chỉnh sửa file → (4) Upload → (5) Preview → (6) Kiểm tra lỗi → (7) Xác nhận nhập.",
        title: "Quy trình 7 bước"
      },
      {
        body: "Nội dung nhập được lưu thành nháp trước — không tự đăng công khai. Luôn kiểm tra preview trước khi ghi đè.",
        title: "Lưu ý an toàn"
      },
      {
        body: "Hỗ trợ CSV UTF-8 với header tiếng Anh ổn định (story_code, chapter_order, content, content_format, structured_content_json, validation_status…). Composer: đặt content_format=structured_blocks và dán JSON Composer v1 vào structured_content_json.",
        links: [{ href: studioPath("/import"), label: "Xem hướng dẫn import" }],
        title: "Định dạng file"
      }
    ],
    keywords: ["nhập", "xuất", "import", "export", "csv", "hàng loạt", "template", "preview"],
    primaryAction: { href: studioPath("/import"), label: "Nhập / xuất hàng loạt" },
    summary: "Tạo, cập nhật nhiều chương/truyện qua file CSV — có preview trước khi lưu.",
    title: "Nhập / xuất hàng loạt",
    whenToUse: "Khi cần đăng nhiều chương nhanh hoặc chỉnh sửa hàng loạt bên ngoài app."
  },
  {
    badge: "new",
    capabilities: [
      "Tạo Reels từ chương nổi bật, câu thoại, twist",
      "Quản lý trạng thái: nháp, lên lịch, đã đăng, ẩn, cần sửa",
      "Gắn CTA dẫn về truyện/chương",
      "Theo dõi hiệu quả trong Thống kê"
    ],
    id: "reels",
    items: [
      {
        body: "Reels là đoạn text ngắn/hook kéo độc giả vào truyện — hiển thị trên feed Reels của ChapMee.",
        links: [{ href: studioPath("/reels"), label: "Quản lý Reels" }],
        title: "Reels là gì?"
      },
      {
        body: "Có thể tạo từ chương nổi bật, câu thoại, twist hoặc tình huống gây tò mò.",
        title: "Nguồn nội dung"
      },
      {
        body: "Trạng thái: nháp, đã lên lịch, đã đăng, đã ẩn, cần sửa. Mỗi Reels nên có CTA rõ ràng.",
        title: "Trạng thái & CTA"
      }
    ],
    keywords: ["reels", "hook", "quảng bá", "cta", "kéo độc giả"],
    primaryAction: { href: studioPath("/reels"), label: "Tạo Reels" },
    summary: "Đoạn text ngắn kéo độc giả vào truyện hoặc chương.",
    title: "Reels",
    whenToUse: "Khi muốn quảng bá truyện trên feed Reels và tăng lượt đọc."
  },
  {
    capabilities: [
      "Lên lịch chương, truyện hoặc Reels",
      "Theo dõi: Sắp tới, Đã đăng, Lỗi, Đã hủy",
      "Múi giờ Việt Nam (Asia/Ho_Chi_Minh)",
      "Xử lý lịch lỗi: kiểm tra nội dung và trạng thái"
    ],
    id: "calendar",
    items: [
      {
        body: "Lên lịch đăng chương, truyện hoặc Reels tại Lịch đăng hoặc ngay trong trình soạn.",
        links: [{ href: studioPath("/calendar"), label: "Mở Lịch đăng" }],
        title: "Lên lịch nội dung"
      },
      {
        body: "Các trạng thái: Sắp tới, Đã đăng, Lỗi, Đã hủy. Thời gian hiển thị theo múi giờ Việt Nam.",
        title: "Trạng thái lịch"
      },
      {
        body: "Nếu lịch báo lỗi, kiểm tra trạng thái truyện/chương, checklist đăng và kết nối mạng rồi thử lại.",
        title: "Xử lý lỗi lịch"
      }
    ],
    keywords: ["lịch", "đăng", "schedule", "giờ", "timezone", "sắp tới"],
    primaryAction: { href: studioPath("/calendar"), label: "Xem lịch đăng" },
    summary: "Đặt thời gian đăng chương, truyện và Reels.",
    title: "Lịch đăng",
    whenToUse: "Khi muốn duy trì nhịp đăng đều mà không cần online đúng giờ."
  },
  {
    capabilities: [
      "Xem bình luận theo truyện/chương",
      "Trả lời, ghim, ẩn hoặc báo cáo bình luận",
      "Tham gia nhóm truyện trên Cộng đồng",
      "Giữ tương tác với độc giả trung thành"
    ],
    id: "comments",
    items: [
      {
        body: "Xem và trả lời bình luận mới tại Bình luận — lọc theo truyện hoặc chương.",
        links: [{ href: studioPath("/comments"), label: "Hộp thư bình luận" }],
        title: "Quản lý bình luận"
      },
      {
        body: "Ghim bình luận hữu ích, ẩn spam và báo cáo vi phạm để đội ngũ xem xét.",
        title: "Ghim / ẩn / báo cáo"
      },
      {
        body: "Nhóm truyện giúp xây cộng đồng quanh truyện. Phản hồi bình luận mới giúp giữ chân độc giả.",
        links: [{ href: "/community", external: true, label: "Cộng đồng ChapMee" }],
        title: "Cộng đồng & nhóm truyện"
      }
    ],
    keywords: ["bình luận", "comment", "cộng đồng", "ghim", "phản hồi"],
    primaryAction: { href: studioPath("/comments"), label: "Xem bình luận" },
    summary: "Tương tác với độc giả quanh truyện và bài cộng đồng.",
    title: "Bình luận & cộng đồng",
    whenToUse: "Khi cần theo dõi phản hồi độc giả hoặc xử lý bình luận spam."
  },
  {
    badge: "monetization",
    capabilities: [
      "Chương trả phí bằng coin",
      "Tip và quà tặng ảo (nếu được bật)",
      "Theo dõi số dư và lịch sử giao dịch",
      "Yêu cầu rút tiền khi đủ ngưỡng"
    ],
    id: "monetization",
    items: [
      {
        body: "Điều kiện kiếm tiền phụ thuộc cấu hình nền tảng: hồ sơ tác giả hợp lệ, tuân thủ quy định và được admin bật.",
        links: [{ href: studioPath("/monetization"), label: "Trang kiếm tiền" }],
        title: "Điều kiện bật kiếm tiền"
      },
      {
        body: "Các nguồn có thể có: chương trả phí, tip, VIP/fan club, quà tặng. Một số tính năng có thể chưa bật trên nền tảng.",
        title: "Nguồn thu nhập"
      },
      {
        body: "Rút tiền phụ thuộc ngưỡng tối thiểu, kỳ chờ và kiểm duyệt thủ công. Mọi giao dịch đều có lịch sử.",
        links: [{ href: studioPath("/finance"), label: "Tài chính Studio" }],
        title: "Rút tiền & audit"
      },
      {
        body: "ChapMee không hứa hẹn mức thu nhập cố định. Tỷ lệ chia sẻ và quy tắc có thể thay đổi theo cấu hình admin.",
        title: "Lưu ý quan trọng"
      }
    ],
    keywords: ["kiếm tiền", "rút tiền", "tip", "coin", "monetization", "thu nhập"],
    primaryAction: { href: studioPath("/monetization"), label: "Kiểm tra kiếm tiền" },
    summary: "Kiếm tiền từ truyện khi đủ điều kiện nền tảng.",
    title: "Kiếm tiền",
    whenToUse: "Khi muốn bật chương trả phí, nhận tip hoặc rút tiền."
  },
  {
    badge: "attention",
    capabilities: [
      "Xem trạng thái chất lượng từng truyện/chương",
      "Hiểu các mức: cần xử lý, đang xét, đã khôi phục, ẩn vĩnh viễn",
      "Sửa nội dung bị cảnh báo và gửi xét duyệt lại",
      "Theo dõi tín hiệu tương tác và báo cáo"
    ],
    id: "content-quality",
    items: [
      {
        body: "ChapMee đánh giá chất lượng dựa trên tín hiệu: nội dung hoàn thiện, báo cáo, tương tác, kiểm duyệt.",
        links: [{ href: studioPath("/content-health"), label: "Chất lượng nội dung" }],
        title: "Cách đánh giá"
      },
      {
        body: "Trạng thái có thể gồm: cần xử lý, đang xét duyệt, đã khôi phục, đã ẩn vĩnh viễn — tùy mức độ.",
        title: "Các trạng thái"
      },
      {
        body: "Nên sửa nội dung bị cảnh báo và gửi xét duyệt lại nếu có. Mục tiêu là giúp nội dung ổn định, không phải phạt bừa.",
        title: "Cách xử lý"
      }
    ],
    keywords: ["chất lượng", "cảnh báo", "quality", "xét duyệt", "ẩn"],
    primaryAction: { href: studioPath("/content-health"), label: "Xem chất lượng" },
    summary: "Theo dõi và xử lý cảnh báo chất lượng nội dung.",
    title: "Chất lượng nội dung",
    whenToUse: "Khi truyện/chương bị cảnh báo hoặc cần hiểu trạng thái kiểm duyệt."
  },
  {
    id: "content-rules",
    items: [
      { body: "Không đăng trùng lặp, quảng cáo ồ ạt hoặc nội dung rác.", title: "Không spam" },
      {
        body: "Chỉ đăng nội dung bạn có quyền. Không sao chép truyện người khác mà không phép.",
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
      },
      {
        body: "Không nội dung gây hại hoặc phá trải nghiệm người đọc.",
        title: "Không phá trải nghiệm đọc"
      }
    ],
    keywords: ["quy định", "vi phạm", "spam", "đạo nhái", "pháp luật", "keyword"],
    summary: "Những điều không được phép trên ChapMee.",
    title: "Quy định nội dung",
    whenToUse: "Trước khi đăng nội dung mới hoặc khi không chắc nội dung có phù hợp.",
    capabilities: [
      "Hiểu các hành vi bị cấm",
      "Tránh vi phạm khi sáng tác và quảng bá",
      "Tham khảo chính sách nội dung chính thức"
    ]
  },
  {
    id: "enforcement",
    items: [
      { body: "Lần đầu hoặc vi phạm nhẹ: ChapMee có thể nhắc và yêu cầu chỉnh sửa.", title: "Nhắc nhở" },
      { body: "Nội dung vi phạm có thể bị ẩn khỏi công khai.", title: "Ẩn nội dung" },
      { body: "Tạm thời không cho đăng mới hoặc lên lịch.", title: "Hạn chế đăng" },
      { body: "Tạm khóa rút tiền / kiếm tiền trong thời gian điều tra.", title: "Tạm khóa kiếm tiền" },
      {
        body: "Vi phạm nghiêm trọng hoặc tái phạm nhiều lần có thể dẫn tới khóa tài khoản tác giả.",
        title: "Khóa tài khoản"
      },
      {
        body: "Nếu bạn cho rằng hệ thống xử lý sai, hãy gửi góp ý / báo lỗi qua mục Liên hệ bên dưới.",
        title: "Khiếu nại & phản hồi"
      }
    ],
    keywords: ["xử lý", "vi phạm", "khóa", "ẩn", "hạn chế", "khiếu nại"],
    summary: "Các bước xử lý khi phát hiện vi phạm.",
    title: "Xử lý vi phạm",
    whenToUse: "Khi tài khoản hoặc nội dung bị hạn chế và bạn cần hiểu mức xử lý.",
    capabilities: [
      "Hiểu thang mức xử lý từ nhắc nhở đến khóa tài khoản",
      "Biết cách khiếu nại nếu xử lý sai",
      "Tránh tái phạm"
    ]
  }
];

/** Alias tương thích code cũ */
export const STUDIO_HELP_SECTIONS = STUDIO_HELP_GUIDE_MODULES;

export const STUDIO_HELP_FAQ_STATIC: Omit<StudioHelpFaqItem, "answer">[] = [
  {
    id: "create-story",
    keywords: ["tạo", "truyện", "mới", "story"],
    question: "Làm sao để tạo truyện mới?"
  },
  {
    id: "add-chapter",
    keywords: ["thêm", "chương", "viết", "episode"],
    question: "Làm sao để thêm chương?"
  },
  {
    id: "bulk-chapters",
    keywords: ["nhập", "hàng loạt", "import", "nhiều chương"],
    question: "Làm sao để nhập nhiều chương cùng lúc?"
  },
  {
    id: "bulk-export",
    keywords: ["xuất", "export", "csv", "chỉnh sửa", "offline"],
    question: "Tôi có thể xuất nội dung hiện có để chỉnh sửa hàng loạt không?"
  },
  {
    id: "not-public",
    keywords: ["hiển thị", "công khai", "duyệt", "ẩn"],
    question: "Vì sao truyện chưa hiển thị công khai?"
  },
  {
    id: "schedule-chapter",
    keywords: ["lên lịch", "đăng", "chương", "giờ"],
    question: "Làm sao để lên lịch đăng chương?"
  },
  {
    id: "reels-purpose",
    keywords: ["reels", "dùng", "hook", "quảng bá"],
    question: "Reels dùng để làm gì?"
  },
  {
    id: "change-genre",
    keywords: ["đổi", "thể loại", "danh mục", "genre"],
    question: "Tôi có thể đổi thể loại truyện không?"
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
    id: "quality-warning",
    keywords: ["chất lượng", "cảnh báo", "quality", "ẩn"],
    question: "Tại sao nội dung bị cảnh báo chất lượng?"
  },
  {
    id: "contact",
    keywords: ["liên hệ", "email", "hỗ trợ", "fanpage", "góp ý"],
    question: "Tôi có thể liên hệ ChapMee ở đâu?"
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
    "add-chapter": `Mở ${studioPath("/stories")} → chọn truyện → thêm chương mới. Viết nội dung, lưu nháp hoặc đăng/lên lịch.`,
    "bulk-chapters": `Dùng ${studioPath("/import")}: chọn loại nhập → upload CSV UTF-8 hoặc vào từng truyện để dùng template .txt → xem preview → xác nhận. Nội dung nhập lưu thành nháp trước.`,
    "bulk-export": `Có — tại ${studioPath("/import")}, tab Xuất dữ liệu: chọn loại (truyện/chương/Reels), phạm vi và tải CSV UTF-8. Chỉnh sửa offline rồi nhập lại qua tab Nhập dữ liệu.`,
    "change-genre":
      "Có — chỉnh danh mục/thể loại trong form sửa truyện. Thay đổi có thể ảnh hưởng cách truyện xuất hiện trên feed.",
    "contact":
      "Dùng mục Liên hệ ở cuối trang này: Gửi góp ý / báo lỗi, email, fanpage hoặc Telegram (theo cấu hình admin).",
    "create-story": `Vào ${studioPath("/stories/new")}, điền tiêu đề, mô tả, thể loại và ảnh bìa. Sau đó thêm chương từ Truyện & chương.`,
    "min-withdraw": input.payoutsEnabled
      ? `Ngưỡng rút tối thiểu hiện tại: ${withdrawLabel}. Luôn kiểm tra ${studioPath("/monetization")} để biết giá trị mới nhất.`
      : "Tính năng rút tiền có thể chưa bật. Xem trang Kiếm tiền để biết trạng thái mới nhất.",
    "monetization-when":
      "Khi hồ sơ tác giả active, nội dung tuân thủ quy định và admin đã bật kiếm tiền. Xem trạng thái tại trang Kiếm tiền.",
    "not-public":
      "Truyện có thể đang nháp, chờ duyệt, bị ẩn hoặc chưa đủ checklist (thiếu bìa, mô tả, thể loại…). Kiểm tra trạng thái trong Truyện & chương và Lịch đăng.",
    "quality-warning": `ChapMee phát hiện tín hiệu cần xử lý (báo cáo, nội dung chưa hoàn thiện, vi phạm nhẹ…). Xem chi tiết tại ${studioPath("/content-health")} và sửa theo hướng dẫn.`,
    "reels-purpose": `Reels là đoạn text ngắn trên feed Reels để kéo độc giả vào truyện/chương. Tạo tại ${studioPath("/reels")} với hook và CTA rõ ràng.`,
    "schedule-chapter": `Mở chương → Đăng hoặc lên lịch, hoặc dùng ${studioPath("/calendar")}. Chọn ngày giờ tương lai (giờ Việt Nam).`
  };

  return STUDIO_HELP_FAQ_STATIC.map((item) => ({
    ...item,
    answer: answers[item.id] ?? ""
  }));
}

export function normalizeHelpSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

export function matchesHelpSearch(
  query: string,
  parts: Array<string | undefined>
): boolean {
  const normalized = normalizeHelpSearch(query.trim());
  if (!normalized) {
    return true;
  }
  const haystack = normalizeHelpSearch(parts.filter(Boolean).join(" "));
  return haystack.includes(normalized);
}

export function filterGuideModules(
  modules: StudioHelpGuideModule[],
  query: string
): StudioHelpGuideModule[] {
  if (!query.trim()) {
    return modules;
  }
  return modules.filter((module) =>
    matchesHelpSearch(query, [
      module.title,
      module.summary,
      module.whenToUse,
      ...module.keywords,
      ...module.capabilities,
      ...module.items.flatMap((item) => [item.title, item.body])
    ])
  );
}

export function filterActionCards(cards: HelpActionCard[], query: string): HelpActionCard[] {
  if (!query.trim()) {
    return cards;
  }
  return cards.filter((card) =>
    matchesHelpSearch(query, [card.title, card.description, ...card.keywords])
  );
}

export function filterFaqItems(items: StudioHelpFaqItem[], query: string): StudioHelpFaqItem[] {
  if (!query.trim()) {
    return items;
  }
  return items.filter((item) =>
    matchesHelpSearch(query, [item.question, item.answer, ...item.keywords])
  );
}
