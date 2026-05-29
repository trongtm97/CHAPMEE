"use client";

import { Card } from "@/components/ui";
import { DECISION_LABELS, REASON_CODE_LABELS, RISK_LEVEL_LABELS } from "@/lib/messaging/labels";

function formatReasonCodes(codes: string[]) {
  return codes.map((c) => REASON_CODE_LABELS[c] ?? c).join(", ");
}
import type { MessageSafetyDecisionItem } from "@/types/messaging-safety";
import type { MessageSafetyLogItem } from "@/types/admin-messaging";

type Props = {
  decisions: MessageSafetyDecisionItem[];
  legacyLogs: MessageSafetyLogItem[];
};

export function BlockedMessagesLog({ decisions, legacyLogs }: Props) {
  const hasDecisions = decisions.length > 0;

  if (!hasDecisions && !legacyLogs.length) {
    return (
      <Card className="p-6 text-center text-sm text-zinc-400">
        Chưa có tin bị chặn trong khoảng thời gian đã chọn.
      </Card>
    );
  }

  if (hasDecisions) {
    return (
      <div className="space-y-2">
        {decisions.map((row) => (
          <Card className="space-y-2 p-3 text-sm" key={row.id}>
            <div className="flex flex-wrap justify-between gap-2">
              <p className="font-medium text-white">{row.senderName}</p>
              <p className="text-xs text-zinc-500">
                {new Date(row.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>
            <p className="text-xs text-zinc-500">
              {DECISION_LABELS[row.decision]} · {RISK_LEVEL_LABELS[row.riskLevel]} ·{" "}
              {formatReasonCodes(row.reasonCodes)}
            </p>
            {row.messageExcerptMasked ? (
              <p className="rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-zinc-300">
                {row.messageExcerptMasked}
              </p>
            ) : null}
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {legacyLogs.map((row) => (
        <Card className="space-y-2 p-3 text-sm" key={row.id}>
          <div className="flex flex-wrap justify-between gap-2">
            <p className="font-medium text-white">{row.displayName}</p>
            <p className="text-xs text-zinc-500">
              {new Date(row.createdAt).toLocaleString("vi-VN")}
            </p>
          </div>
          <p className="text-xs text-zinc-500">{row.status} · {row.reasons.join(", ")}</p>
          <p className="rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-zinc-300">
            {row.textPreview}
          </p>
        </Card>
      ))}
    </div>
  );
}
