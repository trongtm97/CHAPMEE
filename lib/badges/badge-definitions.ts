import type { BadgeDefinition, BadgeRarity } from "@/types/badge";

export const badgeDefinitions = [
  {
    key: "reader_new",
    name: "Người đọc mới",
    description: "Tài khoản đọc mới trong tuần đầu trên ChapMee.",
    type: "reader",
    icon: "✨",
    rarity: "common"
  },
  {
    key: "early_fan",
    name: "Fan đời đầu",
    description: "Theo dõi truyện khi nó còn rất sớm.",
    type: "reader",
    icon: "⚡",
    rarity: "rare"
  },
  {
    key: "story_saver",
    name: "Người lưu truyện",
    description: "Đánh dấu truyện để đọc sau.",
    type: "reader",
    icon: "🔖",
    rarity: "common"
  },
  {
    key: "author_follower",
    name: "Người theo dõi tác giả",
    description: "Theo dõi tác giả để không bỏ lỡ chương mới.",
    type: "reader",
    icon: "👀",
    rarity: "common"
  },
  {
    key: "active_commenter",
    name: "Bình luận tích cực",
    description: "Đã để lại nhiều bình luận hữu ích cho cộng đồng.",
    type: "reader",
    icon: "💬",
    rarity: "rare"
  },
  {
    key: "top_comment_candidate",
    name: "Comment được thích",
    description: "Bình luận bắt đầu nhận được nhiều lượt thích.",
    type: "reader",
    icon: "🌟",
    rarity: "epic"
  },
  {
    key: "author_new",
    name: "Tác giả mới",
    description: "Vừa mở hồ sơ tác giả trên ChapMee.",
    type: "author",
    icon: "✍️",
    rarity: "common"
  },
  {
    key: "first_story",
    name: "Truyện đầu tiên",
    description: "Đã có ít nhất một truyện public.",
    type: "author",
    icon: "📚",
    rarity: "common"
  },
  {
    key: "first_100_reads",
    name: "100 lượt đọc đầu tiên",
    description: "Chạm mốc 100 lượt đọc cho tác phẩm.",
    type: "author",
    icon: "📈",
    rarity: "rare"
  },
  {
    key: "first_1000_reads",
    name: "1.000 lượt đọc",
    description: "Tác phẩm bắt đầu chạm một cột mốc lớn.",
    type: "author",
    icon: "🔥",
    rarity: "epic"
  },
  {
    key: "loved_author",
    name: "Tác giả được yêu thích",
    description: "Có nhiều người theo dõi tác giả.",
    type: "author",
    icon: "❤️",
    rarity: "rare"
  },
  {
    key: "consistent_writer",
    name: "Viết đều",
    description: "Đăng truyện đều đặn trong một khoảng thời gian ngắn.",
    type: "author",
    icon: "🗓️",
    rarity: "legendary"
  }
] as const satisfies readonly BadgeDefinition[];

export type BadgeKey = (typeof badgeDefinitions)[number]["key"];

export const badgeDefinitionMap = new Map(
  badgeDefinitions.map((definition) => [definition.key, definition])
);

export function getBadgeDefinition(key: BadgeKey | string) {
  return badgeDefinitionMap.get(key as BadgeKey) ?? null;
}

export function rarityToTone(rarity: BadgeRarity) {
  switch (rarity) {
    case "rare":
      return "success";
    case "epic":
      return "warning";
    case "legendary":
      return "danger";
    default:
      return "default";
  }
}
