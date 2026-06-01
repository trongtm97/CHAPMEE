"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";
import type { TopupPackagePublic } from "@/types/topup-package";

type TopupPackageListProps = {
  packages: TopupPackagePublic[];
  canSubmit: boolean;
  submitLabel?: string;
  disabledReason?: string | null;
  formAction: (formData: FormData) => void | Promise<void>;
  provider?: string;
};

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

function TopupSubmitButton({
  canSubmit,
  label,
  disabledReason
}: {
  canSubmit: boolean;
  label: string;
  disabledReason?: string | null;
}) {
  const { pending } = useFormStatus();
  return (
    <>
      {!canSubmit && disabledReason ? (
        <p className="text-sm text-amber-300">{disabledReason}</p>
      ) : null}
      <Button disabled={!canSubmit || pending} loading={pending} type="submit">
        {pending ? "Đang tạo giao dịch..." : label}
      </Button>
    </>
  );
}

export function TopupPackageList({
  packages,
  canSubmit,
  submitLabel = "Nạp gói này",
  disabledReason,
  formAction,
  provider = "sepay"
}: TopupPackageListProps) {
  if (packages.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center">
        <p className="text-sm font-medium text-zinc-300">Hiện chưa có gói nạp khả dụng.</p>
        <p className="mt-1 text-xs text-zinc-500">
          Admin có thể bật gói nạp tại Cấu hình kiếm tiền.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {packages.map((pkg) => (
        <form
          action={formAction}
          className={`relative space-y-3 rounded-xl border p-4 ${
            pkg.is_recommended
              ? "border-cyan-400/40 bg-cyan-400/5 ring-1 ring-cyan-400/20"
              : "border-white/10 bg-zinc-950/40"
          }`}
          key={pkg.id}
        >
          <input name="package_id" type="hidden" value={pkg.id} />
          <input name="provider" type="hidden" value={provider} />

          {pkg.badge_text ? (
            <span className="inline-flex rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
              {pkg.badge_text}
            </span>
          ) : null}
          {pkg.is_recommended ? (
            <span className="ml-1 inline-flex rounded-full bg-cyan-500/20 px-2 py-0.5 text-[11px] font-semibold text-cyan-200">
              Đề xuất
            </span>
          ) : null}

          <div>
            <p className="text-base font-bold text-white">{pkg.name}</p>
            {pkg.description ? (
              <p className="mt-1 text-xs text-zinc-500">{pkg.description}</p>
            ) : null}
          </div>

          <p className="text-xl font-black text-white">{formatVnd(pkg.amount_vnd)}</p>
          <p className="text-sm text-zinc-300">
            Tổng Coin nhận:{" "}
            <span className="font-bold text-cyan-300">
              {pkg.total_coin.toLocaleString("vi-VN")} Coin
            </span>
          </p>
          {pkg.bonus_coin > 0 ? (
            <p className="text-xs text-amber-300">
              Bonus +{pkg.bonus_percent}% (+{pkg.bonus_coin.toLocaleString("vi-VN")} Coin)
            </p>
          ) : null}

          <TopupSubmitButton
            canSubmit={canSubmit}
            disabledReason={disabledReason}
            label={submitLabel}
          />
        </form>
      ))}
    </div>
  );
}
