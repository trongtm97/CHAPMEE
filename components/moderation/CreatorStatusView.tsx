import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import type { CreatorStatusSummary } from "@/types/moderation";

type CreatorStatusViewProps = {
  status: CreatorStatusSummary;
};

function formatDate(value: string | null) {
  if (!value) return "đang chờ xem xét";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
    new Date(value)
  );
}

export function CreatorStatusView({ status }: CreatorStatusViewProps) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="page-kicker">Studio</p>
        <h1 className="page-title">Trạng thái tác giả</h1>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatusCard
          label="Đăng truyện"
          ok={status.canPublishStories}
          detail={
            status.canPublishStories
              ? "Bạn có thể tạo và gửi truyện duyệt."
              : "Đang bị hạn chế đăng truyện."
          }
        />
        <StatusCard
          label="Kiếm tiền"
          ok={!status.monetizationHeld}
          detail={
            status.monetizationHeld
              ? `Tạm giữ đến ${formatDate(status.monetizationHoldEndsAt)}`
              : "Hoạt động bình thường"
          }
        />
        <StatusCard
          label="Rút tiền"
          ok={!status.payoutHeld}
          detail={
            status.payoutHeld
              ? `Tạm giữ đến ${formatDate(status.payoutHoldEndsAt)}`
              : "Hoạt động bình thường"
          }
        />
        <StatusCard
          label="Truyện chờ duyệt"
          ok={status.pendingReviewStories === 0}
          detail={`${status.pendingReviewStories} truyện đang chờ`}
        />
      </div>

      {status.monetizationHeld || status.payoutHeld ? (
        <Card className="border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-6 text-amber-100">
          Tài khoản tác giả đang bị giữ kiếm tiền hoặc rút tiền để xem xét vi phạm.
          Số dư không bị tịch thu tự động — chỉ tạm khóa thao tác liên quan.
        </Card>
      ) : null}

      {status.recentViolations.length > 0 ? (
        <Card className="space-y-3 p-4">
          <h2 className="font-semibold text-white">Vi phạm gần đây</h2>
          {status.recentViolations.map((v) => (
            <div className="text-sm text-zinc-300" key={v.id}>
              <Badge className="mr-2">{v.severity}</Badge>
              {v.policyArea} — {v.actionTaken}
            </div>
          ))}
          <Link className="text-sm text-cyan-300" href="/me/account-status">
            Gửi khiếu nại
          </Link>
        </Card>
      ) : null}

      <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/community-guidelines">
        Quy định cộng đồng cho tác giả
      </Link>
    </div>
  );
}

function StatusCard({
  detail,
  label,
  ok
}: {
  label: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <Card className="space-y-2 p-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-white">{label}</p>
        <Badge variant={ok ? "success" : "warning"}>{ok ? "Ổn" : "Hạn chế"}</Badge>
      </div>
      <p className="text-sm text-zinc-400">{detail}</p>
    </Card>
  );
}
