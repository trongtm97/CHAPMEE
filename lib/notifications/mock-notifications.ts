import type { NotificationItem } from "@/types/notification";

const now = Date.now();

function minutesAgo(minutes: number) {
  return new Date(now - minutes * 60_000).toISOString();
}

/** Dữ liệu mẫu khi DB chưa có thông báo — chỉ dùng để kiểm thử UI. */
export function getMockNotifications(userId: string): NotificationItem[] {
  return [
    {
      id: "mock-reading-1",
      user_id: userId,
      type: "new_chapter_from_followed_story",
      title: "Có chương mới",
      body: "Bữa Cơm Có Ghế Trống vừa cập nhật Chương 4.",
      target_type: "chapter",
      target_id: "ch-4",
      action_url: "/stories/bua-com-co-ghe-trong/episodes/4",
      metadata: {
        story_title: "Bữa Cơm Có Ghế Trống",
        story_slug: "bua-com-co-ghe-trong",
        chapter_number: 4,
        context_label: "Chương 4"
      },
      read_at: null,
      created_at: minutesAgo(2)
    },
    {
      id: "mock-author-1",
      user_id: userId,
      type: "author_thank_you_sent",
      title: "Tác giả gửi lời cảm ơn",
      body: "Minh Nguyệt cảm ơn bạn đã ủng hộ truyện Đêm Không Ngủ.",
      target_type: "story",
      target_id: "story-1",
      action_url: "/stories/dem-khong-ngu",
      metadata: {
        author_name: "Minh Nguyệt",
        story_title: "Đêm Không Ngủ"
      },
      read_at: null,
      created_at: minutesAgo(18)
    },
    {
      id: "mock-community-1",
      user_id: userId,
      type: "author_replied_to_comment",
      title: "Có người trả lời bình luận",
      body: "Ai đó đã trả lời bình luận của bạn trong nhóm Hội mê truyện ngắn.",
      target_type: "comment",
      target_id: "cmt-1",
      action_url: "/community",
      metadata: {
        group_name: "Hội mê truyện ngắn",
        context_label: "Cộng đồng"
      },
      read_at: null,
      created_at: minutesAgo(45)
    },
    {
      id: "mock-wallet-1",
      user_id: userId,
      type: "coin_topup_success",
      title: "Nạp coin thành công",
      body: "Bạn vừa nhận 500 coin vào ví. Số dư đã được cập nhật.",
      target_type: "wallet",
      target_id: "tx-1",
      action_url: "/wallet",
      metadata: {
        coin_amount: 500,
        context_label: "+500 coin"
      },
      read_at: minutesAgo(60),
      created_at: minutesAgo(90)
    },
    {
      id: "mock-wallet-2",
      user_id: userId,
      type: "chapter_purchase_success",
      title: "Mua chương thành công",
      body: "Bạn đã mở khóa Chương VIP 12 — Hành trình về phía Bắc.",
      target_type: "chapter",
      target_id: "ch-vip-12",
      action_url: "/wallet",
      metadata: {
        story_title: "Hành trình về phía Bắc",
        chapter_number: 12,
        coin_amount: 15,
        context_label: "15 coin"
      },
      read_at: minutesAgo(120),
      created_at: minutesAgo(180)
    },
    {
      id: "mock-creator-1",
      user_id: userId,
      type: "story_reached_reads_milestone",
      title: "Truyện đạt mốc lượt đọc",
      body: "Truyện của bạn vừa đạt 10.000 lượt đọc. Tiếp tục phát hành nhé!",
      target_type: "story",
      target_id: "my-story-1",
      action_url: "/studio",
      metadata: {
        story_title: "Những ngày mưa Sài Gòn",
        context_label: "10K lượt đọc"
      },
      read_at: null,
      created_at: minutesAgo(300)
    },
    {
      id: "mock-creator-2",
      user_id: userId,
      type: "creator_tip_received",
      title: "Có người tip",
      body: "Một độc giả vừa gửi tip 50 coin cho truyện của bạn.",
      target_type: "wallet",
      target_id: "tip-1",
      action_url: "/studio",
      metadata: {
        coin_amount: 50,
        context_label: "+50 coin"
      },
      read_at: null,
      created_at: minutesAgo(720)
    },
    {
      id: "mock-reading-2",
      user_id: userId,
      type: "poll_result_updated",
      title: "Poll đã có kết quả",
      body: "Kết quả bình chọn nhân vật yêu thích trong cộng đồng đã được công bố.",
      target_type: "community_post",
      target_id: "poll-1",
      action_url: "/community",
      metadata: {
        context_label: "Poll"
      },
      read_at: minutesAgo(1440),
      created_at: minutesAgo(1500)
    },
    {
      id: "mock-system-1",
      user_id: userId,
      type: "community_guideline_update",
      title: "Cập nhật chính sách",
      body: "ChapMee vừa cập nhật quy tắc cộng đồng. Vui lòng xem qua trước khi đăng bài.",
      target_type: "profile",
      target_id: null,
      action_url: "/notifications",
      metadata: {
        context_label: "Hệ thống"
      },
      read_at: minutesAgo(2880),
      created_at: minutesAgo(3000)
    },
    {
      id: "mock-wallet-3",
      user_id: userId,
      type: "creator_withdrawal_approved",
      title: "Rút tiền đã duyệt",
      body: "Yêu cầu rút doanh thu creator của bạn đã được duyệt và đang chuyển khoản.",
      target_type: "wallet",
      target_id: "wd-1",
      action_url: "/studio",
      metadata: {
        context_label: "Studio"
      },
      read_at: null,
      created_at: minutesAgo(4320)
    }
  ];
}

export function isMockNotificationId(id: string) {
  return id.startsWith("mock-");
}
