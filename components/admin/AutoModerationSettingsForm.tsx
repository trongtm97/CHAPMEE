"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { updateAutoModerationSettingsAction } from "@/lib/admin/update-auto-moderation-settings";
import { MODE_LABELS } from "@/lib/community/auto-moderation-labels";
import type { CommunityAutoModerationSettings } from "@/types/community-auto-moderation";

type AutoModerationSettingsFormProps = {
  initial: CommunityAutoModerationSettings;
  canEdit: boolean;
};

export function AutoModerationSettingsForm({
  initial,
  canEdit
}: AutoModerationSettingsFormProps) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!canEdit) {
    return (
      <p className="text-sm text-zinc-500">
        Chỉ admin có quyền cấu hình (`admin.settings.update`) mới chỉnh được.
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-zinc-900/40 p-4">
      <label className="flex items-center gap-2 text-sm text-white">
        <input
          checked={settings.enabled}
          onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
          type="checkbox"
        />
        Bật duyệt tự động
      </label>

      <label className="block space-y-1 text-xs text-zinc-400">
        Chế độ vận hành
        <select
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              mode: e.target.value as CommunityAutoModerationSettings["mode"]
            }))
          }
          value={settings.mode}
        >
          {(Object.keys(MODE_LABELS) as Array<keyof typeof MODE_LABELS>).map((k) => (
            <option key={k} value={k}>
              {MODE_LABELS[k]}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-zinc-400">
          Điểm tin cậy tối thiểu (auto approve)
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
            max={100}
            min={0}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                autoApproveMinTrustScore: Number(e.target.value)
              }))
            }
            type="number"
            value={settings.autoApproveMinTrustScore}
          />
        </label>
        <label className="space-y-1 text-xs text-zinc-400">
          Điểm tối thiểu (tác giả xác thực)
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
            max={100}
            min={0}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                trustedAuthorMinScore: Number(e.target.value)
              }))
            }
            type="number"
            value={settings.trustedAuthorMinScore}
          />
        </label>
        <label className="space-y-1 text-xs text-zinc-400">
          Tài khoản mới (ngày)
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
            min={0}
            onChange={(e) =>
              setSettings((s) => ({ ...s, newAccountDays: Number(e.target.value) }))
            }
            type="number"
            value={settings.newAccountDays}
          />
        </label>
        <label className="space-y-1 text-xs text-zinc-400">
          Tối đa bài từ chối / 30 ngày
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
            min={0}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                maxRejectedPosts30d: Number(e.target.value)
              }))
            }
            type="number"
            value={settings.maxRejectedPosts30d}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-zinc-300">
        <label className="flex items-center gap-2">
          <input
            checked={settings.requireEmailVerified}
            onChange={(e) =>
              setSettings((s) => ({ ...s, requireEmailVerified: e.target.checked }))
            }
            type="checkbox"
          />
          Bắt buộc email xác minh
        </label>
        <label className="flex items-center gap-2">
          <input
            checked={settings.prioritizeVerifiedAuthors}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                prioritizeVerifiedAuthors: e.target.checked
              }))
            }
            type="checkbox"
          />
          Ưu tiên tự duyệt tác giả xác thực
        </label>
        <label className="flex items-center gap-2">
          <input
            checked={settings.reviewNewAccounts}
            onChange={(e) =>
              setSettings((s) => ({ ...s, reviewNewAccounts: e.target.checked }))
            }
            type="checkbox"
          />
          Duyệt tay tài khoản mới
        </label>
        <label className="flex items-center gap-2">
          <input
            checked={settings.reviewExternalLinks}
            onChange={(e) =>
              setSettings((s) => ({ ...s, reviewExternalLinks: e.target.checked }))
            }
            type="checkbox"
          />
          Link ngoài → hàng đợi
        </label>
      </div>

      <h4 className="text-sm font-medium text-zinc-300">Giới hạn đăng</h4>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-xs text-zinc-400">
          User mới / ngày
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
            min={1}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                rateLimits: {
                  ...s.rateLimits,
                  new_user_posts_per_day: Number(e.target.value)
                }
              }))
            }
            type="number"
            value={settings.rateLimits.new_user_posts_per_day}
          />
        </label>
        <label className="space-y-1 text-xs text-zinc-400">
          User thường / ngày
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
            min={1}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                rateLimits: {
                  ...s.rateLimits,
                  normal_posts_per_day: Number(e.target.value)
                }
              }))
            }
            type="number"
            value={settings.rateLimits.normal_posts_per_day}
          />
        </label>
        <label className="space-y-1 text-xs text-zinc-400">
          User uy tín / ngày
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
            min={1}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                rateLimits: {
                  ...s.rateLimits,
                  trusted_posts_per_day: Number(e.target.value)
                }
              }))
            }
            type="number"
            value={settings.rateLimits.trusted_posts_per_day}
          />
        </label>
        <label className="space-y-1 text-xs text-zinc-400">
          Cooldown (giây)
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
            min={0}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                rateLimits: {
                  ...s.rateLimits,
                  post_cooldown_seconds: Number(e.target.value)
                }
              }))
            }
            type="number"
            value={settings.rateLimits.post_cooldown_seconds}
          />
        </label>
      </div>

      <Button
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          setMessage(null);
          const res = await updateAutoModerationSettingsAction(settings);
          setSaving(false);
          setMessage(res.ok ? "Đã lưu cấu hình duyệt tự động." : res.error);
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
