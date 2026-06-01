"use client";

import { useActionState, useCallback, useState } from "react";
import Link from "next/link";
import { AutosaveStatusBar } from "@/components/editor/AutosaveStatus";
import { StudioLocalDraftRecovery } from "@/components/editor/StudioLocalDraftRecovery";
import { VersionHistoryPanel } from "@/components/editor/VersionHistoryPanel";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { useAutosave } from "@/hooks/useAutosave";
import { parseStoryDraftContent } from "@/lib/studio/draft-content";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import {
  GuidelinesAcknowledgementField,
  useGuidelinesSubmitGuard
} from "@/components/creator/GuidelinesSubmitAcknowledgement";
import { StoryContentClassification } from "@/components/creator/StoryContentClassification";
import { StoryCoverField } from "@/components/story/StoryCoverField";
import { StoryStructureBadge } from "@/components/studio/stories/StoryStructureSelector";
import { StoryFormSidePanel } from "@/components/studio/stories/StoryFormSidePanel";
import { isStandaloneStory } from "@/lib/stories/story-structure";
import { SchedulePicker } from "@/components/studio/SchedulePicker";
import { StoryPublishChecklistPanel } from "@/components/studio/stories/StoryPublishChecklistPanel";
import { StoryTaxonomyFields } from "@/components/studio/stories/StoryTaxonomyFields";
import { TaxonomyRequestPanel } from "@/components/studio/stories/TaxonomyRequestPanel";
import { SEOAssistantPanel } from "@/components/studio/SEOAssistantPanel";
import { shouldIndexStory } from "@/lib/seo/should-index";
import type { SensitiveFlag, StoryAgeRating } from "@/types/moderation";
import type { StoryFormActionState } from "@/lib/creator/createStory";
import type { StoryFormTaxonomyBundle } from "@/lib/creator/get-story-form-taxonomy";
import {
  collectSelectedTaxonomyTagNames,
  getSelectedMainGenreTerm
} from "@/lib/creator/taxonomy-form-display";
import type {
  CreatorStoryFormStory
} from "@/lib/creator/getStoryFormData";
import type { StoryImage } from "@/types/story-images";
import type { StoryDraftContent } from "@/types/drafts";
import type { StudioDraftRecord, StudioDraftVersionRecord } from "@/types/drafts";

type StudioStoryFormProps = {
  action: (
    previousState: StoryFormActionState,
    formData: FormData
  ) => Promise<StoryFormActionState>;
  authorDisplayName?: string | null;
  basePath?: string;
  currentImage?: StoryImage | null;
  profileId: string;
  savedDraft?: StudioDraftRecord | null;
  story?: CreatorStoryFormStory | null;
  taxonomy: StoryFormTaxonomyBundle;
};

function buildInitialStoryState(
  story: CreatorStoryFormStory | null | undefined,
  savedDraft: StudioDraftRecord | null | undefined
): StoryDraftContent {
  const fromDraft = parseStoryDraftContent(savedDraft?.content);

  return {
    hook: fromDraft.hook ?? story?.hook ?? "",
    longDescription:
      fromDraft.longDescription ?? story?.long_description ?? "",
    shortDescription:
      fromDraft.shortDescription ?? story?.short_description ?? "",
    slug: fromDraft.slug ?? story?.slug ?? "",
    title: fromDraft.title ?? story?.title ?? ""
  };
}

const initialState: StoryFormActionState = {
  error: null
};

export function StudioStoryForm({
  action,
  authorDisplayName,
  basePath = "/studio",
  currentImage = null,
  profileId,
  savedDraft,
  story,
  taxonomy
}: StudioStoryFormProps) {
  const initial = buildInitialStoryState(story, savedDraft);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [hook, setHook] = useState(initial.hook);
  const [shortDescription, setShortDescription] = useState(initial.shortDescription);
  const [longDescription, setLongDescription] = useState(initial.longDescription);
  const [seoTitle, setSeoTitle] = useState(story?.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(story?.seo_description ?? "");
  const [seoKeywords, setSeoKeywords] = useState<string[]>(story?.seo_keywords ?? []);
  const [canonicalUrl, setCanonicalUrl] = useState(story?.canonical_url ?? "");
  const mainGenreTerm = getSelectedMainGenreTerm(taxonomy);
  const genreName = mainGenreTerm?.name ?? null;
  const tagNames = collectSelectedTaxonomyTagNames(taxonomy);
  const isPublishedStory = story?.status === "published";
  const isIndexable = shouldIndexStory({
    status: story?.status,
    visibility: story?.visibility
  });

  const getPayload = useCallback(
    () => {
      const content: StoryDraftContent = {
        hook,
        longDescription,
        shortDescription,
        slug,
        title
      };

      return {
        content,
        plainText: [title, hook, shortDescription, longDescription].join("\n"),
        title: title.trim() || "Truyện không tiêu đề"
      };
    },
    [hook, longDescription, shortDescription, slug, title]
  );

  const autosave = useAutosave({
    draftType: "story",
    enabled: Boolean(profileId),
    getPayload,
    initialDraftId: savedDraft?.id ?? null,
    initialLastSavedAt: savedDraft?.lastSavedAt ?? null,
    profileId,
    storyId: story?.id ?? null
  });
  const canSaveDraft =
    !story || (story.status !== "approved" && story.status !== "published");
  const canViewPublicPage =
    story?.visibility === "public" &&
    (story.status === "approved" || story.status === "published");

  const {
    acknowledged,
    ackError,
    guardSubmit,
    setAcknowledged,
    setPendingIntent
  } = useGuidelinesSubmitGuard();

  const handleFieldChange = useCallback(
    <T,>(setter: (value: T) => void, value: T) => {
      setter(value);
      autosave.markDirty();
    },
    [autosave]
  );

  const applyDraftContent = useCallback(
    (draftContent: Record<string, unknown>) => {
      const parsed = parseStoryDraftContent(draftContent);

      if (parsed.title !== undefined) setTitle(parsed.title);
      if (parsed.slug !== undefined) setSlug(parsed.slug);
      if (parsed.hook !== undefined) setHook(parsed.hook);
      if (parsed.shortDescription !== undefined) {
        setShortDescription(parsed.shortDescription);
      }

      if (parsed.longDescription !== undefined) {
        setLongDescription(parsed.longDescription);
      }

      autosave.markDirty();
    },
    [autosave]
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-4">
        <AutosaveStatusBar
          errorMessage={autosave.errorMessage}
          lastSavedAt={autosave.lastSavedAt}
          status={autosave.status}
        />

        {autosave.localRecovery?.snapshot ? (
          <StudioLocalDraftRecovery
            onApply={() => {
              const snapshot = autosave.applyLocalRecovery();

              if (snapshot) {
                applyDraftContent(snapshot.content);
              }
            }}
            onDismiss={autosave.dismissLocalRecovery}
            snapshot={autosave.localRecovery.snapshot}
          />
        ) : null}

      <Card>
        <form
          action={formAction}
          className="space-y-6"
          onSubmit={(event) => {
            guardSubmit(event);

            if (!event.defaultPrevented) {
              void autosave.saveNow(true);
            }
          }}
        >
          {story ? <input name="story_id" type="hidden" value={story.id} /> : null}
          <input
            name="structure_type"
            type="hidden"
            value={story?.structureType ?? "chaptered"}
          />
          <input name="return_base_path" type="hidden" value={basePath} />

          {story ? (
            <div className="flex flex-wrap items-center gap-3">
              <StoryStructureBadge structureType={story.structureType} />
              {isStandaloneStory({ structureType: story.structureType }) ? (
                <Link
                  className="text-sm font-semibold text-cyan-300 hover:underline"
                  href={`${basePath}/stories/${story.id}/content`}
                >
                  Sửa nội dung
                </Link>
              ) : (
                <Link
                  className="text-sm font-semibold text-cyan-300 hover:underline"
                  href={`${basePath}/stories/${story.id}/chapters`}
                >
                  Quản lý chương
                </Link>
              )}
            </div>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-2">
            <Input
              disabled={pending}
              label="Tiêu đề"
              name="title"
              onChange={(event) => handleFieldChange(setTitle, event.target.value)}
              placeholder="Tên truyện"
              required
              value={title}
            />
            <div className="space-y-1">
              <Input
                disabled={pending || isPublishedStory}
                label="Slug"
                name="slug"
                onChange={(event) => handleFieldChange(setSlug, event.target.value)}
                placeholder="tu-khoa-url-safe"
                required
                value={slug}
              />
              {isPublishedStory ? (
                <p className="text-xs text-zinc-500">
                  Truyện đã public — giữ nguyên đường dẫn để tránh gãy URL.
                </p>
              ) : null}
            </div>
          </div>

          <Textarea
            disabled={pending}
            label="Hook"
            name="hook"
            onChange={(event) => handleFieldChange(setHook, event.target.value)}
            placeholder="Một câu thu hút độc giả đọc tiếp."
            required
            rows={4}
            value={hook}
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <Textarea
              disabled={pending}
              label="Mô tả ngắn"
              name="short_description"
              onChange={(event) =>
                handleFieldChange(setShortDescription, event.target.value)
              }
              placeholder="Giới thiệu nhanh truyện."
              rows={5}
              value={shortDescription}
            />
            <Textarea
              disabled={pending}
              label="Mô tả dài"
              name="long_description"
              onChange={(event) =>
                handleFieldChange(setLongDescription, event.target.value)
              }
              placeholder="Bối cảnh, nhân vật, điểm nổi bật..."
              rows={5}
              value={longDescription}
            />
          </div>

          <SEOAssistantPanel
            canonicalUrl={canonicalUrl}
            disabled={pending}
            hasCover={Boolean(story?.cover_url || currentImage)}
            hasGenre={Boolean(mainGenreTerm)}
            hasTags={tagNames.length > 0}
            isIndexable={isIndexable}
            isPublishedStory={isPublishedStory}
            keywords={seoKeywords}
            mode="story"
            onCanonicalUrlChange={(value) => {
              setCanonicalUrl(value);
              autosave.markDirty();
            }}
            onKeywordsChange={(value) => {
              setSeoKeywords(value);
              autosave.markDirty();
            }}
            onSeoDescriptionChange={(value) => {
              setSeoDescription(value);
              autosave.markDirty();
            }}
            onSeoTitleChange={(value) => {
              setSeoTitle(value);
              autosave.markDirty();
            }}
            onSlugChange={
              isPublishedStory ? undefined : (value) => handleFieldChange(setSlug, value)
            }
            originalSlug={story?.slug}
            seoDescription={seoDescription}
            seoTitle={seoTitle}
            slug={slug}
            storyContext={{
              authorName: authorDisplayName,
              genreName,
              hook,
              longDescription,
              shortDescription,
              tagNames,
              title
            }}
          />

          <StoryCoverField
            coverUrl={story?.cover_url}
            currentImage={currentImage}
            disabled={pending}
            storyId={story?.id}
          />

          {taxonomy.enabled ? (
            <StoryTaxonomyFields bundle={taxonomy} disabled={pending} />
          ) : (
            <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              Taxonomy chưa được cấu hình trên hệ thống. Liên hệ quản trị viên trước khi
              lưu truyện.
            </p>
          )}

          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-200 lg:max-w-md">
            <input
              className="size-4 accent-sky-300"
              defaultChecked={story?.is_completed ?? false}
              disabled={pending}
              name="is_completed"
              type="checkbox"
            />
            <span>Đã hoàn thành</span>
          </label>

          {!taxonomy.enabled ? (
            <StoryContentClassification
              defaultAgeRating={(story?.age_rating ?? "all_ages") as StoryAgeRating}
              defaultSensitiveFlags={(story?.sensitive_flags ?? []) as SensitiveFlag[]}
              disabled={pending}
            />
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <label className="space-y-2">
              <span className="block text-sm font-bold text-zinc-200">
                Hiển thị
              </span>
              <select
                className="min-h-12 w-full rounded-xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-base text-white outline-none transition focus:border-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                defaultValue={story?.visibility ?? "private"}
                disabled={pending}
                name="visibility"
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </label>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
              <p className="font-bold text-zinc-200">Gợi ý viết</p>
              <p className="mt-1 leading-6 text-zinc-400">
                Tiêu đề, hook và mô tả ngắn quyết định lượt click — giữ gọn, dễ đọc.
              </p>
            </div>
          </div>

          <GuidelinesAcknowledgementField
            acknowledged={acknowledged}
            disabled={pending}
            error={ackError}
            onAckChange={setAcknowledged}
            variant="story"
          />

          {state.error ? (
            <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">
              {state.error}
            </p>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <Button
              disabled={!canSaveDraft}
              loading={pending}
              name="intent"
              onClick={() => {
                setPendingIntent("draft");
                void autosave.saveNow(true);
              }}
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
        </form>
      </Card>
      </div>

      <div className="space-y-4">
        {story ? (
          <>
            <StoryPublishChecklistPanel
              input={{
                coverUrl: story.cover_url,
                genreId: mainGenreTerm?.id ?? null,
                hasCover: Boolean(story.cover_url || currentImage),
                hook,
                longDescription,
                seoDescription,
                shortDescription,
                status: story.status,
                structureType: story.structureType,
                standalonePlainText: story.standalonePlainText,
                tagCount: tagNames.length,
                title,
                visibility: story.visibility
              }}
              storyId={story.id}
            />
            <SchedulePicker
              storyId={story.id}
              targetId={story.id}
              targetType="story"
            />
          </>
        ) : null}
        <VersionHistoryPanel
          draftId={autosave.draftId}
          onRestored={(version: StudioDraftVersionRecord) => {
            applyDraftContent(version.content);
            void autosave.saveNow(true);
          }}
        />
        <StoryFormSidePanel
          basePath={basePath}
          canSaveDraft={canSaveDraft}
          story={story}
        />
        {taxonomy.enabled ? <TaxonomyRequestPanel /> : null}
        {canViewPublicPage ? (
          <Card className="space-y-2">
            <p className="text-sm font-bold text-white">View public page</p>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
              href={
                story?.slug && story.publicCode
                  ? getStoryDetailHref({
                      slug: story.slug,
                      public_code: story.publicCode
                    })
                  : "#"
              }
            >
              Open public story
            </Link>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
