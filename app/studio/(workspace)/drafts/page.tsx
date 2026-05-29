import { StudioDraftsPage } from "@/components/studio/StudioDraftsPage";
import { ErrorState, SectionHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import {
  getStudioDraftsPage,
  normalizeDraftListFilter
} from "@/lib/studio/get-drafts";
import { studioPath } from "@/lib/studio/constants";
import {
  STUDIO_ACCESS_ERROR_TITLE,
  STUDIO_LOAD_STORIES_ERROR
} from "@/lib/studio/messages";

type StudioDraftsRouteProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    page?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function StudioDraftsRoute({
  searchParams
}: StudioDraftsRouteProps) {
  const params = await searchParams;
  const activeFilter = normalizeDraftListFilter(params.type);
  const search = (params.q ?? "").trim();
  const basePath = studioPath("/drafts");

  const { creatorProfile, error } = await getStudioAccess(basePath);
  const { profile } = await getCurrentUser();

  if (error || !creatorProfile || !profile?.id) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Nháp" />
        <ErrorState message={error} title={STUDIO_ACCESS_ERROR_TITLE} />
      </section>
    );
  }

  const data = await getStudioDraftsPage(profile.id, {
    filter: activeFilter,
    page: params.page,
    search
  });

  const query = {
    page: params.page,
    q: search || undefined,
    type: activeFilter === "all" ? undefined : activeFilter
  };

  const hasActiveFilters =
    Boolean(search) || activeFilter !== "all" || Boolean(params.page);

  return (
    <section className="space-y-6">
      <SectionHeader
        subtitle="Tiếp tục các truyện, chương và nội dung Swipe bạn đang viết."
        title="Nháp"
      />

      {data.error ? (
        <ErrorState message={data.error} title={STUDIO_LOAD_STORIES_ERROR} />
      ) : null}

      <StudioDraftsPage
        activeFilter={activeFilter}
        counts={data.counts}
        drafts={data.drafts}
        hasActiveFilters={hasActiveFilters}
        page={data.page}
        query={query}
        search={search}
        totalPages={data.totalPages}
      />
    </section>
  );
}
