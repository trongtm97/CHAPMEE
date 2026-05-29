import { Badge } from "@/components/ui";

type SponsoredBadgeProps = {
  text?: string | null;
};

export function SponsoredBadge({ text }: SponsoredBadgeProps) {
  return (
    <Badge variant="warning">
      {text?.trim() || "Được tài trợ"}
    </Badge>
  );
}
