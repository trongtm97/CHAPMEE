import Link from "next/link";
import { StoryCommunitySyncSettingsForm } from "@/components/admin/community/StoryCommunitySyncSettingsForm";
import { StoryCommunitySyncToolsPanel } from "@/components/admin/community/StoryCommunitySyncToolsPanel";

type StoryCommunitySyncAdminPageProps = {
  settings: import("@/types/story-community-sync").CommunitySyncSettings;
  updatedAt: string | null;
  canEdit: boolean;
};

export function StoryCommunitySyncAdminPage({
  canEdit,
  settings,
  updatedAt
}: StoryCommunitySyncAdminPageProps) {
  return (
    <section className="mx-auto max-w-[960px] space-y-6">
      <div>
        <Link
          className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          href="/admin/community"
        >
          ← Quản trị cộng đồng
        </Link>
        <p className="mt-5 text-sm font-medium uppercase tracking-wide text-cyan-300">
          Story Community Sync
        </p>
        <h1 className="mt-3 text-3xl font-bold text-white">Đồng bộ nhóm truyện</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
          Cấu hình cách bình luận và tương tác được đồng bộ vào feed nhóm truyện. Khác với cấu
          hình spam cộng đồng (`community_spam_settings`).
        </p>
      </div>

      <StoryCommunitySyncSettingsForm
        canEdit={canEdit}
        initialSettings={settings}
        updatedAt={updatedAt}
      />

      <StoryCommunitySyncToolsPanel canEdit={canEdit} />
    </section>
  );
}
