import { Badge, Card } from "@/components/ui";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";

type CreatorDashboardHeaderProps = {
  creatorProfile: CreatorProfile;
};

export function CreatorDashboardHeader({
  creatorProfile
}: CreatorDashboardHeaderProps) {
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">
            ChapMee Studio
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-white">
            {creatorProfile.display_name}
          </h1>
        </div>
        <Badge variant="success">{creatorProfile.status}</Badge>
      </div>
      {creatorProfile.bio ? (
        <p className="text-sm leading-6 text-zinc-300">{creatorProfile.bio}</p>
      ) : (
        <p className="text-sm leading-6 text-zinc-400">
          Hồ sơ tác giả đã sẵn sàng. Bạn có thể bắt đầu chuẩn bị truyện và chương
          đầu tiên.
        </p>
      )}
    </Card>
  );
}
