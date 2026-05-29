import { Badge, Card } from "@/components/ui";
import { FanClubPlanCard } from "@/components/fanclub/FanClubPlanCard";
import { FanClubJoinButton } from "@/components/fanclub/FanClubJoinButton";
import type { FanClubMembership, FanClubPlan } from "@/types/fan-club";

type FanClubCardProps = {
  enabled: boolean;
  plans: FanClubPlan[];
  membership: FanClubMembership | null;
};

export function FanClubCard({ enabled, plans, membership }: FanClubCardProps) {
  if (!enabled) return null;
  const isActive = membership?.status === "active";

  return (
    <Card className="space-y-3 border-cyan-300/30 bg-cyan-300/5">
      <div className="flex items-center justify-between">
        <p className="text-lg font-black text-white">Fan Club</p>
        {isActive ? <Badge variant="success">Member</Badge> : null}
      </div>
      {isActive ? (
        <p className="text-sm text-zinc-300">
          Bạn đang là member đến {new Date(membership?.expires_at ?? "").toLocaleString()}.
        </p>
      ) : (
        <p className="text-sm text-zinc-300">Tham gia fan club để nhận badge và quyền lợi cơ bản.</p>
      )}
      <div className="space-y-2">
        {plans.map((plan) => (
          <div className="space-y-2" key={plan.id}>
            <FanClubPlanCard plan={plan} />
            {!isActive ? <FanClubJoinButton planId={plan.id} /> : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
