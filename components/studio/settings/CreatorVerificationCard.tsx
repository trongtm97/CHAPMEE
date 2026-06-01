"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { studioPath } from "@/lib/studio/constants";
import { VERIFICATION_STATUS_LABELS } from "@/lib/verification/labels";
import type { UserVerificationSummary } from "@/types/verification";

type CreatorVerificationCardProps = {
  email: string | null;
  accountCreatedAt: string | null;
  verification: UserVerificationSummary;
};

function resolveVerificationStatus(summary: UserVerificationSummary): string {
  if (summary.publicBadge) {
    return "Đã xác minh";
  }
  if (summary.latestPending) {
    return "Đang xét duyệt";
  }
  if (summary.latestRejected) {
    return "Bị từ chối";
  }
  return "Chưa xác minh";
}

export function CreatorVerificationCard({
  accountCreatedAt,
  email,
  verification
}: CreatorVerificationCardProps) {
  const status = resolveVerificationStatus(verification);

  return (
    <section className="scroll-mt-24 space-y-4" id="settings-account">
      <div>
        <h2 className="text-lg font-bold text-white">Tài khoản & xác thực</h2>
        <p className="mt-1 text-sm text-zinc-400">Thông tin đăng nhập và trạng thái xác minh tác giả.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-white">Trạng thái xác thực</span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
              status === "Đã xác minh"
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                : status === "Đang xét duyệt"
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
                  : "border-zinc-500/40 bg-zinc-500/10 text-zinc-300"
            }`}
          >
            {status}
          </span>
        </div>

        <ul className="mt-4 space-y-2 text-sm text-zinc-400">
          <li>• Tăng độ tin cậy với độc giả</li>
          <li>• Có thể bật kiếm tiền khi đủ điều kiện nền tảng</li>
          <li>• Hiển thị badge tác giả xác minh trên hồ sơ công khai</li>
        </ul>

        {verification.latestPending ? (
          <p className="mt-3 text-sm text-amber-200">
            Yêu cầu đang chờ duyệt — {VERIFICATION_STATUS_LABELS.pending}.
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={studioPath("/settings/verification")}>
            <Button className="min-h-10" type="button">
              Mở trang xác thực
            </Button>
          </Link>
          <Link href={studioPath("/help")}>
            <Button className="min-h-10" type="button" variant="secondary">
              Xem điều kiện xác thực
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-400">
        <p>
          <span className="text-zinc-300">Vai trò:</span> Tác giả (Creator)
        </p>
        {email ? (
          <p className="mt-2">
            <span className="text-zinc-300">Email đăng nhập:</span> {email}
          </p>
        ) : null}
        {accountCreatedAt ? (
          <p className="mt-2">
            <span className="text-zinc-300">Ngày tạo tài khoản:</span>{" "}
            {new Date(accountCreatedAt).toLocaleDateString("vi-VN")}
          </p>
        ) : null}
      </div>
    </section>
  );
}
