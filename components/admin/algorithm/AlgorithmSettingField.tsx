"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Card, Input } from "@/components/ui";
import { detectDangerousAlgorithmChange } from "@/lib/algorithm/dangerous-changes";
import {
  resetAlgorithmSettingAction,
  saveAlgorithmSettingFormAction
} from "@/lib/admin/algorithm-settings-actions";
import type { AlgorithmSettingRow } from "@/types/algorithm-settings";

type AlgorithmSettingFieldProps = {
  setting: AlgorithmSettingRow;
  canUpdate: boolean;
  onSaved?: () => void;
};

function formatDisplayValue(setting: AlgorithmSettingRow) {
  if (setting.value_type === "percentage") {
    return String(setting.value ?? "");
  }
  if (setting.value_type === "boolean") {
    return setting.value ? "true" : "false";
  }
  if (setting.value_type === "json") {
    return JSON.stringify(setting.value ?? {}, null, 2);
  }
  return String(setting.value ?? "");
}

export function AlgorithmSettingField({
  setting,
  canUpdate,
  onSaved
}: AlgorithmSettingFieldProps) {
  const [value, setValue] = useState(formatDisplayValue(setting));
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [confirmDangerous, setConfirmDangerous] = useState(false);
  const [pending, startTransition] = useTransition();

  const dangerous = useMemo(() => {
    let parsed: unknown = value;
    if (setting.value_type === "boolean") {
      parsed = value === "true";
    } else if (setting.value_type === "number" || setting.value_type === "percentage") {
      parsed = Number(value);
    } else if (setting.value_type === "json") {
      try {
        parsed = JSON.parse(value);
      } catch {
        return null;
      }
    }
    return detectDangerousAlgorithmChange(setting.key, parsed);
  }, [setting.key, setting.value_type, value]);

  function handleSave() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("key", setting.key);
      formData.set("value_type", setting.value_type);
      formData.set("value", value);
      if (reason.trim()) formData.set("reason", reason.trim());
      if (confirmDangerous) formData.set("confirm_dangerous", "true");

      const result = await saveAlgorithmSettingFormAction(
        { ok: false, message: null },
        formData
      );
      setOk(result.ok);
      setMessage(result.message);
      if (result.ok) {
        onSaved?.();
      }
    });
  }

  function handleReset() {
    startTransition(async () => {
      const result = await resetAlgorithmSettingAction({
        key: setting.key,
        reason: reason.trim() || "admin_reset"
      });
      setOk(result.ok);
      setMessage(result.message);
      if (result.ok) {
        setValue(formatDisplayValue({ ...setting, value: setting.default_value }));
        onSaved?.();
      }
    });
  }

  const min = setting.min_value;
  const max = setting.max_value;
  const boundsLabel =
    min != null || max != null
      ? `Giới hạn: ${min ?? "—"} → ${max ?? "—"}`
      : null;

  return (
    <Card className="space-y-3 p-4">
      <div>
        <p className="text-sm font-bold text-white">{setting.label}</p>
        <p className="mt-0.5 font-mono text-[11px] text-zinc-500">{setting.key}</p>
        {setting.description ? (
          <p className="mt-2 text-sm leading-6 text-zinc-400">{setting.description}</p>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1 text-xs text-zinc-500">Giá trị hiện tại</p>
          {setting.value_type === "boolean" ? (
            <label className="flex items-center gap-2 text-sm text-zinc-200">
              <input
                checked={value === "true"}
                disabled={!canUpdate || pending}
                onChange={(e) => setValue(e.target.checked ? "true" : "false")}
                type="checkbox"
              />
              {value === "true" ? "Bật" : "Tắt"}
            </label>
          ) : setting.value_type === "json" ? (
            <textarea
              className="min-h-24 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-white outline-none focus:border-cyan-300/40"
              disabled={!canUpdate || pending}
              onChange={(e) => setValue(e.target.value)}
              value={value}
            />
          ) : setting.value_type === "number" ||
            setting.value_type === "percentage" ? (
            <div className="space-y-2">
              <input
                className="w-full accent-cyan-400"
                disabled={!canUpdate || pending}
                max={max ?? undefined}
                min={min ?? undefined}
                onChange={(e) => setValue(e.target.value)}
                step={setting.value_type === "percentage" ? 1 : 0.01}
                type="range"
                value={value}
              />
              <Input
                disabled={!canUpdate || pending}
                onChange={(e) => setValue(e.target.value)}
                type="number"
                value={value}
              />
              {setting.value_type === "percentage" ? (
                <span className="text-xs text-zinc-500">Đơn vị: %</span>
              ) : null}
            </div>
          ) : (
            <Input
              disabled={!canUpdate || pending}
              onChange={(e) => setValue(e.target.value)}
              value={value}
            />
          )}
          {boundsLabel ? (
            <p className="mt-1 text-xs text-zinc-500">{boundsLabel}</p>
          ) : null}
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">Mặc định</p>
          <p className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 font-mono text-xs text-zinc-300">
            {formatDisplayValue({ ...setting, value: setting.default_value })}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Cập nhật:{" "}
            {new Date(setting.updated_at).toLocaleString("vi-VN")}
          </p>
        </div>
      </div>

      {canUpdate ? (
        <div className="space-y-2">
          <Input
            disabled={pending}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Lý do thay đổi (tuỳ chọn)"
            value={reason}
          />
          {dangerous ? (
            <label className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
              <input
                checked={confirmDangerous}
                className="mt-1"
                onChange={(e) => setConfirmDangerous(e.target.checked)}
                type="checkbox"
              />
              <span>{dangerous.message}</span>
            </label>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={pending || (dangerous != null && !confirmDangerous)}
              loading={pending}
              onClick={handleSave}
              type="button"
            >
              Lưu
            </Button>
            <Button
              disabled={pending}
              onClick={handleReset}
              type="button"
              variant="ghost"
            >
              Reset mặc định
            </Button>
          </div>
        </div>
      ) : null}

      {message ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            ok
              ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
              : "border border-red-400/30 bg-red-400/10 text-red-100"
          }`}
        >
          {message}
        </p>
      ) : null}
    </Card>
  );
}
