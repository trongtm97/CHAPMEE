import {
  AUTO_DECISION_LABELS,
  reasonCodeLabel
} from "@/lib/community/auto-moderation-labels";
import type { ModerationDecisionLogItem } from "@/types/community-auto-moderation";

type AutoModerationDecisionLogProps = {
  items: ModerationDecisionLogItem[];
};

export function AutoModerationDecisionLog({ items }: AutoModerationDecisionLogProps) {
  if (!items.length) {
    return <p className="text-sm text-zinc-500">Chưa có quyết định gần đây.</p>;
  }

  return (
    <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
      {items.map((item) => (
        <li className="px-4 py-3 text-sm" key={item.id}>
          <p className="font-medium text-white">
            {AUTO_DECISION_LABELS[item.decision] ?? item.decision}
            {item.trustScore != null ? ` · Trust ${item.trustScore}` : ""}
            {item.userLabel ? ` · ${item.userLabel}` : ""}
          </p>
          <p className="text-xs text-zinc-500">
            {item.finalStatus} · {new Date(item.createdAt).toLocaleString("vi-VN")}
            {item.overriddenAt ? " · Đã override" : ""}
          </p>
          {item.reasonCodes.length > 0 ? (
            <p className="mt-1 text-xs text-zinc-600">
              {item.reasonCodes.map(reasonCodeLabel).join(" · ")}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
