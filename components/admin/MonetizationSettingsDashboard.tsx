"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import { CreatorOverrideStatsCard } from "@/components/admin/CreatorOverrideStatsCard";
import { FeatureToggleRow } from "@/components/admin/FeatureToggleRow";
import { MoneySettingCard } from "@/components/admin/MoneySettingCard";
import { MonetizationStickyBar } from "@/components/admin/MonetizationStickyBar";
import {
  RevenueRuleTable,
  RevenueSourceCustomEditor
} from "@/components/admin/RevenueRuleTable";
import { SettingsConfirmModal } from "@/components/admin/SettingsConfirmModal";
import { Button, Input } from "@/components/ui";
import type { CreatorFeeOverrideStats } from "@/lib/admin/get-creator-fee-override-stats";
import type { MonetizationAuditLogEntry } from "@/lib/admin/get-monetization-audit-logs";
import { saveMonetizationDashboardAction } from "@/lib/admin/monetization-dashboard-actions";
import {
  buildDraftChangeList,
  computeSplitPreview,
  ECOSYSTEM_TOGGLES,
  hasImportantDraftChanges,
  hasUnsavedDraft,
  pickDashboardSettings,
  validateMonetizationDashboard,
  type DraftSettingChange,
  type PreviewTransactionType,
  type RevenueSourceDefinition
} from "@/lib/admin/monetization";
import type { MonetizationSettingsPermissions } from "@/lib/auth/monetization-settings-permissions";
import type { MonetizationConfigKey, MonetizationSettingsMap } from "@/types/monetization";

type MonetizationSettingsDashboardProps = {
  initialSettings: MonetizationSettingsMap;
  updatedAt: string | null;
  permissions: MonetizationSettingsPermissions;
  auditLogs: MonetizationAuditLogEntry[];
  overrideStats: CreatorFeeOverrideStats;
};

function num(v: MonetizationSettingsMap[MonetizationConfigKey]) {
  return typeof v === "number" ? v : Number(v) || 0;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-400">{message}</p>;
}

function FieldWarning({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-amber-300/90">{message}</p>;
}

export function MonetizationSettingsDashboard({
  initialSettings,
  updatedAt,
  permissions,
  auditLogs,
  overrideStats
}: MonetizationSettingsDashboardProps) {
  const [baseline, setBaseline] = useState(initialSettings);
  const [draft, setDraft] = useState(initialSettings);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmReason, setConfirmReason] = useState("");
  const [pendingChanges, setPendingChanges] = useState<DraftSettingChange[]>([]);
  const [customSource, setCustomSource] = useState<RevenueSourceDefinition | null>(
    null
  );
  const [previewCoins, setPreviewCoins] = useState(100);
  const [previewType, setPreviewType] = useState<PreviewTransactionType>(
    "chapter_unlock"
  );
  const [previewUseCustom, setPreviewUseCustom] = useState(false);
  const [previewCustomCreator, setPreviewCustomCreator] = useState(70);
  const [previewSimulateLocked, setPreviewSimulateLocked] = useState(false);

  const validation = useMemo(() => validateMonetizationDashboard(draft), [draft]);
  const unsaved = useMemo(() => hasUnsavedDraft(baseline, draft), [baseline, draft]);
  const importantPending = useMemo(
    () => hasImportantDraftChanges(baseline, draft),
    [baseline, draft]
  );

  const preview = useMemo(
    () =>
      computeSplitPreview(draft, {
        coins: previewCoins,
        type: previewType,
        useCustomRate: previewUseCustom,
        customCreatorPercent: previewCustomCreator,
        customPlatformPercent: Math.max(0, 100 - previewCustomCreator),
        simulateLocked: previewSimulateLocked
      }),
    [
      draft,
      previewCoins,
      previewType,
      previewUseCustom,
      previewCustomCreator,
      previewSimulateLocked
    ]
  );

  const monetizationOn = Boolean(draft["monetization.enabled"]);
  const inputDisabled = (sectionOk: boolean) =>
    pending || !sectionOk;

  const update = useCallback(
    (key: MonetizationConfigKey, value: boolean | number | string) => {
      setDraft((prev) => {
        const next = { ...prev, [key]: value };
        if (key === "revenue_share.default_creator_percent" && typeof value === "number") {
          next["revenue_share.default_platform_percent"] = Math.max(0, 100 - value);
        }
        if (key === "revenue_share.default_platform_percent" && typeof value === "number") {
          next["revenue_share.default_creator_percent"] = Math.max(0, 100 - value);
        }
        return next;
      });
    },
    []
  );

  const defaultCreator = num(draft["revenue_share.default_creator_percent"]);
  const defaultPlatform = num(draft["revenue_share.default_platform_percent"]);
  const coinRate = num(draft["coin.exchange_rate_vnd"]);

  function restoreDraft() {
    setDraft(baseline);
    setCustomSource(null);
    setToast(null);
  }

  function persist(reason: string) {
    startTransition(async () => {
      const result = await saveMonetizationDashboardAction({
        settings: pickDashboardSettings(draft),
        reason
      });

      if (!result.ok) {
        setToast({ type: "err", text: result.message ?? "Không lưu được." });
        return;
      }

      if (result.settings) {
        setDraft(result.settings);
        setBaseline(result.settings);
      }
      setToast({ type: "ok", text: "Đã lưu cấu hình kiếm tiền." });
      setConfirmOpen(false);
      setConfirmReason("");
      setPendingChanges([]);
    });
  }

  function handleSaveClick() {
    if (!permissions.canUpdateAny) return;
    if (!unsaved) return;

    const v = validateMonetizationDashboard(draft);
    if (!v.ok) {
      setToast({
        type: "err",
        text: v.formError ?? "Vui lòng sửa lỗi trước khi lưu."
      });
      return;
    }

    const changes = buildDraftChangeList(baseline, draft);
    if (changes.length === 0) return;

    setPendingChanges(changes);
    setConfirmOpen(true);
  }

  function handleSetCustom(source: RevenueSourceDefinition) {
    update(source.useDefaultKey, false);
    setCustomSource(source);
  }

  function handleResetDefault(source: RevenueSourceDefinition) {
    update(source.useDefaultKey, true);
    setCustomSource(null);
  }

  const statusBadges = [
    {
      label: "Hệ sinh thái tiền",
      on: monetizationOn
    },
    {
      label: "Mua coin",
      on: Boolean(draft["coin.purchase_enabled"])
    },
    {
      label: "Chương trả phí",
      on: Boolean(draft["paid_chapters.enabled"])
    },
    {
      label: "Rút tiền tác giả",
      on: Boolean(draft["payout.enabled"])
    },
    {
      label: "Tỷ giá coin",
      value: `${coinRate.toLocaleString("vi-VN")} ₫/coin`
    }
  ];

  return (
    <div className={`space-y-8 ${unsaved ? "pb-28 md:pb-32" : "pb-8"}`}>
      <header className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Cấu hình kiếm tiền
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Quản lý coin, chia doanh thu, chương trả phí, tip và rút tiền.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {statusBadges.map((item) => (
            <span
              key={item.label}
              className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-300"
            >
              {item.label}:{" "}
              {"value" in item ? (
                <span className="text-cyan-300">{item.value}</span>
              ) : (
                <span className={item.on ? "text-cyan-300" : "text-zinc-500"}>
                  {item.on ? "Bật" : "Tắt"}
                </span>
              )}
            </span>
          ))}
        </div>

        {updatedAt ? (
          <p className="text-xs text-zinc-500">
            Cập nhật lần cuối: {new Date(updatedAt).toLocaleString("vi-VN")}
          </p>
        ) : null}

        {unsaved ? (
          <p className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
            Có thay đổi chưa lưu
          </p>
        ) : null}

        {importantPending ? (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 text-xs leading-5 text-amber-100/90">
            <p>Thay đổi này có thể ảnh hưởng giao dịch mới sau khi lưu.</p>
            <p>Giao dịch cũ không được tính lại.</p>
            <p>Vui lòng nhập lý do thay đổi trước khi lưu.</p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {permissions.canViewAudit ? (
            <>
              <Button
                onClick={() =>
                  document.getElementById("history")?.scrollIntoView({ behavior: "smooth" })
                }
                type="button"
                variant="secondary"
              >
                Xem lịch sử thay đổi
              </Button>
              <Link
                className="tap-highlight inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-zinc-100"
                href="/admin/audit?targetType=monetization_settings"
              >
                Xem audit log
              </Link>
            </>
          ) : null}
          {!permissions.canUpdateAny ? (
            <p className="text-sm text-amber-300/90 w-full">
              Chế độ chỉ xem — bạn không có quyền chỉnh cấu hình kiếm tiền.
            </p>
          ) : null}
        </div>

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
        {!validation.ok && validation.formError ? (
          <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300">
            {validation.formError}
          </p>
        ) : null}
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <MoneySettingCard
          description="Bật/tắt từng module. Tắt hệ sinh thái tiền sẽ vô hiệu hóa các toggle phụ thuộc."
          id="ecosystem"
          title="Trạng thái hệ sinh thái"
        >
          <div className="space-y-2">
            {ECOSYSTEM_TOGGLES.map((toggle) => {
              const childLocked =
                toggle.requiresMonetization && !monetizationOn;
              return (
                <FeatureToggleRow
                  key={toggle.key}
                  checked={Boolean(draft[toggle.key])}
                  dangerous={toggle.dangerous}
                  description={toggle.description}
                  disabled={
                    !permissions.canUpdateEcosystem ||
                    childLocked ||
                    inputDisabled(permissions.canUpdateEcosystem)
                  }
                  important={toggle.important}
                  impactNote={toggle.impactNote}
                  loading={pending}
                  label={toggle.label}
                  onChange={(checked) => update(toggle.key, checked)}
                />
              );
            })}
          </div>
        </MoneySettingCard>

        <MoneySettingCard
          description="Tỷ giá mới chỉ áp dụng cho giao dịch mới."
          id="coin"
          title="Coin & tỷ giá"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="text-zinc-400">Tỷ giá coin → VND</span>
              <Input
                className="mt-1 max-w-xs"
                disabled={inputDisabled(permissions.canUpdateCoin)}
                min={1}
                type="number"
                value={coinRate}
                onChange={(e) =>
                  update("coin.exchange_rate_vnd", Number(e.target.value))
                }
              />
              <FieldError message={validation.fieldErrors["coin.exchange_rate_vnd"]} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Giá coin tối thiểu / chương</span>
              <Input
                className="mt-1"
                disabled={inputDisabled(permissions.canUpdateCoin)}
                min={0}
                type="number"
                value={num(draft["paid_chapters.min_coin_price"])}
                onChange={(e) =>
                  update("paid_chapters.min_coin_price", Number(e.target.value))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Giá coin tối đa / chương</span>
              <Input
                className="mt-1"
                disabled={inputDisabled(permissions.canUpdateCoin)}
                min={0}
                type="number"
                value={num(draft["paid_chapters.max_coin_price"])}
                onChange={(e) =>
                  update("paid_chapters.max_coin_price", Number(e.target.value))
                }
              />
              <FieldError message={validation.fieldErrors["paid_chapters.max_coin_price"]} />
              <FieldWarning
                message={validation.fieldWarnings["paid_chapters.max_coin_price"]}
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Coin tối thiểu mỗi lần mua</span>
              <Input
                className="mt-1"
                disabled={inputDisabled(permissions.canUpdateCoin)}
                min={1}
                type="number"
                value={num(draft["coin.min_purchase_coins"])}
                onChange={(e) =>
                  update("coin.min_purchase_coins", Number(e.target.value))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Coin tối đa mỗi lần mua</span>
              <Input
                className="mt-1"
                disabled={inputDisabled(permissions.canUpdateCoin)}
                min={1}
                type="number"
                value={num(draft["coin.max_purchase_coins"])}
                onChange={(e) =>
                  update("coin.max_purchase_coins", Number(e.target.value))
                }
              />
              <FieldError message={validation.fieldErrors["coin.max_purchase_coins"]} />
            </label>
          </div>
          <p className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-zinc-300">
            Ví dụ: 100 coin ={" "}
            <span className="text-cyan-300">
              {(100 * coinRate).toLocaleString("vi-VN")} ₫
            </span>{" "}
            theo tỷ giá hiện tại.
          </p>
        </MoneySettingCard>

        <MoneySettingCard
          className="xl:col-span-2"
          description="Tác giả đã có % riêng trong profile hoặc chính sách phí sẽ không bị ảnh hưởng khi đổi % mặc định."
          id="default-share"
          title="Chia doanh thu mặc định"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-zinc-400">% tác giả mặc định</span>
                <Input
                  className="mt-1"
                  disabled={inputDisabled(permissions.canUpdateRevenue)}
                  max={100}
                  min={0}
                  type="number"
                  value={defaultCreator}
                  onChange={(e) =>
                    update(
                      "revenue_share.default_creator_percent",
                      Number(e.target.value)
                    )
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="text-zinc-400">% nền tảng mặc định</span>
                <Input
                  className="mt-1"
                  disabled={inputDisabled(permissions.canUpdateRevenue)}
                  max={100}
                  min={0}
                  type="number"
                  value={defaultPlatform}
                  onChange={(e) =>
                    update(
                      "revenue_share.default_platform_percent",
                      Number(e.target.value)
                    )
                  }
                />
              </label>
            </div>
            <p className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-zinc-300">
              Người đọc chi <span className="text-white">X coin</span> → Tác giả nhận{" "}
              <span className="text-cyan-300">{defaultCreator} coin</span> → Nền tảng giữ{" "}
              <span className="text-cyan-300">{defaultPlatform} coin</span>.
            </p>
          </div>
        </MoneySettingCard>

        <CreatorOverrideStatsCard stats={overrideStats} />

        <MoneySettingCard
          className="xl:col-span-2"
          description="Tỷ lệ riêng cho từng nguồn doanh thu."
          id="revenue-sources"
          title="Tỷ lệ theo nguồn doanh thu"
        >
          <RevenueRuleTable
            canEdit={permissions.canUpdateRevenue && !pending}
            onResetDefault={handleResetDefault}
            onSetCustom={handleSetCustom}
            settings={draft}
          />
          {customSource ? (
            <RevenueSourceCustomEditor
              onChange={update}
              onClose={() => setCustomSource(null)}
              settings={draft}
              source={customSource}
            />
          ) : null}
        </MoneySettingCard>

        <MoneySettingCard
          description="Doanh thu nên được giữ trước khi cho rút để xử lý hoàn coin, khiếu nại và nội dung vi phạm."
          id="withdrawal"
          title="Rút tiền tác giả"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-zinc-400">Rút tối thiểu (VND)</span>
              <Input
                className="mt-1"
                disabled={inputDisabled(permissions.canUpdateWithdrawal)}
                min={0}
                type="number"
                value={num(draft["payout.min_withdraw_amount_vnd"])}
                onChange={(e) =>
                  update("payout.min_withdraw_amount_vnd", Number(e.target.value))
                }
              />
              <FieldError
                message={validation.fieldErrors["payout.min_withdraw_amount_vnd"]}
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Số ngày giữ tiền</span>
              <Input
                className="mt-1"
                disabled={inputDisabled(permissions.canUpdateWithdrawal)}
                max={90}
                min={0}
                type="number"
                value={num(draft["payout.hold_days"])}
                onChange={(e) => update("payout.hold_days", Number(e.target.value))}
              />
              <FieldError message={validation.fieldErrors["payout.hold_days"]} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Số yêu cầu rút tối đa/ngày</span>
              <Input
                className="mt-1"
                disabled={inputDisabled(permissions.canUpdateWithdrawal)}
                min={1}
                type="number"
                value={num(draft["payout.max_requests_per_day"])}
                onChange={(e) =>
                  update("payout.max_requests_per_day", Number(e.target.value))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Số tiền rút tối đa/ngày (0 = không giới hạn)</span>
              <Input
                className="mt-1"
                disabled={inputDisabled(permissions.canUpdateWithdrawal)}
                min={0}
                type="number"
                value={num(draft["payout.max_amount_vnd_per_day"])}
                onChange={(e) =>
                  update("payout.max_amount_vnd_per_day", Number(e.target.value))
                }
              />
            </label>
          </div>
          <div className="space-y-2">
            {[
              {
                key: "payout.manual_review_required" as const,
                label: "Rút tiền cần duyệt thủ công",
                description: "Mọi yêu cầu rút cần admin duyệt.",
                riskBadge: false,
                warnOff:
                  "Tắt duyệt thủ công: nếu backend hỗ trợ tự động, tiền có thể được chi mà không qua admin."
              },
              {
                key: "payout.withdrawal_pin_required" as const,
                label: "Bắt buộc mã PIN rút tiền",
                description: "Tác giả phải nhập PIN khi rút."
              },
              {
                key: "payout.allow_withdraw_quality_warning" as const,
                label: "Cho phép rút khi có cảnh báo chất lượng",
                description: "Cho phép rút dù nội dung đang bị cảnh báo."
              },
              {
                key: "payout.allow_restricted_accounts" as const,
                label: "Cho phép rút khi tài khoản bị hạn chế",
                description: "Chỉ bật khi có quy trình kiểm soát rủi ro.",
                riskBadge: true,
                dangerous: true
              },
              {
                key: "payout.hold_revenue_enabled" as const,
                label: "Giữ doanh thu trước khi khả dụng",
                description: "Ghi doanh thu ở trạng thái chờ."
              }
            ].map((row) => {
              const checked = Boolean(draft[row.key]);
              return (
                <div key={row.key}>
                  <FeatureToggleRow
                    checked={checked}
                    dangerous={row.dangerous}
                    description={row.description}
                    disabled={inputDisabled(permissions.canUpdateWithdrawal)}
                    label={row.label}
                    loading={pending}
                    riskBadge={row.riskBadge}
                    onChange={(v) => update(row.key, v)}
                  />
                  {row.warnOff && !checked ? (
                    <p className="mt-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                      {row.warnOff}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </MoneySettingCard>

        <MoneySettingCard
          description="Doanh thu bị khóa không thể rút cho đến khi xử lý xong. Chỉ áp dụng cho giao dịch mới."
          id="risk-lock"
          title="Khóa doanh thu & rủi ro"
        >
          <div className="space-y-2">
            {(
              [
                ["fraud.lock_revenue_on_severe_report", "Tự khóa khi report nghiêm trọng"],
                ["fraud.lock_revenue_on_low_quality", "Tự khóa khi chất lượng thấp"],
                ["fraud.lock_revenue_on_creator_warning", "Tự khóa khi tác giả bị cảnh báo"],
                ["fraud.lock_revenue_on_refund_dispute", "Tự khóa khi tranh chấp hoàn coin"],
                ["fraud.allow_admin_manual_revenue_unlock", "Cho phép admin mở khóa thủ công"]
              ] as const
            ).map(([key, label]) => (
              <FeatureToggleRow
                key={key}
                checked={Boolean(draft[key])}
                description="Áp dụng cho giao dịch mới sau khi lưu."
                disabled={inputDisabled(permissions.canUpdateRisk)}
                impactNote="Doanh thu bị khóa không thể rút cho đến khi xử lý xong."
                label={label}
                loading={pending}
                onChange={(checked) => update(key, checked)}
              />
            ))}
            <label className="block pt-2 text-sm">
              <span className="text-zinc-400">Số ngày giữ doanh thu bị khóa</span>
              <Input
                className="mt-1 max-w-xs"
                disabled={inputDisabled(permissions.canUpdateRisk)}
                min={0}
                type="number"
                value={num(draft["fraud.revenue_lock_days"])}
                onChange={(e) =>
                  update("fraud.revenue_lock_days", Number(e.target.value))
                }
              />
            </label>
          </div>
        </MoneySettingCard>

        <MoneySettingCard
          description="Chỉ mô phỏng — không tạo giao dịch thật."
          id="preview"
          title="Xem thử chia tiền"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-zinc-400">Số coin người đọc chi</span>
              <Input
                className="mt-1"
                min={0}
                type="number"
                value={previewCoins}
                onChange={(e) => setPreviewCoins(Number(e.target.value))}
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Nguồn doanh thu</span>
              <select
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
                value={previewType}
                onChange={(e) =>
                  setPreviewType(e.target.value as PreviewTransactionType)
                }
              >
                <option value="chapter_unlock">Chương trả phí</option>
                <option value="tip">Tip</option>
                <option value="vip">VIP</option>
                <option value="fan_club">Fan club</option>
              </select>
            </label>
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm text-zinc-300">
            <input
              checked={previewUseCustom}
              onChange={(e) => setPreviewUseCustom(e.target.checked)}
              type="checkbox"
            />
            Dùng % tùy chỉnh để xem thử
          </label>
          {previewUseCustom ? (
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-zinc-400">% tác giả (thử)</span>
                <Input
                  className="mt-1"
                  max={100}
                  min={0}
                  type="number"
                  value={previewCustomCreator}
                  onChange={(e) => setPreviewCustomCreator(Number(e.target.value))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-zinc-400">% nền tảng (thử)</span>
                <Input
                  className="mt-1"
                  disabled
                  type="number"
                  value={Math.max(0, 100 - previewCustomCreator)}
                />
              </label>
            </div>
          ) : null}
          <label className="mt-2 flex items-center gap-2 text-sm text-zinc-300">
            <input
              checked={previewSimulateLocked}
              onChange={(e) => setPreviewSimulateLocked(e.target.checked)}
              type="checkbox"
            />
            Mô phỏng trạng thái bị khóa
          </label>
          <dl className="mt-3 grid gap-2 rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-3 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-400">Tổng coin</dt>
              <dd className="text-white">{preview.totalCoin}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-400">Tác giả nhận</dt>
              <dd className="text-cyan-200">
                {preview.creatorCoin} ({preview.creatorPercent}%)
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-400">Nền tảng giữ</dt>
              <dd className="text-white">
                {preview.platformCoin} ({preview.platformPercent}%)
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-400">Trạng thái doanh thu</dt>
              <dd className="text-zinc-200">{preview.statusLabel}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-400">VND tham khảo</dt>
              <dd className="text-zinc-200">
                {preview.referenceVnd.toLocaleString("vi-VN")} ₫
              </dd>
            </div>
          </dl>
          <p className="text-xs text-zinc-500">
            Đây chỉ là xem thử, không tạo giao dịch thật.
          </p>
        </MoneySettingCard>
      </div>

      {permissions.canViewAudit ? (
        <MoneySettingCard
          description="Các thay đổi gần nhất từ nhật ký hệ thống."
          id="history"
          title="Lịch sử thay đổi gần đây"
        >
          {auditLogs.length === 0 ? (
            <p className="text-sm text-zinc-500">Chưa có thay đổi cấu hình kiếm tiền.</p>
          ) : (
            <ul className="space-y-3">
              {auditLogs.map((log) => (
                <li
                  key={log.id}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm"
                >
                  <div className="flex flex-wrap justify-between gap-2 text-xs text-zinc-500">
                    <span>{new Date(log.created_at).toLocaleString("vi-VN")}</span>
                    <span>{log.actor_label}</span>
                  </div>
                  <p className="mt-2 text-zinc-400 text-xs">Trường đã đổi</p>
                  <p className="text-zinc-300">
                    {log.changed_keys.length
                      ? log.changed_keys.join(", ")
                      : "—"}
                  </p>
                  {log.old_value && log.new_value ? (
                    <details className="mt-2 text-xs text-zinc-500">
                      <summary className="cursor-pointer text-cyan-300/80">
                        Chi tiết giá trị
                      </summary>
                      <pre className="mt-1 overflow-x-auto rounded bg-black/30 p-2">
                        {JSON.stringify({ cu: log.old_value, moi: log.new_value }, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                  {log.reason ? (
                    <p className="mt-2 text-xs">
                      <span className="text-zinc-500">Lý do: </span>
                      {log.reason}
                    </p>
                  ) : null}
                  {log.ip_address ? (
                    <p className="mt-1 text-xs text-zinc-600">
                      IP: {log.ip_address}
                      {log.user_agent ? ` · ${log.user_agent.slice(0, 60)}…` : ""}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <Link
            className="mt-3 inline-block text-sm font-semibold text-cyan-300"
            href="/admin/audit?targetType=monetization_settings"
          >
            Xem audit log chi tiết →
          </Link>
        </MoneySettingCard>
      ) : null}

      <MonetizationStickyBar
        canSave={validation.ok && permissions.canUpdateAny}
        onRestore={restoreDraft}
        onSave={handleSaveClick}
        pending={pending}
        visible={unsaved && permissions.canUpdateAny}
      />

      <SettingsConfirmModal
        changes={pendingChanges}
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmReason("");
        }}
        onConfirm={() => persist(confirmReason)}
        onReasonChange={setConfirmReason}
        open={confirmOpen}
        pending={pending}
        reason={confirmReason}
      />
    </div>
  );
}
