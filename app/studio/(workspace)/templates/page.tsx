import { StudioTemplatesPage } from "@/components/studio/StudioTemplatesPage";
import { ErrorState } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { getStudioTemplatesPage } from "@/lib/studio/get-templates";
import {
  buildTemplatesQuery,
  normalizeTemplateCategoryFilter,
  normalizeTemplateSort,
  normalizeTemplateTab
} from "@/lib/studio/templates-query";
import type { StudioTemplateTypeFilter } from "@/types/templates";
import { studioPath } from "@/lib/studio/constants";
import { STUDIO_ACCESS_ERROR_TITLE } from "@/lib/studio/messages";

type StudioTemplatesRouteProps = {
  searchParams: Promise<{
    category?: string;
    q?: string;
    sort?: string;
    tab?: string;
    type?: string;
  }>;
};

export const dynamic = "force-dynamic";

function toDbTypeFilter(
  category: ReturnType<typeof normalizeTemplateCategoryFilter>
): StudioTemplateTypeFilter {
  const dbTypes: StudioTemplateTypeFilter[] = [
    "all",
    "reels",
    "chapter",
    "story_description",
    "author_note",
    "seo",
    "community_post"
  ];

  if (dbTypes.includes(category as StudioTemplateTypeFilter)) {
    return category as StudioTemplateTypeFilter;
  }

  return "all";
}

export default async function StudioTemplatesRoute({
  searchParams
}: StudioTemplatesRouteProps) {
  const params = await searchParams;
  const basePath = studioPath("/templates");
  const activeTab = normalizeTemplateTab(params.tab);
  const activeCategory = normalizeTemplateCategoryFilter(
    params.category ?? params.type
  );
  const activeSort = normalizeTemplateSort(params.sort);
  const search = (params.q ?? "").trim();
  const typeFilter = toDbTypeFilter(activeCategory);

  const { creatorProfile, error } = await getStudioAccess(basePath);
  const { profile } = await getCurrentUser();

  if (error || !creatorProfile || !profile?.id) {
    return (
      <section className="w-full min-w-0 space-y-6">
        <h1 className="text-xl font-black text-white">Mẫu nội dung</h1>
        <ErrorState message={error} title={STUDIO_ACCESS_ERROR_TITLE} />
      </section>
    );
  }

  const [systemList, mineList] = await Promise.all([
    getStudioTemplatesPage({
      ownerId: profile.id,
      search,
      tab: "system",
      typeFilter
    }),
    getStudioTemplatesPage({
      ownerId: profile.id,
      search,
      tab: "mine",
      typeFilter
    })
  ]);

  const loadError = systemList.error ?? mineList.error;

  const allTemplates = [
    ...systemList.templates,
    ...mineList.templates.filter(
      (mine) => !systemList.templates.some((system) => system.id === mine.id)
    )
  ];

  const query = buildTemplatesQuery({
    category: activeCategory,
    q: search,
    sort: activeSort,
    tab: activeTab
  });

  return (
    <section className="w-full min-w-0">
      {loadError ? (
        <ErrorState message={loadError} title="Không tải được danh sách mẫu" />
      ) : null}

      <StudioTemplatesPage
        activeCategory={activeCategory}
        activeSort={activeSort}
        activeTab={activeTab}
        allTemplates={allTemplates}
        mineCount={mineList.templates.length}
        query={query}
        search={search}
        systemCount={systemList.templates.length}
      />
    </section>
  );
}
