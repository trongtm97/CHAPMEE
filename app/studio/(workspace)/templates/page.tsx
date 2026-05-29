import { StudioTemplatesPage } from "@/components/studio/StudioTemplatesPage";
import { ErrorState, SectionHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import {
  getStudioTemplatesPage,
  normalizeTemplateTypeFilter
} from "@/lib/studio/get-templates";
import { studioPath } from "@/lib/studio/constants";
import {
  STUDIO_ACCESS_ERROR_TITLE
} from "@/lib/studio/messages";
import type { StudioTemplateTab } from "@/types/templates";

type StudioTemplatesRouteProps = {
  searchParams: Promise<{
    q?: string;
    tab?: string;
    type?: string;
  }>;
};

export const dynamic = "force-dynamic";

function normalizeTemplateTab(value: string | undefined): StudioTemplateTab {
  return value === "mine" ? "mine" : "system";
}

export default async function StudioTemplatesRoute({
  searchParams
}: StudioTemplatesRouteProps) {
  const params = await searchParams;
  const activeTab = normalizeTemplateTab(params.tab);
  const activeType = normalizeTemplateTypeFilter(params.type);
  const search = (params.q ?? "").trim();
  const basePath = studioPath("/templates");

  const { creatorProfile, error } = await getStudioAccess(basePath);
  const { profile } = await getCurrentUser();

  if (error || !creatorProfile || !profile?.id) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Mẫu nội dung" />
        <ErrorState message={error} title={STUDIO_ACCESS_ERROR_TITLE} />
      </section>
    );
  }

  const [listResult, systemList, mineList] = await Promise.all([
    getStudioTemplatesPage({
      ownerId: profile.id,
      search,
      tab: activeTab,
      typeFilter: activeType
    }),
    getStudioTemplatesPage({
      ownerId: profile.id,
      tab: "system",
      typeFilter: "all"
    }),
    getStudioTemplatesPage({
      ownerId: profile.id,
      tab: "mine",
      typeFilter: "all"
    })
  ]);

  return (
    <section className="space-y-6">
      <SectionHeader
        subtitle="Lưu và dùng lại các mẫu viết quen thuộc trong ChapMee Studio."
        title="Mẫu nội dung"
      />

      {listResult.error ? (
        <ErrorState message={listResult.error} title="Không tải được danh sách mẫu" />
      ) : null}

      <StudioTemplatesPage
        activeTab={activeTab}
        activeType={activeType}
        search={search}
        tabCounts={{
          mine: mineList.templates.length,
          system: systemList.templates.length
        }}
        templates={listResult.templates}
      />
    </section>
  );
}
