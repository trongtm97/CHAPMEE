"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { AutosaveStatusBar } from "@/components/editor/AutosaveStatus";
import { useGuidelinesSubmitGuard } from "@/components/creator/GuidelinesSubmitAcknowledgement";
import { StoryCreateCoverField } from "@/components/studio/stories/create/StoryCreateCoverField";
import { StoryCreateSidebar } from "@/components/studio/stories/create/StoryCreateSidebar";
import { StoryStructureSelector } from "@/components/studio/stories/StoryStructureSelector";
import { StoryOriginStep } from "@/components/studio/story/StoryOriginStep";
import { TranslationMetadataForm } from "@/components/studio/story/TranslationMetadataForm";
import { OriginalStoryDeclaration } from "@/components/studio/story/OriginalStoryDeclaration";
import type { StoryCreateChecklistItem } from "@/components/studio/stories/create/StoryCreateChecklist";
import {
  buildStoryTaxonomySelectionFromBundle,
  StoryTaxonomyFields,
  type StoryTaxonomySelection
} from "@/components/studio/stories/StoryTaxonomyFields";
import { SEOAssistantPanel } from "@/components/studio/SEOAssistantPanel";
import { StoryDescriptionEditor } from "@/components/editor/StoryDescriptionEditor";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { useAutosave } from "@/hooks/useAutosave";
import type { StoryFormActionState } from "@/lib/creator/createStory";
import type { StoryFormIntent } from "@/lib/creator/storyFormValidation";
import type { StoryFormTaxonomyBundle } from "@/lib/creator/get-story-form-taxonomy";
import { parseStoryDraftContent } from "@/lib/studio/draft-content";
import { slugifyVietnamese } from "@/lib/seo/slugify-vi";
import { shouldIndexStory } from "@/lib/seo/should-index";
import {
  hasBlockingStoryCreateIssues,
  validateStoryCreateClient,
  validateStoryCreateStep,
  type StoryCreateStepId
} from "@/lib/studio/story-create-validation";
import {
  collectSelectedTaxonomyTagNames,
  getSelectedMainGenreTerm
} from "@/lib/creator/taxonomy-form-display";
import type { StoryStructureType } from "@/types/story-structure";
import type { StudioDraftRecord } from "@/types/drafts";
import type { ContentOrigin } from "@/lib/content-origin/content-origin-types";

const STEPS = [
  { id: "basic", label: "Thông tin" },
  { id: "taxonomy", label: "Phân loại" }
] as const satisfies ReadonlyArray<{ id: StoryCreateStepId; label: string }>;

type StudioStoryCreateWizardProps = {
  action: (
    previousState: StoryFormActionState,
    formData: FormData
  ) => Promise<StoryFormActionState>;
  authorDisplayName?: string | null;
  authorUsername?: string | null;
  basePath?: string;
  profileId: string;
  savedDraft?: StudioDraftRecord | null;
  taxonomy: StoryFormTaxonomyBundle;
};

const initialState: StoryFormActionState = { error: null };

export function StudioStoryCreateWizard({
  action,
  authorDisplayName,
  basePath = "/studio",
  profileId,
  savedDraft,
  taxonomy
}: StudioStoryCreateWizardProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [step, setStep] = useState<StoryCreateStepId>("basic");
  const [submitIntent, setSubmitIntent] = useState<StoryFormIntent>("draft");

  const draftContent = parseStoryDraftContent(savedDraft?.content);
  const [title, setTitle] = useState(draftContent.title ?? "");
  const [slug, setSlug] = useState(draftContent.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(draftContent.slug));
  const [hook, setHook] = useState(draftContent.hook ?? "");
  const [shortDescription, setShortDescription] = useState(
    draftContent.shortDescription ?? ""
  );
  const [longDescription, setLongDescription] = useState(
    draftContent.longDescription ?? ""
  );
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [structureType, setStructureType] = useState<StoryStructureType>("chaptered");
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [taxonomySelection, setTaxonomySelection] = useState<StoryTaxonomySelection>(
    () => buildStoryTaxonomySelectionFromBundle(taxonomy)
  );
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState<string[]>([]);
  const [clientError, setClientError] = useState<string | null>(null);
  const [contentOrigin, setContentOrigin] = useState<ContentOrigin | "">("");
  const [translationMeta, setTranslationMeta] = useState({
    sourceTitle: "",
    sourceAuthorName: "",
    originalLanguage: "",
    sourceUrl: ""
  });

  const taxonomyFormState = useMemo(
    () => ({
      contentWarningsConfirmed: taxonomySelection.contentWarningsConfirmed,
      hasAgeRating: Boolean(taxonomySelection.ageRatingId),
      hasContentType: Boolean(taxonomySelection.contentTypeId),
      hasMainGenre: Boolean(taxonomySelection.mainGenreId)
    }),
    [taxonomySelection]
  );

  const { setPendingIntent } = useGuidelinesSubmitGuard();

  useEffect(() => {
    if (!coverFile) {
      setCoverPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  useEffect(() => {
    if (slugTouched) {
      return;
    }
    const next = slugifyVietnamese(title);
    if (next) {
      setSlug(next);
    }
  }, [title, slugTouched]);

  const getPayload = useCallback(
    () => ({
      content: {
        hook,
        longDescription,
        shortDescription,
        slug,
        title
      },
      plainText: [title, hook, shortDescription, longDescription].join("\n"),
      title: title.trim() || "Truyện không tiêu đề"
    }),
    [hook, longDescription, shortDescription, slug, title]
  );

  const autosave = useAutosave({
    draftType: "story",
    enabled: Boolean(profileId),
    getPayload,
    initialDraftId: savedDraft?.id ?? null,
    initialLastSavedAt: savedDraft?.lastSavedAt ?? null,
    profileId,
    storyId: null
  });

  const markDirty = useCallback(() => {
    autosave.markDirty();
  }, [autosave]);

  const mainGenreTerm = getSelectedMainGenreTerm({
    ...taxonomy,
    selectedByType: {
      ...taxonomy.selectedByType,
      main_genre: taxonomySelection.mainGenreId
        ? [taxonomySelection.mainGenreId]
        : taxonomy.selectedByType.main_genre
    }
  });
  const genreName = mainGenreTerm?.name ?? null;

  const tagNames = useMemo(
    () =>
      collectSelectedTaxonomyTagNames({
        ...taxonomy,
        selectedByType: {
          ...taxonomy.selectedByType,
          subgenre: taxonomySelection.optionalTermIds.subgenre ?? [],
          trope_tag: taxonomySelection.optionalTermIds.trope_tag ?? []
        }
      }),
    [taxonomy, taxonomySelection.optionalTermIds]
  );

  const validationInput = useMemo(
    () => ({
      intent: submitIntent,
      title,
      slug,
      hook,
      shortDescription,
      useTaxonomy: taxonomy.enabled,
      hasMainGenre: taxonomyFormState.hasMainGenre,
      hasContentType: taxonomyFormState.hasContentType,
      hasAgeRating: taxonomyFormState.hasAgeRating,
      presentationMode: taxonomySelection.presentationMode,
      contentWarningsConfirmed: taxonomyFormState.contentWarningsConfirmed,
      hasCoverPreview: Boolean(coverFile || coverPreviewUrl),
      structureType,
      contentOrigin,
      translationMeta
    }),
    [
      contentOrigin,
      coverFile,
      coverPreviewUrl,
      hook,
      shortDescription,
      slug,
      structureType,
      submitIntent,
      taxonomy.enabled,
      taxonomyFormState,
      taxonomySelection.presentationMode,
      title,
      translationMeta
    ]
  );

  const validationIssues = useMemo(() => {
    return validateStoryCreateClient(validationInput, {
      showErrors: showValidationErrors
    });
  }, [showValidationErrors, validationInput]);

  const checklist: StoryCreateChecklistItem[] = useMemo(
    () => [
      { id: "title", label: "Có tiêu đề", done: Boolean(title.trim()) },
      {
        id: "slug",
        label: "Slug hợp lệ",
        done: Boolean(slug.trim()) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
      },
      { id: "hook", label: "Có hook", done: Boolean(hook.trim()), optional: true },
      {
        id: "short",
        label: "Có mô tả ngắn",
        done: Boolean(shortDescription.trim()),
        optional: true
      },
      {
        id: "genre",
        label: "Có thể loại chính",
        done: taxonomy.enabled ? taxonomyFormState.hasMainGenre : false
      },
      {
        id: "age",
        label: "Có độ tuổi",
        done: taxonomy.enabled ? taxonomyFormState.hasAgeRating : true
      },
      {
        id: "format",
        label: "Có cách trình bày",
        done: Boolean(taxonomySelection.presentationMode)
      },
      {
        id: "ownership",
        label: "Chọn loại nội dung & quyền",
        done: Boolean(contentOrigin),
        optional: true
      },
      {
        id: "seo",
        label: "SEO cơ bản",
        done:
          Boolean(seoTitle.trim() || title.trim()) &&
          Boolean(seoDescription.trim() || shortDescription.trim())
      }
    ],
    [
      contentOrigin,
      hook,
      seoDescription,
      seoTitle,
      shortDescription,
      slug,
      taxonomy.enabled,
      taxonomyFormState,
      taxonomySelection.presentationMode,
      title
    ]
  );

  const lastSavedLabel = autosave.lastSavedAt
    ? `Đã lưu nháp ${new Date(autosave.lastSavedAt).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit"
      })}`
    : null;

  const isIndexable = shouldIndexStory({
    status: "draft",
    visibility
  });

  function goToNextStep() {
    const stepIssues = validateStoryCreateStep(step, {
      ...validationInput,
      intent: "review"
    });
    if (stepIssues.some((issue) => issue.level === "error")) {
      setShowValidationErrors(true);
      setClientError(stepIssues.find((i) => i.level === "error")?.message ?? null);
      return;
    }
    setClientError(null);
    const nextIndex = stepIndex + 1;
    if (nextIndex < STEPS.length) {
      setStep(STEPS[nextIndex]!.id);
    }
  }

  function submitWithIntent(intent: StoryFormIntent) {
    setSubmitIntent(intent);
    setClientError(null);
    setShowValidationErrors(true);
    setPendingIntent(intent === "review" ? "review" : "draft");

    const issues = validateStoryCreateClient(
      { ...validationInput, intent },
      { showErrors: true }
    );

    if (hasBlockingStoryCreateIssues(issues, intent)) {
      const first = issues.find((i) => i.level === "error");
      setClientError(first?.message ?? "Vui lòng hoàn thiện các mục bắt buộc.");
      if (
        first?.field === "content_type" ||
        first?.field === "main_genre" ||
        first?.field === "age_rating" ||
        first?.field === "presentation_mode"
      ) {
        setStep("taxonomy");
      } else {
        setStep("basic");
      }
      return;
    }

    const form = formRef.current;
    if (!form) {
      return;
    }

    const fd = new FormData(form);
    fd.set("intent", intent);
    fd.set(
      "post_create_path",
      structureType === "standalone" ? "standalone_draft_only" : "story_only"
    );
    if (coverFile) {
      fd.set("cover_file", coverFile);
    }
    void autosave.saveNow(true);
    formAction(fd);
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 hidden gap-2 md:flex">
        {STEPS.map((s, index) => (
          <button
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              step === s.id
                ? "bg-cyan-300 text-zinc-950"
                : index < stepIndex
                  ? "bg-cyan-400/15 text-cyan-100"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10"
            }`}
            key={s.id}
            onClick={() => setStep(s.id)}
            type="button"
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-black/20 text-xs">
              {index + 1}
            </span>
            {s.label}
          </button>
        ))}
      </div>

      <p className="mb-4 text-sm font-semibold text-zinc-400 md:hidden">
        Bước {stepIndex + 1}/{STEPS.length}: {STEPS[stepIndex]?.label}
      </p>

      <AutosaveStatusBar
        errorMessage={autosave.errorMessage}
        lastSavedAt={autosave.lastSavedAt}
        status={autosave.status}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-4">
          <Card className="p-4 sm:p-6">
            <form
              action={formAction}
              className="space-y-6"
              onSubmit={(event) => {
                event.preventDefault();
                submitWithIntent(submitIntent);
              }}
              ref={formRef}
            >
              <input name="return_base_path" type="hidden" value={basePath} />
              <input name="use_taxonomy" type="hidden" value={taxonomy.enabled ? "1" : "0"} />
              <input name="intent" type="hidden" value={submitIntent} />

              <div className={step === "basic" ? "space-y-5" : "hidden"}>
                <StoryStructureSelector
                  onChange={setStructureType}
                  value={structureType}
                />
                <StoryOriginStep
                  disabled={pending}
                  onChange={(value) => {
                    setContentOrigin(value);
                    markDirty();
                  }}
                  value={contentOrigin}
                />
                {contentOrigin === "translation" ? (
                  <TranslationMetadataForm
                    disabled={pending}
                    onChange={(next) => {
                      setTranslationMeta(next);
                      markDirty();
                    }}
                    value={translationMeta}
                  />
                ) : contentOrigin === "original" ? (
                  <OriginalStoryDeclaration />
                ) : null}
                <div>
                  <h2 className="text-lg font-bold text-white">Thông tin cơ bản</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Tiêu đề, mô tả và ảnh bìa — lưu nháp bất cứ lúc nào.
                  </p>
                </div>
                <Input
                  disabled={pending}
                  label="Tiêu đề truyện"
                  labelRequired
                  name="title"
                  onChange={(e) => {
                    setTitle(e.target.value);
                    markDirty();
                  }}
                  placeholder="Tên truyện"
                  required
                  value={title}
                />
                <div className="space-y-1">
                  <Input
                    disabled={pending}
                    label="Đường dẫn (slug)"
                    name="slug"
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(e.target.value);
                      markDirty();
                    }}
                    placeholder="banh-cuon-nho"
                    value={slug}
                  />
                  <p className="text-xs text-zinc-500">
                    Xem trước: /truyen/{slug.trim() || "…"}-s.[mã]
                  </p>
                </div>
                <Textarea
                  disabled={pending}
                  label="Hook"
                  name="hook"
                  onChange={(e) => {
                    setHook(e.target.value);
                    markDirty();
                  }}
                  placeholder="Một câu thu hút độc giả."
                  rows={3}
                  value={hook}
                />
                <Textarea
                  disabled={pending}
                  label="Mô tả ngắn"
                  name="short_description"
                  onChange={(e) => {
                    setShortDescription(e.target.value);
                    markDirty();
                  }}
                  placeholder="Giới thiệu nhanh."
                  rows={4}
                  value={shortDescription}
                />
                <StoryDescriptionEditor
                  disabled={pending}
                  label="Mô tả dài"
                  name="long_description"
                  onChange={(next) => {
                    setLongDescription(next);
                    markDirty();
                  }}
                  value={longDescription}
                />
                <StoryCreateCoverField
                  disabled={pending}
                  file={coverFile}
                  onFileChange={(file) => {
                    setCoverFile(file);
                    markDirty();
                  }}
                />
                <label className="block space-y-2">
                  <span className="text-sm font-bold text-zinc-200">Hiển thị</span>
                  <select
                    className="min-h-12 w-full max-w-xs rounded-xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-base text-white outline-none focus:border-cyan-300"
                    disabled={pending}
                    name="visibility"
                    onChange={(e) =>
                      setVisibility(e.target.value as "public" | "private")
                    }
                    value={visibility}
                  >
                    <option value="private">Riêng tư (nháp)</option>
                    <option value="public">Công khai</option>
                  </select>
                </label>

                <div className="border-t border-white/10 pt-5">
                  <p className="mb-3 text-xs text-zinc-600">
                    Index khi public:{" "}
                    {isIndexable ? (
                      <span className="text-emerald-400">có thể index</span>
                    ) : (
                      <span className="text-zinc-500">noindex (nháp/riêng tư)</span>
                    )}
                  </p>
                  <SEOAssistantPanel
                    compact
                    disabled={pending}
                    hasCover={Boolean(coverFile || coverPreviewUrl)}
                    hasGenre={Boolean(genreName)}
                    hasTags={tagNames.length > 0}
                    isIndexable={isIndexable}
                    keywords={seoKeywords}
                    mode="story"
                    onKeywordsChange={setSeoKeywords}
                    onSeoDescriptionChange={(value) => {
                      setSeoDescription(value);
                      markDirty();
                    }}
                    onSeoTitleChange={(value) => {
                      setSeoTitle(value);
                      markDirty();
                    }}
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
                </div>
              </div>

              <div className={step === "taxonomy" ? "space-y-5" : "hidden"}>
                <div>
                  <h2 className="text-lg font-bold text-white">Phân loại</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Chọn loại nội dung, thể loại và cách trình bày — dùng tìm kiếm
                    trong từng mục.
                  </p>
                </div>
                {taxonomy.enabled ? (
                  <StoryTaxonomyFields
                    bundle={taxonomy}
                    collapsibleAdvanced
                    disabled={pending}
                    onPresentationModeChange={(mode) => {
                      setTaxonomySelection((prev) => ({ ...prev, presentationMode: mode }));
                    }}
                    onSelectionChange={setTaxonomySelection}
                  />
                ) : (
                  <p className="text-sm text-zinc-500">
                    Taxonomy chưa được cấu hình — liên hệ quản trị trước khi tạo
                    truyện.
                  </p>
                )}
              </div>

              {state.error || clientError ? (
                <p
                  className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100"
                  role="alert"
                >
                  {clientError ?? state.error}
                </p>
              ) : null}

              <div className="hidden flex-wrap gap-2 border-t border-white/10 pt-4 md:flex">
                {stepIndex > 0 ? (
                  <Button
                    onClick={() => setStep(STEPS[stepIndex - 1]!.id)}
                    type="button"
                    variant="secondary"
                  >
                    Quay lại
                  </Button>
                ) : null}
                {stepIndex < STEPS.length - 1 ? (
                  <Button className="ml-auto" onClick={goToNextStep} type="button">
                    Tiếp tục
                  </Button>
                ) : (
                  <div className="ml-auto flex flex-wrap gap-2">
                    <Button
                      disabled={pending}
                      loading={pending}
                      onClick={() => submitWithIntent("draft")}
                      type="button"
                      variant="secondary"
                    >
                      Lưu nháp
                    </Button>
                    <Button
                      className="border border-amber-400/30 bg-amber-400/10 text-amber-50"
                      disabled={pending}
                      loading={pending}
                      onClick={() => submitWithIntent("review")}
                      type="button"
                      variant="secondary"
                    >
                      Đăng truyện
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </Card>

          <div className="space-y-4 xl:hidden">
            <StoryCreateSidebar
              autosaveLabel={lastSavedLabel}
              basePath={basePath}
              checklist={checklist}
              dirty={autosave.status === "dirty" || autosave.status === "saving"}
              issues={validationIssues}
              onAction={submitWithIntent}
              pending={pending}
              showValidationErrors={showValidationErrors}
              step={step}
              visibility={visibility}
            />
          </div>
        </div>

        <div className="hidden xl:block">
          <StoryCreateSidebar
            autosaveLabel={lastSavedLabel}
            basePath={basePath}
            checklist={checklist}
            dirty={autosave.status === "dirty" || autosave.status === "saving"}
            issues={validationIssues}
            onAction={submitWithIntent}
            pending={pending}
            showValidationErrors={showValidationErrors}
            step={step}
            visibility={visibility}
          />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-white/10 bg-zinc-950/95 p-3 backdrop-blur md:hidden">
        <Button
          className="flex-1"
          disabled={pending}
          loading={pending}
          onClick={() => submitWithIntent("draft")}
          type="button"
          variant="secondary"
        >
          Lưu nháp
        </Button>
        {stepIndex < STEPS.length - 1 ? (
          <Button className="flex-1" onClick={goToNextStep} type="button">
            Tiếp tục
          </Button>
        ) : (
          <Button
            className="flex-1 border border-amber-400/30 bg-amber-400/10 text-amber-50"
            disabled={pending}
            loading={pending}
            onClick={() => submitWithIntent("review")}
            type="button"
            variant="secondary"
          >
            Đăng truyện
          </Button>
        )}
      </div>
      <div className="h-20 md:hidden" aria-hidden />
    </div>
  );
}
