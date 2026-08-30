"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Card, Input } from "@/components/ui";
import {
  deleteSeoRedirectAction,
  saveSeoRedirectAction
} from "@/lib/admin/seo-redirect-actions";
import type { SeoRedirectRow } from "@/lib/db/schema/seo-center";
import { SEO_REDIRECT_STATUS_CODES } from "@/lib/seo/seo-constants";
import type { SeoRedirectStatusCode } from "@/lib/seo/seo-types";

type SeoRedirectFormProps = {
  initial?: SeoRedirectRow | null;
  canUpdate: boolean;
  prefilledSourcePath?: string;
};

export function SeoRedirectForm({
  initial,
  canUpdate,
  prefilledSourcePath
}: SeoRedirectFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    sourcePath: initial?.sourcePath ?? prefilledSourcePath ?? "",
    destinationPath: initial?.destinationPath ?? "",
    statusCode: (initial?.statusCode ?? 301) as SeoRedirectStatusCode,
    preserveQuery: initial?.preserveQuery ?? true,
    isEnabled: initial?.isEnabled ?? true,
    note: initial?.note ?? ""
  });
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setFieldErrors({});
    setWarnings([]);

    startTransition(async () => {
      const result = await saveSeoRedirectAction({
        id: initial?.id,
        sourcePath: form.sourcePath,
        destinationPath: form.destinationPath,
        statusCode: form.statusCode,
        preserveQuery: form.preserveQuery,
        isEnabled: form.isEnabled,
        note: form.note || null
      });

      setOk(result.ok);
      setMessage(result.message ?? "");
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
      if (result.warnings) {
        setWarnings(result.warnings);
      }
      if (result.ok && result.id && !initial?.id) {
        router.push(`/admin/seo/redirects/${result.id}`);
      }
    });
  }

  function onDelete() {
    if (!initial?.id || !window.confirm("Xóa redirect này?")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteSeoRedirectAction(initial.id);
      setMessage(result.message ?? "");
      if (result.ok) {
        router.push("/admin/seo/redirects");
      }
    });
  }

  return (
    <form onSubmit={onSubmit}>
    <Card className="space-y-4 p-5">
      <Input
        error={fieldErrors.sourcePath}
        label="Source path"
        onChange={(event) => setForm((prev) => ({ ...prev, sourcePath: event.target.value }))}
        placeholder="/old-test"
        required
        value={form.sourcePath}
      />
      <Input
        error={fieldErrors.destinationPath}
        label="Destination path hoặc URL"
        onChange={(event) =>
          setForm((prev) => ({ ...prev, destinationPath: event.target.value }))
        }
        placeholder="/truyen hoặc https://..."
        required
        value={form.destinationPath}
      />

      {warnings.map((warning) => (
        <p className="text-xs text-amber-200" key={warning}>
          ⚠ {warning}
        </p>
      ))}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-300">Status code</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                statusCode: Number(event.target.value) as SeoRedirectStatusCode
              }))
            }
            value={form.statusCode}
          >
            {SEO_REDIRECT_STATUS_CODES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-300">Note</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
            value={form.note}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            checked={form.preserveQuery}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, preserveQuery: event.target.checked }))
            }
            type="checkbox"
          />
          Preserve query string
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            checked={form.isEnabled}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, isEnabled: event.target.checked }))
            }
            type="checkbox"
          />
          Enabled
        </label>
      </div>

      {message ? (
        <p className={`text-sm ${ok ? "text-emerald-300" : "text-red-300"}`}>{message}</p>
      ) : null}

      {canUpdate ? (
        <div className="flex flex-wrap gap-2">
          <Button disabled={pending} type="submit">
            {pending ? "Đang lưu…" : initial?.id ? "Cập nhật redirect" : "Tạo redirect"}
          </Button>
          {initial?.id ? (
            <Button disabled={pending} onClick={onDelete} type="button" variant="secondary">
              Xóa
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">Bạn chỉ có quyền xem.</p>
      )}
    </Card>
    </form>
  );
}
