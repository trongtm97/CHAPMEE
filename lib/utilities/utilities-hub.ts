export type UtilityItem = {
  id: string;
  href: string;
  kicker: string;
  title: string;
  /** Nhãn ngắn cho sidebar / menu. */
  navLabel: string;
  description: string;
  icon: string;
};

export type UtilityGroup = {
  id: string;
  label: string;
  itemIds: string[];
};

/** Nhóm tiện ích — thứ tự hiển thị sidebar và hub. */
export const UTILITY_GROUPS: UtilityGroup[] = [
  {
    id: "featured",
    label: "Nổi bật",
    itemIds: ["boi-tinh-yeu"]
  },
  {
    id: "text",
    label: "Văn bản",
    itemIds: ["icon", "xoa-dau-tieng-viet", "chuyen-chu-hoa-thuong", "dem-tu-ky-tu"]
  },
  {
    id: "finance",
    label: "Tài chính",
    itemIds: ["chuyen-so-tien-thanh-chu", "tinh-phan-tram", "tinh-thue-vat", "tinh-lai-suat"]
  },
  {
    id: "health",
    label: "Sức khỏe",
    itemIds: ["tinh-bmi", "tinh-tdee", "tinh-ngay-quan-he-an-toan"]
  },
  {
    id: "other",
    label: "Khác",
    itemIds: ["tao-ma-qr-code", "pomodoro"]
  }
];

/** Reader-facing utilities under Khám phá → Tiện ích. */
export const UTILITY_ITEMS: UtilityItem[] = [
  {
    id: "boi-tinh-yeu",
    href: "/tien-ich/boi-tinh-yeu",
    kicker: "Tiện ích",
    title: "Bói Tình Yêu",
    navLabel: "Bói tình yêu",
    description:
      "Xem mức độ hợp nhau theo tên và ngày sinh — thần số học, cung hoàng đạo, con giáp, ngũ hành. Miễn phí, deterministic.",
    icon: "💕"
  },
  {
    id: "icon",
    href: "/tien-ich/icon",
    kicker: "Tiện ích",
    title: "Icon",
    navLabel: "Icon",
    description: "Bộ icon Facebook / emoji — chạm để sao chép nhanh.",
    icon: "😍"
  },
  {
    id: "xoa-dau-tieng-viet",
    href: "/tien-ich/xoa-dau-tieng-viet",
    kicker: "Tiện ích",
    title: "Xóa Dấu Tiếng Việt",
    navLabel: "Xóa dấu",
    description: "Chuyển tiếng Việt có dấu sang không dấu, tạo slug SEO và sao chép nhanh.",
    icon: "🔤"
  },
  {
    id: "chuyen-chu-hoa-thuong",
    href: "/tien-ich/chuyen-chu-hoa-thuong",
    kicker: "Tiện ích",
    title: "Chuyển Chữ Hoa / Thường",
    navLabel: "Hoa/thường",
    description: "Đổi chữ hoa, thường, viết hoa đầu câu/từ — giữ nguyên dấu tiếng Việt, sao chép nhanh.",
    icon: "🔠"
  },
  {
    id: "dem-tu-ky-tu",
    href: "/tien-ich/dem-tu-ky-tu",
    kicker: "Tiện ích",
    title: "Đếm Từ / Ký Tự",
    navLabel: "Đếm từ",
    description: "Đếm từ, ký tự, câu, dòng, đoạn văn và ước tính thời gian đọc — ngay trên trình duyệt.",
    icon: "🔢"
  },
  {
    id: "chuyen-so-tien-thanh-chu",
    href: "/tien-ich/chuyen-so-tien-thanh-chu",
    kicker: "Tiện ích",
    title: "Chuyển Số Tiền Thành Chữ",
    navLabel: "Số → chữ",
    description: "Đổi số tiền sang chữ tiếng Việt cho hợp đồng, hóa đơn, phiếu thu/chi — sao chép nhanh.",
    icon: "💰"
  },
  {
    id: "tinh-phan-tram",
    href: "/tien-ich/tinh-phan-tram",
    kicker: "Tiện ích",
    title: "Tính Phần Trăm",
    navLabel: "Tính %",
    description:
      "Tính % của một số, tỷ lệ %, tăng/giảm %, phần trăm thay đổi, giá sau giảm giá và tìm giá gốc — miễn phí, chạy trên trình duyệt.",
    icon: "📊"
  },
  {
    id: "tinh-thue-vat",
    href: "/tien-ich/tinh-thue-vat",
    kicker: "Tiện ích",
    title: "Công Cụ Tính Thuế VAT",
    navLabel: "Tính VAT",
    description:
      "Tính thuế VAT từ giá chưa thuế hoặc đã có thuế — hỗ trợ 0%, 5%, 8%, 10% và thuế suất tùy chỉnh. Miễn phí, chạy trên trình duyệt.",
    icon: "🧾"
  },
  {
    id: "tinh-lai-suat",
    href: "/tien-ich/tinh-lai-suat",
    kicker: "Tiện ích",
    title: "Công cụ tính lãi",
    navLabel: "Tính lãi",
    description:
      "Tính lãi suất kép, lãi tiết kiệm và lãi vay — xem tổng tiền, lãi nhận được, lịch trả nợ theo kỳ hạn. Miễn phí, chạy trên trình duyệt.",
    icon: "📈"
  },
  {
    id: "tinh-bmi",
    href: "/tien-ich/tinh-bmi",
    kicker: "Tiện ích",
    title: "Tính BMI",
    navLabel: "Tính BMI",
    description:
      "Tính chỉ số khối cơ thể (BMI) từ cân nặng và chiều cao — phân loại, khoảng cân tham khảo, chạy trên trình duyệt.",
    icon: "⚖️"
  },
  {
    id: "tinh-tdee",
    href: "/tien-ich/tinh-tdee",
    kicker: "Tiện ích",
    title: "Công Cụ Tính TDEE",
    navLabel: "Tính TDEE",
    description:
      "Tính BMR, TDEE, calo duy trì, calo giảm/tăng cân và macro tham khảo — chạy trên trình duyệt, không lưu dữ liệu.",
    icon: "🔥"
  },
  {
    id: "tinh-ngay-quan-he-an-toan",
    href: "/tien-ich/tinh-ngay-quan-he-an-toan",
    kicker: "Tiện ích",
    title: "Tính Ngày Quan Hệ An Toàn",
    navLabel: "Ngày an toàn",
    description:
      "Ước tính ngày rụng trứng, khoảng dễ thụ thai và ngày ít khả năng thụ thai — chạy trên trình duyệt, không lưu dữ liệu.",
    icon: "📅"
  },
  {
    id: "tao-ma-qr-code",
    href: "/tien-ich/tao-ma-qr-code",
    kicker: "Tiện ích",
    title: "Tạo Mã QR Code",
    navLabel: "Tạo QR",
    description:
      "Tạo mã QR cho liên kết, văn bản, WiFi, danh thiếp, email, SMS — tải PNG/SVG, chạy trên trình duyệt.",
    icon: "📱"
  },
  {
    id: "pomodoro",
    href: "/tien-ich/pomodoro",
    kicker: "Tiện ích",
    title: "Pomodoro Timer",
    navLabel: "Pomodoro",
    description:
      "Hẹn giờ Pomodoro — tập trung 25 phút, nghỉ ngắn 5 phút, nghỉ dài 15 phút. Tùy chỉnh thời gian, preset nhanh, chạy trên trình duyệt.",
    icon: "🍅"
  }
];

const utilityById = new Map(UTILITY_ITEMS.map((item) => [item.id, item]));

export function getUtilityItemsByGroup(): { group: UtilityGroup; items: UtilityItem[] }[] {
  return UTILITY_GROUPS.map((group) => ({
    group,
    items: group.itemIds
      .map((id) => utilityById.get(id))
      .filter((item): item is UtilityItem => item !== undefined)
  }));
}

export function resolveUtilityItemByPathname(pathname: string): UtilityItem | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  if (normalized === "/tien-ich") {
    return null;
  }

  let best: UtilityItem | null = null;
  for (const item of UTILITY_ITEMS) {
    if (normalized === item.href || normalized.startsWith(`${item.href}/`)) {
      if (!best || item.href.length > best.href.length) {
        best = item;
      }
    }
  }
  return best;
}
