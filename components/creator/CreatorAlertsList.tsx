import Link from "next/link";
import { Card } from "@/components/ui";
import type { CreatorDashboardAlert } from "@/types/creator";

type CreatorAlertsListProps = {
  alerts: CreatorDashboardAlert[];
};

export function CreatorAlertsList({ alerts }: CreatorAlertsListProps) {
  if (alerts.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-zinc-400">
          Không có việc cần xử lý gấp. Tiếp tục viết nhé!
        </p>
      </Card>
    );
  }

  return (
    <ul className="space-y-2">
      {alerts.map((alert) => {
        const content = (
          <Card
            className={`p-3 sm:p-4 ${
              alert.severity === "warning"
                ? "border-amber-400/25 bg-amber-400/[0.04]"
                : ""
            }`}
          >
            <p className="text-sm font-semibold text-white">{alert.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">
              {alert.description}
            </p>
          </Card>
        );

        return (
          <li key={alert.id}>
            {alert.href ? (
              <Link className="block transition hover:opacity-90" href={alert.href}>
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
