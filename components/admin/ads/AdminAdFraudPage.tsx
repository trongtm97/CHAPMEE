"use client";

import { useCallback, useState } from "react";
import { AdminAdsMonetizationSectionNav } from "@/components/admin/ads/AdminAdsMonetizationSectionNav";
import { Button, Input } from "@/components/ui";
import type { AdFraudDashboard, AdFraudRule, AdFraudSignalListItem } from "@/types/ad-fraud";
import {
  AD_FRAUD_SEVERITY_LABELS,
  AD_FRAUD_SIGNAL_STATUS_LABELS
} from "@/types/ad-fraud";

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Math.round(value));
}

type AdminAdFraudPageProps = {
  initialDashboard: AdFraudDashboard;
  initialSignals: AdFraudSignalListItem[];
  initialRules: AdFraudRule[];
  canUpdate: boolean;
};

export function AdminAdFraudPage({
  initialDashboard,
  initialSignals,
  initialRules,
  canUpdate
}: AdminAdFraudPageProps) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [signals, setSignals] = useState(initialSignals);
  const [rules, setRules] = useState(initialRules);
  const [tab, setTab] = useState<"signals" | "rules">("signals");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [actionReason, setActionReason] = useState("");
  const [selectedSignal, setSelectedSignal] = useState<AdFraudSignalListItem | null>(null);
  const [allocations, setAllocations] = useState<
    Array<{ id: string; status: string; final_payable_vnd: number; month: string }>
  >([]);

  const [filters, setFilters] = useState({
    status: "",
    severity: "",
    rule_key: "",
    month: ""
  });

  const [detectMonth, setDetectMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const refreshDashboard = async () => {
    const res = await fetch("/api/admin/ad-fraud/dashboard");
    const json = (await res.json()) as { dashboard?: AdFraudDashboard };
    if (json.dashboard) setDashboard(json.dashboard);
  };

  const reloadSignals = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.severity) params.set("severity", filters.severity);
    if (filters.rule_key) params.set("rule_key", filters.rule_key);
    if (filters.month) params.set("month", filters.month);
    const res = await fetch(`/api/admin/ad-fraud/signals?${params}`);
    const json = (await res.json()) as { signals?: AdFraudSignalListItem[] };
    if (json.signals) setSignals(json.signals);
  }, [filters]);

  const runDetection = async () => {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ad-fraud/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: detectMonth })
      });
      const json = (await res.json()) as {
        created?: number;
        errors?: string[];
        error?: string;
      };
      if (!res.ok) {
        setMessage(json.error ?? "Chạy detection thất bại.");
        return;
      }
      setMessage(
        `Detection xong: ${json.created ?? 0} signal mới.${
          json.errors?.length ? ` Lỗi: ${json.errors.join("; ")}` : ""
        }`
      );
      await Promise.all([reloadSignals(), refreshDashboard()]);
    } finally {
      setPending(false);
    }
  };

  const patchSignal = async (id: string, status: string) => {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/ad-fraud/signals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(json.error ?? "Cập nhật signal thất bại.");
        return;
      }
      await reloadSignals();
      await refreshDashboard();
    } finally {
      setPending(false);
    }
  };

  const loadAllocationsForSignal = async (signal: AdFraudSignalListItem) => {
    setSelectedSignal(signal);
    if (!signal.author_id || !signal.month) {
      setAllocations([]);
      return;
    }
    const res = await fetch(
      `/api/admin/ad-fraud/allocations/lookup?author_id=${signal.author_id}&month=${signal.month}`
    );
    const json = (await res.json()) as { allocations?: typeof allocations };
    setAllocations(json.allocations ?? []);
  };

  const allocationAction = async (
    allocationId: string,
    action: "hold" | "release" | "cancel"
  ) => {
    if (!actionReason.trim()) {
      setMessage("Nhập lý do trước khi hold/release/cancel allocation.");
      return;
    }
    setPending(true);
    try {
      const path =
        action === "hold"
          ? "hold"
          : action === "release"
            ? "release"
            : "cancel";
      const res = await fetch(`/api/admin/ad-fraud/allocations/${allocationId}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: actionReason,
          fraud_signal_id: selectedSignal?.id
        })
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(json.error ?? "Thao tác allocation thất bại.");
        return;
      }
      setMessage(`Đã ${action} allocation.`);
      setActionReason("");
      if (selectedSignal) await loadAllocationsForSignal(selectedSignal);
      await refreshDashboard();
    } finally {
      setPending(false);
    }
  };

  const saveRule = async (rule: AdFraudRule, thresholdJson: string) => {
    if (!canUpdate) return;
    let threshold_config: Record<string, unknown>;
    try {
      threshold_config = JSON.parse(thresholdJson) as Record<string, unknown>;
    } catch {
      setMessage("threshold_config JSON không hợp lệ.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/admin/ad-fraud/rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rule_key: rule.rule_key,
          is_enabled: rule.is_enabled,
          severity: rule.severity,
          action: rule.action,
          threshold_config
        })
      });
      const json = (await res.json()) as { error?: string; rule?: AdFraudRule };
      if (!res.ok) {
        setMessage(json.error ?? "Lưu rule thất bại.");
        return;
      }
      if (json.rule) {
        setRules((prev) => prev.map((r) => (r.rule_key === json.rule!.rule_key ? json.rule! : r)));
      }
      setMessage("Đã lưu rule.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold text-white">Cảnh báo & hold doanh thu QC</h1>
        <AdminAdsMonetizationSectionNav />
        <p className="text-sm text-zinc-400">
          Phát hiện tín hiệu rủi ro, giữ allocation khi cần — không tự khóa tài khoản, không tự trả
          tiền vào ví.
        </p>
      </header>

      {message ? (
        <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">{message}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Signal mở" value={String(dashboard.openSignals)} />
        <StatCard label="Cao / nghiêm trọng" value={String(dashboard.criticalSignals)} />
        <StatCard label="Creator đang giữ" value={String(dashboard.heldCreators)} />
        <StatCard
          label="Ước tính đang giữ"
          value={formatVnd(dashboard.heldAmountEstimateVnd)}
        />
      </div>

      {canUpdate ? (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-white/10 p-3">
          <label className="text-sm text-zinc-400">
            Tháng detection
            <Input
              className="mt-1 w-36"
              value={detectMonth}
              onChange={(e) => setDetectMonth(e.target.value)}
              placeholder="YYYY-MM"
            />
          </label>
          <Button type="button" disabled={pending} onClick={() => void runDetection()}>
            Run detection
          </Button>
        </div>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm ${tab === "signals" ? "bg-cyan-500/20 text-cyan-200" : "text-zinc-400"}`}
          onClick={() => setTab("signals")}
        >
          Signals
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm ${tab === "rules" ? "bg-cyan-500/20 text-cyan-200" : "text-zinc-400"}`}
          onClick={() => setTab("rules")}
        >
          Rules
        </button>
      </div>

      {tab === "signals" ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="status"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="max-w-[120px]"
            />
            <Input
              placeholder="severity"
              value={filters.severity}
              onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value }))}
              className="max-w-[120px]"
            />
            <Input
              placeholder="rule_key"
              value={filters.rule_key}
              onChange={(e) => setFilters((f) => ({ ...f, rule_key: e.target.value }))}
              className="max-w-[160px]"
            />
            <Input
              placeholder="month"
              value={filters.month}
              onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))}
              className="max-w-[100px]"
            />
            <Button type="button" variant="secondary" onClick={() => void reloadSignals()}>
              Lọc
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-2 py-2">Rule</th>
                  <th className="px-2 py-2">Mức</th>
                  <th className="px-2 py-2">Tác giả</th>
                  <th className="px-2 py-2">Tháng</th>
                  <th className="px-2 py-2">TT</th>
                  <th className="px-2 py-2">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {signals.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 text-zinc-300">
                    <td className="px-2 py-2">
                      <div className="text-zinc-200">{s.rule_name}</div>
                      <div className="text-xs text-zinc-500">{s.rule_key}</div>
                    </td>
                    <td className="px-2 py-2">{AD_FRAUD_SEVERITY_LABELS[s.severity]}</td>
                    <td className="px-2 py-2">@{s.author_username ?? "—"}</td>
                    <td className="px-2 py-2">{s.month ?? s.event_date ?? "—"}</td>
                    <td className="px-2 py-2">{AD_FRAUD_SIGNAL_STATUS_LABELS[s.status]}</td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={pending}
                          onClick={() => void loadAllocationsForSignal(s)}
                        >
                          Allocation
                        </Button>
                        {canUpdate && s.status === "open" ? (
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={pending}
                            onClick={() => void patchSignal(s.id, "reviewing")}
                          >
                            Review
                          </Button>
                        ) : null}
                        {canUpdate ? (
                          <>
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={pending}
                              onClick={() => void patchSignal(s.id, "dismissed")}
                            >
                              Dismiss
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={pending}
                              onClick={() => void patchSignal(s.id, "resolved")}
                            >
                              Resolve
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedSignal ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
              <p className="text-sm text-amber-100">
                Allocation cho @{selectedSignal.author_username} · tháng {selectedSignal.month}
              </p>
              <Input
                placeholder="Lý do (bắt buộc cho hold/release/cancel)"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
              />
              {allocations.length === 0 ? (
                <p className="text-sm text-zinc-500">Không có allocation cho tháng này.</p>
              ) : (
                <ul className="space-y-2">
                  {allocations.map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center gap-2 text-sm text-zinc-300"
                    >
                      <span>
                        {a.id.slice(0, 8)}… · {a.status} · {formatVnd(a.final_payable_vnd)}
                      </span>
                      {canUpdate ? (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={pending}
                            onClick={() => void allocationAction(a.id, "hold")}
                          >
                            Hold
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={pending}
                            onClick={() => void allocationAction(a.id, "release")}
                          >
                            Release
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={pending}
                            onClick={() => void allocationAction(a.id, "cancel")}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <RuleEditor
              key={rule.id}
              rule={rule}
              canUpdate={canUpdate}
              pending={pending}
              onSave={saveRule}
              onToggle={(enabled) =>
                setRules((prev) =>
                  prev.map((r) =>
                    r.rule_key === rule.rule_key ? { ...r, is_enabled: enabled } : r
                  )
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function RuleEditor({
  rule,
  canUpdate,
  pending,
  onSave,
  onToggle
}: {
  rule: AdFraudRule;
  canUpdate: boolean;
  pending: boolean;
  onSave: (rule: AdFraudRule, json: string) => void;
  onToggle: (enabled: boolean) => void;
}) {
  const [json, setJson] = useState(JSON.stringify(rule.threshold_config, null, 2));

  return (
    <div className="rounded-xl border border-white/10 p-4 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-white">{rule.name}</p>
          <p className="text-xs text-zinc-500">{rule.rule_key}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={rule.is_enabled}
            disabled={!canUpdate}
            onChange={(e) => onToggle(e.target.checked)}
          />
          Bật
        </label>
      </div>
      <p className="text-sm text-zinc-400">{rule.description}</p>
      <textarea
        className="min-h-[80px] w-full rounded-lg border border-white/10 bg-black/30 p-2 font-mono text-xs text-zinc-300"
        value={json}
        disabled={!canUpdate}
        onChange={(e) => setJson(e.target.value)}
      />
      {canUpdate ? (
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => onSave(rule, json)}
        >
          Lưu rule
        </Button>
      ) : null}
    </div>
  );
}
