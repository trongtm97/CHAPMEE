"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ReelsPreview } from "@/components/studio/reels/ReelsPreview";
import { Input, Textarea, Button } from "@/components/ui";
import {
  createReelsItemQuickAction,
  loadChaptersForReelsStoryAction
} from "@/lib/reels/reels-actions";
import { studioPath } from "@/lib/studio/constants";
import { REELS_CTA_PRESETS } from "@/types/reels";
import {
  STORY_REELS_LONG_DESC_AUTHOR_NOTE,
  suggestStoryReelsDraft
} from "@/lib/reels/resolve-story-reels-text";
import {
  reelsBtnSecondary
} from "@/components/studio/reels/management/shared/styles";

type StoryOption = {
  id: string;
  title: string;
  slug: string;
  hook?: string | null;
  long_description?: string | null;
};

type ChapterOption = {
  id: string;
  title: string;
  episode_number: number;
};

type StudioReelsCreateDrawerProps = {
  authorName: string;
  onClose: () => void;
  open: boolean;
  stories: StoryOption[];
};

export function StudioReelsCreateDrawer({
  authorName,
  onClose,
  open,
  stories
}: StudioReelsCreateDrawerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [storyId, setStoryId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [contentSource, setContentSource] = useState<"story" | "chapter">("story");
  const [hook, setHook] = useState("");
  const [body, setBody] = useState("");
  const [cta, setCta] = useState("Xem truyện ngay");
  const [chapters, setChapters] = useState<ChapterOption[]>([]);

  const selectedStory = stories.find((story) => story.id === storyId);
  const selectedChapter = chapters.find((chapter) => chapter.id === chapterId);

  useEffect(() => {
    if (contentSource === "story" && chapterId) {
      setChapterId("");
    }
  }, [chapterId, contentSource]);

  useEffect(() => {
    if (!storyId) {
      setChapters([]);
      setChapterId("");
      return;
    }

    let cancelled = false;

    loadChaptersForReelsStoryAction(storyId).then((result) => {
      if (cancelled) {
        return;
      }

      setChapters(
        (result.chapters ?? []).map((chapter) => ({
          episode_number: chapter.episode_number as number,
          id: chapter.id as string,
          title: chapter.title as string
        }))
      );
    });

    return () => {
      cancelled = true;
    };
  }, [storyId]);

  useEffect(() => {
    if (contentSource !== "story" || !selectedStory) {
      return;
    }

    const draft = suggestStoryReelsDraft({
      title: selectedStory.title,
      hook: selectedStory.hook,
      longDescription: selectedStory.long_description
    });

    if (!draft) {
      return;
    }

    setHook((current) => current || draft.hook);
    setBody((current) => current || draft.body);
  }, [contentSource, selectedStory?.id]);

  if (!open) {
    return null;
  }

  function submit(intent: "draft" | "full") {
    setError(null);

    const formData = new FormData();
    formData.set("story_id", storyId);
    formData.set("chapter_id", contentSource === "chapter" ? chapterId : "");
    formData.set("hook", hook);
    formData.set("body", body);
    formData.set("cta", cta);
    formData.set("cta_type", contentSource === "chapter" ? "read_chapter" : "view_story");
    formData.set("source_type", contentSource === "chapter" ? "manual_selection" : "story_description");

    if (intent === "full") {
      onClose();
      router.push(studioPath("/reels/new"));
      return;
    }

    startTransition(async () => {
      const result = await createReelsItemQuickAction(formData);

      if (!result.ok || !result.id) {
        setError(result.error ?? "Không tạo được Reels.");
        return;
      }

      onClose();
      router.push(studioPath(`/reels/${result.id}/edit`));
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <button aria-label="Đóng" className="absolute inset-0" onClick={onClose} type="button" />
      <div className="relative flex h-full w-full max-w-4xl flex-col overflow-hidden border-l border-white/10 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-base font-bold text-white">Tạo Reels mới</h2>
            <p className="text-xs text-zinc-500">Lưu nháp nhanh hoặc mở editor đầy đủ.</p>
          </div>
          <button className={reelsBtnSecondary} onClick={onClose} type="button">
            Đóng
          </button>
        </div>

        <div className="grid flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-2 lg:p-5">
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                  contentSource === "story"
                    ? "border-cyan-300/40 bg-cyan-300/10 text-white"
                    : "border-white/10 bg-zinc-900 text-zinc-300"
                }`}
                onClick={() => {
                  setContentSource("story");
                  setCta("Xem truyện ngay");
                }}
                type="button"
              >
                <p className="font-semibold">Nguồn từ truyện</p>
                <p className="mt-1 text-xs text-zinc-400">
                  Không cần chọn chương. Mô tả dài đủ nội dung sẽ tự lên feed Reels.
                </p>
              </button>
              <button
                className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                  contentSource === "chapter"
                    ? "border-cyan-300/40 bg-cyan-300/10 text-white"
                    : "border-white/10 bg-zinc-900 text-zinc-300"
                }`}
                onClick={() => {
                  setContentSource("chapter");
                  setCta(REELS_CTA_PRESETS[0]?.label ?? "Đọc tiếp chương này");
                }}
                type="button"
              >
                <p className="font-semibold">Nguồn từ chương</p>
                <p className="mt-1 text-xs text-zinc-400">Dẫn thẳng vào chương đã chọn.</p>
              </button>
            </div>

            <label className="block space-y-1 text-sm">
              <span className="text-xs font-semibold text-zinc-400">Truyện *</span>
              <select
                className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-100"
                onChange={(event) => setStoryId(event.target.value)}
                value={storyId}
              >
                <option value="">Chọn truyện</option>
                {stories.map((story) => (
                  <option key={story.id} value={story.id}>
                    {story.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1 text-sm">
              <span className="text-xs font-semibold text-zinc-400">
                {contentSource === "chapter" ? "Chương *" : "Chương"}
              </span>
              <select
                className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-100"
                disabled={!storyId || contentSource !== "chapter"}
                onChange={(event) => setChapterId(event.target.value)}
                value={chapterId}
              >
                <option value="">
                  {contentSource === "chapter" ? "Chọn chương" : "Không chọn / chọn sau"}
                </option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    Ch.{chapter.episode_number} - {chapter.title}
                  </option>
                ))}
              </select>
            </label>

            <Input label="Hook *" onChange={(event) => setHook(event.target.value)} value={hook} />
            <Textarea
              label="Nội dung trích dẫn *"
              onChange={(event) => setBody(event.target.value)}
              rows={6}
              value={body}
            />

            <label className="block space-y-1 text-sm">
              <span className="text-xs font-semibold text-zinc-400">CTA</span>
              <input
                className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-100"
                onChange={(event) => setCta(event.target.value)}
                value={cta}
              />
            </label>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            <div className="flex flex-wrap gap-2">
              <Button disabled={pending} onClick={() => submit("draft")} type="button">
                Lưu nháp
              </Button>
              <button
                className={reelsBtnSecondary}
                disabled={pending}
                onClick={() => submit("full")}
                type="button"
              >
                Editor đầy đủ
              </button>
            </div>
          </div>

          <div className="min-h-[20rem]">
            <ReelsPreview
              backgroundImageUrl={null}
              body={body}
              contentSource={contentSource}
              creatorName={authorName}
              cta={cta}
              episodeNumber={contentSource === "chapter" ? selectedChapter?.episode_number ?? null : null}
              episodeTitle={contentSource === "chapter" ? selectedChapter?.title ?? "" : ""}
              hook={hook}
              storySlug={selectedStory?.slug ?? ""}
              storyTitle={selectedStory?.title ?? "Chọn truyện"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
