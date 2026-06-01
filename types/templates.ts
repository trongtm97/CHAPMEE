export const STUDIO_TEMPLATE_TYPES = [
  "story_description",
  "chapter",
  "author_note",
  "reels",
  "seo",
  "community_post"
] as const;

export type StudioTemplateType = (typeof STUDIO_TEMPLATE_TYPES)[number];

export type StudioTemplateStatus = "active" | "archived";

export type StudioTemplateContent = {
  body: string;
  format?: "plain";
};

export type StudioTemplateRecord = {
  id: string;
  ownerId: string | null;
  templateType: StudioTemplateType;
  title: string;
  description: string | null;
  content: StudioTemplateContent;
  plainText: string | null;
  isSystem: boolean;
  status: StudioTemplateStatus;
  createdAt: string;
  updatedAt: string;
};

export type StudioTemplateListItem = Pick<
  StudioTemplateRecord,
  | "id"
  | "templateType"
  | "title"
  | "description"
  | "plainText"
  | "isSystem"
  | "updatedAt"
>;

export type StudioTemplateTab = "system" | "mine" | "favorites" | "recent";

export type StudioTemplateTypeFilter = StudioTemplateType | "all";

export type StudioTemplateCategoryFilter =
  | StudioTemplateTypeFilter
  | "content_warning"
  | "dialogue"
  | "cta"
  | "chapter_opening"
  | "chapter_ending";

export type StudioTemplateSort = "newest" | "used" | "az" | "favorite";

export type StudioTemplatesPageStats = {
  systemCount: number;
  mineCount: number;
  favoriteCount: number;
  recentCount: number;
  typeCount: number;
};

export const STUDIO_TEMPLATE_TITLE_MAX = 80;
