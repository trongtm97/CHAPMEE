"use client";

import Link from "next/link";
import { MonetizationBadge } from "@/components/studio/monetization/monetization-ui";
import type { CreatorAccessStatus } from "@/types/creator-access";
import type { StudioMonetizationGateStatus } from "@/types/studio-monetization";

type MonetizationStatusSectionProps = {
  gateStatus: StudioMonetizationGateStatus;
  creatorAccess: CreatorAccessStatus;
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function MonetizationStatusSection({
  gateStatus,
  creatorAccess
}: MonetizationStatusSectionProps) {
  const monetizationOpen =
    creatorAccess.monetizationEnabled &&
    gateStatus !== "disabled" &&
    gateStatus !== "admin_disabled";

  const withdrawalBlocked = !creatorAccess.withdrawalEnabled;

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-white">Trạng thái kiếm tiền</h2>
        <MonetizationBadge tone={monetizationOpen ? "green" : "rose"}>
          {monetizationOpen ? "Đang mở" : "Đã bị admin tắt"}
        </MonetizationBadge>
        {withdrawalBlocked ? (
          <MonetizationBadge tone="amber">Rút tiền bị khóa</MonetizationBadge>
        ) : null}
      </div>

      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
        {monetizationOpen
          ? "Kiếm tiền đang được mở mặc định. Chỉ bị tắt nếu có quyết định quản trị riêng."
          : "Tài khoản của bạn đang bị tắt kiếm tiền bởi quản trị viên."}
      </p>

      {!monetizationOpen && creatorAccess.monetizationDisabledReason ? (
        <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-sm text-rose-100">
          <p>Lý do: {creatorAccess.monetizationDisabledReason}</p>
          {creatorAccess.override?.monetization_disabled_at ? (
            <p className="mt-1 text-xs text-rose-200/80">
              Ngày tắt: {formatDate(creatorAccess.override.monetization_disabled_at)}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-zinc-400">
            Nếu bạn cho rằng đây là nhầm lẫn, hãy gửi yêu cầu qua{" "}
            <Link className="font-semibold text-cyan-300 hover:text-cyan-200" href="/studio/help">
              Trung tâm trợ giúp Studio
            </Link>
            .
          </p>
        </div>
      ) : null}

      {withdrawalBlocked && creatorAccess.withdrawalDisabledReason ? (
        <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs leading-relaxed text-amber-100">
          Rút tiền: {creatorAccess.withdrawalDisabledReason}. Bạn vẫn có thể cấu hình trả phí nếu
          kiếm tiền đang mở.
        </p>
      ) : null}
    </section>
  );
}
