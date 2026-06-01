import Link from "next/link";
import { MonetizationBadge } from "@/components/studio/monetization/monetization-ui";
import { formatMonetizationVnd } from "@/lib/studio/format-monetization-display";
import type { StudioCreatorRevenuePolicyView } from "@/types/studio-monetization";

type CreatorRevenuePolicySectionProps = {
  policy: StudioCreatorRevenuePolicyView;
};

export function CreatorRevenuePolicySection({ policy }: CreatorRevenuePolicySectionProps) {
  const paidChapter = policy.sourceRows.find((row) => row.id === "paid_chapter");
  const fullStory = policy.sourceRows.find((row) => row.id === "full_story");
  const tip = policy.sourceRows.find((row) => row.id === "tip");

  return (
    <section className="rounded-2xl border border-teal-400/25 bg-gradient-to-br from-teal-950/50 via-zinc-950 to-cyan-950/30 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-teal-50">Chính sách doanh thu của bạn</h2>
          <p className="mt-1 max-w-2xl text-sm text-teal-100/75">
            Chỉ còn tỉ lệ ăn chia: bạn nhận + ChapMee giữ = 100% trên mỗi giao dịch.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <MonetizationBadge tone={policy.badgeLabel === "Chính sách riêng" ? "purple" : "cyan"}>
            {policy.badgeLabel}
          </MonetizationBadge>
          {policy.effectiveFromLabel ? (
            <MonetizationBadge tone="green">
              Có hiệu lực từ {policy.effectiveFromLabel}
            </MonetizationBadge>
          ) : null}
          {policy.scheduledChangeLabel ? (
            <MonetizationBadge tone="amber">
              Sắp thay đổi từ {policy.scheduledChangeLabel}
            </MonetizationBadge>
          ) : null}
        </div>
      </div>

      {policy.scheduledChangeLabel ? (
        <p className="mt-3 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-sm text-amber-50">
          Chính sách mới{policy.scheduledPolicyName ? ` “${policy.scheduledPolicyName}”` : ""} sẽ
          áp dụng từ ngày {policy.scheduledChangeLabel}.
        </p>
      ) : null}

      {policy.policyName && policy.showDetails ? (
        <p className="mt-2 text-sm text-teal-100/80">
          Tên chính sách: <span className="font-semibold text-white">{policy.policyName}</span>
        </p>
      ) : null}

      {policy.publicNote && policy.showDetails ? (
        <p className="mt-2 whitespace-pre-line rounded-lg border border-teal-400/20 bg-teal-950/40 px-3 py-2 text-sm text-teal-100/85">
          {policy.publicNote}
        </p>
      ) : null}

      <div className="mt-4 hidden overflow-x-auto rounded-xl border border-teal-400/15 md:block">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-teal-400/15 text-xs uppercase tracking-wide text-teal-200/70">
              <th className="px-3 py-2 font-semibold">Nguồn doanh thu</th>
              <th className="px-3 py-2 font-semibold">Bạn nhận</th>
              <th className="px-3 py-2 font-semibold">ChapMee giữ</th>
              <th className="px-3 py-2 font-semibold">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {policy.sourceRows.map((row) => (
              <tr className="border-t border-teal-400/10" key={row.id}>
                <td className="px-3 py-2.5 font-medium text-teal-50">{row.label}</td>
                <td className="px-3 py-2.5 font-semibold text-emerald-200">{row.authorPercent}%</td>
                <td className="px-3 py-2.5 text-zinc-300">{row.platformPercent}%</td>
                <td className="px-3 py-2.5 text-zinc-400">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-4 space-y-2 md:hidden">
        {policy.sourceRows.map((row) => (
          <li
            className="rounded-xl border border-teal-400/15 bg-teal-950/30 p-3 text-sm"
            key={row.id}
          >
            <p className="font-semibold text-teal-50">{row.label}</p>
            <p className="mt-1 text-emerald-200">Bạn nhận: {row.authorPercent}%</p>
            <p className="text-zinc-300">ChapMee giữ: {row.platformPercent}%</p>
            <p className="mt-1 text-xs text-zinc-500">{row.note}</p>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {paidChapter && policy.showDetails ? (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
            <p className="text-sm font-semibold text-emerald-100">Doanh thu chương trả phí</p>
            <ul className="mt-2 space-y-1 text-sm text-zinc-300">
              <li>Bạn nhận: {paidChapter.authorPercent}%</li>
              <li>ChapMee giữ: {paidChapter.platformPercent}%</li>
              <li className="text-emerald-100/90">
                Ví dụ: chương {policy.paidChapterExample.coinPrice}{" "}
                {policy.paidChapterExample.coinDisplayName} → bạn nhận{" "}
                {policy.paidChapterExample.authorCoin} {policy.paidChapterExample.coinDisplayName},
                nền tảng giữ {policy.paidChapterExample.platformCoin}{" "}
                {policy.paidChapterExample.coinDisplayName}.
              </li>
            </ul>
          </div>
        ) : null}

        {fullStory && policy.showDetails ? (
          <div className="rounded-xl border border-violet-400/20 bg-violet-400/5 p-3">
            <p className="text-sm font-semibold text-violet-100">Doanh thu bán trọn bộ</p>
            <ul className="mt-2 space-y-1 text-sm text-zinc-300">
              <li>Bạn nhận: {fullStory.authorPercent}%</li>
              <li>ChapMee giữ: {fullStory.platformPercent}%</li>
            </ul>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-amber-100/90">
              {policy.fullStoryHoldRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {tip && policy.showDetails ? (
          <div className="rounded-xl border border-rose-400/15 bg-rose-400/5 p-3">
            <p className="text-sm font-semibold text-rose-100">Tip / ủng hộ</p>
            <ul className="mt-2 space-y-1 text-sm text-zinc-300">
              <li>Bạn nhận: {tip.authorPercent}%</li>
              <li>ChapMee giữ: {tip.platformPercent}%</li>
            </ul>
          </div>
        ) : null}

        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3">
          <p className="text-sm font-semibold text-cyan-100">Rút tiền</p>
          <ul className="mt-2 space-y-1 text-sm text-zinc-300">
            <li>Rút tối thiểu: {formatMonetizationVnd(policy.withdrawal.minWithdrawVnd)}</li>
            <li>Thời gian xử lý dự kiến: {policy.withdrawal.processingDaysLabel}</li>
            <li>
              Cần admin duyệt: {policy.withdrawal.requiresAdminApproval ? "Có" : "Không"}
            </li>
            <li>
              Cần xác thực tài khoản:{" "}
              {policy.withdrawal.requiresIdentityVerification ? "Có" : "Không"}
            </li>
            <li>PIN rút tiền: {policy.withdrawal.requiresPin ? "Bắt buộc" : "Không bắt buộc"}</li>
          </ul>
          {!policy.withdrawal.platformWithdrawalsEnabled ? (
            <p className="mt-2 text-sm font-medium text-rose-200">
              Rút tiền đang tắt trên toàn nền tảng.
            </p>
          ) : null}
          {policy.withdrawal.creatorWithdrawalBlocked ? (
            <p className="mt-2 text-sm font-medium text-rose-200">
              Tài khoản bị khóa rút tiền:{" "}
              {policy.withdrawal.creatorWithdrawalBlockReason ?? "Liên hệ ChapMee."}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-sky-400/20 bg-sky-400/5 p-3">
          <p className="text-sm font-semibold text-sky-100">Coin / VND</p>
          <p className="mt-2 text-sm text-zinc-300">
            1 {policy.coinDisplayName} = {policy.coinToVndRate.toLocaleString("vi-VN")} ₫
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs text-teal-200/50">
        Doanh thu được chia theo tỉ lệ trên tổng Coin/VND giao dịch. Bạn nhận + ChapMee giữ = 100%.
        Giao dịch cũ giữ nguyên tỷ lệ đã ghi nhận.
      </p>
    </section>
  );
}
