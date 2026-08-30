"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { StudioAudioPageData } from "@/lib/studio/get-studio-audio-page";
import type { AudioItemRow } from "@/src/lib/audio/audio-items";
import type { StoryAudioQueueItem } from "@/src/lib/audio/audio-queue";
import { studioPath } from "@/lib/studio/constants";
import { AudioRightsDeclaration } from "@/components/studio/audio/AudioRightsDeclaration";
import { AudioSourceTypePicker, type StudioAudioSourceType } from "@/components/studio/audio/AudioSourceTypePicker";
import { ExternalAudioForm } from "@/components/studio/audio/ExternalAudioForm";
import { YoutubeAudioForm } from "@/components/studio/audio/YoutubeAudioForm";
import { StudioAudioList } from "@/components/studio/audio/StudioAudioList";
import { MediaSourcePolicyNote } from "@/components/media/MediaSourcePolicyNote";
import {
  checkAudioLinkAction,
  createAudioItemAction,
  updateAudioItemAction
} from "@/app/actions/audio-items";
import { parseYoutubeVideoId } from "@/src/lib/audio/audio-url";

type StudioAudioWorkspaceProps = {
  data: StudioAudioPageData;
  queue: StoryAudioQueueItem[];
};

export function StudioAudioWorkspace({ data, queue }: StudioAudioWorkspaceProps) {
  const { story, items, summary, capabilities, adsDisabledReason } = data;
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<AudioItemRow | null>(null);
  const [sourceType, setSourceType] = useState<StudioAudioSourceType>("external_audio_url");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [language, setLanguage] = useState("vi");
  const [externalUrl, setExternalUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const [linkOk, setLinkOk] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();

  const externalEnabled = capabilities.canUseExternalAudio;
  const youtubeEnabled = capabilities.canUseYoutubeEmbed;
  const parsedYoutubeId = useMemo(
    () => (youtubeUrl ? parseYoutubeVideoId(youtubeUrl) : null),
    [youtubeUrl]
  );

  const resetForm = () => {
    setEditingItem(null);
    setTitle("");
    setDescription("");
    setPartNumber("");
    setSortOrder("0");
    setLanguage("vi");
    setExternalUrl("");
    setYoutubeUrl("");
    setFormError(null);
    setLinkMessage(null);
    setLinkOk(null);
    setSourceType(externalEnabled ? "external_audio_url" : "youtube_embed");
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (item: AudioItemRow) => {
    setEditingItem(item);
    setShowForm(true);
    setSourceType(item.audio_source_type);
    setTitle(item.title);
    setDescription(item.description ?? "");
    setPartNumber(item.part_number != null ? String(item.part_number) : "");
    setSortOrder(String(item.sort_order ?? 0));
    setLanguage(item.language ?? "vi");
    setExternalUrl(item.external_audio_url ?? item.normalized_external_audio_url ?? "");
    setYoutubeUrl(item.youtube_url ?? "");
  };

  const validateLink = () => {
    const fd = new FormData();
    fd.set(
      "audio_source_type",
      sourceType === "external_audio_url" ? "external_audio_url" : "youtube_embed"
    );
    fd.set("url", sourceType === "external_audio_url" ? externalUrl : youtubeUrl);
    startTransition(async () => {
      const result = await checkAudioLinkAction(fd);
      if (!result.ok) {
        setLinkOk(false);
        setLinkMessage(result.error);
        return;
      }
      const payload = result.data as { ok?: boolean; reasonCode?: string | null };
      setLinkOk(Boolean(payload?.ok));
      setLinkMessage(result.message ?? (payload?.ok ? "Hợp lệ" : payload?.reasonCode ?? "Không hợp lệ"));
    });
  };

  const submitForm = (statusIntent: "draft" | "review" | "publish") => {
    const fd = new FormData();
    fd.set("story_id", story.id);
    fd.set("audio_source_type", sourceType);
    fd.set("title", title);
    fd.set("description", description);
    fd.set("part_number", partNumber);
    fd.set("sort_order", sortOrder);
    fd.set("language", language);
    fd.set("rights_declaration", "1");
    fd.set("status_intent", statusIntent);
    if (sourceType === "external_audio_url") {
      fd.set("external_audio_url", externalUrl);
    } else {
      fd.set("youtube_url", youtubeUrl);
      if (parsedYoutubeId) fd.set("youtube_video_id", parsedYoutubeId);
    }

    startTransition(async () => {
      if (editingItem) {
        fd.set("audio_id", editingItem.id);
      }
      const result = editingItem
        ? await updateAudioItemAction(fd)
        : await createAudioItemAction(fd);

      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setFormError(null);
      setShowForm(false);
      resetForm();
    });
  };

  if (data.error) {
    return (
      <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
        {data.error}
      </p>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <header className="space-y-4">
        <nav className="text-sm text-zinc-500">
          <Link className="hover:text-zinc-300" href={studioPath("/audio")}>
            Audio
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-400">{story.title}</span>
        </nav>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white sm:text-3xl">Audio</h1>
            <p className="max-w-3xl text-sm text-zinc-400">
              Audio là phần nghe đi kèm truyện text. Giai đoạn này ChapMee chỉ lưu link ngoài/YouTube,
              không lưu file audio. Audio liên kết ở cấp truyện, bạn không cần gắn audio theo từng
              chương.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            disabled={!capabilities.canCreateAudio}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Thêm audio
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-300">
          <ul className="list-disc space-y-1 pl-5">
            <li>Audio miễn phí 100%.</li>
            <li>Không bán audio / coin unlock.</li>
            <li>
              External audio có thể nghe nền và nghe liên tục nếu trình duyệt hỗ trợ (Global Audio
              Player).
            </li>
            <li>YouTube chỉ phát bằng iframe chính thức, không nghe nền bằng ChapMee.</li>
            <li>Không cần chọn chương.</li>
          </ul>
          {adsDisabledReason ? (
            <p className="mt-3 text-xs text-amber-200">{adsDisabledReason}</p>
          ) : null}
          <p className="mt-3 text-xs text-zinc-500">
            Tổng {summary.total} audio · {summary.published} published · {summary.external} external
            · {summary.youtube} YouTube
          </p>
        </div>
      </header>

      {showForm ? (
        <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">
              {editingItem ? "Sửa audio" : "Thêm audio"}
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="text-sm text-zinc-400 hover:text-zinc-200"
            >
              Đóng
            </button>
          </div>

          <div className="space-y-4">
            <AudioSourceTypePicker
              value={sourceType}
              onChange={setSourceType}
              externalEnabled={externalEnabled}
              youtubeEnabled={youtubeEnabled}
              externalDisabledReason={
                externalEnabled ? null : "Admin đã tắt external audio trên hệ thống."
              }
              youtubeDisabledReason={
                youtubeEnabled ? null : "Admin đã tắt YouTube embed trên hệ thống."
              }
            />

            <label className="block text-sm font-medium text-zinc-200">
              Tiêu đề
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
                required
              />
            </label>

            <label className="block text-sm font-medium text-zinc-200">
              Mô tả (tuỳ chọn)
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm font-medium text-zinc-200">
                Part number
                <input
                  type="number"
                  min={1}
                  value={partNumber}
                  onChange={(event) => setPartNumber(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block text-sm font-medium text-zinc-200">
                Sort order
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block text-sm font-medium text-zinc-200">
                Ngôn ngữ
                <input
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
                />
              </label>
            </div>

            {sourceType === "external_audio_url" ? (
              <ExternalAudioForm
                url={externalUrl}
                onUrlChange={setExternalUrl}
                onValidate={validateLink}
                validationMessage={linkMessage}
                validationOk={linkOk}
              />
            ) : (
              <>
                <YoutubeAudioForm
                  url={youtubeUrl}
                  videoId={parsedYoutubeId}
                  onUrlChange={setYoutubeUrl}
                  onValidate={validateLink}
                  validationMessage={linkMessage}
                  validationOk={linkOk}
                />
                <MediaSourcePolicyNote audience="creator" tab="audio" />
              </>
            )}

            <AudioRightsDeclaration />

            {formError ? <p className="text-sm text-rose-300">{formError}</p> : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => submitForm("draft")}
                className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-white"
              >
                Lưu nháp
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => submitForm("review")}
                className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Gửi duyệt
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => submitForm("publish")}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Xuất bản
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <StudioAudioList
        storyId={story.id}
        items={items}
        queue={queue}
        onEdit={openEditForm}
      />
    </div>
  );
}
