export const STUDIO_TEMPLATE_TYPES = [
  "story_description",
  "chapter",
  "author_note",
  "swipe",
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

export type StudioTemplateTab = "system" | "mine";

export type StudioTemplateTypeFilter = StudioTemplateType | "all";

export const STUDIO_TEMPLATE_TITLE_MAX = 80;
