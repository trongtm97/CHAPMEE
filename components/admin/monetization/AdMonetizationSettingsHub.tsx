"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { MoneySettingCard } from "@/components/admin/MoneySettingCard";
import { Button, Input } from "@/components/ui";
import { saveAdMonetizationHubAction } from "@/lib/admin/ad-monetization-settings-actions";
import {
  AD_CREATOR_POOL_CONFIRM_THRESHOLD,
  buildEstimatePolicyMismatchWarning,
  validateAdMonetizationHubInput
} from "@/lib/admin/ad-monetization-hub-validation";
import type { MonetizationSettingsPermissions } from "@/lib/auth/monetization-settings-permissions";
import type {
  AdMonetizationOverview,
  CreatorAdPolicyAuditLog
} from "@/types/admin-ad-monetization-settings";

const QUICK_LINKS = [
  { label: "Quản lý vị trí quảng cáo", href: "/admin/ads", description: "Vị trí hiển thị & AdSense" },
  {
    label: "Chính sách chia sẻ ads",
    href: "/admin/ad-revenue-policy",
    description: "KYC, hồ sơ tác giả, văn bản chính sách"
  },
  {
    label: "Đối soát doanh thu",
    href: "/admin/ad-revenue-reconciliation",
    description: "Doanh thu đối tác theo tháng"
  },
  { label: "Cảnh báo gian lận", href: "/admin/ad-fraud", description: "Tín hiệu & hold" },
  { label: "Báo cáo ads", href: "/admin/ad-revenue", description: "RPM & ước tính" }
] as const;

type AdHubTab = "ads" | "sharing" | "reconciliation" | "fraud" | "placement";

type AdMonetizationSettingsHubProps = {
  initialOverview: AdMonetizationOverview;
  auditLogs: CreatorAdPolicyAuditLog[];
  permissions: MonetizationSettingsPermissions;
};

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Math.round(value));
}

function StatusPill({ on, label }: { on: boolean; label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-300">
      {label}:{" "}
      <span className={on ? "text-cyan-300" : "text-zinc-500"}>{on ? "Bật" : "Tắt"}</span>
    </span>
  );
}

export function AdMonetizationSettingsHub({
  initialOverview,
  auditLogs: initialAuditLogs,
  permissions
}: AdMonetizationSettingsHubProps) {
  const canEdit = permissions.canUpdateRevenue || permissions.canUpdateAny;
  const [tab, setTab] = useState<AdHubTab>("ads");
  const [overview, setOverview] = useState(initialOverview);
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [poolPercent, setPoolPercent] = useState(String(overview.policy.creator_pool_percent));
  const [reservePercent, setReservePercent] = useState(String(overview.policy.reserve_percent));
  const [reserveDays, setReserveDays] = useState(String(overview.policy.reserve_hold_days));
  const [minPayout, setMinPayout] = useState(String(overview.policy.min_payout_vnd));
  const [betaMode, setBetaMode] = useState(overview.policy.beta_mode);
  const [estimateVisible, setEstimateVisible] = useState(
    overview.estimateSettings.is_estimate_visible_to_creators
  );

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmReason, setConfirmReason] = useState("");
  const [riskAck, setRiskAck] = useState(false);

  const mismatchWarning = useMemo(
    () =>
      buildEstimatePolicyMismatchWarning({
        estimateVisible: overview.estimateSettings.is_estimate_visible_to_creators,
        policyEnabled: overview.policy.is_enabled
      }),
    [overview]
  );

  const draftValidation = useMemo(
    () =>
      validateAdMonetizationHubInput({
        creator_pool_percent: Number(poolPercent),
        reserve_percent: Number(reservePercent),
        reserve_hold_days: Number(reserveDays),
        min_payout_vnd: Number(minPayout)
      }),
    [poolPercent, reservePercent, reserveDays, minPayout]
  );

  const unsaved =
    Number(poolPercent) !== overview.policy.creator_pool_percent ||
    Number(reservePercent) !== overview.policy.reserve_percent ||
    Number(reserveDays) !== overview.policy.reserve_hold_days ||
    Number(minPayout) !== overview.policy.min_payout_vnd ||
    betaMode !== overview.policy.beta_mode ||
    estimateVisible !== overview.estimateSettings.is_estimate_visible_to_creators;

  function handleSaveClick() {
    if (!canEdit || !unsaved) return;
    if (!draftValidation.ok) {
      setToast({ type: "err", text: draftValidation.formError ?? "Dữ liệu không hợp lệ." });
      return;
    }
    setRiskAck(false);
    setConfirmOpen(true);
  }

  function persist(reason: string) {
    startTransition(async () => {
      const result = await saveAdMonetizationHubAction({
        creator_pool_percent: Number(poolPercent),
        reserve_percent: Number(reservePercent),
        reserve_hold_days: Number(reserveDays),
        min_payout_vnd: Number(minPayout),
        beta_mode: betaMode,
        is_estimate_visible_to_creators: estimateVisible,
        reason
      });

      if (!result.ok) {
        setToast({ type: "err", text: result.message ?? "Không lưu được." });
        return;
      }

      if (result.overview) {
        setOverview(result.overview);
        setPoolPercent(String(result.overview.policy.creator_pool_percent));
        setReservePercent(String(result.overview.policy.reserve_percent));
        setReserveDays(String(result.overview.policy.reserve_hold_days));
        setMinPayout(String(result.overview.policy.min_payout_vnd));
        setBetaMode(result.overview.policy.beta_mode);
        setEstimateVisible(result.overview.estimateSettings.is_estimate_visible_to_creators);
      }

      setToast({ type: "ok", text: result.message ?? "Đã lưu." });
      setConfirmOpen(false);
      setConfirmReason("");
      setRiskAck(false);

      try {
        const res = await fetch("/api/admin/ad-revenue-policy/audit?limit=10");
        const json = (await res.json()) as { logs?: CreatorAdPolicyAuditLog[] };
        if (json.logs) setAuditLogs(json.logs);
      } catch {
        /* ignore refresh failure */
      }
    });
  }

  const tabButtons: { id: AdHubTab; label: string }[] = [
    { id: "ads", label: "Quảng cáo" },
    { id: "sharing", label: "Chia sẻ doanh thu ads" },
    { id: "reconciliation", label: "Đối soát" },
    { id: "fraud", label: "Chống gian lận" },
    { id: "placement", label: "Vị trí QC" }
  ];

  return (
    <div className={`space-y-6 ${unsaved && canEdit ? "pb-28" : "pb-4"}`}>
      <div className="rounded-2xl border border-violet-400/20 bg-violet-400/5 p-4 text-sm text-violet-100/90">
        Khu vực này chỉ quản lý quảng cáo và chia sẻ doanh thu quảng cáo — tách biệt với coin,
        chương trả phí và gói nạp tiền. Số liệu tỷ lệ đọc từ cơ sở dữ liệu, không hard-code trên
        giao diện.
      </div>

      <header className="space-y-3">
        <div>
          <h2 className="text-xl font-bold text-white sm:text-2xl">Quảng cáo & chia sẻ doanh thu</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Tổng quan, liên kết module chuyên sâu và chỉnh chính sách cơ bản (nếu có quyền tài chính).
          </p>
        </div>

        <nav className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
          {tabButtons.map((item) => (
            <button
              key={item.id}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                tab === item.id
                  ? "bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              onClick={() => setTab(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {mismatchWarning ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          {mismatchWarning}
        </div>
      ) : null}

      {draftValidation.warnings.length > 0 && tab === "sharing" ? (
        <ul className="space-y-1 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-100/90">
          {draftValidation.warnings.map((w) => (
            <li key={w}>• {w}</li>
          ))}
        </ul>
      ) : null}

      {toast ? (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${
            toast.type === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/30 bg-red-500/10 text-red-200"
          }`}
        >
          {toast.text}
        </p>
      ) : null}

      {!canEdit ? (
        <p className="text-sm text-amber-300/90">
          Chế độ chỉ xem — không có quyền chỉnh chính sách quảng cáo.
        </p>
      ) : null}

      {(tab === "ads" || tab === "sharing") && (
        <MoneySettingCard
          description="Trạng thái hiện tại từ chính sách và cấu hình ước tính."
          title="Tổng quan"
        >
          <div className="flex flex-wrap gap-2">
            <StatusPill
              label="Vị trí QC đang bật"
              on={overview.adsPlacementsEnabled > 0}
            />
            <StatusPill label="Chia sẻ QC tác giả" on={overview.policy.is_enabled} />
            <StatusPill label="Chế độ beta" on={overview.policy.beta_mode} />
            <StatusPill
              label="Ước tính hiển thị cho tác giả"
              on={overview.estimateSettings.is_estimate_visible_to_creators}
            />
          </div>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-2 border-b border-white/5 pb-2">
              <dt className="text-zinc-400">Tỷ lệ pool tác giả</dt>
              <dd className="font-medium text-white">{overview.policy.creator_pool_percent}%</dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-white/5 pb-2">
              <dt className="text-zinc-400">Tỷ lệ dự phòng</dt>
              <dd className="font-medium text-white">{overview.policy.reserve_percent}%</dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-white/5 pb-2">
              <dt className="text-zinc-400">Số ngày giữ dự phòng</dt>
              <dd className="font-medium text-white">{overview.policy.reserve_hold_days} ngày</dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-white/5 pb-2">
              <dt className="text-zinc-400">Rút tối thiểu</dt>
              <dd className="font-medium text-white">{formatVnd(overview.policy.min_payout_vnd)}</dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-white/5 pb-2">
              <dt className="text-zinc-400">Ước tính tháng {overview.currentMonthKey}</dt>
              <dd className="font-medium text-cyan-200">
                {formatVnd(overview.currentMonthEstimateGrossVnd)}
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-white/5 pb-2">
              <dt className="text-zinc-400">Tháng đối soát gần nhất</dt>
              <dd className="font-medium text-white">
                {overview.lastReconciledMonth ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-white/5 pb-2 sm:col-span-2">
              <dt className="text-zinc-400">Vị trí quảng cáo</dt>
              <dd className="font-medium text-white">
                {overview.adsPlacementsEnabled}/{overview.adsPlacementsTotal} đang bật
              </dd>
            </div>
          </dl>
        </MoneySettingCard>
      )}

      <MoneySettingCard description="Điều hướng tới trang chuyên sâu." title="Liên kết nhanh">
        <ul className="grid gap-3 sm:grid-cols-2">
          {QUICK_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                className="block rounded-xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-cyan-400/30 hover:bg-cyan-400/5"
                href={link.href}
              >
                <span className="text-sm font-semibold text-cyan-200">{link.label}</span>
                <p className="mt-1 text-xs text-zinc-500">{link.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </MoneySettingCard>

      {tab === "sharing" && (
        <MoneySettingCard
          description="Các trường cơ bản; bật/tắt chương trình và KYC tại trang chính sách đầy đủ."
          title="Chỉnh chính sách cơ bản"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="text-zinc-400">Tỷ lệ pool tác giả (%)</span>
              <Input
                disabled={!canEdit || pending}
                inputMode="decimal"
                onChange={(e) => setPoolPercent(e.target.value)}
                value={poolPercent}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-zinc-400">Dự phòng (% trên pool)</span>
              <Input
                disabled={!canEdit || pending}
                inputMode="decimal"
                onChange={(e) => setReservePercent(e.target.value)}
                value={reservePercent}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-zinc-400">Số ngày giữ dự phòng</span>
              <Input
                disabled={!canEdit || pending}
                inputMode="numeric"
                onChange={(e) => setReserveDays(e.target.value)}
                value={reserveDays}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-zinc-400">Rút tối thiểu (VND)</span>
              <Input
                disabled={!canEdit || pending}
                inputMode="numeric"
                onChange={(e) => setMinPayout(e.target.value)}
                value={minPayout}
              />
            </label>
          </div>

          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-3 text-sm text-zinc-200">
              <input
                checked={betaMode}
                className="size-4 rounded border-white/20"
                disabled={!canEdit || pending}
                onChange={(e) => setBetaMode(e.target.checked)}
                type="checkbox"
              />
              Chế độ beta (giới hạn phạm vi triển khai)
            </label>
            <label className="flex items-center gap-3 text-sm text-zinc-200">
              <input
                checked={estimateVisible}
                className="size-4 rounded border-white/20"
                disabled={!canEdit || pending}
                onChange={(e) => setEstimateVisible(e.target.checked)}
                type="checkbox"
              />
              Hiển thị ước tính doanh thu cho tác giả (không phải số đối soát cuối)
            </label>
          </div>

          {canEdit && unsaved ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button disabled={pending || !draftValidation.ok} onClick={handleSaveClick} type="button">
                {pending ? "Đang lưu…" : "Lưu chính sách quảng cáo"}
              </Button>
              <Button
                disabled={pending}
                onClick={() => {
                  setPoolPercent(String(overview.policy.creator_pool_percent));
                  setReservePercent(String(overview.policy.reserve_percent));
                  setReserveDays(String(overview.policy.reserve_hold_days));
                  setMinPayout(String(overview.policy.min_payout_vnd));
                  setBetaMode(overview.policy.beta_mode);
                  setEstimateVisible(
                    overview.estimateSettings.is_estimate_visible_to_creators
                  );
                }}
                type="button"
                variant="secondary"
              >
                Hoàn tác
              </Button>
            </div>
          ) : null}

          <p className="mt-3 text-xs text-zinc-500">
            Bật/tắt chương trình chia sẻ, văn bản chính sách và hồ sơ tác giả:{" "}
            <Link className="text-cyan-300" href="/admin/ad-revenue-policy">
              Chính sách chia sẻ ads →
            </Link>
          </p>
        </MoneySettingCard>
      )}

      {tab === "reconciliation" && (
        <MoneySettingCard
          description="Đối soát theo doanh thu đối tác — không dùng RPM ước tính làm số chi trả."
          title="Đối soát doanh thu"
        >
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-400">Tháng đối soát gần nhất</dt>
              <dd className="text-white">{overview.lastReconciledMonth ?? "Chưa có"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-400">Bản nháp đang mở</dt>
              <dd className="text-white">{overview.draftReconciliations}</dd>
            </div>
          </dl>
          <Link
            className="mt-4 inline-block text-sm font-semibold text-cyan-300"
            href="/admin/ad-revenue-reconciliation"
          >
            Mở đối soát tháng →
          </Link>
        </MoneySettingCard>
      )}

      {tab === "fraud" && (
        <MoneySettingCard description="Tín hiệu gian lận và hold phân bổ." title="Chống gian lận">
          <p className="text-sm text-zinc-300">
            Tín hiệu đang mở / đang xem xét:{" "}
            <span className="font-semibold text-amber-200">{overview.openFraudSignals}</span>
          </p>
          <Link className="mt-4 inline-block text-sm font-semibold text-cyan-300" href="/admin/ad-fraud">
            Mở cảnh báo gian lận →
          </Link>
        </MoneySettingCard>
      )}

      {tab === "placement" && (
        <MoneySettingCard description="Vị trí hiển thị quảng cáo trên nền tảng." title="Vị trí quảng cáo">
          <p className="text-sm text-zinc-300">
            {overview.adsPlacementsEnabled} / {overview.adsPlacementsTotal} vị trí đang bật
          </p>
          <Link className="mt-4 inline-block text-sm font-semibold text-cyan-300" href="/admin/ads">
            Quản lý vị trí quảng cáo →
          </Link>
        </MoneySettingCard>
      )}

      {permissions.canViewAudit ? (
        <MoneySettingCard
          description="Thay đổi chính sách quảng cáo từ trang này và trang chính sách đầy đủ."
          title="Nhật ký chính sách quảng cáo gần đây"
        >
          {auditLogs.length === 0 ? (
            <p className="text-sm text-zinc-500">Chưa có thay đổi.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {auditLogs.slice(0, 8).map((log) => (
                <li
                  key={log.id}
                  className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2"
                >
                  <div className="flex flex-wrap justify-between gap-1 text-xs text-zinc-500">
                    <span>{new Date(log.created_at).toLocaleString("vi-VN")}</span>
                    <span>{log.action}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link
            className="mt-3 inline-block text-sm font-semibold text-cyan-300"
            href="/admin/ad-revenue-policy"
          >
            Xem nhật ký đầy đủ →
          </Link>
        </MoneySettingCard>
      ) : null}

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-white">Xác nhận lưu cấu hình quảng cáo</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Thay đổi áp dụng cho chính sách chia sẻ doanh thu quảng cáo (tách biệt coin).
            </p>
            {draftValidation.needsPoolConfirm ? (
              <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                Tỷ lệ pool tác giả &gt; {AD_CREATOR_POOL_CONFIRM_THRESHOLD}% — vui lòng xác nhận bạn hiểu
                tác động tài chính.
              </p>
            ) : null}
            <label className="mt-4 block text-sm text-zinc-300">
              Lý do thay đổi (bắt buộc)
              <Input
                className="mt-1"
                onChange={(e) => setConfirmReason(e.target.value)}
                placeholder="Ví dụ: điều chỉnh dự phòng theo báo cáo đối tác"
                value={confirmReason}
              />
            </label>
            <label className="mt-3 flex items-start gap-2 text-sm text-zinc-300">
              <input
                checked={riskAck}
                className="mt-1 size-4"
                onChange={(e) => setRiskAck(e.target.checked)}
                type="checkbox"
              />
              Tôi xác nhận đã đọc cảnh báo và chịu trách nhiệm với thay đổi này.
            </label>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                onClick={() => {
                  setConfirmOpen(false);
                  setConfirmReason("");
                }}
                type="button"
                variant="secondary"
              >
                Hủy
              </Button>
              <Button
                disabled={
                  pending || confirmReason.trim().length < 3 || !riskAck || !draftValidation.ok
                }
                onClick={() => persist(confirmReason)}
                type="button"
              >
                {pending ? "Đang lưu…" : "Lưu"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
