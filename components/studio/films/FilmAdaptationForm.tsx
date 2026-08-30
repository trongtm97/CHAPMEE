"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { FilmAdaptationRow } from "@/src/lib/film-adaptations/film-adaptations";
import type { FilmAdaptationPolicyResult } from "@/src/lib/film-adaptations/film-policy";
import { getFilmRelationLabel } from "@/src/lib/film-adaptations/film-labels";
import {
  buildYoutubePlaylistEmbedUrl,
  buildYoutubeVideoEmbedUrl,
  parseYoutubeEmbedInput
} from "@/src/lib/film-adaptations/youtube";
import {
  createFilmAdaptationAction,
  updateFilmAdaptationAction,
  validateFilmYoutubeUrlAction
} from "@/app/actions/film-adaptations";
import { FilmRelationTypeSelect } from "@/components/studio/films/FilmRelationTypeSelect";
import { FilmRightsDeclaration } from "@/components/studio/films/FilmRightsDeclaration";
import { MediaSourcePolicyNote } from "@/components/media/MediaSourcePolicyNote";

type FilmAdaptationFormProps = {
  storyId: string;
  storyTitle: string;
  storyHref: string;
  capabilities: FilmAdaptationPolicyResult;
  creativeDisclaimerText: string;
  editingItem: FilmAdaptationRow | null;
  onCancel: () => void;
  onSaved: () => void;
};

export function FilmAdaptationForm({
  storyId,
  storyTitle,
  storyHref,
  capabilities,
  creativeDisclaimerText,
  editingItem,
  onCancel,
  onSaved
}: FilmAdaptationFormProps) {
  const [youtubeUrl, setYoutubeUrl] = useState(editingItem?.youtube_url ?? "");
  const [embedType, setEmbedType] = useState<"video" | "playlist">(
    editingItem?.youtube_embed_type ?? "video"
  );
  const [title, setTitle] = useState(editingItem?.title ?? "");
  const [description, setDescription] = useState(editingItem?.description ?? "");
  const [creativeNote, setCreativeNote] = useState(editingItem?.creative_note ?? "");
  const [relationType, setRelationType] = useState<string>(
    editingItem?.relation_type ?? "based_on_story"
  );
  const [language, setLanguage] = useState(editingItem?.language ?? "vi");
  const [sortOrder, setSortOrder] = useState(String(editingItem?.sort_order ?? 0));
  const [formError, setFormError] = useState<string | null>(null);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const [linkOk, setLinkOk] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();

  const parsed = useMemo(
    () => parseYoutubeEmbedInput(youtubeUrl),
    [youtubeUrl]
  );

  const previewEmbedSrc = useMemo(() => {
    if (embedType === "playlist") {
      const id = parsed.playlistId;
      return id ? buildYoutubePlaylistEmbedUrl(id) : null;
    }
    const id = parsed.videoId;
    return id ? buildYoutubeVideoEmbedUrl(id) : null;
  }, [embedType, parsed.playlistId, parsed.videoId]);

  const validateLink = () => {
    const fd = new FormData();
    fd.set("youtube_url", youtubeUrl);
    fd.set("youtube_embed_type", embedType);
    startTransition(async () => {
      const result = await validateFilmYoutubeUrlAction(fd);
      if (!result.ok) {
        setLinkOk(false);
        setLinkMessage(result.error);
        return;
      }
      const payload = result.data as { ok?: boolean };
      setLinkOk(Boolean(payload?.ok));
      setLinkMessage(result.message ?? (payload?.ok ? "Hợp lệ" : "Không hợp lệ"));
    });
  };

  const submit = (statusIntent: "draft" | "review" | "publish") => {
    if (!capabilities.canUseYoutubeVideo && embedType === "video") {
      setFormError("Video YouTube đang tắt trong cài đặt.");
      return;
    }
    if (!capabilities.canUseYoutubePlaylist && embedType === "playlist") {
      setFormError("Playlist YouTube đang tắt trong cài đặt.");
      return;
    }

    const fd = new FormData();
    fd.set("story_id", storyId);
    fd.set("youtube_url", youtubeUrl);
    fd.set("youtube_embed_type", embedType);
    fd.set("title", title);
    fd.set("description", description);
    fd.set("creative_note", creativeNote);
    fd.set("relation_type", relationType);
    fd.set("language", language);
    fd.set("sort_order", sortOrder);
    fd.set("rights_declaration", "1");
    fd.set("status_intent", statusIntent);
    if (editingItem) {
      fd.set("film_id", editingItem.id);
    }

    startTransition(async () => {
      const result = editingItem
        ? await updateFilmAdaptationAction(fd)
        : await createFilmAdaptationAction(fd);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setFormError(null);
      onSaved();
    });
  };

  return (
    <div className="space-y-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">
          {editingItem ? "Sửa phim chuyển thể" : "Thêm phim chuyển thể"}
        </h2>
        <p className="text-sm text-zinc-400">
          Liên kết truyện:{" "}
          <Link className="text-cyan-200 underline" href={storyHref}>
            {storyTitle}
          </Link>
        </p>
      </div>

      <label className="block space-y-2 text-sm">
        <span className="font-medium text-zinc-200">URL YouTube</span>
        <input
          type="url"
          name="youtube_url"
          value={youtubeUrl}
          onChange={(event) => {
            setYoutubeUrl(event.target.value);
            setLinkOk(null);
            setLinkMessage(null);
          }}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white"
          required
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-zinc-200">Loại nhúng</legend>
        <div className="flex flex-wrap gap-2">
          <label
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              embedType === "video"
                ? "bg-cyan-400 text-zinc-950"
                : "border border-white/10 text-zinc-300"
            } ${!capabilities.canUseYoutubeVideo ? "opacity-40" : ""}`}
          >
            <input
              type="radio"
              name="youtube_embed_type"
              value="video"
              checked={embedType === "video"}
              disabled={!capabilities.canUseYoutubeVideo}
              onChange={() => setEmbedType("video")}
              className="sr-only"
            />
            Video
          </label>
          <label
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              embedType === "playlist"
                ? "bg-cyan-400 text-zinc-950"
                : "border border-white/10 text-zinc-300"
            } ${!capabilities.canUseYoutubePlaylist ? "opacity-40" : ""}`}
          >
            <input
              type="radio"
              name="youtube_embed_type"
              value="playlist"
              checked={embedType === "playlist"}
              disabled={!capabilities.canUseYoutubePlaylist}
              onChange={() => setEmbedType("playlist")}
              className="sr-only"
            />
            Playlist
          </label>
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={validateLink}
          disabled={isPending}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-200"
        >
          Kiểm tra URL
        </button>
        {linkMessage ? (
          <span className={`text-xs ${linkOk ? "text-emerald-300" : "text-rose-300"}`}>
            {linkMessage}
          </span>
        ) : null}
      </div>

      <label className="block space-y-2 text-sm">
        <span className="font-medium text-zinc-200">Tiêu đề phim/video</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white"
          required
        />
      </label>

      <label className="block space-y-2 text-sm">
        <span className="font-medium text-zinc-200">Mô tả (tuỳ chọn)</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white"
        />
      </label>
      <MediaSourcePolicyNote audience="creator" tab="video" />

      <label className="block space-y-2 text-sm">
        <span className="font-medium text-zinc-200">Ghi chú sáng tạo (tuỳ chọn)</span>
        <textarea
          value={creativeNote}
          onChange={(event) => setCreativeNote(event.target.value)}
          rows={2}
          className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white"
        />
      </label>

      <FilmRelationTypeSelect value={relationType} onChange={setRelationType} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-2 text-sm">
          <span className="font-medium text-zinc-200">Ngôn ngữ</span>
          <input
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white"
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="font-medium text-zinc-200">Thứ tự hiển thị</span>
          <input
            type="number"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white"
          />
        </label>
      </div>

      <FilmRightsDeclaration />

      <div className="space-y-3 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">
          Ghi chú sáng tạo
        </p>
        <p className="text-sm text-amber-100/90">{creativeDisclaimerText}</p>
        <p className="text-xs text-zinc-400">
          Badge: {getFilmRelationLabel(relationType)} · YouTube · Không phát nền / không tách audio
        </p>
      </div>

      {previewEmbedSrc ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-200">Xem trước iframe YouTube</p>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
            <iframe
              src={previewEmbedSrc}
              title={title || "YouTube preview"}
              className="aspect-video w-full"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      ) : null}

      {formError ? <p className="text-sm text-rose-300">{formError}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => submit("draft")}
          className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-100"
        >
          Lưu nháp
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => submit("review")}
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-white"
        >
          Gửi duyệt
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => submit("publish")}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Xuất bản
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm text-zinc-400"
        >
          Huỷ
        </button>
      </div>
    </div>
  );
}
