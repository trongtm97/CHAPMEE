"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, Card, ErrorState, Input } from "@/components/ui";
import {
  executePendingDeleteCleanupAction,
  markAssetActiveAction,
  rebuildStorageMetricsAction,
  runDraftVersionCleanupAction,
  runHardDeleteDryRunAction,
  runOrphanScanAction,
  updateCleanupPolicyAction
} from "@/lib/storage/cleanup-service";
import type {
  CleanupPolicyRow,
  StorageAssetFilters,
  StorageAssetStatus,
  StorageAssetRow,
  StorageCleanupPageData
} from "@/types/storage-cleanup";

type TabId = "dashboard" | "policies" | "assets" | "scanner" | "jobs";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "policies", label: "Policies" },
  { id: "assets", label: "Assets" },
  { id: "scanner", label: "Orphan scanner" },
  { id: "jobs", label: "Jobs" }
];

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unit]}`;
}

function dateLabel(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
}

export function StorageCleanupAdminPage({
  data,
  filters
}: {
  data: StorageCleanupPageData;
  filters: StorageAssetFilters;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("dashboard");
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
  }

  function refresh() {
    router.refresh();
  }

  return (
    <section className="mx-auto w-full max-w-[1400px] space-y-5">
      <header className="space-y-2 border-b border-white/10 pb-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
          ChapMee Admin
        </p>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-normal text-white">
              Storage & Cleanup
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Theo doi asset registry, retention policy, orphan scan, quarantine va cleanup jobs.
              MVP nay mac dinh an toàn: dry-run/quarantine truoc, khong hard delete file truc tiep.
            </p>
          </div>
          <Button disabled={pending} onClick={refresh} variant="secondary">
            Refresh
          </Button>
        </div>
      </header>

      {data.error ? (
        <ErrorState message={data.error} title="Storage cleanup chua san sang" variant="danger" />
      ) : null}

      {toast ? (
        <p className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {toast}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {TABS.map((item) => (
          <button
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              tab === item.id
                ? "border-cyan-300 bg-cyan-300 text-zinc-950"
                : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
            }`}
            key={item.id}
            onClick={() => setTab(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" ? <DashboardTab data={data} /> : null}
      {tab === "policies" ? (
        <PoliciesTab
          onSaved={(message) => {
            notify(message);
            refresh();
          }}
          policies={data.policies}
        />
      ) : null}
      {tab === "assets" ? (
        <AssetsTab
          assets={data.assets.items}
          filters={filters}
          onMarkActive={(assetId) => {
            startTransition(async () => {
              const result = await markAssetActiveAction(assetId);
              notify(result.ok ? "Asset da duoc danh dau active." : result.error ?? "Loi.");
              if (result.ok) refresh();
            });
          }}
          pending={pending}
          page={data.assets.page}
          pageSize={data.assets.pageSize}
          total={data.assets.total}
          totalPages={data.assets.totalPages}
        />
      ) : null}
      {tab === "scanner" ? (
        <ScannerTab
          onHardDeleteDryRun={() => {
            startTransition(async () => {
              const result = await runHardDeleteDryRunAction();
              notify(
                result.ok
                  ? `Hard-delete dry-run: ${result.affectedCount} asset, ${formatBytes(result.bytesSaved)} co the giai phong.`
                  : result.error ?? "Khong the chay hard-delete dry-run."
              );
              if (result.ok) refresh();
            });
          }}
          onExecuteCleanup={() => {
            const confirmText = window.prompt(
              "Nhap DELETE PENDING MEDIA de xoa file storage dang pending-delete."
            );
            if (!confirmText) return;
            startTransition(async () => {
              const result = await executePendingDeleteCleanupAction({ confirmText });
              notify(
                result.ok
                  ? `Da xoa ${result.affectedCount} asset, giai phong ${formatBytes(result.bytesSaved)}.`
                  : result.error ?? "Khong the execute cleanup."
              );
              if (result.ok) refresh();
            });
          }}
          onVersionCleanup={(dryRun) => {
            startTransition(async () => {
              const result = await runDraftVersionCleanupAction({ dryRun });
              notify(
                result.ok
                  ? `${dryRun ? "Dry-run" : "Cleanup"} draft versions: ${result.affectedCount} ban.`
                  : result.error ?? "Khong the cleanup draft versions."
              );
              if (result.ok) refresh();
            });
          }}
          onMetricsRollup={() => {
            startTransition(async () => {
              const result = await rebuildStorageMetricsAction();
              notify(result.ok ? "Storage metrics da duoc rebuild." : result.error ?? "Khong the rebuild metrics.");
              if (result.ok) refresh();
            });
          }}
          onRun={(quarantine) => {
            startTransition(async () => {
              const result = await runOrphanScanAction({ quarantine });
              notify(
                result.ok
                  ? `${quarantine ? "Pending delete" : "Dry scan"}: ${result.affectedCount} asset, ${formatBytes(result.bytesSaved)}.`
                  : result.error ?? "Khong the chay scanner."
              );
              if (result.ok) refresh();
            });
          }}
          pending={pending}
        />
      ) : null}
      {tab === "jobs" ? <JobsTab data={data} /> : null}
    </section>
  );
}

function DashboardTab({ data }: { data: StorageCleanupPageData }) {
  const cards = [
    ["Total assets", data.dashboard.totalAssets.toLocaleString("vi-VN")],
    ["Active", data.dashboard.activeAssets.toLocaleString("vi-VN")],
    ["Orphan", data.dashboard.orphanAssets.toLocaleString("vi-VN")],
    ["Quarantined", data.dashboard.quarantinedAssets.toLocaleString("vi-VN")],
    ["Can delete", data.dashboard.deletableAssets.toLocaleString("vi-VN")],
    ["Total storage", formatBytes(data.dashboard.totalBytes)],
    ["Potential saving", formatBytes(data.dashboard.reclaimableBytes)]
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <Card className="border-white/10 bg-white/[0.03]" key={label}>
            <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-white">{value}</p>
          </Card>
        ))}
      </div>

      {data.dashboard.policyWarnings.length > 0 ? (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {data.dashboard.policyWarnings.join(" | ")}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <MiniTable
          columns={["Bucket", "Assets", "Bytes"]}
          rows={data.dashboard.topBuckets.map((row) => [
            row.bucket,
            row.count.toLocaleString("vi-VN"),
            formatBytes(row.bytes)
          ])}
          title="Top buckets"
        />
        <MiniTable
          columns={["Owner", "Assets", "Bytes"]}
          rows={data.dashboard.topUsers.map((row) => [
            row.username ?? row.ownerId ?? "Unknown",
            row.count.toLocaleString("vi-VN"),
            formatBytes(row.bytes)
          ])}
          title="Top users"
        />
        <Card className="border-white/10 bg-white/[0.03]">
          <h2 className="text-sm font-bold text-white">Latest jobs</h2>
          <p className="mt-3 text-sm text-zinc-400">
            Latest: {data.dashboard.latestJob?.summary ?? "No cleanup job yet."}
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Latest failed: {data.dashboard.latestFailedJob?.summary ?? "No failed job."}
          </p>
        </Card>
      </div>

      <MiniTable
        columns={["Path", "Bucket", "Status", "Size"]}
        rows={data.dashboard.largestFiles.map((asset) => [
          asset.path,
          asset.bucket,
          asset.status,
          formatBytes(asset.sizeBytes)
        ])}
        title="Top largest files"
      />
    </div>
  );
}

function PoliciesTab({
  policies,
  onSaved
}: {
  policies: CleanupPolicyRow[];
  onSaved: (message: string) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, CleanupPolicyRow[]>();
    for (const policy of policies) {
      map.set(policy.category, [...(map.get(policy.category) ?? []), policy]);
    }
    return Array.from(map.entries());
  }, [policies]);
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(policies.map((policy) => [policy.key, JSON.stringify(policy.value)]))
  );
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  async function save(policy: CleanupPolicyRow) {
    setPendingKey(policy.key);
    try {
      const value = JSON.parse(drafts[policy.key] ?? "null") as unknown;
      const result = await updateCleanupPolicyAction({ key: policy.key, value });
      onSaved(result.ok ? "Policy da duoc luu." : result.error ?? "Khong the luu policy.");
    } catch {
      onSaved("Gia tri policy phai la JSON hop le.");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="space-y-5">
      {grouped.map(([category, rows]) => (
        <Card className="border-white/10 bg-white/[0.03]" key={category}>
          <h2 className="text-base font-bold capitalize text-white">{category}</h2>
          <div className="mt-4 grid gap-3">
            {rows.map((policy) => (
              <div
                className="grid gap-2 rounded-xl border border-white/10 bg-zinc-950/40 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)_auto]"
                key={policy.key}
              >
                <div>
                  <p className="font-mono text-xs text-cyan-200">{policy.key}</p>
                  <p className="mt-1 text-xs text-zinc-500">{policy.description}</p>
                </div>
                <Input
                  onChange={(event) =>
                    setDrafts((prev) => ({ ...prev, [policy.key]: event.target.value }))
                  }
                  value={drafts[policy.key] ?? ""}
                />
                <Button
                  disabled={pendingKey === policy.key}
                  onClick={() => void save(policy)}
                  variant="secondary"
                >
                  Save
                </Button>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function AssetsTab({
  assets,
  filters,
  total,
  totalPages,
  page,
  pageSize,
  pending,
  onMarkActive
}: {
  assets: StorageAssetRow[];
  filters: StorageAssetFilters;
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
  pending: boolean;
  onMarkActive: (assetId: string) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draftFilters, setDraftFilters] = useState({
    bucket: filters.bucket ?? "",
    entityType: filters.entityType ?? "",
    mimeType: filters.mimeType ?? "",
    query: filters.query ?? "",
    status: filters.status ?? "all",
    usageType: filters.usageType ?? ""
  });

  function navigate(next: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyFilters() {
    navigate({ ...draftFilters, page: 1, pageSize });
  }

  return (
    <div className="space-y-4">
      <Card className="border-white/10 bg-white/[0.03]">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-bold text-white">Assets</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Page {page.toLocaleString("vi-VN")} / {totalPages.toLocaleString("vi-VN")} from{" "}
              {total.toLocaleString("vi-VN")} registered assets.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-[8rem_10rem_10rem_10rem_minmax(12rem,1fr)_auto]">
            <select
              className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  status: event.target.value as StorageAssetStatus | "all"
                }))
              }
              value={draftFilters.status}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="temp">Temp</option>
              <option value="replaced">Replaced</option>
              <option value="orphan_candidate">Orphan candidate</option>
              <option value="orphan_detected">Orphan</option>
              <option value="pending_delete">Pending delete</option>
              <option value="quarantined">Quarantined</option>
              <option value="deleted">Deleted</option>
              <option value="failed">Failed</option>
              <option value="error">Error</option>
            </select>
            <Input
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, bucket: event.target.value }))
              }
              placeholder="Bucket"
              value={draftFilters.bucket}
            />
            <Input
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, mimeType: event.target.value }))
              }
              placeholder="image/"
              value={draftFilters.mimeType}
            />
            <Input
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, usageType: event.target.value }))
              }
              placeholder="Usage type"
              value={draftFilters.usageType}
            />
            <Input
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, query: event.target.value }))
              }
              placeholder="Path or checksum"
              value={draftFilters.query}
            />
            <Button onClick={applyFilters} variant="secondary">
              Filter
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={page <= 1}
              onClick={() => navigate({ page: Math.max(1, page - 1) })}
              variant="secondary"
            >
              Prev
            </Button>
            <Button
              disabled={page >= totalPages}
              onClick={() => navigate({ page: Math.min(totalPages, page + 1) })}
              variant="secondary"
            >
              Next
            </Button>
            <select
              className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              onChange={(event) => navigate({ page: 1, pageSize: event.target.value })}
              value={String(pageSize)}
            >
              <option value="10">10 / page</option>
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
              <option value="100">100 / page</option>
            </select>
          </div>
        </div>
      </Card>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-[1180px] w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-3">Preview</th>
              <th className="px-3 py-3">Path</th>
              <th className="px-3 py-3">Owner</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Entity</th>
              <th className="px-3 py-3">Size</th>
              <th className="px-3 py-3">Last used</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {assets.map((asset) => (
              <tr key={asset.id}>
                <td className="px-3 py-3">
                  {asset.publicUrl && asset.mimeType?.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover"
                      loading="lazy"
                      src={asset.publicUrl}
                    />
                  ) : (
                    <span className="text-xs text-zinc-600">No preview</span>
                  )}
                </td>
                <td className="max-w-[360px] px-3 py-3">
                  <p className="font-mono text-xs text-zinc-200 line-clamp-2">{asset.path}</p>
                  <p className="mt-1 text-xs text-zinc-500">{asset.bucket}</p>
                </td>
                <td className="px-3 py-3 text-zinc-400">{asset.ownerUsername ?? asset.ownerId ?? "-"}</td>
                <td className="px-3 py-3 text-zinc-300">{asset.status}</td>
                <td className="px-3 py-3 text-zinc-400">
                  <p>{asset.usageType ?? "-"}</p>
                  {asset.linkedEntityType ?? "-"}
                  {asset.linkedField ? ` / ${asset.linkedField}` : ""}
                </td>
                <td className="px-3 py-3 text-zinc-300">{formatBytes(asset.sizeBytes)}</td>
                <td className="px-3 py-3 text-zinc-500">{dateLabel(asset.lastUsedAt)}</td>
                <td className="px-3 py-3">
                  <Button
                    disabled={pending}
                    onClick={() => onMarkActive(asset.id)}
                    variant="secondary"
                  >
                    Mark active
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScannerTab({
  pending,
  onRun,
  onExecuteCleanup,
  onHardDeleteDryRun,
  onMetricsRollup,
  onVersionCleanup
}: {
  pending: boolean;
  onRun: (quarantine: boolean) => void;
  onExecuteCleanup: () => void;
  onHardDeleteDryRun: () => void;
  onMetricsRollup: () => void;
  onVersionCleanup: (dryRun: boolean) => void;
}) {
  return (
    <Card className="border-white/10 bg-white/[0.03]">
      <h2 className="text-base font-bold text-white">Orphan scanner</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
        Scanner kiem tra registry va cac tham chieu chinh nhu profile, story cover, content post,
        verification document truoc khi danh dau orphan. Hard-delete hien chi dry-run va ghi job.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={pending} onClick={() => onRun(false)} variant="secondary">
          Run dry scan
        </Button>
        <Button disabled={pending} onClick={() => onRun(true)} variant="danger">
          Mark pending delete
        </Button>
        <Button disabled={pending} onClick={onHardDeleteDryRun} variant="secondary">
          Hard-delete dry-run
        </Button>
        <Button disabled={pending} onClick={onExecuteCleanup} variant="danger">
          Execute pending delete
        </Button>
        <Button disabled={pending} onClick={() => onVersionCleanup(true)} variant="secondary">
          Autosave dry-run
        </Button>
        <Button disabled={pending} onClick={() => onVersionCleanup(false)} variant="secondary">
          Cleanup autosaves
        </Button>
        <Button disabled={pending} onClick={onMetricsRollup} variant="secondary">
          Rebuild metrics
        </Button>
      </div>
    </Card>
  );
}

function JobsTab({ data }: { data: StorageCleanupPageData }) {
  return (
    <MiniTable
      columns={["Job", "Mode", "Status", "Scanned", "Affected", "Bytes", "Started", "Summary"]}
      rows={data.jobs.items.map((job) => [
        job.jobType,
        job.mode,
        job.status,
        job.scannedCount.toLocaleString("vi-VN"),
        job.affectedCount.toLocaleString("vi-VN"),
        formatBytes(job.bytesSaved),
        dateLabel(job.startedAt),
        job.summary ?? "-"
      ])}
      title="Cleanup jobs"
    />
  );
}

function MiniTable({
  title,
  columns,
  rows
}: {
  title: string;
  columns: string[];
  rows: string[][];
}) {
  return (
    <Card className="overflow-hidden border-white/10 bg-white/[0.03]">
      <h2 className="mb-3 text-sm font-bold text-white">{title}</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-zinc-500">
            <tr>
              {columns.map((column) => (
                <th className="px-3 py-2" key={column}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-zinc-500" colSpan={columns.length}>
                  No data yet.
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={`${title}-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td className="max-w-[420px] px-3 py-2 text-zinc-300" key={`${rowIndex}-${cellIndex}`}>
                      <span className="line-clamp-2">{cell}</span>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
