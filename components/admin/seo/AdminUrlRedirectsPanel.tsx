"use client";

import { useState, useTransition } from "react";

import {
  createUrlRedirectAction,
  deactivateUrlRedirectAction,
  type UrlAdminDashboard
} from "@/lib/admin/url-seo-data";

type Props = {
  initialData: UrlAdminDashboard;
};

export function AdminUrlRedirectsPanel({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [sourcePath, setSourcePath] = useState("");
  const [targetPath, setTargetPath] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function refreshFromServer(next: UrlAdminDashboard) {
    setData(next);
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Cảnh báo URL</h2>
        {data.warnings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Không có cảnh báo.</p>
        ) : (
          <ul className="space-y-2">
            {data.warnings.map((warning) => (
              <li
                key={warning.id}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  warning.severity === "critical"
                    ? "border-red-500/40 bg-red-500/10"
                    : "border-amber-500/40 bg-amber-500/10"
                }`}
              >
                {warning.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Tạo redirect thủ công</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="/truyen/old-slug-s.12345678"
            value={sourcePath}
            onChange={(e) => setSourcePath(e.target.value)}
          />
          <input
            className="rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="/truyen/new-slug-s.12345678"
            value={targetPath}
            onChange={(e) => setTargetPath(e.target.value)}
          />
        </div>
        <button
          type="button"
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          onClick={() => {
            startTransition(async () => {
              const result = await createUrlRedirectAction({ sourcePath, targetPath });
              setMessage(result.ok ? "Đã tạo redirect." : result.error);
            });
          }}
        >
          Tạo redirect 301
        </button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Redirects ({data.redirects.length})</h2>
        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Target</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {data.redirects.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{row.source_path}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.target_path}</td>
                  <td className="px-3 py-2">{row.status_code}</td>
                  <td className="px-3 py-2">{row.is_active ? "Yes" : "No"}</td>
                  <td className="px-3 py-2">
                    {row.is_active ? (
                      <button
                        type="button"
                        className="text-xs text-red-400"
                        onClick={() => {
                          startTransition(async () => {
                            await deactivateUrlRedirectAction(row.id);
                            refreshFromServer({
                              ...data,
                              redirects: data.redirects.map((r) =>
                                r.id === row.id ? { ...r, is_active: false } : r
                              )
                            });
                          });
                        }}
                      >
                        Tắt
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Slug history ({data.slugHistory.length})</h2>
        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">Old path</th>
                <th className="px-3 py-2">New path</th>
                <th className="px-3 py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {data.slugHistory.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">
                    {row.entity_type}
                    <div className="font-mono text-xs text-muted-foreground">{row.entity_id}</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{row.old_path}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.new_path}</td>
                  <td className="px-3 py-2">{new Date(row.changed_at).toLocaleString("vi-VN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
