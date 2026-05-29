import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { SponsoredBadge } from "@/components/campaigns/SponsoredBadge";
import type { ChallengeView } from "@/types/challenge";

type ChallengeCardProps = {
  challenge: ChallengeView;
  sponsoredInfo?: {
    sponsorName: string;
    sponsorLogoUrl: string | null;
    disclosureText: string;
  } | null;
};

export function ChallengeCard({ challenge, sponsoredInfo }: ChallengeCardProps) {
  return (
    <Link className="tap-highlight block" href={`/challenges/${challenge.id}`}>
      <Card className="overflow-hidden p-0 transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-[var(--surface-soft)]">
        <div className="bg-[linear-gradient(135deg,rgba(236,72,153,0.18),rgba(34,211,238,0.16))] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cyan-100/90">Thử thách tác giả</p>
              <h3 className="mt-2 line-clamp-2 text-xl font-black leading-7 text-white">{challenge.title}</h3>
            </div>
            <div className="flex flex-col items-end gap-2">
              {challenge.sponsoredCampaignId ? <SponsoredBadge /> : null}
              <Badge variant={challenge.status === "active" ? "success" : "default"}>
                {challenge.status === "active" ? "Đang mở" : "Đã đóng"}
              </Badge>
            </div>
          </div>
          {challenge.description ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-100/90">{challenge.description}</p> : null}
        </div>

        <div className="space-y-3 p-4">
          {sponsoredInfo ? (
            <div className="flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-xs text-zinc-200">
              {sponsoredInfo.sponsorLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={sponsoredInfo.sponsorName} className="h-4 w-4 rounded object-cover" src={sponsoredInfo.sponsorLogoUrl} />
              ) : null}
              <span>{sponsoredInfo.disclosureText}</span>
              <span className="text-zinc-400">-</span>
              <span>{sponsoredInfo.sponsorName}</span>
            </div>
          ) : null}
          <p className="text-sm leading-6 text-zinc-300">
            {challenge.promptText}
          </p>
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>{challenge.entryCount} entry</span>
            <span>{challenge.startsAt ? new Date(challenge.startsAt).toLocaleDateString("vi-VN") : ""}</span>
          </div>
          <span className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-black uppercase tracking-[0.12em] text-zinc-950">
            {challenge.status === "active" ? "Tham gia ngay" : "Xem challenge"}
          </span>
        </div>
      </Card>
    </Link>
  );
}
