import type { MilestoneDefinition } from "@/types/milestone";

export const milestoneDefinitions = [
  {
    key: "became_early_fan",
    title: "Trở thành Fan đời đầu",
    description: "Bạn đã theo dõi truyện khi nó còn rất sớm.",
    milestoneType: "reader",
    icon: "⚡",
    tone: "success"
  },
  {
    key: "first_saved_story",
    title: "Lưu truyện đầu tiên",
    description: "Bạn đã thêm một truyện vào tủ đọc.",
    milestoneType: "reader",
    icon: "🔖",
    tone: "default"
  },
  {
    key: "first_followed_author",
    title: "Theo dõi tác giả đầu tiên",
    description: "Bạn đã bắt đầu theo dõi một tác giả.",
    milestoneType: "reader",
    icon: "👀",
    tone: "default"
  },
  {
    key: "first_comment",
    title: "Bình luận đầu tiên",
    description: "Bạn đã để lại dấu ấn đầu tiên trong cộng đồng.",
    milestoneType: "reader",
    icon: "💬",
    tone: "warning"
  },
  {
    key: "top_fan_story",
    title: "Top Fan của truyện",
    description: "Bạn đã leo lên ngôi Top Fan của một truyện.",
    milestoneType: "reader",
    icon: "🌟",
    tone: "warning"
  },
  {
    key: "first_story_published",
    title: "Đăng truyện đầu tiên",
    description: "Tác giả đã có truyện đầu tiên được xuất bản.",
    milestoneType: "author",
    icon: "📚",
    tone: "success"
  },
  {
    key: "story_100_reads",
    title: "100 lượt đọc",
    description: "Một truyện đã vượt mốc 100 lượt đọc.",
    milestoneType: "story",
    icon: "📈",
    tone: "default"
  },
  {
    key: "story_1000_reads",
    title: "1.000 lượt đọc",
    description: "Một truyện đã chạm mốc 1.000 lượt đọc.",
    milestoneType: "story",
    icon: "🔥",
    tone: "warning"
  },
  {
    key: "story_10000_reads",
    title: "10.000 lượt đọc",
    description: "Một truyện đã bùng nổ tới 10.000 lượt đọc.",
    milestoneType: "story",
    icon: "👑",
    tone: "danger"
  },
  {
    key: "first_100_followers",
    title: "Đạt 100 follower",
    description: "Tác giả đã cán mốc 100 người theo dõi.",
    milestoneType: "author",
    icon: "❤️",
    tone: "success"
  },
  {
    key: "pinned_comment_received",
    title: "Có comment được ghim",
    description: "Một bình luận trên tác phẩm đã được ghim lại.",
    milestoneType: "author",
    icon: "📌",
    tone: "warning"
  }
] as const satisfies readonly MilestoneDefinition[];

export type MilestoneKey = (typeof milestoneDefinitions)[number]["key"];

export const milestoneDefinitionMap = new Map(
  milestoneDefinitions.map((definition) => [definition.key, definition])
);

export function getMilestoneDefinition(key: string) {
  return milestoneDefinitionMap.get(key as MilestoneKey) ?? null;
}
