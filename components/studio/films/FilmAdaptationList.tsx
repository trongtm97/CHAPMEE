"use client";

import { useState, useTransition } from "react";
import {
  buildYoutubePlaylistEmbedUrl,
  buildYoutubeVideoEmbedUrl
} from "@/src/lib/film-adaptations/youtube";
import type { FilmAdaptationRow } from "@/src/lib/film-adaptations/film-adaptations";
import {
  deleteFilmAdaptationAction,
  hideFilmAdaptationAction,
  publishFilmAdaptationAction,
  submitFilmAdaptationForReviewAction
} from "@/app/actions/film-adaptations";
import {
  getFilmRelationLabel,
  getFilmStatusLabel
} from "@/src/lib/film-adaptations/film-labels";

type FilmAdaptationListProps = {
  storyId: string;
  items: FilmAdaptationRow[];
  onEdit?: (item: FilmAdaptationRow) => void;
};

function embedTypeLabel(type: FilmAdaptationRow["youtube_embed_type"]) {
  return type === "playlist" ? "Playlist" : "Video";
}

export function FilmAdaptationList({ storyId, items, onEdit }: FilmAdaptationListProps) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const runAction = (formData: FormData, successMessage: string) => {
    startTransition(async () => {
      const actionType = formData.get("_action");
      let result;
      if (actionType === "delete") {
        result = await deleteFilmAdaptationAction(formData);
      } else if (actionType === "submit") {
        result = await submitFilmAdaptationForReviewAction(formData);
      } else if (actionType === "publish") {
        result = await publishFilmAdaptationAction(formData);
      } else if (actionType === "hide") {
        result = await hideFilmAdaptationAction(formData);
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

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-zinc-400">
        Chưa có phim chuyển thể nào cho truyện này.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-300">
          {message}
        </p>
      ) : null}

      <div className="space-y-3">
        {items.map((item) => {
          const embedSrc =
            item.youtube_embed_type === "playlist" && item.youtube_playlist_id
              ? buildYoutubePlaylistEmbedUrl(item.youtube_playlist_id)
              : item.youtube_video_id
                ? buildYoutubeVideoEmbedUrl(item.youtube_video_id)
                : null;

          return (
            <article
              key={item.id}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-1">
                  <h3 className="text-base font-semibold text-white">{item.title}</h3>
                  <p className="text-xs text-zinc-400">
                    {getFilmRelationLabel(item.relation_type)} · YouTube {embedTypeLabel(item.youtube_embed_type)} ·{" "}
                    {getFilmStatusLabel(item.status)} · {item.rights_status} · ads: {item.ads_policy}
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
                    onClick={() => setPreviewId(previewId === item.id ? null : item.id)}
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
                          fd.set("film_id", item.id);
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
                          fd.set("film_id", item.id);
                          fd.set("story_id", storyId);
                          runAction(fd, "Đã xóa nháp.");
                        }}
                        className="rounded-lg border border-rose-400/40 px-3 py-1.5 text-xs text-rose-200"
                      >
                        Xóa nháp
                      </button>
                    </>
                  ) : null}
                  {item.status === "draft" || item.status === "pending_review" ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        const fd = new FormData();
                        fd.set("_action", "publish");
                        fd.set("film_id", item.id);
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
                        fd.set("film_id", item.id);
                        runAction(fd, "Đã ẩn phim.");
                      }}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-200"
                    >
                      Ẩn
                    </button>
                  ) : null}
                </div>
              </div>

              {previewId === item.id && embedSrc ? (
                <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                  <iframe
                    src={embedSrc}
                    title={item.title}
                    className="aspect-video w-full"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
