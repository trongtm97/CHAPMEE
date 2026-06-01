import { MonetizationWorkspaceTabs } from "@/components/studio/monetization/MonetizationWorkspaceTabs";
import { MonetizationEmptyHint } from "@/components/studio/monetization/dashboard/MonetizationEmptyHint";
import type { CreatorMonetizationProfile } from "@/types/creator-monetization";
import type { StudioMonetizationConfigView } from "@/types/studio-monetization";
import type { StudioMonetizationGenreOption } from "@/types/studio-monetization-stories";

type PaidStoriesPanelProps = {
  canConfigure: boolean;
  config: StudioMonetizationConfigView;
  genreOptions: StudioMonetizationGenreOption[];
  storiesTotalCount: number;
  profile: CreatorMonetizationProfile | null;
};

export function PaidStoriesPanel({
  canConfigure,
  config,
  genreOptions,
  storiesTotalCount,
  profile
}: PaidStoriesPanelProps) {
  if (!canConfigure) {
    return (
      <MonetizationEmptyHint
        description="Hoàn tất điều kiện kiếm tiền và đảm bảo tài khoản không bị khóa để quản lý truyện trả phí."
        title="Chưa thể cấu hình trả phí"
      />
    );
  }

  if (!config.paidChaptersEnabled) {
    return (
      <MonetizationEmptyHint
        description="Quản trị viên cần bật chương trả phí trên nền tảng trước khi bạn cấu hình giá."
        title="Chương trả phí chưa bật"
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Tìm truyện, lọc theo trạng thái trả phí và mở cài đặt chi tiết. Danh sách hỗ trợ tìm
        kiếm và phân trang.
      </p>
      <MonetizationWorkspaceTabs
        canConfigure={canConfigure}
        config={config}
        genreOptions={genreOptions}
        profile={profile}
        storiesTotalCount={storiesTotalCount}
      />
    </div>
  );
}
