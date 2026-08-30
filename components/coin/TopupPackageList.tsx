"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";
import { XuIcon } from "@/components/wallet/XuIcon";
import { formatTopupPriceShort, formatXu } from "@/lib/format/money";
import type { TopupPackagePublic } from "@/types/topup-package";

type TopupPackageListProps = {
  packages: TopupPackagePublic[];
  canSubmit: boolean;
  submitLabel?: string;
  disabledReason?: string | null;
  formAction: (formData: FormData) => void | Promise<void>;
  provider?: string;
};

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
      <Button
        className="w-full normal-case tracking-normal"
        disabled={!canSubmit || pending}
        loading={pending}
        type="submit"
      >
        {pending ? "Đang tạo giao dịch..." : label}
      </Button>
    </>
  );
}

export function TopupPackageList({
  packages,
  canSubmit,
  submitLabel = "Nạp Xu",
  disabledReason,
  formAction,
  provider = "sepay"
}: TopupPackageListProps) {
  if (packages.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center">
        <p className="text-sm font-medium text-zinc-300">Hiện chưa có gói nạp khả dụng.</p>
        <p className="mt-1 text-xs text-zinc-500">
          Admin có thể bật gói nạp trong cấu hình kiếm tiền.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {packages.map((pkg) => {
        const priceShort = formatTopupPriceShort(pkg.amount_vnd);

        return (
          <form
            action={formAction}
            className={`relative flex min-w-0 flex-col justify-between gap-4 rounded-[1.5rem] border p-4 transition ${
              pkg.is_recommended
                ? "border-amber-300/25 bg-[linear-gradient(180deg,rgba(251,191,36,0.08),rgba(255,255,255,0.03))] shadow-[0_14px_28px_rgba(245,158,11,0.08)]"
                : "border-white/10 bg-white/[0.025]"
            }`}
            key={pkg.id}
          >
            <input name="package_id" type="hidden" value={pkg.id} />
            <input name="provider" type="hidden" value={provider} />

            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.72rem] font-semibold tracking-[0.08em] text-zinc-500">
                  Gói {priceShort}
                </p>
                <p className="mt-1.5 whitespace-nowrap text-3xl font-black tracking-tight text-white">
                  {priceShort}
                </p>
              </div>
              <XuIcon className="mt-0.5" size="sm" />
            </div>

            <div className="min-w-0 space-y-1.5">
              <p className="min-w-0 text-sm font-semibold text-zinc-200">
                Nhận <span className="text-amber-200">{formatXu(pkg.base_coin)}</span>
              </p>
              {pkg.bonus_coin > 0 ? (
                <p className="text-sm text-amber-300 break-words">+ {formatXu(pkg.bonus_coin)} bonus</p>
              ) : null}
              {pkg.badge_text ? (
                <p className="text-xs font-semibold text-cyan-200 break-words">
                  {pkg.badge_text}
                </p>
              ) : null}
            </div>

            <TopupSubmitButton
              canSubmit={canSubmit}
              disabledReason={disabledReason}
              label={submitLabel}
            />
          </form>
        );
      })}
    </div>
  );
}
