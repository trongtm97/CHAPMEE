import type {
  StudioTemplateCategoryFilter,
  StudioTemplateSort,
  StudioTemplateTab
} from "@/types/templates";

export function normalizeTemplateTab(value: string | undefined): StudioTemplateTab {
  if (
    value === "mine" ||
    value === "favorites" ||
    value === "recent" ||
    value === "system"
  ) {
    return value;
  }

  return "system";
}

export function normalizeTemplateCategoryFilter(
  value: string | undefined
): StudioTemplateCategoryFilter {
  const allowed: StudioTemplateCategoryFilter[] = [
    "all",
    "reels",
    "chapter",
    "story_description",
    "author_note",
    "content_warning",
    "dialogue",
    "seo",
    "cta",
    "chapter_opening",
    "chapter_ending",
    "community_post"
  ];

  if (value && allowed.includes(value as StudioTemplateCategoryFilter)) {
    return value as StudioTemplateCategoryFilter;
  }

  return "all";
}

export function normalizeTemplateSort(value: string | undefined): StudioTemplateSort {
  const allowed: StudioTemplateSort[] = [
    "newest",
    "used",
    "az",
    "favorite"
  ];

  if (value && allowed.includes(value as StudioTemplateSort)) {
    return value as StudioTemplateSort;
  }

  return "newest";
}

export function buildTemplatesQuery(input: {
  category?: StudioTemplateCategoryFilter;
  q?: string;
  sort?: StudioTemplateSort;
  tab?: StudioTemplateTab;
  type?: string;
}): Record<string, string | undefined> {
  return {
    category:
      input.category && input.category !== "all" ? input.category : undefined,
    q: input.q?.trim() || undefined,
    sort: input.sort && input.sort !== "newest" ? input.sort : undefined,
    tab:
      input.tab && input.tab !== "system"
        ? input.tab
        : undefined,
    type: input.type && input.type !== "all" ? input.type : undefined
  };
}

export function matchesCategoryFilter(
  item: {
    description: string | null;
    plainText: string | null;
    templateType: string;
    title: string;
  },
  category: StudioTemplateCategoryFilter
): boolean {
  if (category === "all") {
    return true;
  }

  if (
    category === "reels" ||
    category === "chapter" ||
    category === "story_description" ||
    category === "author_note" ||
    category === "seo" ||
    category === "community_post"
  ) {
    return item.templateType === category;
  }

  const haystack = `${item.title} ${item.description ?? ""} ${item.plainText ?? ""}`.toLowerCase();

  if (category === "content_warning") {
    return (
      item.templateType === "chapter" &&
      (haystack.includes("cảnh báo") || haystack.includes("lưu ý nội dung"))
    );
  }

  if (category === "dialogue") {
    return (
      item.templateType === "chapter" &&
      (haystack.includes("hội thoại") || haystack.includes("chat"))
    );
  }

  if (category === "cta") {
    return (
      item.templateType === "reels" ||
      haystack.includes("cta") ||
      haystack.includes("kêu gọi")
    );
  }

  if (category === "chapter_opening") {
    return (
      item.templateType === "chapter" &&
      (haystack.includes("mở đầu") || haystack.includes("recap"))
    );
  }

  if (category === "chapter_ending") {
    return (
      item.templateType === "chapter" &&
      (haystack.includes("kết chương") || haystack.includes("cliffhanger"))
    );
  }

  return true;
}
