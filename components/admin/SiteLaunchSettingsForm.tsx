"use client";

import { useActionState } from "react";
import {
  resetSiteLaunchSettingsAction,
  updateSiteLaunchSettingsAction,
  type SiteLaunchActionState
} from "@/lib/admin/site-launch-actions";
import type { SiteLaunchSettings } from "@/lib/settings/site-launch-settings";

type SiteLaunchSettingsFormProps = {
  initialSettings: SiteLaunchSettings;
  updatedAt?: string | null;
};

export function SiteLaunchSettingsForm({
  initialSettings,
  updatedAt
}: SiteLaunchSettingsFormProps) {
  const [state, saveAction, savePending] = useActionState(
    async (_prev: SiteLaunchActionState | null, formData: FormData) =>
      updateSiteLaunchSettingsAction(formData),
    null as SiteLaunchActionState | null
  );
  const [resetState, resetAction, resetPending] = useActionState(
    async () => resetSiteLaunchSettingsAction(),
    null as SiteLaunchActionState | null
  );

  const settings = state?.settings ?? resetState?.settings ?? initialSettings;
  const message = state?.message ?? resetState?.message;
  const messageOk = state?.ok ?? resetState?.ok;

  return (
    <div className="space-y-6">
      <form
        action={saveAction}
        className="space-y-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5"
        key={JSON.stringify(settings)}
      >
        <div>
          <h2 className="text-lg font-bold text-zinc-100">Chặn công cụ tìm kiếm (tạm thời)</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Khi bật: robots.txt chặn toàn bộ, sitemap trống và meta robots noindex trên trang
            public. Dùng trước khi ra mắt hoặc khi bảo trì lớn.
          </p>
        </div>

        <label className="flex items-start gap-3 text-sm text-zinc-300">
          <input
            className="mt-1"
            defaultChecked={settings.block_search_engines}
            name="blockSearchEngines"
            type="checkbox"
          />
          <span>
            <span className="font-semibold text-zinc-100">Chặn Google/Bing và bot index</span>
            <span className="mt-1 block text-zinc-500">
              Khác với tắt robots.txt trong SEO Sitemap — đây là công tắc nhanh, bật/tắt một lần.
            </span>
          </span>
        </label>

        <hr className="border-white/[0.06]" />

        <div>
          <h2 className="text-lg font-bold text-zinc-100">Chế độ Coming soon</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Khách truy cập chỉ thấy trang /coming-soon. Đội có quyền admin vẫn duyệt site bình
            thường.
          </p>
        </div>

        <label className="flex items-start gap-3 text-sm text-zinc-300">
          <input
            className="mt-1"
            defaultChecked={settings.coming_soon_enabled}
            name="comingSoonEnabled"
            type="checkbox"
          />
          <span className="font-semibold text-zinc-100">Bật Coming soon</span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-500">Tiêu đề trang</span>
          <input
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-zinc-100"
            defaultValue={settings.coming_soon_title}
            maxLength={200}
            name="comingSoonTitle"
            required
            type="text"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-500">Nội dung</span>
          <textarea
            className="min-h-[120px] rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-zinc-100"
            defaultValue={settings.coming_soon_message}
            maxLength={2000}
            name="comingSoonMessage"
            required
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            defaultChecked={settings.show_login_link}
            name="showLoginLink"
            type="checkbox"
          />
          Hiện liên kết đăng nhập trên trang Coming soon
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-bold text-zinc-950 disabled:opacity-60"
            disabled={savePending}
            type="submit"
          >
            {savePending ? "Đang lưu…" : "Lưu cấu hình"}
          </button>
          {updatedAt ? (
            <span className="text-xs text-zinc-500">
              Cập nhật lần cuối: {new Date(updatedAt).toLocaleString("vi-VN")}
            </span>
          ) : null}
        </div>

        {message ? (
          <p className={`text-sm ${messageOk ? "text-emerald-300" : "text-rose-300"}`}>{message}</p>
        ) : null}
      </form>

      <form action={resetAction}>
        <button
          className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-300 hover:border-white/25 disabled:opacity-60"
          disabled={resetPending}
          type="submit"
        >
          {resetPending ? "Đang đặt lại…" : "Đặt lại mặc định (tắt hết)"}
        </button>
      </form>
    </div>
  );
}
