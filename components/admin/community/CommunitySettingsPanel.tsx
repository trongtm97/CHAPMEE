"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { updateCommunitySpamSettingsAction } from "@/lib/admin/community-group-actions";
import type { CommunityAdminPermissions, CommunitySpamSettings } from "@/types/community-admin";

type CommunitySettingsPanelProps = {
  settings: CommunitySpamSettings;
  permissions: CommunityAdminPermissions;
};

export function CommunitySettingsPanel({
  settings: initial,
  permissions
}: CommunitySettingsPanelProps) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!permissions.canManageSpamSettings) {
    return (
      <p className="text-sm text-zinc-500">
        Chỉ admin có quyền cấu hình mới chỉnh được cấu hình cộng đồng.
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-zinc-900/40 p-4">
      <h3 className="text-sm font-semibold text-white">Cấu hình cộng đồng</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-zinc-400">
          Số bài tối đa/ngày (user mới)
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
            min={1}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                maxPostsPerDayNewUser: Number(e.target.value) || 1
              }))
            }
            type="number"
            value={settings.maxPostsPerDayNewUser}
          />
        </label>
        <label className="space-y-1 text-xs text-zinc-400">
          Số comment tối đa/giờ
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
            min={1}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                maxCommentsPerHour: Number(e.target.value) || 1
              }))
            }
            type="number"
            value={settings.maxCommentsPerHour}
          />
        </label>
        <label className="space-y-1 text-xs text-zinc-400">
          Ngưỡng report → hàng đợi
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
            min={1}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                reportQueueThreshold: Number(e.target.value) || 1
              }))
            }
            type="number"
            value={settings.reportQueueThreshold}
          />
        </label>
        <label className="space-y-1 text-xs text-zinc-400">
          Ngưỡng tự ẩn tạm (cao)
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
            min={1}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                autoHideReportThreshold: Number(e.target.value) || 1
              }))
            }
            type="number"
            value={settings.autoHideReportThreshold}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          checked={settings.preModerateExternalLinks}
          onChange={(e) =>
            setSettings((s) => ({ ...s, preModerateExternalLinks: e.target.checked }))
          }
          type="checkbox"
        />
        Duyệt trước bài có link ngoài
      </label>
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          checked={settings.preModerateNewUsers}
          onChange={(e) =>
            setSettings((s) => ({ ...s, preModerateNewUsers: e.target.checked }))
          }
          type="checkbox"
        />
        Duyệt trước bài user mới
      </label>

      <label className="block space-y-1 text-xs text-zinc-400">
        Từ khóa chặn (mỗi dòng một từ)
        <textarea
          className="min-h-[60px] w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              blockedKeywords: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean)
            }))
          }
          value={settings.blockedKeywords.join("\n")}
        />
      </label>

      <label className="block space-y-1 text-xs text-zinc-400">
        Từ khóa cần review (mỗi dòng một từ)
        <textarea
          className="min-h-[60px] w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              reviewKeywords: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean)
            }))
          }
          value={settings.reviewKeywords.join("\n")}
        />
      </label>

      <Button
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          setMessage(null);
          const res = await updateCommunitySpamSettingsAction(
            settings as unknown as Record<string, unknown>
          );
          setSaving(false);
          setMessage(res.ok ? "Đã lưu cấu hình." : (res.error ?? "Lỗi lưu."));
        }}
        type="button"
        variant="primary"
      >
        {saving ? "Đang lưu…" : "Lưu cấu hình"}
      </Button>
      {message ? <p className="text-xs text-zinc-400">{message}</p> : null}
    </div>
  );
}
