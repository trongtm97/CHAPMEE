import { Badge, Card } from "@/components/ui";
import { ShareButton } from "@/components/share/ShareButton";
import { buildAchievementSharePayload } from "@/lib/share/profileShare";
import { getShareUrl } from "@/lib/share/getShareUrl";
import type { ProfileAchievement } from "@/types/profile";

type BadgeCardProps = {
  badge: ProfileAchievement;
  /** Chỉ chủ hồ sơ mới được chia sẻ thành tích. */
  allowShare?: boolean;
};

const statusLabel: Record<ProfileAchievement["status"], string> = {
  unlocked: "Đã mở",
  locked: "Chưa mở",
  unavailable: "Sắp có"
};

const statusVariant: Record<ProfileAchievement["status"], "default" | "success" | "warning"> = {
  unlocked: "success",
  locked: "warning",
  unavailable: "default"
};

export function BadgeCard({ allowShare = false, badge }: BadgeCardProps) {
  const isMuted = badge.status !== "unlocked";

  return (
    <Card
      className={`space-y-3 p-4 transition ${isMuted ? "bg-white/[0.03]" : "bg-white/[0.05]"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className={`text-base font-bold tracking-normal ${isMuted ? "text-zinc-200" : "text-white"}`}
          >
            {badge.title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-zinc-400">
            {badge.description}
          </p>
        </div>
        <Badge variant={statusVariant[badge.status]}>{statusLabel[badge.status]}</Badge>
      </div>
      {badge.value ? (
        <div className="rounded-2xl border border-white/10 bg-black/15 px-3 py-2 text-sm font-semibold text-zinc-100">
          {badge.value}
        </div>
      ) : null}
      {allowShare && badge.status === "unlocked" ? (
        <div className="flex justify-end">
          <ShareButton
            label="Share badge"
            payload={buildAchievementSharePayload({
              ctaLabel: "Xem badge trên ChapMee",
              text: badge.description,
              title: badge.title,
              url: getShareUrl("/me#badges")
            })}
          />
        </div>
      ) : null}
    </Card>
  );
}
