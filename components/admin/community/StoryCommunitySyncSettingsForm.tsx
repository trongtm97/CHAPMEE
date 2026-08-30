"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import {
  COMMUNITY_SYNC_SETTING_DEFINITIONS,
  COMMUNITY_SYNC_SETTING_SECTIONS
} from "@/lib/community-sync/settings";
import { saveStoryCommunitySyncSettingsAction } from "@/lib/admin/community-sync-settings-actions";
import type { CommunitySyncSettings, NotifyGroupMembersDefault } from "@/types/story-community-sync";

type StoryCommunitySyncSettingsFormProps = {
  initialSettings: CommunitySyncSettings;
  canEdit: boolean;
  updatedAt: string | null;
};

function ToggleSwitch({
  checked,
  disabled,
  id,
  onChange
}: {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-checked={checked}
      aria-labelledby={id}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${
        checked
          ? "border-cyan-400/40 bg-cyan-400/25"
          : "border-zinc-600 bg-zinc-800"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export function StoryCommunitySyncSettingsForm({
  canEdit,
  initialSettings,
  updatedAt
}: StoryCommunitySyncSettingsFormProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateSetting<K extends keyof CommunitySyncSettings>(
    key: K,
    value: CommunitySyncSettings[K]
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    if (!canEdit) {
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    const result = await saveStoryCommunitySyncSettingsAction(settings);

    if (result.ok) {
      setSettings(result.settings);
      setMessage(result.message);
    } else {
      setSettings(result.settings);
      setError(result.message);
    }

    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Cấu hình đồng bộ</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Các giá trị được lưu trong `community_sync_settings` và backend đọc trực tiếp từ DB.
          </p>
          {updatedAt ? (
            <p className="mt-1 text-xs text-zinc-500">
              Cập nhật gần nhất:{" "}
              {new Intl.DateTimeFormat("vi-VN", {
                dateStyle: "medium",
                timeStyle: "short"
              }).format(new Date(updatedAt))}
            </p>
          ) : null}
        </div>
        {canEdit ? (
          <Button disabled={saving} onClick={() => void handleSave()} type="button">
            {saving ? "Đang lưu…" : "Lưu cấu hình"}
          </Button>
        ) : (
          <p className="text-sm text-zinc-500">Chỉ xem — thiếu quyền admin.settings.update</p>
        )}
      </div>

      {message ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {COMMUNITY_SYNC_SETTING_SECTIONS.map((section) => {
        const fields = COMMUNITY_SYNC_SETTING_DEFINITIONS.filter(
          (field) => field.section === section.id
        );

        return (
          <section
            className="rounded-xl border border-white/10 bg-zinc-900/40 p-4"
            key={section.id}
          >
            <h3 className="text-sm font-semibold text-white">{section.label}</h3>
            <div className="mt-3 divide-y divide-white/5">
              {fields.map((field) => (
                <div
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between"
                  key={field.key}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-200" id={field.key}>
                      {field.label}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">{field.description}</p>
                  </div>

                  <div className="shrink-0">
                    {field.type === "boolean" ? (
                      <ToggleSwitch
                        checked={Boolean(settings[field.key])}
                        disabled={!canEdit || saving}
                        id={field.key}
                        onChange={(checked) =>
                          updateSetting(field.key as keyof CommunitySyncSettings, checked)
                        }
                      />
                    ) : null}

                    {field.type === "number" ? (
                      <input
                        className="w-28 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
                        disabled={!canEdit || saving}
                        max={field.max}
                        min={field.min}
                        onChange={(event) =>
                          updateSetting(
                            field.key as keyof CommunitySyncSettings,
                            Number(event.target.value) || 0
                          )
                        }
                        type="number"
                        value={Number(settings[field.key as keyof CommunitySyncSettings])}
                      />
                    ) : null}

                    {field.type === "notify" ? (
                      <select
                        className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
                        disabled={!canEdit || saving}
                        onChange={(event) =>
                          updateSetting(
                            "notifyGroupMembersDefault",
                            event.target.value as NotifyGroupMembersDefault
                          )
                        }
                        value={settings.notifyGroupMembersDefault}
                      >
                        <option value="all">Tất cả hoạt động</option>
                        <option value="important_only">Chỉ quan trọng</option>
                        <option value="none">Không thông báo</option>
                      </select>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
