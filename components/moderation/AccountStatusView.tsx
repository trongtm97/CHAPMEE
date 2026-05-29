import Link from "next/link";
import { AppealForm } from "@/components/moderation/AppealForm";
import { Badge, Card } from "@/components/ui";
import { restrictionLabel } from "@/lib/moderation/restriction-labels";
import type { AccountStatusSummary } from "@/types/moderation";

type AccountStatusViewProps = {
  status: AccountStatusSummary;
};

function formatDate(value: string | null) {
  if (!value) return "không xác định";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function AccountStatusView({ status }: AccountStatusViewProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <p className="page-kicker">Tài khoản</p>
        <h1 className="page-title">Trạng thái tài khoản</h1>
        {status.accountOk ? (
          <p className="text-sm text-emerald-300">
            Tài khoản của bạn đang ổn.
          </p>
        ) : (
          <p className="text-sm text-amber-200">
            Tài khoản của bạn có cảnh cáo hoặc hạn chế đang hiệu lực.
          </p>
        )}
      </header>

      {status.activeRestrictions.length > 0 ? (
        <Card className="space-y-3 p-4">
          <h2 className="font-semibold text-white">Hạn chế hiện tại</h2>
          {status.activeRestrictions.map((r) => (
            <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3" key={r.id}>
              <p className="text-sm text-zinc-200">
                Bạn đang bị hạn chế {restrictionLabel(r.restrictionType)} đến{" "}
                {formatDate(r.endsAt)}.
              </p>
              {r.reason ? (
                <p className="mt-1 text-xs text-zinc-500">{r.reason}</p>
              ) : null}
            </div>
          ))}
        </Card>
      ) : null}

      {status.activeStrikes.length > 0 ? (
        <Card className="space-y-3 p-4">
          <h2 className="font-semibold text-white">Strike còn hiệu lực</h2>
          <ul className="space-y-2 text-sm text-zinc-300">
            {status.activeStrikes.map((s) => (
              <li className="flex items-center justify-between gap-2" key={s.id}>
                <span>
                  {s.policyArea} · {s.points} điểm
                </span>
                <Badge variant="warning">Hết hạn {formatDate(s.expiresAt)}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {status.recentViolations.length > 0 ? (
        <Card className="space-y-4 p-4">
          <h2 className="font-semibold text-white">Vi phạm gần đây</h2>
          {status.recentViolations.map((v) => (
            <div className="space-y-2 border-b border-white/5 pb-4 last:border-0" key={v.id}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{v.severity}</Badge>
                <span className="text-sm text-zinc-400">{v.policyArea}</span>
                <span className="text-xs text-zinc-600">{formatDate(v.createdAt)}</span>
              </div>
              <p className="text-sm text-zinc-300">
                Hành động: {v.actionTaken}
                {v.note ? ` — ${v.note}` : ""}
              </p>
              <AppealForm violationId={v.id} />
            </div>
          ))}
        </Card>
      ) : null}

      <Card className="space-y-2 p-4 text-sm leading-6 text-zinc-400">
        <p>
          Bạn có thể gửi khiếu nại nếu cho rằng quyết định này nhầm lẫn. ChapMee sẽ
          xem xét trong thời gian sớm nhất.
        </p>
        <Link className="text-cyan-300 hover:text-cyan-200" href="/community-guidelines">
          Đọc quy định cộng đồng
        </Link>
      </Card>
    </div>
  );
}
