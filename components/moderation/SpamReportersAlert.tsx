import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { getProfileUrl } from "@/lib/profile/profile-url";
import type { ReporterQualitySummary } from "@/types/moderation";

type SpamReportersAlertProps = {
  reporters: ReporterQualitySummary[];
};

export function SpamReportersAlert({ reporters }: SpamReportersAlertProps) {
  if (reporters.length === 0) {
    return null;
  }

  return (
    <Card className="space-y-3 border-amber-400/20 bg-amber-400/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-amber-100">
          Nghi lạm dụng báo cáo ({reporters.length})
        </p>
        <Badge variant="warning">Spam report</Badge>
      </div>
      <ul className="space-y-2 text-sm text-zinc-300">
        {reporters.map((r) => (
          <li className="flex flex-wrap items-center justify-between gap-2" key={r.userId}>
            <span>
              {r.displayName ?? r.userId.slice(0, 8)}
              {" · "}
              {r.reportsSubmitted} báo cáo · trust {r.trustScore}
            </span>
            {getProfileUrl(r.username) ? (
              <Link
                className="text-xs text-cyan-300 hover:text-cyan-200"
                href={getProfileUrl(r.username)!}
              >
                Xem hồ sơ
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
