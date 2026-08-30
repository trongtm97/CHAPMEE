"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loadChaptersForReelsStoryAction } from "@/lib/reels/reels-actions";
import {
  ReelsBackgroundPicker,
  type BackgroundOption
} from "@/components/studio/reels/ReelsBackgroundPicker";
import { resolvePublicMediaUrlClient } from "@/lib/media/public-media-client";
import { ReelsPreview } from "@/components/studio/reels/ReelsPreview";
import { ReelsSuggestionTools } from "@/components/studio/reels/ReelsSuggestionTools";
import { Button, Input, Textarea } from "@/components/ui";
import { PublishConfirmDialog } from "@/components/studio/PublishConfirmDialog";
import {
  publishChecklistHasBlockingErrors,
  publishChecklistHasWarnings
} from "@/components/studio/PublishChecklist";
import { ReelsPublishChecklistPanel } from "@/components/studio/reels/ReelsPublishChecklistPanel";
import { validateReelsBeforePublish } from "@/lib/publish/validate-reels-before-publish";
import { autoTrimReelsBody } from "@/lib/reels/validate-reels-item";
import {
  STORY_REELS_LONG_DESC_AUTHOR_NOTE,
  suggestStoryReelsDraft
} from "@/lib/reels/resolve-story-reels-text";
import { studioPath } from "@/lib/studio/constants";
import {
  REELS_BODY_MAX,
  REELS_CTA_MAX,
  REELS_CTA_PRESETS,
  REELS_HOOK_MAX,
  type ReelsItemListItem,
  type ReelsSuggestionResult
} from "@/types/reels";

type StoryOption = {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  hook: string | null;
  short_description: string | null;
  long_description?: string | null;
};

type ChapterOption = {
  id: string;
  title: string;
  episode_number: number;
  content: string | null;
  background_image_url: string | null;
};

export type ReelsEditorProps = {
  action: (formData: FormData) => Promise<{ error?: string; ok?: boolean } | void>;
  authorName: string;
  chapters?: ChapterOption[];
  initial?: ReelsItemListItem | null;
  mode: "create" | "edit";
  stories: StoryOption[];
  reelId?: string;
};

export function ReelsEditor({
  action,
  authorName,
  chapters: initialChapters = [],
  initial,
  mode,
  stories,
  reelId
}: ReelsEditorProps) {
  const itemId = reelId;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [storyId, setStoryId] = useState(initial?.storyId ?? "");
  const [chapterId, setChapterId] = useState(initial?.chapterId ?? "");
  const [contentSource, setContentSource] = useState<"story" | "chapter">(
    initial?.chapterId ? "chapter" : "story"
  );
  const [hook, setHook] = useState(initial?.hook ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [cta, setCta] = useState(initial?.cta ?? "");
  const [ctaType, setCtaType] = useState(initial?.ctaType ?? "read_chapter");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(
    initial?.backgroundImageUrl ?? null
  );
  const [sourceType, setSourceType] = useState(initial?.sourceType ?? "manual");
  const [sourceTextStart, setSourceTextStart] = useState<number | null>(
    initial?.sourceTextStart ?? null
  );
  const [sourceTextEnd, setSourceTextEnd] = useState<number | null>(
    initial?.sourceTextEnd ?? null
  );
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<"publish" | "schedule" | null>(
    null
  );
  const [chapters, setChapters] = useState<ChapterOption[]>(initialChapters);

  useEffect(() => {
    if (!storyId) {
      setChapters([]);
      return;
    }

    let cancelled = false;

    void loadChaptersForReelsStoryAction(storyId).then((result) => {
      if (!cancelled) {
        setChapters((result.chapters ?? []) as ChapterOption[]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [storyId]);

  const selectedStory = stories.find((story) => story.id === storyId) ?? null;

  useEffect(() => {
    if (mode !== "create" || contentSource !== "story" || !selectedStory) {
      return;
    }

    const draft = suggestStoryReelsDraft({
      title: selectedStory.title,
      hook: selectedStory.hook,
      shortDescription: selectedStory.short_description,
      longDescription: selectedStory.long_description
    });

    if (!draft) {
      return;
    }

    setHook((current) => current || draft.hook);
    setBody((current) => current || draft.body);
    setSourceType("story_description");
  }, [contentSource, mode, selectedStory?.id]);

  const selectedChapter = chapters.find((chapter) => chapter.id === chapterId) ?? null;

  useEffect(() => {
    if (contentSource === "story" && chapterId) {
      setChapterId("");
    }
  }, [chapterId, contentSource]);

  const backgroundOptions = useMemo((): BackgroundOption[] => {
    const options: BackgroundOption[] = [
      { id: "gradient", label: "Nền gradient mặc định", storageValue: null }
    ];

    if (selectedStory?.cover_url) {
      options.push({
        id: "story_cover",
        label: "Ảnh bìa truyện",
        storageValue: selectedStory.cover_url
      });
    }

    if (selectedChapter?.background_image_url) {
      options.push({
        id: "chapter_bg",
        label: "Ảnh nền chương",
        storageValue: selectedChapter.background_image_url
      });
    }

    return options;
  }, [selectedChapter?.background_image_url, selectedStory?.cover_url]);

  const previewBackgroundUrl =
    resolvePublicMediaUrlClient(backgroundImageUrl) ?? backgroundImageUrl;

  function applySuggestion(result: ReelsSuggestionResult) {
    setHook(result.hook);
    setBody(result.body);
    setSourceType(result.sourceType);
    setSourceTextStart(result.sourceTextStart);
    setSourceTextEnd(result.sourceTextEnd);
  }

  function handleCtaPresetChange(presetId: string) {
    setCtaType(presetId);
    const preset = REELS_CTA_PRESETS.find((item) => item.id === presetId);

    if (preset && presetId !== "custom") {
      setCta(preset.label);
    }
  }

  function applySourceMode(nextSource: "story" | "chapter") {
    setContentSource(nextSource);

    if (nextSource === "story") {
      setChapterId("");
      if (ctaType === "read_chapter" || !cta.trim()) {
        handleCtaPresetChange("view_story");
      }
      return;
    }

    if (ctaType === "view_story" || !cta.trim()) {
      handleCtaPresetChange("read_chapter");
    }
  }

  const reelsChecklistInput = useMemo(
    () => ({
      backgroundImageUrl,
      body,
      chapterId: chapterId || undefined,
      cta,
      hook,
      storyId: storyId || undefined
    }),
    [backgroundImageUrl, body, chapterId, cta, hook, storyId]
  );

  const publishRules = useMemo(
    () => validateReelsBeforePublish(reelsChecklistInput).rules,
    [reelsChecklistInput]
  );

  const hasBlocking = publishChecklistHasBlockingErrors(publishRules);
  const hasWarnings = publishChecklistHasWarnings(publishRules);

  function runSubmit(intent: "draft" | "publish" | "schedule") {
    setError(null);

    const formData = new FormData();
    formData.set("intent", intent);
    formData.set("story_id", storyId);
    formData.set("chapter_id", contentSource === "chapter" ? chapterId : "");
    formData.set("hook", hook);
    formData.set("body", body);
    formData.set("cta", cta);
    formData.set("cta_type", ctaType);
    formData.set("title", title);
    formData.set("background_image_url", backgroundImageUrl ?? "");
    formData.set("source_type", sourceType);
    formData.set("source_text_start", String(sourceTextStart ?? ""));
    formData.set("source_text_end", String(sourceTextEnd ?? ""));

    if (intent === "schedule") {
      formData.set("schedule_date", scheduleDate);
      formData.set("schedule_time", scheduleTime);
    }

    if (itemId) {
      formData.set("reel_id", itemId);
    }

    startTransition(async () => {
      try {
        const result = await action(formData);

        if (result && "ok" in result && result.ok === false) {
          setError(result.error ?? "Không thể lưu Reels.");
          return;
        }

        setConfirmOpen(false);
        router.refresh();
      } catch (submitError) {
        if (
          submitError &&
          typeof submitError === "object" &&
          "digest" in submitError &&
          String((submitError as { digest?: string }).digest).includes("NEXT_REDIRECT")
        ) {
          return;
        }

        setError(
          submitError instanceof Error
            ? submitError.message
            : "Không lưu được Reels."
        );
      }
    });
  }

  function submit(intent: "draft" | "publish" | "schedule") {
    if (intent === "draft") {
      runSubmit(intent);
      return;
    }

    if (hasBlocking) {
      setError("Không thể đăng cho đến khi sửa các mục bắt buộc.");
      return;
    }

    if (hasWarnings) {
      setPendingIntent(intent);
      setConfirmOpen(true);
      return;
    }

    runSubmit(intent);
  }

  function handleConfirmPublish() {
    if (pendingIntent) {
      runSubmit(pendingIntent);
    }
  }

  const bodyTooLong = body.length > REELS_BODY_MAX;

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-lg font-semibold text-white">Liên kết truyện</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                contentSource === "story"
                  ? "border-cyan-300/40 bg-cyan-300/10 text-white"
                  : "border-white/10 bg-zinc-950 text-zinc-300"
              }`}
              onClick={() => applySourceMode("story")}
              type="button"
            >
              <p className="font-semibold">Nguồn từ truyện</p>
              <p className="mt-1 text-xs text-zinc-400">
                Chỉ cần chọn truyện, không bắt buộc chương. Truyện có mô tả dài cũng tự lên feed Reels.
              </p>
            </button>
            <button
              className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                contentSource === "chapter"
                  ? "border-cyan-300/40 bg-cyan-300/10 text-white"
                  : "border-white/10 bg-zinc-950 text-zinc-300"
              }`}
              onClick={() => applySourceMode("chapter")}
              type="button"
            >
              <p className="font-semibold">Nguồn từ chương</p>
              <p className="mt-1 text-xs text-zinc-400">Chọn truyện trước, rồi chọn chương liên kết.</p>
            </button>
          </div>

          {contentSource === "story" ? (
            <p className="text-xs leading-5 text-zinc-500">{STORY_REELS_LONG_DESC_AUTHOR_NOTE}</p>
          ) : null}

          <label className="block space-y-1 text-sm">
            <span className="text-zinc-400">Chọn truyện</span>
            <select
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-zinc-100"
              onChange={(event) => {
                setStoryId(event.target.value);
                setChapterId("");
              }}
              required={mode === "create"}
              value={storyId}
            >
              <option value="">— Chọn truyện —</option>
              {stories.map((story) => (
                <option key={story.id} value={story.id}>
                  {story.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-zinc-400">
              {contentSource === "chapter" ? "Chọn chương" : "Chọn chương (không bắt buộc)"}
            </span>
            <select
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-zinc-100"
              disabled={contentSource !== "chapter" || !storyId || chapters.length === 0}
              onChange={(event) => setChapterId(event.target.value)}
              value={chapterId}
            >
              <option value="">
                {contentSource === "chapter" ? "— Chọn chương —" : "— Mở trang truyện —"}
              </option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  Chương {chapter.episode_number}: {chapter.title}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-lg font-semibold text-white">Nội dung Reels</h2>

          <ReelsSuggestionTools
            chapterContent={contentSource === "chapter" ? selectedChapter?.content : undefined}
            chapterTitle={contentSource === "chapter" ? selectedChapter?.title : undefined}
            onApply={applySuggestion}
            storyDescription={
              selectedStory?.long_description?.trim() ||
              selectedStory?.short_description
            }
            storyTitle={selectedStory?.title}
          />

          <Input
            label="Hook"
            maxLength={REELS_HOOK_MAX}
            name="hook_preview"
            onChange={(event) => setHook(event.target.value)}
            placeholder="Câu mở đầu thu hút"
            required
            value={hook}
          />
          <p className="-mt-3 text-xs text-zinc-500">{hook.length}/{REELS_HOOK_MAX} ký tự</p>

          <Textarea
            label="Nội dung"
            name="body_preview"
            onChange={(event) => setBody(event.target.value)}
            placeholder="Đoạn trích ngắn cho Reels"
            required
            rows={8}
            value={body}
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span className={bodyTooLong ? "text-rose-300" : ""}>
              {body.length}/{REELS_BODY_MAX} ký tự (khuyến nghị 120–300)
            </span>
            {bodyTooLong ? (
              <Button
                onClick={() => setBody(autoTrimReelsBody(body))}
                type="button"
                variant="secondary"
              >
                Cắt tự động
              </Button>
            ) : null}
          </div>

          <label className="block space-y-1 text-sm">
            <span className="text-zinc-400">CTA</span>
            <select
              className="mb-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-zinc-100"
              onChange={(event) => handleCtaPresetChange(event.target.value)}
              value={ctaType}
            >
              {REELS_CTA_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
            <Input
              maxLength={REELS_CTA_MAX}
              onChange={(event) => setCta(event.target.value)}
              placeholder="Lời kêu gọi hành động"
              value={cta}
            />
          </label>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <ReelsBackgroundPicker
            onChange={(url) => setBackgroundImageUrl(url)}
            options={backgroundOptions}
            value={backgroundImageUrl}
          />
        </section>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-lg font-semibold text-white">Xuất bản</h2>
          <ReelsPublishChecklistPanel input={reelsChecklistInput} reelId={itemId} />
          {hasBlocking ? (
            <p className="text-xs text-rose-300">
              Không thể đăng cho đến khi sửa các mục bắt buộc.
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="text-zinc-400">Ngày lên lịch</span>
              <input
                className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-zinc-100"
                onChange={(event) => setScheduleDate(event.target.value)}
                type="date"
                value={scheduleDate}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-zinc-400">Giờ</span>
              <input
                className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-zinc-100"
                onChange={(event) => setScheduleTime(event.target.value)}
                type="time"
                value={scheduleTime}
              />
            </label>
          </div>
        </section>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <Button disabled={pending} onClick={() => submit("draft")} type="button" variant="secondary">
            Lưu nháp
          </Button>
          <Button
            disabled={pending || bodyTooLong || hasBlocking}
            onClick={() => submit("publish")}
            type="button"
          >
            Đăng ngay
          </Button>
          <Button
            disabled={pending || !scheduleDate || !scheduleTime || hasBlocking}
            onClick={() => submit("schedule")}
            type="button"
            variant="secondary"
          >
            Lên lịch
          </Button>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-zinc-400 hover:text-zinc-200"
            href={studioPath("/reels")}
          >
            Huỷ
          </Link>
        </div>
      </form>

      <PublishConfirmDialog
        onCancel={() => {
          setConfirmOpen(false);
          setPendingIntent(null);
        }}
        onConfirm={handleConfirmPublish}
        open={confirmOpen}
        pending={pending}
      />

      <aside className="xl:sticky xl:top-6 xl:self-start">
        <ReelsPreview
          backgroundImageUrl={previewBackgroundUrl}
          body={body}
          contentSource={contentSource}
          creatorName={authorName}
          cta={cta}
          episodeNumber={contentSource === "chapter" ? selectedChapter?.episode_number ?? null : null}
          episodeTitle={contentSource === "chapter" ? selectedChapter?.title ?? "" : ""}
          genreName={null}
          hook={hook}
          storySlug={selectedStory?.slug ?? ""}
          storyTitle={selectedStory?.title ?? ""}
        />
      </aside>
    </div>
  );
}
