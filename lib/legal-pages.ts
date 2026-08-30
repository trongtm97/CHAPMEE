import {
  SITE_LINK_GROUPS,
  SITE_LINKS,
  getLegalIndexSectionsFromConfig,
  type SiteLinkGroupId
} from "@/lib/config/site-links";

export const LEGAL_CONTENT_PLACEHOLDER =
  "Nội dung đang được ChapMee cập nhật.";

export const LEGAL_BCT_DISCLAIMER =
  "Thông tin thông báo/đăng ký Bộ Công Thương sẽ được cập nhật khi có xác nhận chính thức.";

export type LegalPageGroupId = Extract<
  SiteLinkGroupId,
  "info" | "general" | "commerce" | "creator"
>;

export const LEGAL_PAGE_GROUP_IDS: LegalPageGroupId[] = [
  "info",
  "general",
  "commerce",
  "creator"
];

export type LegalPageGroup = {
  id: LegalPageGroupId;
  title: string;
  description: string;
  sortOrder: number;
};

export const LEGAL_PAGE_GROUPS: Record<LegalPageGroupId, LegalPageGroup> = {
  info: {
    id: "info",
    title: SITE_LINK_GROUPS.info.title,
    description: SITE_LINK_GROUPS.info.description,
    sortOrder: SITE_LINK_GROUPS.info.sortOrder
  },
  general: {
    id: "general",
    title: SITE_LINK_GROUPS.general.title,
    description: SITE_LINK_GROUPS.general.description,
    sortOrder: SITE_LINK_GROUPS.general.sortOrder
  },
  commerce: {
    id: "commerce",
    title: SITE_LINK_GROUPS.commerce.title,
    description: SITE_LINK_GROUPS.commerce.description,
    sortOrder: SITE_LINK_GROUPS.commerce.sortOrder
  },
  creator: {
    id: "creator",
    title: SITE_LINK_GROUPS.creator.title,
    description: SITE_LINK_GROUPS.creator.description,
    sortOrder: SITE_LINK_GROUPS.creator.sortOrder
  }
};

export type LegalPageDefinition = {
  slug: LegalPageSlug;
  title: string;
  footerLabel: string;
  description: string;
  groupId: LegalPageGroupId;
  sortOrder: number;
};

function legalSlugFromHref(href: string): string {
  return href.replace(/^\/legal\//, "");
}

const LEGAL_SITE_LINKS = SITE_LINKS.filter(
  (item) => item.href.startsWith("/legal/") && item.isLegalIndexVisible
);

export const LEGAL_PAGE_SLUGS = LEGAL_SITE_LINKS.map((item) =>
  legalSlugFromHref(item.href)
);

export type LegalPageSlug = (typeof LEGAL_PAGE_SLUGS)[number];

function buildLegalPagesRecord(): Record<LegalPageSlug, LegalPageDefinition> {
  const record = {} as Record<LegalPageSlug, LegalPageDefinition>;
  for (const item of LEGAL_SITE_LINKS) {
    const slug = legalSlugFromHref(item.href) as LegalPageSlug;
    record[slug] = {
      slug,
      title: item.title,
      footerLabel: item.footerLabel?.trim() || item.title,
      description: item.description?.trim() || "",
      groupId: item.group as LegalPageGroupId,
      sortOrder: item.order
    };
  }
  return record;
}

export const LEGAL_PAGES = buildLegalPagesRecord();

const LEGAL_PAGE_LIST = Object.values(LEGAL_PAGES);

export function getLegalPage(slug: string): LegalPageDefinition | null {
  return LEGAL_PAGES[slug as LegalPageSlug] ?? null;
}

export function buildLegalPageMetadataTitle(page: LegalPageDefinition): string {
  return `${page.title} | ChapMee`;
}

export function getLegalPagesByGroup(): Array<{
  group: LegalPageGroup;
  pages: LegalPageDefinition[];
}> {
  return LEGAL_PAGE_GROUP_IDS.map((groupId) => ({
    group: LEGAL_PAGE_GROUPS[groupId],
    pages: LEGAL_PAGE_LIST.filter((page) => page.groupId === groupId).sort(
      (a, b) => a.sortOrder - b.sortOrder
    )
  }));
}

export function getLegalIndexSections(): Array<{
  group: LegalPageGroup;
  links: Array<{ title: string; href: string }>;
}> {
  return getLegalIndexSectionsFromConfig().map(({ group, links }) => ({
    group: LEGAL_PAGE_GROUPS[group.id as LegalPageGroupId],
    links
  }));
}

export function formatLegalUpdatedDate(date = new Date()): string {
  return date.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}
