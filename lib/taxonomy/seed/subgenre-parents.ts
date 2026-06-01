import { slugify } from "@/lib/slugify";

/** Maps subgenre display names → main_genre slug (parent). */
const SUBGENRE_PARENT_GROUPS: Array<{ parentSlug: string; names: string[] }> = [
  {
    parentSlug: "ngon-tinh",
    names: [
      "Ngọt sủng",
      "Ngược tâm",
      "Ngược thân",
      "Cưới trước yêu sau",
      "Yêu thầm",
      "Gương vỡ lại lành",
      "Tình đầu",
      "Tình yêu trưởng thành",
      "Tình yêu công sở",
      "Hợp đồng hôn nhân",
      "Bạn thân thành người yêu",
      "Kẻ thù thành người yêu",
      "Tình yêu chữa lành",
      "Hôn nhân",
      "Ly hôn"
    ]
  },
  {
    parentSlug: "do-thi",
    names: [
      "Tổng tài",
      "Hào môn",
      "Công sở",
      "Khởi nghiệp",
      "Kinh doanh",
      "Giới giải trí",
      "Livestream / mạng xã hội",
      "Báo chí"
    ]
  },
  {
    parentSlug: "gia-dinh",
    names: ["Gia đình", "Nuôi con"]
  },
  {
    parentSlug: "doi-thuong",
    names: ["Làng quê", "Đời sống thành thị"]
  },
  {
    parentSlug: "hoc-duong",
    names: ["Đời học sinh", "Đời sinh viên"]
  },
  {
    parentSlug: "tu-tien",
    names: [
      "Luyện khí",
      "Trúc cơ",
      "Kim đan",
      "Nguyên anh",
      "Phi thăng",
      "Linh khí",
      "Đan dược",
      "Trận pháp",
      "Bí cảnh"
    ]
  },
  {
    parentSlug: "kiem-hiep",
    names: ["Tông môn", "Ma đạo", "Chính đạo", "Linh thú"]
  },
  {
    parentSlug: "fantasy",
    names: [
      "Phép thuật",
      "Rồng",
      "Ma pháp học viện",
      "Thần thoại",
      "Quỷ tộc",
      "Thiên thần",
      "Ác ma",
      "Quái vật",
      "Dị năng",
      "Khế ước",
      "Triệu hồi"
    ]
  },
  {
    parentSlug: "lich-su",
    names: ["Vương quốc", "Đế chế"]
  },
  {
    parentSlug: "game-he-thong",
    names: [
      "Hệ thống nhiệm vụ",
      "Level up",
      "Thanh trạng thái",
      "Kỹ năng",
      "Hầm ngục",
      "Boss",
      "Bang hội",
      "Võng du thực tế ảo",
      "Game sinh tồn",
      "Game kinh dị"
    ]
  },
  {
    parentSlug: "kinh-di",
    names: [
      "Ma quỷ",
      "Ám ảnh",
      "Nhà hoang",
      "Trường học ma ám",
      "Nghi lễ",
      "Lời nguyền",
      "Đô thị truyền thuyết"
    ]
  },
  {
    parentSlug: "tam-linh",
    names: ["Tâm linh Việt Nam"]
  },
  {
    parentSlug: "trinh-tham",
    names: [
      "Phá án",
      "Serial killer",
      "Điều tra tâm lý",
      "Hồ sơ tội phạm",
      "Thám tử tư",
      "Cảnh sát",
      "Pháp y"
    ]
  },
  {
    parentSlug: "khoa-hoc-vien-tuong",
    names: [
      "Du hành thời gian",
      "Không gian vũ trụ",
      "Robot",
      "AI hư cấu",
      "Cyborg",
      "Thực tại ảo",
      "Đa vũ trụ",
      "Xã hội tương lai"
    ]
  },
  {
    parentSlug: "sinh-ton",
    names: [
      "Dịch bệnh",
      "Thiên tai",
      "Thế giới sụp đổ",
      "Sinh tồn nhóm",
      "Căn cứ",
      "Zombie"
    ]
  },
  {
    parentSlug: "y-khoa",
    names: ["Y tế"]
  },
  {
    parentSlug: "phap-luat",
    names: ["Luật pháp"]
  }
];

export const SUBGENRE_PARENT_SLUG_BY_SUBGENRE_SLUG: Record<string, string> =
  Object.fromEntries(
    SUBGENRE_PARENT_GROUPS.flatMap((group) =>
      group.names.map((name) => [slugify(name), group.parentSlug])
    )
  );

export function parentSlugForSubgenreName(name: string): string | undefined {
  return SUBGENRE_PARENT_SLUG_BY_SUBGENRE_SLUG[slugify(name)];
}
