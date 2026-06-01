import Link from "next/link";
import { StudioBadge } from "@/components/studio/dashboard/shared/StudioBadge";
import { StudioEmptyState } from "@/components/studio/dashboard/shared/StudioEmptyState";
import { studioPillBtn } from "@/components/studio/dashboard/shared/styles";
import type { StudioTodayAction } from "@/types/creator";

type StudioTodayActionsProps = {
  actions: StudioTodayAction[];
  writeChapterHref: string;
  writeActionLabel: string;
};

function priorityVariant(
  priority: StudioTodayAction["priority"]
): "danger" | "warning" | "default" {
  switch (priority) {
    case "high":
      return "danger";
    case "medium":
      return "warning";
    default:
      return "default";
  }
}

export function StudioTodayActions({
  actions,
  writeActionLabel,
  writeChapterHref
}: StudioTodayActionsProps) {
  if (actions.length === 0) {
    return (
      <StudioEmptyState
        bare
        action={
          <Link className={studioPillBtn} href={writeChapterHref}>
            {writeActionLabel}
          </Link>
        }
        description="Không có việc gấp."
        title="Hôm nay ổn rồi"
      />
    );
  }

  return (
    <ul className="space-y-1.5 lg:grid lg:grid-cols-3 lg:gap-2 lg:space-y-0">
      {actions.map((action) => (
        <li key={action.id}>
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2 lg:flex-col lg:items-stretch lg:gap-2 lg:p-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="line-clamp-1 text-sm font-medium text-white">
                  {action.title}
                </p>
                <StudioBadge soft variant={priorityVariant(action.priority)}>
                  {action.priorityLabel}
                </StudioBadge>
              </div>
              <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500 lg:line-clamp-2">
                {action.description}
              </p>
            </div>
            <Link
              className={`${studioPillBtn} shrink-0 lg:w-full lg:justify-center`}
              href={action.href}
            >
              {action.ctaLabel}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
