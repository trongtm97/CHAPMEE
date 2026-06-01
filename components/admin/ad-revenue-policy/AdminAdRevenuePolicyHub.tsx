"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { AdminAdsMonetizationSectionNav } from "@/components/admin/ads/AdminAdsMonetizationSectionNav";
import { FraudSignalsTable } from "@/components/admin/ad-revenue-policy/FraudSignalsTable";
import { PolicyOverviewCards } from "@/components/admin/ad-revenue-policy/PolicyOverviewCards";
import { PolicyVersionsPanel } from "@/components/admin/ad-revenue-policy/PolicyVersionsPanel";
import { RevenueSimulatorPanel } from "@/components/admin/ad-revenue-policy/RevenueSimulatorPanel";
import type { AdminAdFraudSignalRow } from "@/lib/creator-ad-revenue/list-fraud-signals-admin";
import type { CreatorAdPolicyVersion } from "@/types/creator-ad-policy-version";
import { Button, Input } from "@/components/ui";
import { DEFAULT_CREATOR_AD_REVENUE_POLICY_TEXT } from "@/lib/creator-ad-revenue/default-policy-text";
import { validateCreatorAdRevenuePolicy } from "@/lib/creator-ad-revenue/policy-validation";
import type { AdminAdRevenuePolicyOverview } from "@/lib/creator-ad-revenue/get-admin-policy-overview";
import type { AdRevenuePolicyPermissions } from "@/lib/auth/ad-revenue-policy-permissions";
import type {
  CreatorAdMonetizationProfileListItem,
  CreatorAdPolicyAuditLog,
  CreatorAdRevenuePolicy
} from "@/types/creator-ad-revenue-policy";
import {
  CREATOR_AD_PAYOUT_CYCLE_LABELS,
  CREATOR_AD_POLICY_STATUS_LABELS,
  CREATOR_AD_STATUS_LABELS,
  creatorPublicProfilePath
} from "@/types/creator-ad-revenue-policy";

type HubTab =
  | "overview"
  | "formula"
  | "eligibility"
  | "policy"
  | "creators"
  | "fraud"
  | "payout"
  | "audit";

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Math.round(value));
}

type AdminAdRevenuePolicyHubProps = {
  initialPolicy: CreatorAdRevenuePolicy;
  initialOverview: AdminAdRevenuePolicyOverview;
  initialProfiles: CreatorAdMonetizationProfileListItem[];
  initialProfilesTotal: number;
  initialAuditLogs: CreatorAdPolicyAuditLog[];
  initialVersions: CreatorAdPolicyVersion[];
  initialFraudSignals: AdminAdFraudSignalRow[];
  permissions: AdRevenuePolicyPermissions;
};

const PROFILES_PAGE_SIZE = 25;

const TABS: { id: HubTab; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "formula", label: "Công thức chia" },
  { id: "eligibility", label: "Điều kiện tham gia" },
  { id: "policy", label: "Nội dung chính sách" },
  { id: "creators", label: "Tác giả tham gia" },
  { id: "fraud", label: "Giữ tiền & gian lận" },
  { id: "payout", label: "Thanh toán & đối soát" },
  { id: "audit", label: "Nhật ký audit" }
];

export function AdminAdRevenuePolicyHub({
  initialPolicy,
  initialOverview,
  initialProfiles,
  initialProfilesTotal,
  initialAuditLogs,
  initialVersions,
  initialFraudSignals,
  permissions
}: AdminAdRevenuePolicyHubProps) {
  const [tab, setTab] = useState<HubTab>("overview");
  const [policy, setPolicy] = useState(initialPolicy);
  const [profiles, setProfiles] = useState(initialProfiles);
  const [profilesTotal, setProfilesTotal] = useState(initialProfilesTotal);
  const [profilesPage, setProfilesPage] = useState(0);
  const [versions, setVersions] = useState(initialVersions);
  const [fraudSignals] = useState(initialFraudSignals);
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [saveReason, setSaveReason] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [kycFilter, setKycFilter] = useState("");
  const [search, setSearch] = useState("");
  const [lookupQ, setLookupQ] = useState("");
  const [lookupUsers, setLookupUsers] = useState<
    { id: string; username: string | null; display_name: string | null }[]
  >([]);
  const [actionReason, setActionReason] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [auditActionFilter, setAuditActionFilter] = useState("");

  const readOnly = !permissions.canUpdatePolicy;
  const validation = validateCreatorAdRevenuePolicy(policy);

  const refreshAudit = useCallback(async () => {
    const params = new URLSearchParams({ limit: "50" });
    if (auditActionFilter) params.set("action", auditActionFilter);
    const res = await fetch(`/api/admin/ad-revenue-policy/audit?${params}`);
    const json = (await res.json()) as { logs?: CreatorAdPolicyAuditLog[] };
    if (json.logs) setAuditLogs(json.logs);
  }, [auditActionFilter]);

  const savePolicy = async (extra?: Partial<CreatorAdRevenuePolicy>) => {
    if (!permissions.canUpdatePolicy) return;
    const merged = { ...policy, ...extra };
    const v = validateCreatorAdRevenuePolicy(merged);
    if (!v.ok) {
      setMessage({ type: "err", text: Object.values(v.errors)[0] ?? "Dữ liệu không hợp lệ." });
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ad-revenue-policy/policy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...merged, audit_note: saveReason || undefined })
      });
      const json = (await res.json()) as { policy?: CreatorAdRevenuePolicy; error?: string };
      if (!res.ok) {
        setMessage({ type: "err", text: json.error ?? "Lưu thất bại." });
        return;
      }
      if (json.policy) setPolicy(json.policy);
      setMessage({ type: "ok", text: "Đã lưu chính sách." });
      await refreshAudit();
      const verRes = await fetch("/api/admin/ad-revenue-policy/versions");
      const verJson = (await verRes.json()) as { versions?: CreatorAdPolicyVersion[] };
      if (verJson.versions) setVersions(verJson.versions);
    } finally {
      setPending(false);
    }
  };

  const reloadProfiles = useCallback(
    async (page = profilesPage) => {
      const params = new URLSearchParams({
        limit: String(PROFILES_PAGE_SIZE),
        offset: String(page * PROFILES_PAGE_SIZE)
      });
      if (statusFilter) params.set("status", statusFilter);
      if (kycFilter) params.set("kyc_status", kycFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/ad-revenue-policy/profiles?${params}`);
      const json = (await res.json()) as {
        profiles?: CreatorAdMonetizationProfileListItem[];
        total?: number;
      };
      if (json.profiles) setProfiles(json.profiles);
      if (json.total != null) setProfilesTotal(json.total);
    },
    [statusFilter, kycFilter, search, profilesPage]
  );

  const profileAction = async (
    userId: string,
    action: "approve" | "suspend" | "reject" | "reset" | "fraud_hold" | "release_fraud_hold" | "toggle_ads"
  ) => {
    if (!permissions.canManageProfiles) return;
    setPending(true);
    try {
      const res = await fetch(`/api/admin/ad-revenue-policy/profiles/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: actionReason || undefined })
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage({ type: "err", text: json.error ?? "Cập nhật thất bại." });
        return;
      }
      setMessage({ type: "ok", text: "Đã cập nhật tác giả." });
      setSelectedUserId(null);
      setActionReason("");
      await reloadProfiles();
      await refreshAudit();
    } finally {
      setPending(false);
    }
  };

  const boolField = (
    key: keyof CreatorAdRevenuePolicy,
    label: string,
    help?: string
  ) => (
    <label className="flex items-start gap-2 text-sm text-zinc-300" key={String(key)}>
      <input
        checked={Boolean(policy[key])}
        className="mt-1"
        disabled={readOnly}
        onChange={(e) => setPolicy((p) => ({ ...p, [key]: e.target.checked }))}
        type="checkbox"
      />
      <span>
        {label}
        {help ? <span className="mt-0.5 block text-xs text-zinc-500">{help}</span> : null}
      </span>
    </label>
  );

  return (
    <div className="space-y-6 pb-16">
      <header className="space-y-3">
        <nav className="text-xs text-zinc-500">
          <Link className="hover:text-cyan-300" href="/admin">
            Admin
          </Link>
          <span className="mx-1.5">/</span>
          <Link className="hover:text-cyan-300" href="/admin/ads">
            Quảng cáo
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-zinc-300">Chia sẻ doanh thu tác giả</span>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Chia sẻ doanh thu quảng cáo</h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-400">
              Quản lý chính sách, điều kiện tham gia, quỹ tác giả, dự phòng, đối soát và trạng thái
              monetization quảng cáo. Chưa xử lý thanh toán thật trên trang này.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {permissions.canUpdatePolicy ? (
              <Button disabled={pending} onClick={() => void savePolicy()} type="button">
                {pending ? "Đang lưu…" : "Lưu thay đổi"}
              </Button>
            ) : null}
            <Button
              disabled={readOnly}
              onClick={() => setPolicy((p) => ({ ...p, policy_text: DEFAULT_CREATOR_AD_REVENUE_POLICY_TEXT }))}
              type="button"
              variant="secondary"
            >
              Khôi phục mẫu
            </Button>
            <Link
              className="inline-flex min-h-10 items-center rounded-full border border-white/10 px-4 text-sm text-cyan-200 hover:bg-white/5"
              href="/admin/ad-fraud"
            >
              Cảnh báo fraud
            </Link>
          </div>
        </div>

        <AdminAdsMonetizationSectionNav />

        <PolicyOverviewCards policy={policy} overview={initialOverview} />

        <nav className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                tab === t.id
                  ? "bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/35"
                  : "text-zinc-500 hover:text-zinc-200"
              }`}
              onClick={() => setTab(t.id)}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {message ? (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${
            message.type === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/30 bg-red-500/10 text-red-200"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {!validation.ok && tab === "formula" ? (
        <p className="text-sm text-red-300">{Object.values(validation.errors)[0]}</p>
      ) : null}
      {validation.warnings.length > 0 && tab === "formula" ? (
        <ul className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-100">
          {validation.warnings.map((w) => (
            <li key={w}>• {w}</li>
          ))}
        </ul>
      ) : null}

      {permissions.canUpdatePolicy ? (
        <label className="block max-w-md text-xs text-zinc-500">
          Lý do thay đổi (ghi audit, tùy chọn)
          <Input className="mt-1" value={saveReason} onChange={(e) => setSaveReason(e.target.value)} />
        </label>
      ) : null}

      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <h2 className="font-semibold text-white">Vận hành chương trình</h2>
            {boolField("is_enabled", "Bật chương trình chia sẻ doanh thu quảng cáo")}
            {boolField("beta_mode", "Chế độ beta (giới hạn phạm vi)")}
            {boolField(
              "internal_tracking_only",
              "Chỉ theo dõi nội bộ",
              "Chưa coi là khoản có thể rút thật cho tác giả."
            )}
            <p className="text-xs text-zinc-500">
              Trạng thái chính sách:{" "}
              <span className="text-cyan-200">
                {CREATOR_AD_POLICY_STATUS_LABELS[policy.policy_status]}
              </span>{" "}
              · v{policy.policy_version}
            </p>
          </section>
          <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <h2 className="font-semibold text-white mb-3">Checklist triển khai</h2>
            <ul className="space-y-2 text-sm">
              {initialOverview.checklist.map((item) => (
                <li className="flex items-start gap-2" key={item.id}>
                  <span className={item.met ? "text-emerald-400" : "text-zinc-600"}>
                    {item.met ? "✓" : "○"}
                  </span>
                  <span className="text-zinc-300">
                    {item.label}
                    {item.detail ? (
                      <span className="block text-xs text-zinc-500">{item.detail}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {tab === "formula" && (
        <div className="space-y-6">
          <section className="rounded-xl border border-white/10 p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm text-zinc-400">
              Quỹ tác giả (%)
              <Input
                className="mt-1"
                disabled={readOnly}
                inputMode="decimal"
                value={policy.creator_pool_percent}
                onChange={(e) =>
                  setPolicy((p) => ({ ...p, creator_pool_percent: Number(e.target.value) }))
                }
              />
            </label>
            <label className="text-sm text-zinc-400">
              Dự phòng (% trên pool)
              <Input
                className="mt-1"
                disabled={readOnly}
                value={policy.reserve_percent}
                onChange={(e) => setPolicy((p) => ({ ...p, reserve_percent: Number(e.target.value) }))}
              />
            </label>
            <label className="text-sm text-zinc-400">
              Giữ dự phòng (ngày)
              <Input
                className="mt-1"
                disabled={readOnly}
                value={policy.reserve_hold_days}
                onChange={(e) =>
                  setPolicy((p) => ({ ...p, reserve_hold_days: Number(e.target.value) }))
                }
              />
            </label>
            <label className="text-sm text-zinc-400">
              Rút tối thiểu (VND)
              <Input
                className="mt-1"
                disabled={readOnly}
                value={policy.min_payout_vnd}
                onChange={(e) => setPolicy((p) => ({ ...p, min_payout_vnd: Number(e.target.value) }))}
              />
            </label>
            <label className="text-sm text-zinc-400 sm:col-span-2">
              Chu kỳ thanh toán
              <select
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                disabled={readOnly}
                value={policy.payout_cycle}
                onChange={(e) => setPolicy((p) => ({ ...p, payout_cycle: e.target.value }))}
              >
                {Object.entries(CREATOR_AD_PAYOUT_CYCLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {boolField(
              "show_estimated_revenue_to_creators",
              "Cho phép tác giả thấy doanh thu ước tính"
            )}
            {boolField(
              "estimated_revenue_disclaimer_enabled",
              'Hiển thị disclaimer "số liệu ước tính"'
            )}
          </section>
          <RevenueSimulatorPanel policy={policy} />
        </div>
      )}

      {tab === "eligibility" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-white/10 p-4 space-y-3">
            <h2 className="font-semibold text-white">Điều kiện tài khoản</h2>
            {boolField("require_kyc", "Bắt buộc KYC")}
            {boolField("require_tax_info", "Bắt buộc thông tin thuế")}
            {boolField("require_payout_setup", "Bắt buộc tài khoản nhận tiền")}
            {boolField("require_good_standing", "Tài khoản đang hoạt động tốt")}
            {boolField("invalid_traffic_hold_enabled", "Giữ doanh thu khi nghi invalid traffic")}
          </section>
          <section className="rounded-xl border border-white/10 p-4 space-y-3">
            <h2 className="font-semibold text-white">Điều kiện traffic</h2>
            <label className="text-sm text-zinc-400">
              Lượt đọc hợp lệ tối thiểu / tháng
              <Input
                className="mt-1"
                disabled={readOnly}
                value={policy.min_monthly_valid_reads}
                onChange={(e) =>
                  setPolicy((p) => ({ ...p, min_monthly_valid_reads: Number(e.target.value) }))
                }
              />
            </label>
            <label className="text-sm text-zinc-400">
              Impression QC tối thiểu / tháng
              <Input
                className="mt-1"
                disabled={readOnly}
                value={policy.min_monthly_ad_impressions}
                onChange={(e) =>
                  setPolicy((p) => ({ ...p, min_monthly_ad_impressions: Number(e.target.value) }))
                }
              />
            </label>
            <label className="text-sm text-zinc-400">
              Tỷ lệ invalid traffic tối đa (0–1)
              <Input
                className="mt-1"
                disabled={readOnly}
                value={policy.max_invalid_traffic_rate}
                onChange={(e) =>
                  setPolicy((p) => ({ ...p, max_invalid_traffic_rate: Number(e.target.value) }))
                }
              />
            </label>
            <label className="text-sm text-zinc-400">
              CTR bất thường tối đa (0–1)
              <Input
                className="mt-1"
                disabled={readOnly}
                value={policy.max_suspicious_ctr}
                onChange={(e) =>
                  setPolicy((p) => ({ ...p, max_suspicious_ctr: Number(e.target.value) }))
                }
              />
            </label>
          </section>
        </div>
      )}

      {tab === "policy" && (
        <section className="rounded-xl border border-white/10 p-4 space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <label className="text-sm text-zinc-400">
              Phiên bản
              <Input
                className="mt-1 w-28"
                disabled={readOnly}
                value={policy.policy_version}
                onChange={(e) => setPolicy((p) => ({ ...p, policy_version: e.target.value }))}
              />
            </label>
            <label className="text-sm text-zinc-400">
              Trạng thái
              <select
                className="mt-1 block rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                disabled={readOnly}
                value={policy.policy_status}
                onChange={(e) =>
                  setPolicy((p) => ({
                    ...p,
                    policy_status: e.target.value as CreatorAdRevenuePolicy["policy_status"]
                  }))
                }
              >
                {Object.entries(CREATOR_AD_POLICY_STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <Button
              disabled={readOnly || pending}
              onClick={() =>
                void savePolicy({
                  policy_status: "published",
                  policy_published_at: new Date().toISOString()
                })
              }
              type="button"
              variant="secondary"
            >
              Xuất bản
            </Button>
            <Button
              disabled={readOnly}
              onClick={() => setPolicy((p) => ({ ...p, policy_text: DEFAULT_CREATOR_AD_REVENUE_POLICY_TEXT }))}
              type="button"
              variant="secondary"
            >
              Khôi phục mẫu đề xuất
            </Button>
          </div>
          <textarea
            className="min-h-[360px] w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-zinc-200 font-mono"
            disabled={readOnly}
            value={policy.policy_text ?? ""}
            onChange={(e) => setPolicy((p) => ({ ...p, policy_text: e.target.value }))}
          />
          <details className="text-sm text-zinc-400">
            <summary className="cursor-pointer text-cyan-300">Xem trước (markdown thô)</summary>
            <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-xs text-zinc-300">
              {policy.policy_text}
            </pre>
          </details>
          <PolicyVersionsPanel
            readOnly={readOnly}
            versions={versions}
            onRestored={(text, ver) =>
              setPolicy((p) => ({ ...p, policy_text: text, policy_version: ver, policy_status: "draft" }))
            }
            onVersionsChange={setVersions}
          />
        </section>
      )}

      {tab === "creators" && (
        <CreatorsSection
          actionReason={actionReason}
          kycFilter={kycFilter}
          lookupQ={lookupQ}
          lookupUsers={lookupUsers}
          pending={pending}
          permissions={permissions}
          profileAction={profileAction}
          profiles={profiles}
          profilesPage={profilesPage}
          profilesTotal={profilesTotal}
          pageSize={PROFILES_PAGE_SIZE}
          setProfilesPage={setProfilesPage}
          reloadProfiles={reloadProfiles}
          search={search}
          statusFilter={statusFilter}
          exportCsvHref={`/api/admin/ad-revenue-policy/profiles/export?${new URLSearchParams({
            ...(statusFilter ? { status: statusFilter } : {}),
            ...(kycFilter ? { kyc_status: kycFilter } : {}),
            ...(search ? { search } : {})
          }).toString()}`}
          selectedUserId={selectedUserId}
          setActionReason={setActionReason}
          setKycFilter={setKycFilter}
          setLookupQ={setLookupQ}
          setSearch={setSearch}
          setSelectedUserId={setSelectedUserId}
          setStatusFilter={setStatusFilter}
          onLookup={async () => {
            if (!lookupQ.trim()) return;
            const res = await fetch(
              `/api/admin/ad-revenue-policy/lookup-user?q=${encodeURIComponent(lookupQ.trim())}`
            );
            const json = (await res.json()) as {
              users?: { id: string; username: string | null; display_name: string | null }[];
            };
            setLookupUsers(json.users ?? []);
          }}
          onEnsureProfile={async (userId) => {
            await fetch(`/api/admin/ad-revenue-policy/profiles/${userId}`, { method: "PUT" });
            await reloadProfiles();
          }}
        />
      )}

      {tab === "fraud" && (
        <div className="space-y-6">
          <section className="rounded-xl border border-white/10 p-4 grid gap-3 sm:grid-cols-2">
            {boolField("auto_hold_invalid_traffic", "Tự giữ khi invalid traffic vượt ngưỡng")}
            {boolField("auto_hold_suspicious_ctr", "Tự giữ khi CTR bất thường")}
            {boolField("auto_hold_traffic_spike", "Tự giữ khi traffic tăng đột biến")}
            {boolField("auto_hold_reported_content", "Tự giữ khi nội dung bị report nhiều")}
            {boolField("auto_hold_copyright_dispute", "Tự giữ khi tranh chấp bản quyền")}
            {boolField("auto_hold_missing_compliance", "Tự giữ khi thiếu KYC/thuế/payout")}
          </section>
          <section className="rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-white">Cảnh báo liên quan</h2>
              <Link className="text-sm text-cyan-300" href="/admin/ad-fraud">
                Mở trung tâm fraud →
              </Link>
            </div>
            <p className="mt-2 text-sm text-zinc-500">
              {initialOverview.openFraudSignals > 0
                ? `${initialOverview.openFraudSignals} tín hiệu đang mở — xử lý tại trang fraud.`
                : "Chưa có tín hiệu fraud mở."}
            </p>
            <p className="mt-2 text-xs text-zinc-600">
              Tác giả đang fraud hold: {initialOverview.fraudHoldCreators}
            </p>
          </section>
          <section className="rounded-xl border border-white/10 p-4 space-y-3">
            <h2 className="font-semibold text-white">Tín hiệu gần đây</h2>
            <FraudSignalsTable signals={fraudSignals} />
          </section>
        </div>
      )}

      {tab === "payout" && (
        <section className="rounded-xl border border-white/10 p-4 space-y-4">
          <p className="text-sm text-zinc-400">
            Trang này không thực hiện payout thật. Liên kết workflow đối soát và ước tính.
          </p>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-zinc-500">Chu kỳ cấu hình</dt>
              <dd className="text-white">
                {CREATOR_AD_PAYOUT_CYCLE_LABELS[policy.payout_cycle] ?? policy.payout_cycle}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Ngưỡng rút</dt>
              <dd className="text-white">{formatVnd(policy.min_payout_vnd)}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Link className="text-sm font-semibold text-cyan-300" href="/admin/ad-revenue">
              Doanh thu QC ước tính →
            </Link>
            <Link className="text-sm font-semibold text-cyan-300" href="/admin/ad-revenue-reconciliation">
              Đối soát QC tháng →
            </Link>
            <Link className="text-sm font-semibold text-cyan-300" href="/admin/monetization-settings">
              Cấu hình kiếm tiền →
            </Link>
          </div>
        </section>
      )}

      {tab === "audit" && (
        <section className="rounded-xl border border-white/10 p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-xs"
              placeholder="Lọc action"
              value={auditActionFilter}
              onChange={(e) => setAuditActionFilter(e.target.value)}
            />
            <Button onClick={() => void refreshAudit()} type="button" variant="secondary">
              Lọc
            </Button>
          </div>
          <div className="max-h-[480px] overflow-y-auto space-y-2">
            {auditLogs.map((log) => (
              <div
                className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm"
                key={log.id}
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-mono text-cyan-300">{log.action}</span>
                  <span className="text-xs text-zinc-500">
                    {new Date(log.created_at).toLocaleString("vi-VN")}
                  </span>
                </div>
                {log.target_username ? (
                  <p className="text-xs text-zinc-400 mt-1">Tác giả: @{log.target_username}</p>
                ) : null}
                {log.actor_username ? (
                  <p className="text-xs text-zinc-500">Bởi @{log.actor_username}</p>
                ) : null}
                {log.note ? <p className="text-xs text-amber-200/80 mt-1">Lý do: {log.note}</p> : null}
                {log.before && log.after ? (
                  <details className="mt-2 text-xs text-zinc-500">
                    <summary className="cursor-pointer text-zinc-400">Chi tiết thay đổi</summary>
                    <pre className="mt-1 overflow-x-auto rounded bg-black/40 p-2">
                      {JSON.stringify({ truoc: log.before, sau: log.after }, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </div>
            ))}
            {auditLogs.length === 0 ? (
              <p className="text-zinc-500">Chưa có nhật ký audit.</p>
            ) : null}
          </div>
        </section>
      )}

      {readOnly ? (
        <p className="text-sm text-amber-300/90">Chế độ chỉ xem — không có quyền sửa chính sách.</p>
      ) : null}
    </div>
  );
}

function CreatorsSection({
  profiles,
  profilesTotal,
  profilesPage,
  pageSize,
  setProfilesPage,
  exportCsvHref,
  permissions,
  statusFilter,
  setStatusFilter,
  kycFilter,
  setKycFilter,
  search,
  setSearch,
  reloadProfiles,
  lookupQ,
  setLookupQ,
  lookupUsers,
  onLookup,
  onEnsureProfile,
  selectedUserId,
  setSelectedUserId,
  actionReason,
  setActionReason,
  profileAction,
  pending
}: {
  profiles: CreatorAdMonetizationProfileListItem[];
  profilesTotal: number;
  profilesPage: number;
  pageSize: number;
  setProfilesPage: (n: number) => void;
  exportCsvHref: string;
  permissions: AdRevenuePolicyPermissions;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  kycFilter: string;
  setKycFilter: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  reloadProfiles: (page?: number) => Promise<void>;
  lookupQ: string;
  setLookupQ: (v: string) => void;
  lookupUsers: { id: string; username: string | null; display_name: string | null }[];
  onLookup: () => void;
  onEnsureProfile: (userId: string) => Promise<void>;
  selectedUserId: string | null;
  setSelectedUserId: (v: string | null) => void;
  actionReason: string;
  setActionReason: (v: string) => void;
  profileAction: (
    userId: string,
    action: "approve" | "suspend" | "reject" | "reset" | "fraud_hold" | "release_fraud_hold" | "toggle_ads"
  ) => void;
  pending: boolean;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Trạng thái" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="max-w-[140px]" />
        <Input placeholder="KYC" value={kycFilter} onChange={(e) => setKycFilter(e.target.value)} className="max-w-[120px]" />
        <Input placeholder="Tìm @username" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[200px]" />
        <Button
          onClick={() => {
            setProfilesPage(0);
            void reloadProfiles(0);
          }}
          type="button"
          variant="secondary"
        >
          Áp dụng
        </Button>
        <a
          className="inline-flex items-center rounded-lg border border-white/10 px-3 py-2 text-sm text-cyan-300 hover:bg-white/5"
          href={exportCsvHref}
          download
        >
          Xuất CSV
        </a>
      </div>
      <p className="text-xs text-zinc-500">
        {profilesTotal} tác giả · trang {profilesPage + 1} / {Math.max(1, Math.ceil(profilesTotal / pageSize))}
      </p>
      <div className="rounded-xl border border-dashed border-white/15 p-3 space-y-2">
        <p className="text-sm text-zinc-400">Thêm user (không tạo profile riêng — chỉ hồ sơ monetization QC)</p>
        <div className="flex flex-wrap gap-2">
          <Input value={lookupQ} onChange={(e) => setLookupQ(e.target.value)} placeholder="Username hoặc user id" className="max-w-xs" />
          <Button onClick={onLookup} type="button" variant="secondary">
            Tìm
          </Button>
        </div>
        {lookupUsers.map((u) => (
          <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-300" key={u.id}>
            @{u.username ?? "—"}
            <Button onClick={() => void onEnsureProfile(u.id)} type="button" variant="secondary">
              Thêm hồ sơ
            </Button>
          </div>
        ))}
      </div>
      {selectedUserId ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
          <Input value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder="Lý do (bắt buộc cho suspend/reject/fraud hold)" />
          <div className="flex flex-wrap gap-2">
            <Button disabled={pending || !actionReason.trim()} onClick={() => profileAction(selectedUserId, "fraud_hold")} type="button">
              Fraud hold
            </Button>
            <Button disabled={pending || !actionReason.trim()} onClick={() => profileAction(selectedUserId, "suspend")} type="button" variant="secondary">
              Tạm dừng
            </Button>
            <Button onClick={() => setSelectedUserId(null)} type="button" variant="secondary">
              Hủy
            </Button>
          </div>
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">Tác giả</th>
              <th className="px-3 py-2">Trạng thái</th>
              <th className="px-3 py-2">KYC</th>
              <th className="px-3 py-2">QC</th>
              <th className="px-3 py-2">Ước tính tháng</th>
              <th className="px-3 py-2">Cảnh báo</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr className="border-b border-white/5" key={p.id}>
                <td className="px-3 py-2">
                  <Link className="text-cyan-300 hover:underline" href={creatorPublicProfilePath(p.username, p.user_id)}>
                    @{p.username ?? p.user_id.slice(0, 8)}
                  </Link>
                  <div className="text-xs text-zinc-500">{p.display_name}</div>
                </td>
                <td className="px-3 py-2">{CREATOR_AD_STATUS_LABELS[p.status] ?? p.status}</td>
                <td className="px-3 py-2">{p.kyc_status}</td>
                <td className="px-3 py-2">{p.ads_revenue_enabled ? "Bật" : "Tắt"}</td>
                <td className="px-3 py-2">{formatVnd(p.estimated_revenue_month_vnd ?? 0)}</td>
                <td className="px-3 py-2">{p.fraud_hold || p.has_fraud_signal ? "⚠" : "—"}</td>
                <td className="px-3 py-2">
                  {permissions.canManageProfiles ? (
                    <div className="flex flex-wrap gap-1">
                      <Button disabled={pending} onClick={() => profileAction(p.user_id, "approve")} type="button" variant="secondary">
                        Duyệt
                      </Button>
                      <Button disabled={pending} onClick={() => profileAction(p.user_id, "toggle_ads")} type="button" variant="secondary">
                        Bật/tắt QC
                      </Button>
                      <Button disabled={pending} onClick={() => setSelectedUserId(p.user_id)} type="button" variant="secondary">
                        Hold…
                      </Button>
                      {p.fraud_hold ? (
                        <Button disabled={pending} onClick={() => profileAction(p.user_id, "release_fraud_hold")} type="button" variant="secondary">
                          Gỡ hold
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {profiles.length === 0 ? (
          <p className="p-6 text-center text-sm text-zinc-500">Chưa có tác giả trong chương trình.</p>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Button
          disabled={profilesPage <= 0}
          onClick={() => {
            const next = profilesPage - 1;
            setProfilesPage(next);
            void reloadProfiles(next);
          }}
          type="button"
          variant="secondary"
        >
          ← Trước
        </Button>
        <Button
          disabled={(profilesPage + 1) * pageSize >= profilesTotal}
          onClick={() => {
            const next = profilesPage + 1;
            setProfilesPage(next);
            void reloadProfiles(next);
          }}
          type="button"
          variant="secondary"
        >
          Sau →
        </Button>
      </div>
    </section>
  );
}
