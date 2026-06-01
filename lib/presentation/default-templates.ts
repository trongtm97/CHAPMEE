import type {
  CaseFileStructuredContent,
  ChatStoryStructuredContent,
  DiaryStructuredContent,
  MixedMediaStructuredContent,
  PresentationMode,
  ScriptStructuredContent,
  SocialFeedStructuredContent,
  SystemGameStructuredContent
} from "@/types/presentation";

export const DEFAULT_CHAT_STORY_TEMPLATE: ChatStoryStructuredContent = {
  characters: [
    { id: "a", name: "Lan", avatar_url: null, side: "left" },
    { id: "b", name: "Minh", avatar_url: null, side: "right" }
  ],
  messages: [
    {
      type: "message",
      character_id: "a",
      text: "Cậu còn thức không?",
      time: "00:03"
    },
    { type: "system", text: "Minh đang nhập..." },
    {
      type: "message",
      character_id: "b",
      text: "Có chuyện gì vậy?",
      time: "00:04"
    }
  ]
};

export const DEFAULT_CASE_FILE_TEMPLATE: CaseFileStructuredContent = {
  case_title: "Hồ sơ số 17",
  case_code: "CF-017",
  status: "Đang điều tra",
  sections: [
    {
      type: "summary",
      title: "Tóm tắt vụ án",
      content: "Một vụ việc hư cấu trong tòa nhà cũ."
    },
    {
      type: "timeline",
      title: "Dòng thời gian",
      items: [{ time: "22:10", content: "Nạn nhân rời khỏi quán." }]
    },
    {
      type: "evidence",
      title: "Bằng chứng",
      items: [{ label: "Bằng chứng A", content: "Một chiếc chìa khóa gãy." }]
    }
  ]
};

export const DEFAULT_DIARY_TEMPLATE: DiaryStructuredContent = {
  entries: [
    {
      date: "2026-05-31",
      location: "Sài Gòn",
      mood: "Mưa nhẹ",
      title: "Ngày đầu tiên",
      content: "Hôm nay trời mưa nhẹ. Tôi viết những dòng đầu tiên..."
    }
  ]
};

export const DEFAULT_SYSTEM_GAME_TEMPLATE: SystemGameStructuredContent = {
  blocks: [
    {
      type: "system_notice",
      title: "Nhiệm vụ mới",
      content: "Sống sót qua đêm đầu tiên."
    },
    {
      type: "stats",
      title: "Trạng thái",
      items: [
        { label: "Cấp", value: "3" },
        { label: "HP", value: "80/100" },
        { label: "Kỹ năng", value: "Quan sát Lv.1" }
      ]
    },
    {
      type: "reward",
      title: "Phần thưởng",
      items: ["+10 EXP", "Dao gỉ"]
    },
    {
      type: "prose",
      content: "Tôi nhìn màn hình xanh hiện ra trước mắt..."
    }
  ]
};

export const DEFAULT_SOCIAL_FEED_TEMPLATE: SocialFeedStructuredContent = {
  platform: "ChapSocial",
  posts: [
    {
      author: "Lan Nguyễn",
      handle: "@lan.nguyen",
      time: "2 giờ",
      text: "Ai còn thức không? Có chuyện lạ lắm...",
      likes: 24,
      comments_count: 5
    },
    {
      author: "Minh Trần",
      handle: "@minh",
      time: "1 giờ",
      text: "Mình vừa thấy cái gì đó ở hành lang tầng 3.",
      likes: 8,
      comments_count: 2
    }
  ]
};

export const DEFAULT_SCRIPT_TEMPLATE: ScriptStructuredContent = {
  lines: [
    { type: "scene", text: "INT. PHÒNG TRỌ - ĐÊM" },
    {
      type: "action",
      text: "Lan ngồi trước màn hình điện thoại, ánh sáng xanh phủ khuôn mặt."
    },
    {
      type: "dialogue",
      speaker: "LAN",
      parenthetical: "(thì thầm)",
      text: "Cậu còn thức không?"
    },
    { type: "dialogue", speaker: "MINH", text: "Có. Chuyện gì vậy?" }
  ]
};

export const DEFAULT_MIXED_MEDIA_TEMPLATE: MixedMediaStructuredContent = {
  blocks: [
    {
      type: "prose",
      content: "Tôi mở điện thoại — feed tràn ngập tin nhắn lạ."
    },
    {
      type: "notice",
      title: "Ghi chú tác giả",
      content: "Phần dưới là bài đăng giả lập trong truyện."
    },
    {
      type: "quote",
      content: "Đừng tin vào những gì màn hình cho bạn thấy.",
      attribution: "— Nhân vật ẩn danh"
    },
    { type: "divider" },
    {
      type: "prose",
      content: "Tôi gõ một câu trả lời, rồi xóa đi."
    }
  ]
};

export function getDefaultStructuredTemplate(
  mode: PresentationMode
): Record<string, unknown> | null {
  switch (mode) {
    case "chat_story":
      return DEFAULT_CHAT_STORY_TEMPLATE;
    case "social_feed":
      return DEFAULT_SOCIAL_FEED_TEMPLATE;
    case "case_file":
      return DEFAULT_CASE_FILE_TEMPLATE;
    case "diary":
      return DEFAULT_DIARY_TEMPLATE;
    case "system_game":
      return DEFAULT_SYSTEM_GAME_TEMPLATE;
    case "script":
      return DEFAULT_SCRIPT_TEMPLATE;
    case "mixed_media":
      return DEFAULT_MIXED_MEDIA_TEMPLATE;
    default:
      return null;
  }
}

export function getDefaultStructuredTemplateJson(mode: PresentationMode): string {
  const template = getDefaultStructuredTemplate(mode);
  return template ? JSON.stringify(template, null, 2) : "{}";
}
