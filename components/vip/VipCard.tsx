import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import type { VipPlan } from "@/types/vip";

type VipCardProps = {
  enabled: boolean;
  isActive: boolean;
  activePlan: VipPlan | null;
  expiresAt: string | null;
};

export function VipCard({ enabled, isActive, activePlan, expiresAt }: VipCardProps) {
  if (!enabled) return null;

  return (
    <Card className="space-y-3 border-cyan-300/30 bg-cyan-300/5">
      <div className="flex items-center justify-between">
        <p className="text-lg font-black text-white">ChapMee VIP</p>
        {isActive ? <Badge variant="success">VIP</Badge> : <Badge>Free</Badge>}
      </div>
      {isActive ? (
        <>
          <p className="text-sm text-zinc-200">Gói hiện tại: {activePlan?.name ?? "VIP"}</p>
          <p className="text-sm text-zinc-300">
            Hết hạn: {expiresAt ? new Date(expiresAt).toLocaleString() : "N/A"}
          </p>
          <Link className="text-sm font-semibold text-cyan-200" href="/vip">
            Quản lý VIP
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm text-zinc-300">
            Nâng cấp để nhận coin bonus, badge VIP và quyền lợi mở rộng.
          </p>
          <Link className="text-sm font-semibold text-cyan-200" href="/vip">
            Nâng cấp VIP
          </Link>
        </>
      )}
    </Card>
  );
}
