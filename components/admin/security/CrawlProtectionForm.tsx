"use client";

import { useActionState } from "react";
import { updateCrawlProtectionAction } from "@/lib/admin/crawl-protection-actions";
import type { CrawlProtectionSettings } from "@/lib/security/crawl-protection-settings";

type CrawlProtectionFormProps = {
  settings: CrawlProtectionSettings;
};

export function CrawlProtectionForm({ settings }: CrawlProtectionFormProps) {
  const [state, action, pending] = useActionState(
    async (_prev: { ok: boolean; message: string } | null, formData: FormData) =>
      updateCrawlProtectionAction(formData),
    null
  );

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
      <h2 className="text-lg font-bold text-zinc-100">Cấu hình chống crawl</h2>
      <div className="flex flex-wrap gap-4 text-sm text-zinc-300">
        <label className="flex items-center gap-2">
          <input defaultChecked={settings.enabled} name="enabled" type="checkbox" />
          Bật bảo vệ
        </label>
        <label className="flex items-center gap-2">
          <input
            defaultChecked={settings.readerRateLimitEnabled}
            name="readerRateLimitEnabled"
            type="checkbox"
          />
          Giới hạn đọc chương
        </label>
        <label className="flex items-center gap-2">
          <input defaultChecked={settings.challengeEnabled} name="challengeEnabled" type="checkbox" />
          Challenge (Turnstile khi có key)
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          defaultValue={settings.anonymousChapterReadsPerMinute}
          label="Ẩn danh / phút"
          name="anonymousChapterReadsPerMinute"
        />
        <Field
          defaultValue={settings.anonymousChapterReadsPerHour}
          label="Ẩn danh / giờ"
          name="anonymousChapterReadsPerHour"
        />
        <Field
          defaultValue={settings.loggedInChapterReadsPerMinute}
          label="Đăng nhập / phút"
          name="loggedInChapterReadsPerMinute"
        />
        <Field
          defaultValue={settings.loggedInChapterReadsPerHour}
          label="Đăng nhập / giờ"
          name="loggedInChapterReadsPerHour"
        />
        <Field defaultValue={settings.searchRequestsPerMinute} label="Tìm kiếm / phút" name="searchRequestsPerMinute" />
        <Field defaultValue={settings.commentRequestsPerMinute} label="Bình luận / phút" name="commentRequestsPerMinute" />
        <Field
          defaultValue={settings.reactionRequestsPerMinute}
          label="Cảm xúc / phút"
          name="reactionRequestsPerMinute"
        />
        <Field defaultValue={settings.reviewRequestsPerHour} label="Đánh giá / giờ" name="reviewRequestsPerHour" />
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-500">Datacenter mode</span>
        <select
          className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-zinc-100"
          defaultValue={settings.blockDatacenterMode}
          name="blockDatacenterMode"
        >
          <option value="off">off</option>
          <option value="monitor">monitor</option>
          <option value="challenge">challenge</option>
          <option value="block">block</option>
        </select>
      </label>
      <button
        className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-bold text-zinc-950 disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Đang lưu…" : "Lưu"}
      </button>
      {state?.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-300" : "text-rose-300"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}

function Field({
  defaultValue,
  label,
  name
}: {
  defaultValue: number;
  label: string;
  name: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-500">{label}</span>
      <input
        className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-zinc-100"
        defaultValue={defaultValue}
        name={name}
        required
        type="number"
      />
    </label>
  );
}
