import { SectionHeader, ErrorState } from "@/components/ui";
import { StudioSwipePage } from "@/components/studio/swipe/StudioSwipePage";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { getCreatorSwipeItems } from "@/lib/swipe/get-creator-swipe-items";
import { studioPath } from "@/lib/studio/constants";
import type { SwipeListTab } from "@/types/swipe";

type StudioSwipeRouteProps = {
  searchParams: Promise<{
    page?: string;
    tab?: string;
  }>;
};

export const dynamic = "force-dynamic";

function normalizeTab(value?: string): SwipeListTab {
  if (
    value === "draft" ||
    value === "scheduled" ||
    value === "published" ||
    value === "hidden" ||
    value === "needs_fix"
  ) {
    return value;
  }

  return "all";
}

export default async function StudioSwipeRoute({ searchParams }: StudioSwipeRouteProps) {
  const params = await searchParams;
  const activeTab = normalizeTab(params.tab);
  const page = Number.parseInt(params.page ?? "1", 10) || 1;
  const basePath = studioPath("/swipe");

  const { creatorProfile, error } = await getStudioAccess(basePath);
  const { profile } = await getCurrentUser();

  if (error || !creatorProfile || !profile?.id) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Nội dung Swipe" />
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const list = await getCreatorSwipeItems({
    ownerId: profile.id,
    page,
    tab: activeTab
  });

  return (
    <section className="space-y-6">
      <SectionHeader
        subtitle="Tạo, quản lý và quảng bá truyện của bạn trên Swipe."
        title="Nội dung Swipe"
      />

      {list.error ? (
        <ErrorState message={list.error} title="Không tải được danh sách Swipe" />
      ) : null}

      <StudioSwipePage
        activeTab={activeTab}
        items={list.items}
        page={list.page}
        totalPages={list.totalPages}
      />
    </section>
  );
}
