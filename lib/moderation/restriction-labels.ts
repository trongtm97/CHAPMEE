export function restrictionLabel(type: string): string {
  const labels: Record<string, string> = {
    comment_block: "Bình luận",
    post_block: "Đăng bài cộng đồng",
    story_publish_block: "Đăng truyện",
    creator_monetization_hold: "Kiếm tiền tác giả",
    payout_hold: "Rút tiền",
    recommendation_limited: "Gợi ý nội dung",
    account_suspended: "Tài khoản (tạm khóa)",
    account_banned: "Tài khoản (khóa vĩnh viễn)",
    report_block: "Gửi báo cáo",
    message_block_24h: "Nhắn tin",
    message_block_7d: "Nhắn tin",
    message_block_30d: "Nhắn tin",
    message_banned: "Nhắn tin (cấm)"
  };
  return labels[type] ?? type;
}
