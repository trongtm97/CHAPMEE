"use client";

import { useMemo, useState, useTransition } from "react";
import { ExternalAudioPlayer } from "@/src/components/audio/ExternalAudioPlayer";
import type { StoryAudioQueueItem } from "@/src/lib/audio/audio-queue";
import type { AudioItemRow } from "@/src/lib/audio/audio-items";
import {
  deleteAudioItemAction,
  hideAudioItemAction,
  publishAudioItemAction,
  submitAudioItemForReviewAction
} from "@/app/actions/audio-items";
import { buildYoutubeEmbedUrl } from "@/src/lib/audio/audio-url";

export type StudioAudioFilter =
  | "all"
  | "draft"
  | "pending_review"
  | "published"
  | "hidden_broken"
  | "external"
  | "youtube";

type StudioAudioListProps = {
  storyId: string;
  items: AudioItemRow[];
  queue: StoryAudioQueueItem[];
  onEdit?: (item: AudioItemRow) => void;
};

function statusLabel(status: AudioItemRow["status"]) {
  const map: Record<AudioItemRow["status"], string> = {
    draft: "Draft",
    pending_review: "Pending review",
    published: "Published",
    hidden: "Hidden",
    broken: "Broken",
    rejected: "Rejected",
    copyright_disputed: "Copyright disputed"
  };
  return map[status] ?? status;
}

function sourceLabel(source: AudioItemRow["audio_source_type"]) {
  return source === "external_audio_url" ? "External" : "YouTube";
}

function matchesFilter(item: AudioItemRow, filter: StudioAudioFilter) {
  if (filter === "all") return true;
  if (filter === "draft") return item.status === "draft";
  if (filter === "pending_review") return item.status === "pending_review";
  if (filter === "published") return item.status === "published";
  if (filter === "hidden_broken") {
    return item.status === "hidden" || item.status === "broken";
  }
  if (filter === "external") return item.audio_source_type === "external_audio_url";
  if (filter === "youtube") return item.audio_source_type === "youtube_embed";
  return true;
}

export function StudioAudioList({ storyId, items, queue, onEdit }: StudioAudioListProps) {
  const [filter, setFilter] = useState<StudioAudioFilter>("all");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () => items.filter((item) => matchesFilter(item, filter)),
    [filter, items]
  );

  const previewItem = filtered.find((item) => item.id === previewId) ?? null;

  const runAction = (formData: FormData, successMessage: string) => {
    startTransition(async () => {
      const actionType = formData.get("_action");
      let result;
      if (actionType === "delete") {
        result = await deleteAudioItemAction(formData);
      } else if (actionType === "submit") {
        result = await submitAudioItemForReviewAction(formData);
      } else if (actionType === "publish") {
        result = await publishAudioItemAction(formData);
      } else if (actionType === "hide") {
        result = await hideAudioItemAction(formData);
      } else {
        result = { ok: false as const, error: "Hành động không hợp lệ." };
      }
      if (result.ok) {
        setMessage(successMessage);
      } else {
        setMessage(result.error);
      }
    });
  };

  const filterTabs: Array<{ id: StudioAudioFilter; label: string }> = [
    { id: "all", label: "Tất cả" },
    { id: "draft", label: "Draft" },
    { id: "pending_review", label: "Pending review" },
    { id: "published", label: "Published" },
    { id: "hidden_broken", label: "Hidden/Broken" },
    { id: "external", label: "External audio" },
    { id: "youtube", label: "YouTube" }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              filter === tab.id
                ? "bg-cyan-400 text-zinc-950"
                : "border border-white/10 bg-white/5 text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-300">
          {message}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-zinc-400">
          Chưa có audio phù hợp bộ lọc.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const queueItem = queue.find((q) => q.audioItemId === item.id);
            return (
              <article
                key={item.id}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-1">
                    <h3 className="text-base font-semibold text-white">
                      {item.part_number != null ? `Phần ${item.part_number}: ` : ""}
                      {item.title}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      {sourceLabel(item.audio_source_type)} · {statusLabel(item.status)} ·{" "}
                      {item.rights_status} · ads: {item.ads_policy}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Background: {item.background_playback_allowed ? "có" : "không"} · Continuous:{" "}
                      {item.continuous_playback_allowed ? "có" : "không"} · Check:{" "}
                      {item.last_check_status ?? "unknown"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {onEdit ? (
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-200"
                      >
                        Sửa
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setPreviewId(item.id)}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-200"
                    >
                      Preview
                    </button>
                    {item.status === "draft" ? (
                      <>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            const fd = new FormData();
                            fd.set("_action", "submit");
                            fd.set("audio_id", item.id);
                            runAction(fd, "Đã gửi duyệt.");
                          }}
                          className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-white"
                        >
                          Gửi duyệt
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            const fd = new FormData();
                            fd.set("_action", "delete");
                            fd.set("audio_id", item.id);
                            fd.set("story_id", storyId);
                            runAction(fd, "Đã xóa nháp.");
                          }}
                          className="rounded-lg border border-rose-400/40 px-3 py-1.5 text-xs text-rose-200"
                        >
                          Xóa nháp
                        </button>
                      </>
                    ) : null}
                    {item.status === "pending_review" || item.status === "draft" ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          const fd = new FormData();
                          fd.set("_action", "publish");
                          fd.set("audio_id", item.id);
                          runAction(fd, "Đã xuất bản.");
                        }}
                        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs text-white"
                      >
                        Xuất bản
                      </button>
                    ) : null}
                    {item.status === "published" ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          const fd = new FormData();
                          fd.set("_action", "hide");
                          fd.set("audio_id", item.id);
                          runAction(fd, "Đã ẩn audio.");
                        }}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-200"
                      >
                        Ẩn
                      </button>
                    ) : null}
                  </div>
                </div>

                {previewId === item.id ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-zinc-950/80 p-3">
                    {item.audio_source_type === "external_audio_url" && queueItem ? (
                      <ExternalAudioPlayer audioItem={queueItem} queue={queue} />
                    ) : null}
                    {item.audio_source_type === "youtube_embed" && item.youtube_video_id ? (
                      <iframe
                        src={buildYoutubeEmbedUrl(item.youtube_video_id) ?? undefined}
                        title={item.title}
                        className="aspect-video w-full rounded-lg"
                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
