"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import {
  runRebuildGroupFeedProjectionToolAction,
  runStoryGroupBackfillToolAction,
  type StoryCommunitySyncToolResult
} from "@/lib/admin/community-sync-settings-actions";

type StoryCommunitySyncToolsPanelProps = {
  canEdit: boolean;
};

function ResultBox({ result }: { result: StoryCommunitySyncToolResult }) {
  if (!result.ok) {
    return (
      <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
        {result.error}
      </p>
    );
  }

  if (result.backfill) {
    const data = result.backfill;
    return (
      <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-300">
        <p className="font-semibold text-white">
          {data.dryRun ? "Dry-run backfill" : "Backfill đã chạy"}
        </p>
        <ul className="mt-2 space-y-1 text-xs text-zinc-400">
          <li>Ứng viên: {data.candidates}</li>
          <li>{data.dryRun ? "Sẽ tạo" : "Đã tạo"}: {data.created}</li>
          <li>Bỏ qua: {data.skipped}</li>
          <li>Lỗi: {data.errors}</li>
        </ul>
      </div>
    );
  }

  if (result.rebuild) {
    const data = result.rebuild;
    return (
      <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-300">
        <p className="font-semibold text-white">
          {data.dryRun ? "Dry-run rebuild projection" : "Rebuild projection đã chạy"}
        </p>
        <ul className="mt-2 space-y-1 text-xs text-zinc-400">
          <li>Events quét: {data.eventsScanned}</li>
          <li>Projected: {data.projected}</li>
          <li>Gom nhóm: {data.aggregated ?? 0}</li>
          <li>Card riêng: {data.individual ?? 0}</li>
          <li>Tạo mới: {data.created}</li>
          <li>Cập nhật: {data.updated}</li>
          <li>Bỏ qua: {data.skipped}</li>
          <li>Lỗi: {data.errors}</li>
          {data.hasMore ? <li>Tiếp: offset {data.nextOffset}</li> : null}
        </ul>
      </div>
    );
  }

  return null;
}

export function StoryCommunitySyncToolsPanel({ canEdit }: StoryCommunitySyncToolsPanelProps) {
  const [backfillConfirm, setBackfillConfirm] = useState("");
  const [rebuildConfirm, setRebuildConfirm] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [backfillResult, setBackfillResult] = useState<StoryCommunitySyncToolResult | null>(
    null
  );
  const [rebuildResult, setRebuildResult] = useState<StoryCommunitySyncToolResult | null>(
    null
  );

  async function runBackfill(dryRun: boolean) {
    setLoading(dryRun ? "backfill-dry" : "backfill-apply");
    const result = await runStoryGroupBackfillToolAction({
      dryRun,
      confirm: dryRun ? undefined : backfillConfirm
    });
    setBackfillResult(result);
    setLoading(null);
  }

  async function runRebuild(dryRun: boolean) {
    setLoading(dryRun ? "rebuild-dry" : "rebuild-apply");
    const result = await runRebuildGroupFeedProjectionToolAction({
      dryRun,
      confirm: dryRun ? undefined : rebuildConfirm
    });
    setRebuildResult(result);
    setLoading(null);
  }

  return (
    <section className="space-y-4 rounded-xl border border-white/10 bg-zinc-900/40 p-4">
      <div>
        <h2 className="text-lg font-bold text-white">Công cụ vận hành</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Chạy thủ công khi cần. Không tự chạy khi mở trang. Trên VPS, backup DB trước khi
          rebuild projection thật.
        </p>
      </div>

      {!canEdit ? (
        <p className="text-sm text-zinc-500">Thiếu quyền admin.settings.update để chạy công cụ.</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-white/10 p-4">
          <h3 className="text-sm font-semibold text-white">Backfill nhóm truyện</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Tạo `story_groups` cho truyện publish còn thiếu. Không xóa dữ liệu hiện có.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              disabled={!canEdit || loading !== null}
              onClick={() => void runBackfill(true)}
              type="button"
              variant="secondary"
            >
              {loading === "backfill-dry" ? "Đang chạy…" : "Dry-run"}
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            <label className="block text-xs text-zinc-400">
              Xác nhận backfill thật — nhập BACKFILL
              <input
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
                disabled={!canEdit || loading !== null}
                onChange={(event) => setBackfillConfirm(event.target.value)}
                value={backfillConfirm}
              />
            </label>
            <Button
              disabled={!canEdit || loading !== null || backfillConfirm !== "BACKFILL"}
              onClick={() => void runBackfill(false)}
              type="button"
            >
              {loading === "backfill-apply" ? "Đang chạy…" : "Backfill thật"}
            </Button>
          </div>
          {backfillResult ? <ResultBox result={backfillResult} /> : null}
        </div>

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <h3 className="text-sm font-semibold text-amber-100">Rebuild feed projection</h3>
          <p className="mt-1 text-xs leading-5 text-amber-100/70">
            Upsert lại `group_feed_items` từ `interaction_events`. Không xóa DB. Trên production:
            backup trước khi chạy thật.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              disabled={!canEdit || loading !== null}
              onClick={() => void runRebuild(true)}
              type="button"
              variant="secondary"
            >
              {loading === "rebuild-dry" ? "Đang chạy…" : "Dry-run"}
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            <label className="block text-xs text-amber-100/80">
              Xác nhận rebuild thật — nhập REBUILD
              <input
                className="mt-1 w-full rounded-lg border border-amber-500/30 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
                disabled={!canEdit || loading !== null}
                onChange={(event) => setRebuildConfirm(event.target.value)}
                value={rebuildConfirm}
              />
            </label>
            <Button
              disabled={!canEdit || loading !== null || rebuildConfirm !== "REBUILD"}
              onClick={() => void runRebuild(false)}
              type="button"
            >
              {loading === "rebuild-apply" ? "Đang chạy…" : "Rebuild thật"}
            </Button>
          </div>
          {rebuildResult ? <ResultBox result={rebuildResult} /> : null}
        </div>
      </div>
    </section>
  );
}
