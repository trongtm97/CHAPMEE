import Link from "next/link";
import { Card } from "@/components/ui";
import type { FinancePaymentStatusSummary } from "@/types/finance";

type PaymentStatusPanelProps = {
  status: FinancePaymentStatusSummary;
};

export function PaymentStatusPanel({ status }: PaymentStatusPanelProps) {
  const webhookLabel =
    status.sepayWebhookStatus === "not_configured"
      ? "Chưa cấu hình"
      : status.sepayWebhookStatus === "error"
        ? "Lỗi"
        : "Hoạt động";

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-black text-white">Trạng thái thanh toán</h3>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link className="font-semibold text-cyan-300" href="/admin/payments">
            Xem webhook logs
          </Link>
          <Link className="font-semibold text-cyan-300" href="/admin/payments">
            Đối soát giao dịch
          </Link>
          <Link className="font-semibold text-cyan-300" href="/admin/monetization-settings">
            Kiểm tra cấu hình thanh toán
          </Link>
        </div>
      </div>

      {!status.sepayConfigured ? (
        <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-100">
          Chưa cấu hình SePay. Vui lòng vào Cấu hình thanh toán.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="SePay webhook" value={webhookLabel} />
        <Metric
          label="Lần webhook gần nhất"
          value={
            status.lastWebhookAt
              ? new Date(status.lastWebhookAt).toLocaleString("vi-VN")
              : "—"
          }
        />
        <Metric label="Payment pending" value={String(status.pending)} />
        <Metric label="Payment paid" value={String(status.paid)} />
        <Metric label="Payment failed" value={String(status.failed)} />
        <Metric label="Payment expired" value={String(status.expired)} />
        <Metric label="Payment duplicate" value={String(status.duplicate)} />
        <Metric label="Manual review" value={String(status.manualReview)} />
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 px-3 py-2">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-100">{value}</p>
    </div>
  );
}
