"use client";

import { useActionState } from "react";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { GuidelinesAcknowledgementField, useGuidelinesSubmitGuard } from "@/components/creator/GuidelinesSubmitAcknowledgement";
import { StoryContentClassification } from "@/components/creator/StoryContentClassification";
import { StoryCoverField } from "@/components/story/StoryCoverField";
import type { StoryFormActionState } from "@/lib/creator/createStory";
import type {
  CreatorStoryFormStory,
  StoryFormGenre,
  StoryFormTag
} from "@/lib/creator/getStoryFormData";
import type { SensitiveFlag, StoryAgeRating } from "@/types/moderation";
import type { StoryImage } from "@/types/story-images";

type StoryFormProps = {
  action: (
    previousState: StoryFormActionState,
    formData: FormData
  ) => Promise<StoryFormActionState>;
  genres: StoryFormGenre[];
  tags: StoryFormTag[];
  story?: CreatorStoryFormStory | null;
  currentImage?: StoryImage | null;
  returnBasePath?: string;
};

const initialState: StoryFormActionState = {
  error: null
};

export function StoryForm({
  action,
  currentImage = null,
  genres,
  returnBasePath = "/studio",
  story,
  tags
}: StoryFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const selectedTags = new Set(story?.tagIds ?? []);
  const canSaveDraft =
    !story || (story.status !== "approved" && story.status !== "published");

  const {
    acknowledged,
    ackError,
    guardSubmit,
    setAcknowledged,
    setPendingIntent
  } = useGuidelinesSubmitGuard();

  return (
    <Card>
      <form action={formAction} className="space-y-5" onSubmit={guardSubmit}>
        {story ? <input name="story_id" type="hidden" value={story.id} /> : null}
        <input
          name="return_base_path"
          type="hidden"
          value={returnBasePath}
        />

        <Input
          defaultValue={story?.title ?? ""}
          disabled={pending}
          label="Tiêu đề"
          name="title"
          placeholder="Tên truyện"
          required
        />
        <Input
          defaultValue={story?.slug ?? ""}
          disabled={pending}
          label="Slug"
          name="slug"
          placeholder="tu-khoa-url-safe"
        />
        <Textarea
          defaultValue={story?.hook ?? ""}
          disabled={pending}
          label="Hook"
          name="hook"
          placeholder="Một câu khiến độc giả muốn đọc ngay."
          required
          rows={3}
        />
        <Textarea
          defaultValue={story?.short_description ?? ""}
          disabled={pending}
          label="Mô tả ngắn"
          name="short_description"
          placeholder="Tóm tắt ngắn cho card truyện."
          rows={3}
        />
        <Textarea
          defaultValue={story?.long_description ?? ""}
          disabled={pending}
          label="Mô tả dài"
          name="long_description"
          placeholder="Giới thiệu thêm về bối cảnh, nhân vật hoặc lời hứa câu chuyện."
          rows={6}
        />
        <StoryCoverField
          coverUrl={story?.cover_url}
          currentImage={currentImage}
          disabled={pending}
          storyId={story?.id}
        />

        <div className="space-y-2">
          <label
            className="block text-sm font-medium text-zinc-200"
            htmlFor="genre_id"
          >
            Thể loại
          </label>
          <select
            className="min-h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            defaultValue={story?.genre_id ?? ""}
            disabled={pending}
            id="genre_id"
            name="genre_id"
            required
          >
            <option value="">Chọn thể loại</option>
            {genres.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-200">Tags</p>
          <div className="grid grid-cols-2 gap-2">
            {tags.map((tag) => (
              <label
                className="flex min-h-11 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                key={tag.id}
              >
                <input
                  className="size-4 accent-cyan-300"
                  defaultChecked={selectedTags.has(tag.id)}
                  disabled={pending}
                  name="tags"
                  type="checkbox"
                  value={tag.id}
                />
                <span>{tag.name}</span>
              </label>
            ))}
          </div>
        </div>

        <StoryContentClassification
          defaultAgeRating={(story?.age_rating ?? "all_ages") as StoryAgeRating}
          defaultSensitiveFlags={(story?.sensitive_flags ?? []) as SensitiveFlag[]}
          disabled={pending}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="block text-sm font-medium text-zinc-200">
              Hiển thị
            </span>
            <select
              className="min-h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              defaultValue={story?.visibility ?? "private"}
              disabled={pending}
              name="visibility"
            >
              <option value="private">Riêng tư</option>
              <option value="public">Công khai</option>
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 sm:self-end">
            <input
              className="size-4 accent-cyan-300"
              defaultChecked={story?.is_completed ?? false}
              disabled={pending}
              name="is_completed"
              type="checkbox"
            />
            <span>Đã hoàn thành</span>
          </label>
        </div>

        <GuidelinesAcknowledgementField
          acknowledged={acknowledged}
          disabled={pending}
          error={ackError}
          onAckChange={setAcknowledged}
          variant="story"
        />

        {state.error ? (
          <p className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">
            {state.error}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            disabled={!canSaveDraft}
            loading={pending}
            name="intent"
            onClick={() => setPendingIntent("draft")}
            type="submit"
            value="draft"
            variant="secondary"
          >
            Lưu nháp
          </Button>
          <Button
            loading={pending}
            name="intent"
            onClick={() => setPendingIntent("review")}
            type="submit"
            value="review"
          >
            Gửi duyệt
          </Button>
        </div>

        {!canSaveDraft ? (
          <p className="text-sm leading-6 text-zinc-500">
            Truyện đã duyệt/xuất bản nên không thể lưu nháp lại ở MVP.
          </p>
        ) : null}
      </form>
    </Card>
  );
}
