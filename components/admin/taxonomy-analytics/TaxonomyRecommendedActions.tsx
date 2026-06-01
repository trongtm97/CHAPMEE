import Link from "next/link";
import { EmptyAnalyticsState } from "@/components/admin/taxonomy-analytics/EmptyAnalyticsState";
import type { TaxonomyRecommendedAction } from "@/types/taxonomy-analytics";

type TaxonomyRecommendedActionsProps = {
  actions: TaxonomyRecommendedAction[];
};

export function TaxonomyRecommendedActions({ actions }: TaxonomyRecommendedActionsProps) {
  return (
    <section className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
      <h2 className="text-base font-semibold">Việc nên làm</h2>
      {actions.length === 0 ? (
        <EmptyAnalyticsState
          title="Chưa có đề xuất."
          description="Cần thêm dữ liệu impression, click, read và taxonomy usage."
        />
      ) : (
        <ul className="mt-3 space-y-2">
          {actions.slice(0, 8).map((action) => (
            <li key={action.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-sm">{action.description}</p>
              {action.actionHref ? (
                <Link className="mt-1 inline-block text-xs text-cyan-300 hover:text-cyan-200" href={action.actionHref}>
                  {action.actionLabel ?? "Mở chi tiết"}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
