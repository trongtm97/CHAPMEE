import type { CreatorEligibilityResult } from "@/types/creator-monetization";

const STATIC_GROWTH_TIPS = [
  "Tăng số chương để giữ chân độc giả",
  "Bổ sung ảnh bìa để tăng tỷ lệ bấm",
  "Tạo Reels để kéo độc giả vào truyện",
  "Trả lời bình luận để tăng tương tác",
  "Cài đặt chương trả phí sau vài chương miễn phí"
];

export function buildMonetizationGrowthTips(stats: CreatorEligibilityResult["stats"]): string[] {
  const tips = [...STATIC_GROWTH_TIPS];

  if (stats.chapters_count < 5) {
    tips.push("Đăng thêm chương đều đặn để tạo thói quen đọc");
  }

  if (stats.total_reads < 100) {
    tips.push("Chia sẻ truyện trong cộng đồng ChapMee để tăng lượt đọc");
  }

  if (stats.followers < 10) {
    tips.push("Tương tác với độc giả để họ theo dõi bạn trên nền tảng");
  }

  if (stats.violations_count > 0) {
    tips.push("Xem lại nội dung đã bị gắn cờ để tránh gián đoạn trải nghiệm độc giả");
  }

  return [...new Set(tips)];
}
