import { MonetizationBadge, type MonetizationTone } from "@/components/studio/monetization/monetization-ui";
import type { MonetizationProgramBadge } from "@/types/studio-monetization-dashboard";

export function StatusBadge({ badge }: { badge: MonetizationProgramBadge }) {
  return (
    <MonetizationBadge tone={badge.tone as MonetizationTone}>
      <span className="sr-only">Trạng thái: </span>
      {badge.label}
    </MonetizationBadge>
  );
}
