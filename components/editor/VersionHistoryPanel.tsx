"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import {
  listStudioDraftVersionsAction,
  restoreStudioDraftVersionAction
} from "@/lib/studio/draft-actions";
import type { StudioDraftVersionRecord } from "@/types/drafts";

type VersionHistoryPanelProps = {
  draftId: string | null;
  onRestored: (version: StudioDraftVersionRecord) => void;
};

function formatWhen(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

export function VersionHistoryPanel({
  draftId,
  onRestored
}: VersionHistoryPanelProps) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<StudioDraftVersionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadVersions = useCallback(async () => {
    if (!draftId) {
      setVersions([]);
      return;
    }

    const result = await listStudioDraftVersionsAction(draftId);

    if (result.error) {
      setError(result.error);
      setVersions([]);
      return;
    }

    setError(null);
    setVersions(result.versions);
  }, [draftId]);

  useEffect(() => {
    if (open && draftId) {
      void loadVersions();
    }
  }, [draftId, loadVersions, open]);

  function handleRestore(version: StudioDraftVersionRecord) {
    if (!draftId) {
      return;
    }

    const confirmed = window.confirm(
      "Khôi phục phiên bản này? Nội dung hiện tại sẽ được thay bằng phiên bản đã chọn."
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await restoreStudioDraftVersionAction(draftId, version.id);

      if (!result.ok) {
        setError(result.error ?? "Không thể khôi phục phiên bản.");
        return;
      }

      setError(null);
      onRestored(version);
      setOpen(false);
      await loadVersions();
    });
  }

  const preview = versions.find((version) => version.id === previewId);

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-white">Lịch sử phiên bản</p>
        <Button
          disabled={!draftId}
          onClick={() => setOpen((value) => !value)}
          type="button"
          variant="secondary"
        >
          {open ? "Đóng" : "Mở"}
        </Button>
      </div>

      {!draftId ? (
        <p className="text-sm text-zinc-500">
          Autosave sẽ tạo nháp — sau đó bạn có thể xem lịch sử phiên bản tại đây.
        </p>
      ) : null}

      {open && draftId ? (
        <div className="space-y-3">
          {error ? (
            <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-100">
              {error}
            </p>
          ) : null}

          {versions.length === 0 ? (
            <p className="text-sm text-zinc-500">Chưa có phiên bản nào được lưu.</p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {versions.map((version) => (
                <li
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                  key={version.id}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        v{version.versionNumber}
                        {version.title ? ` · ${version.title}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {formatWhen(version.createdAt)} ·{" "}
                        {new Intl.NumberFormat("vi-VN").format(version.wordCount)}{" "}
                        từ
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        className="rounded-lg border border-white/10 px-2 py-1 text-xs font-semibold text-zinc-200 hover:bg-white/5"
                        onClick={() =>
                          setPreviewId((current) =>
                            current === version.id ? null : version.id
                          )
                        }
                        type="button"
                      >
                        Xem
                      </button>
                      <button
                        className="rounded-lg bg-sky-300 px-2 py-1 text-xs font-semibold text-zinc-950 hover:bg-cyan-200 disabled:opacity-50"
                        disabled={isPending}
                        onClick={() => handleRestore(version)}
                        type="button"
                      >
                        Khôi phục
                      </button>
                    </div>
                  </div>
                  {previewId === version.id ? (
                    <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-xs leading-5 text-zinc-400">
                      {version.plainText?.trim() ||
                        JSON.stringify(version.content).slice(0, 400)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </Card>
  );
}
