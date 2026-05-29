"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input } from "@/components/ui";

const ACTION_OPTIONS = [
  "",
  "assign_role",
  "remove_role",
  "ban_user",
  "unban_user"
];

type AuditLogFiltersProps = {
  total: number;
  page: number;
  pageSize: number;
};

export function AuditLogFilters({ total, page, pageSize }: AuditLogFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const action = searchParams.get("action") ?? "";
  const actorId = searchParams.get("actorId") ?? "";
  const targetType = searchParams.get("targetType") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/admin/audit?${params.toString()}`);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function goPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`/admin/audit?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
          value={action}
          onChange={(event) => updateParam("action", event.target.value)}
        >
          {ACTION_OPTIONS.map((item) => (
            <option key={item || "all"} value={item}>
              {item || "Tất cả action"}
            </option>
          ))}
        </select>
        <Input
          placeholder="Actor user id"
          value={actorId}
          onChange={(event) => updateParam("actorId", event.target.value)}
        />
        <Input
          placeholder="Target type (user, story...)"
          value={targetType}
          onChange={(event) => updateParam("targetType", event.target.value)}
        />
        <Input
          type="date"
          value={from ? from.slice(0, 10) : ""}
          onChange={(event) =>
            updateParam(
              "from",
              event.target.value ? `${event.target.value}T00:00:00.000Z` : ""
            )
          }
        />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          className="sm:max-w-xs"
          type="date"
          value={to ? to.slice(0, 10) : ""}
          onChange={(event) =>
            updateParam(
              "to",
              event.target.value ? `${event.target.value}T23:59:59.999Z` : ""
            )
          }
        />
        <p className="text-sm text-zinc-400">
          {total} bản ghi · trang {page}/{totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            disabled={page <= 1}
            onClick={() => goPage(page - 1)}
            type="button"
            variant="secondary"
          >
            Trước
          </Button>
          <Button
            disabled={page >= totalPages}
            onClick={() => goPage(page + 1)}
            type="button"
            variant="secondary"
          >
            Sau
          </Button>
        </div>
      </div>
    </div>
  );
}
