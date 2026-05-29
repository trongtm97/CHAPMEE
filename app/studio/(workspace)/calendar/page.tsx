import { StudioCalendarPage } from "@/components/studio/StudioCalendarPage";
import { ErrorState, SectionHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import {
  getScheduledPublicationsPage,
  normalizeCalendarTab
} from "@/lib/studio/scheduling/get-scheduled-publications";
import { studioPath } from "@/lib/studio/constants";
import { createClient } from "@/lib/supabase/server";

type StudioCalendarRouteProps = {
  searchParams: Promise<{ tab?: string; page?: string }>;
};

export const dynamic = "force-dynamic";

export default async function StudioCalendarRoute({
  searchParams
}: StudioCalendarRouteProps) {
  const params = await searchParams;
  const activeTab = normalizeCalendarTab(params.tab);
  const basePath = studioPath("/calendar");

  const { error } = await getStudioAccess(basePath);
  const { profile } = await getCurrentUser();

  if (error || !profile?.id) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Lịch đăng" />
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const supabase = await createClient();
  const data = await getScheduledPublicationsPage(supabase, profile.id, {
    page: params.page,
    tab: activeTab
  });

  const query = {
    page: params.page,
    tab: activeTab === "upcoming" ? undefined : activeTab
  };

  return (
    <section className="space-y-6">
      <SectionHeader
        subtitle="Quản lý lịch đăng truyện, chương và nội dung của bạn."
        title="Lịch đăng"
      />

      {data.error ? (
        <ErrorState message={data.error} title="Không tải được lịch đăng" />
      ) : null}

      <StudioCalendarPage
        activeTab={data.tab}
        counts={data.counts}
        items={data.items}
        page={data.page}
        query={query}
        totalPages={data.totalPages}
      />
    </section>
  );
}
