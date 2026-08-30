import { PublicActivitiesTab } from "@/components/profile/PublicActivitiesTab";
import { PublicCollectionsTab } from "@/components/profile/PublicCollectionsTab";
import { PublicCommentsTab } from "@/components/profile/PublicCommentsTab";
import { ProfileEmptyState } from "@/components/profile/ProfileEmptyState";
import type { PublicProfilePageData } from "@/types/public-profile";

type PublicProfileAboutTabProps = {
  data: PublicProfilePageData;
  page: number;
};

function formatJoinedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric"
  });
}

export function PublicProfileAboutTab({ data, page }: PublicProfileAboutTabProps) {
  const joined = formatJoinedDate(data.user.createdAt);
  const hasCollections = data.privacy.showPublicCollections && data.collectionsTotal > 0;
  const hasActivities = data.privacy.showPublicActivities && data.activitiesTotal > 0;
  const hasComments = data.privacy.showPublicComments && data.commentsTotal > 0;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h2 className="text-sm font-bold text-white">Giới thiệu</h2>
        {data.user.bio ? (
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-300">
            {data.user.bio}
          </p>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">
            Người dùng này chưa thêm giới thiệu.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
          {data.user.isCreator ? <span>Vai trò: Tác giả</span> : null}
          {joined ? <span>Tham gia từ {joined}</span> : null}
        </div>
      </section>

      {hasCollections ? (
        <PublicCollectionsTab
          collections={data.collections}
          page={page}
          total={data.collectionsTotal}
          username={data.user.username}
        />
      ) : null}

      {hasActivities ? (
        <PublicActivitiesTab
          activities={data.activities}
          page={page}
          total={data.activitiesTotal}
          username={data.user.username}
        />
      ) : null}

      {hasComments ? (
        <PublicCommentsTab
          comments={data.comments}
          page={page}
          total={data.commentsTotal}
          username={data.user.username}
        />
      ) : null}

      {!hasCollections && !hasActivities && !hasComments && !data.user.bio ? (
        <ProfileEmptyState
          compact
          description="Người dùng này chưa chia sẻ thêm thông tin công khai."
          title="Chưa có nội dung giới thiệu"
        />
      ) : null}
    </div>
  );
}
