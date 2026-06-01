"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useGuidelinesSubmitGuard
} from "@/components/creator/GuidelinesSubmitAcknowledgement";
import type { EditorCanvasHandle } from "@/components/editor/EditorCanvas";
import { EditorPresentationPreview } from "@/components/editor/EditorPresentationPreview";
import { EditorPreview } from "@/components/editor/EditorPreview";
import { ChapMeeStudioComposer } from "@/components/composer/ChapMeeStudioComposer";
import { collectMediaIdsFromBlocks } from "@/lib/composer/collect-media-ids";
import { validateComposerContent } from "@/lib/composer/validate-composer-content";
import { useChapterImagesMap } from "@/hooks/useChapterImagesMap";
import { ChapterContentModeCard } from "@/components/studio/chapters/ChapterContentModeCard";
import { ChapterEditorStatsBar } from "@/components/studio/chapters/ChapterEditorStatsBar";
import { ChapterMetaCard } from "@/components/studio/chapters/ChapterMetaCard";
import { ChapterSeoSection } from "@/components/studio/chapters/ChapterSeoSection";
import { ChapterProseEditor } from "@/components/studio/chapters/ChapterProseEditor";
import { ChapterWorkspaceHeader } from "@/components/studio/chapters/ChapterWorkspaceHeader";
import { ChapterWritingSidebar } from "@/components/studio/chapters/ChapterWritingSidebar";
import {
  ChapterPresentationPanel,
  type PresentationEditorMode
} from "@/components/studio/presentation/ChapterPresentationPanel";
import {
  buildInitialComposerDocument,
  composerDocumentToPlainFallback,
  composerValueToHiddenJson,
  convertProseChapterToComposer,
  resolveChapterComposerMode,
  shouldUseStudioComposer,
  type ChapterPresentationSource
} from "@/lib/composer/editor-state";
import { migrateLegacyStructuredToComposer } from "@/lib/composer/migrate-legacy-to-composer";
import {
  isComposerStructuredDocument,
  tryParseStoredComposerDocument
} from "@/lib/composer/serializer";
import type { ComposerStructuredContent } from "@/lib/composer/types";
import type { ContentFormat } from "@/types/presentation";
import { InsertImageDialog } from "@/components/editor/InsertImageDialog";
import { SaveAsTemplateDialog } from "@/components/editor/SaveAsTemplateDialog";
import { TemplatePicker } from "@/components/editor/TemplatePicker";
import { consumePendingTemplateInsert } from "@/lib/studio/pending-template";
import { shouldIndexEpisode } from "@/lib/seo/should-index";
import { countImageBlocksInContent } from "@/lib/editor/chapter-image-block";
import { StudioLocalDraftRecovery } from "@/components/editor/StudioLocalDraftRecovery";
import { Button } from "@/components/ui";
import { ChapterPublishChecklistPanel } from "@/components/studio/ChapterPublishChecklistPanel";
import { SchedulePicker } from "@/components/studio/SchedulePicker";
import { useAutosave } from "@/hooks/useAutosave";
import type { EpisodeFormActionState } from "@/lib/creator/createEpisode";
import type { CreatorEpisodeFormData } from "@/lib/creator/getCreatorEpisodeById";
import { formatBlockingErrors } from "@/lib/publish/checklist-utils";
import { validateChapterBeforePublish } from "@/lib/publish/validate-chapter-before-publish";
import { getEditorStats } from "@/lib/editor/count-words";
import { sanitizePlainContent } from "@/lib/editor/sanitize-content";
import { applyTextareaFormat } from "@/lib/editor/text-format";
import { parseChapterDraftContent } from "@/lib/studio/draft-content";
import { modeUsesStructuredContent } from "@/lib/presentation/constants";
import { resolveChapterDisplayStatus } from "@/lib/studio/status-labels";
import type { PresentationMode } from "@/types/presentation";
import { createExcerpt } from "@/lib/text/createExcerpt";
import type { EditorViewMode } from "@/types/editor";
import { CHAPTER_IMAGE_MAX_PER_CHAPTER } from "@/types/chapter-images";
import type { ChapterDraftContent } from "@/types/drafts";
import type { StudioDraftRecord, StudioDraftVersionRecord } from "@/types/drafts";

type StudioChapterEditorProps = {
  action: (
    previousState: EpisodeFormActionState,
    formData: FormData
  ) => Promise<EpisodeFormActionState>;
  authorDisplayName?: string | null;
  backHref: string;
  defaultEpisodeNumber: number;
  defaultTitle?: string;
  episode?: CreatorEpisodeFormData["episode"];
  profileId: string;
  savedDraft?: StudioDraftRecord | null;
  story: NonNullable<CreatorEpisodeFormData["story"]>;
};

const initialState: EpisodeFormActionState = {
  error: null
};

const MAX_UNDO = 40;

function buildInitialChapterState(
  episode: CreatorEpisodeFormData["episode"] | undefined,
  savedDraft: StudioDraftRecord | null | undefined,
  defaultEpisodeNumber: number
): ChapterDraftContent {
  const fromDraft = parseChapterDraftContent(savedDraft?.content);

  return {
    content: fromDraft.content ?? episode?.content ?? "",
    episodeNumber:
      fromDraft.episodeNumber ?? episode?.episode_number ?? defaultEpisodeNumber,
    excerpt: fromDraft.excerpt ?? episode?.excerpt ?? "",
    title: fromDraft.title ?? episode?.title ?? ""
  };
}

export function StudioChapterEditor({
  action,
  authorDisplayName,
  backHref,
  defaultEpisodeNumber,
  defaultTitle,
  episode,
  profileId,
  savedDraft,
  story
}: StudioChapterEditorProps) {
  const initial = buildInitialChapterState(episode, savedDraft, defaultEpisodeNumber);
  const storyPresentationMode: PresentationMode = story.presentationMode ?? "standard_prose";
  const usesStructuredStory = modeUsesStructuredContent(storyPresentationMode);
  const episodeContentFormat = (episode?.content_format ?? null) as ContentFormat | null;
  const initialPresentationSource: ChapterPresentationSource = episode?.presentation_mode
    ? (episode.presentation_mode as ChapterPresentationSource)
    : "story";
  const initialComposerMode = resolveChapterComposerMode(
    initialPresentationSource,
    storyPresentationMode,
    episode?.presentation_mode
  );
  const initialStructuredJson =
    episode?.structured_content != null
      ? JSON.stringify(episode.structured_content, null, 2)
      : "";
  const [state, formAction, pending] = useActionState(action, initialState);
  const [episodeNumber, setEpisodeNumber] = useState(initial.episodeNumber);
  const [title, setTitle] = useState(initial.title || defaultTitle || "");
  const [content, setContent] = useState(initial.content);
  const draftComposerPartialEarly = parseChapterDraftContent(savedDraft?.content);

  const [presentationEditorMode, setPresentationEditorMode] =
    useState<PresentationEditorMode>(() => {
      if (
        draftComposerPartialEarly.presentationEditorMode === "structured" ||
        draftComposerPartialEarly.presentationEditorMode === "plain"
      ) {
        return draftComposerPartialEarly.presentationEditorMode;
      }
      if (episode?.content_format === "structured_json") {
        return "structured";
      }
      if (usesStructuredStory && !episode) {
        return "structured";
      }
      return "plain";
    });
  const [structuredContentJson, setStructuredContentJson] =
    useState(initialStructuredJson);
  const draftComposerPartial = draftComposerPartialEarly;

  const [useComposerUi, setUseComposerUi] = useState(() => {
    if (draftComposerPartial.useComposerUi === true) {
      return true;
    }
    if (episodeContentFormat === "structured_blocks") {
      return true;
    }
    if (
      episode?.structured_content &&
      episodeContentFormat === "structured_json"
    ) {
      const migrated = migrateLegacyStructuredToComposer(
        initialComposerMode as PresentationMode,
        episode.structured_content
      );
      if (migrated) {
        return true;
      }
    }
    if (!episode && usesStructuredStory) {
      return true;
    }
    return shouldUseStudioComposer({
      composerMode: initialComposerMode,
      contentFormat: episodeContentFormat,
      structuredContent: episode?.structured_content ?? null,
      useComposerUi: false
    });
  });
  const [composerLoadError, setComposerLoadError] = useState<string | null>(null);
  const [composerDocument, setComposerDocument] = useState<ComposerStructuredContent>(() => {
    if (draftComposerPartial.composerDocument) {
      const parsed = tryParseStoredComposerDocument(draftComposerPartial.composerDocument);
      if (parsed.ok) {
        return parsed.data;
      }
    }
    if (episode?.structured_content) {
      const fromEpisode = tryParseStoredComposerDocument(episode.structured_content);
      if (fromEpisode.ok) {
        return fromEpisode.data;
      }
    }
    const migrated =
      episode?.structured_content && episodeContentFormat === "structured_json"
        ? migrateLegacyStructuredToComposer(
            initialComposerMode as PresentationMode,
            episode.structured_content
          )
        : null;
    if (migrated) {
      return migrated;
    }
    return buildInitialComposerDocument({
      mode: initialComposerMode,
      structuredContent: episode?.structured_content ?? null,
      fallbackContent: initial.content,
      contentFormat: episodeContentFormat
    });
  });
  const [presentationSource, setPresentationSource] = useState<ChapterPresentationSource>(
    () =>
      (draftComposerPartial.presentationSource as ChapterPresentationSource | undefined) ??
      initialPresentationSource
  );
  const [authorNote, setAuthorNote] = useState(initial.excerpt);
  const [seoTitle, setSeoTitle] = useState(episode?.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(episode?.seo_description ?? "");
  const [seoKeywords, setSeoKeywords] = useState<string[]>(episode?.seo_keywords ?? []);
  const chapterIndexable = shouldIndexEpisode({
    episodeStatus: episode?.status,
    storyStatus: story.status,
    storyVisibility: story.visibility
  });
  const [viewMode, setViewMode] = useState<EditorViewMode>("write");
  const [hasViewedPreview, setHasViewedPreview] = useState(false);
  const [publishPanelOpen, setPublishPanelOpen] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [validationFlash, setValidationFlash] = useState<string | null>(null);
  const [composerWarningsAck, setComposerWarningsAck] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const canvasRef = useRef<EditorCanvasHandle>(null);
  const undoStack = useRef<string[]>([initial.content]);
  const redoStack = useRef<string[]>([]);
  const skipHistoryRef = useRef(false);

  const composerMode = useMemo(
    () =>
      resolveChapterComposerMode(
        presentationSource,
        storyPresentationMode,
        presentationSource === "story" ? null : presentationSource
      ),
    [presentationSource, storyPresentationMode]
  );

  const effectiveStructuredJson = useMemo(
    () =>
      useComposerUi
        ? composerValueToHiddenJson({ ...composerDocument, mode: composerMode })
        : structuredContentJson,
    [composerDocument, composerMode, structuredContentJson, useComposerUi]
  );

  const composerMediaIds = useMemo(
    () => collectMediaIdsFromBlocks(composerDocument.blocks),
    [composerDocument.blocks]
  );
  const { imageMap: composerImageMap } = useChapterImagesMap(composerMediaIds);
  const knownComposerMediaIds = useMemo(
    () => Object.keys(composerImageMap),
    [composerImageMap]
  );

  const composerPublishReport = useMemo(() => {
    if (!useComposerUi) {
      return null;
    }
    return validateComposerContent(composerMode, composerDocument, {
      strictPublish: true,
      knownMediaIds: new Set(knownComposerMediaIds),
      storyContentWarningsConfirmed: story.contentWarningsConfirmed,
      previewViewed: hasViewedPreview
    });
  }, [
    composerDocument,
    composerMode,
    knownComposerMediaIds,
    story.contentWarningsConfirmed,
    useComposerUi,
    hasViewedPreview
  ]);

  const canSubmitComposerReview =
    !useComposerUi ||
    (composerPublishReport?.valid === true &&
      (composerPublishReport.warnings.length === 0 || composerWarningsAck));

  const formContent = useMemo(() => {
    if (useComposerUi) {
      const plain = composerDocumentToPlainFallback(composerDocument);
      return plain || content;
    }
    return content;
  }, [composerDocument, content, useComposerUi]);

  const stats = useMemo(() => getEditorStats(formContent), [formContent]);
  const imageCount = useMemo(() => countImageBlocksInContent(content), [content]);
  const imageLimitReached = imageCount >= CHAPTER_IMAGE_MAX_PER_CHAPTER;
  const displayStatus = resolveChapterDisplayStatus({
    status: episode?.status ?? "draft"
  });
  const canSchedule = Boolean(episode?.id);

  const handleViewModeChange = useCallback((mode: EditorViewMode) => {
    setViewMode(mode);

    if (mode === "preview") {
      setHasViewedPreview(true);
    }
  }, []);

  useEffect(() => {
    if (!useComposerUi || !episode?.structured_content) {
      return;
    }
    if (composerDocument.blocks.length > 0) {
      return;
    }
    const parsed = tryParseStoredComposerDocument(episode.structured_content);
    if (parsed.ok) {
      setComposerDocument(parsed.data);
      setComposerLoadError(null);
      return;
    }
    if (
      episodeContentFormat === "structured_blocks" ||
      isComposerStructuredDocument(episode.structured_content)
    ) {
      setComposerLoadError(
        parsed.error ??
          "Không đọc được nội dung Composer đã lưu. Thử «Chèn mẫu» hoặc chuyển về văn xuôi."
      );
    }
  }, [
    composerDocument.blocks.length,
    episode?.id,
    episode?.structured_content,
    episodeContentFormat,
    useComposerUi
  ]);

  useEffect(() => {
    if (useComposerUi) {
      setComposerDocument((prev) =>
        prev.mode === composerMode ? prev : { ...prev, mode: composerMode }
      );
    }
  }, [composerMode, useComposerUi]);

  const getPayload = useCallback(
    () => ({
      content: {
        content: formContent,
        episodeNumber,
        excerpt: authorNote,
        title,
        useComposerUi,
        presentationSource,
        composerDocument: useComposerUi ? composerDocument : undefined,
        structuredContentJson: effectiveStructuredJson,
        presentationEditorMode: useComposerUi ? "structured" : presentationEditorMode
      } satisfies ChapterDraftContent,
      plainText: formContent,
      title: title.trim() || `Chương ${episodeNumber}`
    }),
    [
      authorNote,
      composerDocument,
      effectiveStructuredJson,
      episodeNumber,
      formContent,
      presentationEditorMode,
      presentationSource,
      title,
      useComposerUi
    ]
  );

  const autosave = useAutosave({
    chapterId: episode?.id ?? null,
    draftType: "chapter",
    enabled: Boolean(profileId),
    getPayload,
    initialDraftId: savedDraft?.id ?? null,
    initialLastSavedAt: savedDraft?.lastSavedAt ?? null,
    profileId,
    storyId: story.id
  });

  const {
    acknowledged,
    ackError,
    guardSubmit,
    pendingIntent,
    setAcknowledged,
    setPendingIntent
  } = useGuidelinesSubmitGuard();

  const pushHistory = useCallback((next: string) => {
    const stack = undoStack.current;
    const last = stack[stack.length - 1];

    if (last !== next) {
      stack.push(next);

      if (stack.length > MAX_UNDO) {
        stack.shift();
      }

      redoStack.current = [];
    }
  }, []);

  const handleContentChange = useCallback(
    (value: string) => {
      const sanitized = sanitizePlainContent(value);

      if (!skipHistoryRef.current) {
        pushHistory(sanitized);
      }

      skipHistoryRef.current = false;
      setContent(sanitized);
      autosave.markDirty();
    },
    [autosave, pushHistory]
  );

  const handleFieldChange = useCallback(
    <T,>(setter: (value: T) => void, value: T) => {
      setter(value);
      autosave.markDirty();
    },
    [autosave]
  );

  const applyDraftContent = useCallback(
    (draftContent: Record<string, unknown>) => {
      const parsed = parseChapterDraftContent(draftContent);

      if (parsed.episodeNumber !== undefined) {
        setEpisodeNumber(parsed.episodeNumber);
      }

      if (parsed.title !== undefined) {
        setTitle(parsed.title);
      }

      if (parsed.content !== undefined) {
        skipHistoryRef.current = true;
        setContent(parsed.content);
        pushHistory(parsed.content);
      }

      if (parsed.excerpt !== undefined) {
        setAuthorNote(parsed.excerpt);
      }

      if (parsed.useComposerUi !== undefined) {
        setUseComposerUi(parsed.useComposerUi);
      }

      if (parsed.presentationSource) {
        setPresentationSource(parsed.presentationSource as ChapterPresentationSource);
      }

      if (parsed.composerDocument) {
        const parsedDoc = tryParseStoredComposerDocument(parsed.composerDocument);
        if (parsedDoc.ok) {
          setComposerDocument(parsedDoc.data);
          setComposerLoadError(null);
        } else {
          setComposerLoadError(parsedDoc.error);
        }
      }

      if (parsed.structuredContentJson !== undefined) {
        setStructuredContentJson(parsed.structuredContentJson);
      }

      if (parsed.presentationEditorMode === "plain" || parsed.presentationEditorMode === "structured") {
        setPresentationEditorMode(parsed.presentationEditorMode);
      }

      autosave.markDirty();
    },
    [autosave, pushHistory]
  );

  const handleRestoreVersion = useCallback(
    (version: StudioDraftVersionRecord) => {
      applyDraftContent(version.content);
      void autosave.saveNow(true);
    },
    [applyDraftContent, autosave]
  );

  const handleFormat = useCallback(
    (action: Parameters<typeof applyTextareaFormat>[1]) => {
      const textarea = canvasRef.current?.getTextarea();

      if (!textarea) {
        return;
      }

      const next = applyTextareaFormat(textarea, action);
      handleContentChange(next);
    },
    [handleContentChange]
  );

  const handleUndo = useCallback(() => {
    const stack = undoStack.current;

    if (stack.length <= 1) {
      return;
    }

    const current = stack.pop()!;

    redoStack.current.push(current);
    const previous = stack[stack.length - 1]!;
    skipHistoryRef.current = true;
    setContent(previous);
    autosave.markDirty();
  }, [autosave]);

  const handleRedo = useCallback(() => {
    const next = redoStack.current.pop();

    if (!next) {
      return;
    }

    undoStack.current.push(next);
    skipHistoryRef.current = true;
    setContent(next);
    autosave.markDirty();
  }, [autosave]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      guardSubmit(event);

      if (!event.defaultPrevented) {
        void autosave.saveNow(true);
      }
    },
    [autosave, guardSubmit]
  );

  const openPublishPanel = useCallback(() => {
    setPublishPanelOpen(true);
  }, []);

  const storyPublishInput = useMemo(
    () => ({
      status: story.status,
      title: story.title,
      visibility: story.visibility
    }),
    [story.status, story.title, story.visibility]
  );

  const publishValidation = useMemo(
    () =>
      validateChapterBeforePublish(
        {
          authorNote,
          content: formContent,
          episodeNumber,
          isSaved: !autosave.isDirty && Boolean(episode?.id),
          seoDescription,
          status: episode?.status ?? "draft",
          storyValid: true,
          title
        },
        storyPublishInput
      ),
    [
      authorNote,
      autosave.isDirty,
      episode?.id,
      episode?.status,
      episodeNumber,
      formContent,
      seoDescription,
      storyPublishInput,
      title
    ]
  );

  const publishBlockingMessage = useMemo(() => {
    const blocking = publishValidation.rules.filter(
      (rule) => rule.blocking && rule.status === "error"
    );

    if (blocking.length === 0) {
      return undefined;
    }

    return formatBlockingErrors(blocking) || blocking[0]?.message;
  }, [publishValidation.rules]);

  const scrollToFirstChapterError = useCallback(() => {
    if (!title.trim()) {
      document
        .querySelector('[data-chapter-field="title"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!episodeNumber || episodeNumber < 1) {
      document
        .querySelector('[data-chapter-field="number"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!formContent.trim()) {
      document
        .querySelector('[data-chapter-field="content"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [episodeNumber, formContent, title]);

  const scheduleDisabledReason = !canSchedule
    ? "Lưu chương trước khi đăng hoặc lên lịch"
    : publishBlockingMessage;

  const handlePresentationChange = useCallback(
    (source: ChapterPresentationSource) => {
      setPresentationSource(source);
      const nextMode = resolveChapterComposerMode(
        source,
        storyPresentationMode,
        source === "story" ? null : source
      );

      if (nextMode !== "standard_prose" && source !== "standard_prose") {
        setUseComposerUi(true);
        setPresentationEditorMode("structured");
      }

      if (source === "standard_prose") {
        setUseComposerUi(false);
        setPresentationEditorMode("plain");
      }

      autosave.markDirty();
    },
    [autosave, storyPresentationMode]
  );

  const handleSwitchToComposer = useCallback(async () => {
    await autosave.saveNow(true);
    const mode = resolveChapterComposerMode(
      presentationSource,
      storyPresentationMode,
      presentationSource === "story" ? null : presentationSource
    );
    const fromEpisode =
      episode?.structured_content != null
        ? tryParseStoredComposerDocument(episode.structured_content)
        : null;
    const doc = fromEpisode?.ok
      ? fromEpisode.data
      : convertProseChapterToComposer(content, mode);
    setComposerDocument(doc);
    setComposerLoadError(fromEpisode && !fromEpisode.ok ? fromEpisode.error : null);
    setUseComposerUi(true);
    setPresentationEditorMode("structured");
    autosave.markDirty();
  }, [
    autosave,
    content,
    episode?.structured_content,
    presentationSource,
    storyPresentationMode
  ]);

  const handleSwitchToPlain = useCallback(() => {
    setUseComposerUi(false);
    setComposerLoadError(null);
    autosave.markDirty();
  }, [autosave]);

  const tryOpenPublishFlow = useCallback(
    (intent: "schedule" | "publish") => {
      setValidationFlash(null);

      if (!title.trim() || !formContent.trim()) {
        setValidationFlash(
          !title.trim() ? "Nhập tiêu đề chương." : "Nhập nội dung chương."
        );
        scrollToFirstChapterError();
        return;
      }

      if (useComposerUi && !canSubmitComposerReview) {
        setValidationFlash(
          "Sửa lỗi Composer hoặc xác nhận cảnh báo trước khi đăng."
        );
        return;
      }

      if (!canSchedule) {
        setValidationFlash("Lưu chương trước khi đăng hoặc lên lịch.");
        void autosave.saveNow(true);
        return;
      }

      const blocking = publishValidation.rules.filter(
        (rule) => rule.blocking && rule.status === "error"
      );

      if (blocking.length > 0) {
        setValidationFlash(formatBlockingErrors(blocking) || blocking[0]?.message);
        scrollToFirstChapterError();
        return;
      }

      if (intent === "publish") {
        setPublishConfirmOpen(true);
        return;
      }

      openPublishPanel();
    },
    [
      canSchedule,
      canSubmitComposerReview,
      formContent,
      openPublishPanel,
      publishValidation.rules,
      scrollToFirstChapterError,
      autosave,
      title,
      useComposerUi
    ]
  );

  const handleOpenInsertImage = useCallback(async () => {
    if (!episode?.id && !autosave.draftId) {
      await autosave.saveNow(true);
    }

    setImageDialogOpen(true);
  }, [autosave, episode?.id]);

  const handleOpenTemplatePicker = useCallback(async () => {
    if (!episode?.id && !autosave.draftId) {
      await autosave.saveNow(true);
    }

    setTemplatePickerOpen(true);
  }, [autosave, episode?.id]);

  useEffect(() => {
    const pending = consumePendingTemplateInsert();

    if (pending) {
      setPendingTemplateId(pending);
      setTemplatePickerOpen(true);
    }
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isMeta = event.metaKey || event.ctrlKey;

      if (!isMeta) {
        return;
      }

      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        void autosave.saveNow(true);
        document
          .querySelector<HTMLFormElement>("form[data-studio-chapter-form]")
          ?.requestSubmit();
        return;
      }

      if (viewMode !== "write") {
        return;
      }

      if (event.key.toLowerCase() === "b") {
        event.preventDefault();
        handleFormat("bold");
      }

      if (event.key.toLowerCase() === "i") {
        event.preventDefault();
        handleFormat("italic");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [autosave, handleFormat, viewMode]);

  const pageTitle = episode ? title || "Chỉnh sửa chương" : "Chương mới";
  const reviewDisabledReason = !canSubmitComposerReview
    ? "Sửa lỗi Composer hoặc xác nhận cảnh báo trước khi gửi duyệt"
    : undefined;

  const handleSaveDraftClick = useCallback(() => {
    setPendingIntent("draft");
    void autosave.saveNow(true);
    document
      .querySelector<HTMLFormElement>("form[data-studio-chapter-form]")
      ?.requestSubmit();
  }, [autosave, setPendingIntent]);

  const handleSubmitReviewClick = useCallback(() => {
    if (!canSubmitComposerReview) {
      setValidationFlash(reviewDisabledReason ?? "Không thể gửi duyệt.");
      return;
    }
    setPendingIntent("review");
    document
      .querySelector<HTMLFormElement>("form[data-studio-chapter-form]")
      ?.requestSubmit();
  }, [canSubmitComposerReview, reviewDisabledReason, setPendingIntent]);

  const showProseEditor =
    !(useComposerUi || (usesStructuredStory && presentationEditorMode === "structured"));

  return (
    <div className="space-y-4 pb-24 lg:pb-4">
      <ChapterWorkspaceHeader
        autosave={{
          errorMessage: autosave.errorMessage,
          isDirty: autosave.isDirty,
          lastSavedAt: autosave.lastSavedAt,
          status: autosave.status
        }}
        backHref={backHref}
        canSchedule={canSchedule}
        canSubmitReview={canSubmitComposerReview}
        displayStatus={displayStatus}
        onPublish={() => tryOpenPublishFlow("publish")}
        onSaveDraft={handleSaveDraftClick}
        onSchedule={() => tryOpenPublishFlow("schedule")}
        onSubmitReview={handleSubmitReviewClick}
        onViewModeChange={handleViewModeChange}
        pageTitle={pageTitle}
        pending={pending}
        publishDisabledReason={scheduleDisabledReason}
        reviewDisabledReason={reviewDisabledReason}
        scheduleDisabledReason={scheduleDisabledReason}
        storyTitle={story.title}
        viewMode={viewMode}
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

      {savedDraft && !episode && !autosave.localRecovery ? (
        <p className="rounded-xl border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-sm text-sky-100">
          Đã tải bản nháp autosave gần nhất.
        </p>
      ) : null}

      <form
        action={formAction}
        className="space-y-4"
        data-studio-chapter-form
        onSubmit={handleSubmit}
      >
        <input name="story_id" type="hidden" value={story.id} />
        <input name="return_base_path" type="hidden" value="/studio" />
        {episode ? <input name="episode_id" type="hidden" value={episode.id} /> : null}
        {autosave.draftId ? (
          <input name="studio_draft_id" type="hidden" value={autosave.draftId} />
        ) : null}
        <input name="content" type="hidden" value={formContent} />
        <input name="story_presentation_mode" type="hidden" value={storyPresentationMode} />
        <input
          name="chapter_presentation_mode"
          type="hidden"
          value={presentationSource === "story" ? "" : presentationSource}
        />
        <input
          name="presentation_editor_mode"
          type="hidden"
          value={useComposerUi || presentationEditorMode === "structured" ? "structured" : "plain"}
        />
        <input name="structured_content_json" type="hidden" value={effectiveStructuredJson} />
        <input
          name="content_format"
          type="hidden"
          value={
            useComposerUi
              ? "structured_blocks"
              : usesStructuredStory && presentationEditorMode === "structured"
                ? "structured_json"
                : "plain_text"
          }
        />
        <input name="composer_version" type="hidden" value={useComposerUi ? "1" : ""} />
        <input
          name="composer_warnings_ack"
          type="hidden"
          value={composerWarningsAck ? "on" : ""}
        />
        <input
          name="composer_preview_viewed"
          type="hidden"
          value={viewMode === "preview" ? "1" : ""}
        />
        <input
          name="excerpt"
          type="hidden"
          value={authorNote.trim() || createExcerpt(content)}
        />
        <input name="intent" type="hidden" value={pendingIntent} />

        {viewMode === "preview" ? (
          useComposerUi || usesStructuredStory ? (
            <EditorPresentationPreview
              authorNote={authorNote}
              chapterNumber={episodeNumber}
              content={formContent}
              presentationMode={composerMode as PresentationMode}
              storyTitle={story.title}
              structuredContent={
                useComposerUi
                  ? composerDocument
                  : presentationEditorMode === "structured" && effectiveStructuredJson.trim()
                    ? (() => {
                        try {
                          return JSON.parse(effectiveStructuredJson) as unknown;
                        } catch {
                          return null;
                        }
                      })()
                    : null
              }
              title={title}
            />
          ) : (
            <EditorPreview
              authorNote={authorNote}
              chapterNumber={episodeNumber}
              content={content}
              storyTitle={story.title}
              title={title}
            />
          )
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_17.5rem]">
            <main className="space-y-4">
              <ChapterMetaCard
                disabled={pending}
                episodeNumber={episodeNumber}
                onEpisodeNumberChange={(value) =>
                  handleFieldChange(setEpisodeNumber, value)
                }
                onTitleChange={(value) => handleFieldChange(setTitle, value)}
                storyPublicCode={story.publicCode}
                storySlug={story.slug}
                title={title}
                titleError={validationFlash && !title.trim() ? validationFlash : null}
              />

              <ChapterContentModeCard
                disabled={pending}
                onPresentationChange={handlePresentationChange}
                onSwitchToComposer={() => void handleSwitchToComposer()}
                onSwitchToPlain={handleSwitchToPlain}
                presentationSource={presentationSource}
                storyMode={storyPresentationMode}
                useComposerUi={useComposerUi}
              />

              {validationFlash ? (
                <p
                  className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100"
                  role="alert"
                >
                  {validationFlash}
                </p>
              ) : null}

              {useComposerUi &&
              episode?.validation_status &&
              episode.validation_status !== "valid" ? (
                <div
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    episode.validation_status === "invalid"
                      ? "border-rose-400/30 bg-rose-500/10 text-rose-100"
                      : "border-amber-400/30 bg-amber-500/10 text-amber-100"
                  }`}
                >
                  <p className="font-semibold">
                    {episode.validation_status === "invalid"
                      ? "Composer chưa hợp lệ để gửi duyệt"
                      : "Composer có cảnh báo"}
                  </p>
                  {Array.isArray(episode.validation_errors) &&
                  episode.validation_errors[0]?.message ? (
                    <p className="mt-1 text-xs opacity-90">
                      {episode.validation_errors[0].message}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {composerLoadError ? (
                <p
                  className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100"
                  role="alert"
                >
                  {composerLoadError}
                </p>
              ) : null}

              {useComposerUi ? (
                <ChapMeeStudioComposer
                  fallbackContent={formContent}
                  imageUpload={{
                    draftId: autosave.draftId,
                    episodeId: episode?.id ?? null,
                    storyId: story.id
                  }}
                  mode={composerMode}
                  onChange={(doc) => {
                    setComposerDocument(doc);
                    autosave.markDirty();
                  }}
                  onSaveDraft={() => void autosave.saveNow(true)}
                  onValidate={() => {
                    autosave.markDirty();
                  }}
                  readonly={pending}
                  saveStatusLabel={
                    autosave.lastSavedAt
                      ? `Đã lưu ${new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(autosave.lastSavedAt))}`
                      : null
                  }
                  value={{ ...composerDocument, mode: composerMode }}
                />
              ) : usesStructuredStory ? (
                <div className="space-y-3">
                  <p className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-sm text-violet-100">
                    Chương đang dùng soạn JSON (T6). Khuyến nghị chuyển sang Composer để sửa
                    bằng form.
                  </p>
                  <button
                    className="text-sm font-semibold text-violet-300 underline-offset-2 hover:underline"
                    disabled={pending}
                    onClick={() => void handleSwitchToComposer()}
                    type="button"
                  >
                    Chuyển sang Composer
                  </button>
                  <ChapterPresentationPanel
                    disabled={pending}
                    editorMode={presentationEditorMode}
                    onEditorModeChange={(mode) => {
                      setPresentationEditorMode(mode);
                      autosave.markDirty();
                    }}
                    onStructuredJsonChange={(value) => {
                      setStructuredContentJson(value);
                      autosave.markDirty();
                    }}
                    plainContent={content}
                    storyPresentationMode={storyPresentationMode}
                    structuredJson={structuredContentJson}
                    templateExampleJson={story.formatTemplateExampleJson}
                  />
                </div>
              ) : null}

              {showProseEditor ? (
                <>
                  <ChapterProseEditor
                    canvasRef={canvasRef}
                    content={content}
                    disabled={pending}
                    imageCount={imageCount}
                    imageLimitReached={imageLimitReached}
                    onChange={handleContentChange}
                    onFormat={handleFormat}
                    onInsertImage={() => void handleOpenInsertImage()}
                    onInsertTemplate={() => void handleOpenTemplatePicker()}
                    onRedo={handleRedo}
                    onSaveTemplate={() => setSaveTemplateOpen(true)}
                    onUndo={handleUndo}
                  />
                  <ChapterEditorStatsBar
                    autosave={{
                      errorMessage: autosave.errorMessage,
                      lastSavedAt: autosave.lastSavedAt,
                      status: autosave.status
                    }}
                    characterCount={stats.characterCount}
                    readTimeMinutes={stats.readTimeMinutes}
                    wordCount={stats.wordCount}
                  />
                </>
              ) : null}

              <ChapterSeoSection
                authorDisplayName={authorDisplayName}
                chapterIndexable={chapterIndexable}
                content={formContent}
                disabled={pending}
                episodeNumber={episodeNumber}
                onSeoDescriptionChange={(value) => {
                  setSeoDescription(value);
                  autosave.markDirty();
                }}
                onSeoKeywordsChange={(value) => {
                  setSeoKeywords(value);
                  autosave.markDirty();
                }}
                onSeoTitleChange={(value) => {
                  setSeoTitle(value);
                  autosave.markDirty();
                }}
                seoDescription={seoDescription}
                seoKeywords={seoKeywords}
                seoTitle={seoTitle}
                storyGenreName={story.genreName}
                storyPublicCode={story.publicCode}
                storySlug={story.slug}
                storyTagNames={story.tagNames}
                storyTitle={story.title}
                title={title}
              />
            </main>

            <ChapterWritingSidebar
              acknowledged={acknowledged}
              ackError={ackError}
              authorNote={authorNote}
              canPublish={canSchedule}
              composerDocument={useComposerUi ? composerDocument : null}
              composerMode={composerMode as PresentationMode}
              content={formContent}
              disabled={pending}
              draftId={autosave.draftId}
              episodeId={episode?.id}
              episodeNumber={episodeNumber}
              isSaved={!autosave.isDirty}
              knownComposerMediaIds={knownComposerMediaIds}
              onAckChange={setAcknowledged}
              onAuthorNoteChange={(value) => handleFieldChange(setAuthorNote, value)}
              onComposerWarningsAckChange={setComposerWarningsAck}
              onRestoreVersion={handleRestoreVersion}
              onScrollToComposerBlock={(blockId) => {
                document
                  .getElementById(`composer-block-${blockId}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              onViewPreview={() => handleViewModeChange("preview")}
              previewViewed={hasViewedPreview}
              seoDescription={seoDescription}
              storyContentWarningsConfirmed={story.contentWarningsConfirmed}
              storyId={story.id}
              storyInput={storyPublishInput}
              storyPublicCode={story.publicCode}
              storySlug={story.slug}
              title={title}
              useComposerUi={useComposerUi}
              viewMode={viewMode}
            />
          </div>
        )}

        {state.error ? (
          <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">
            {state.error}
          </p>
        ) : null}
      </form>

      <InsertImageDialog
        content={content}
        draftId={autosave.draftId}
        episodeId={episode?.id ?? null}
        onClose={() => setImageDialogOpen(false)}
        onInsert={(next) => handleContentChange(next)}
        open={imageDialogOpen}
        storyId={story.id}
        textareaRef={canvasRef}
      />

      <TemplatePicker
        content={content}
        defaultType="chapter"
        initialTemplateId={pendingTemplateId}
        onClose={() => {
          setTemplatePickerOpen(false);
          setPendingTemplateId(null);
        }}
        onInsert={(next) => handleContentChange(next)}
        open={templatePickerOpen}
        textareaRef={canvasRef}
      />

      <SaveAsTemplateDialog
        body={content}
        defaultTemplateType="chapter"
        onClose={() => setSaveTemplateOpen(false)}
        open={saveTemplateOpen}
      />

      {publishConfirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-t-2xl border border-white/10 bg-zinc-950 p-5 sm:rounded-2xl">
            <h3 className="text-lg font-bold text-white">Đăng chương ngay?</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Chương sẽ hiển thị công khai cho độc giả. Bạn vẫn có thể chỉnh sửa sau nếu
              chính sách cho phép.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                onClick={() => setPublishConfirmOpen(false)}
                type="button"
                variant="secondary"
              >
                Huỷ
              </Button>
              <Button
                onClick={() => {
                  setPublishConfirmOpen(false);
                  openPublishPanel();
                }}
                type="button"
              >
                Xác nhận đăng
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {publishPanelOpen && canSchedule && episode ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          role="dialog"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-zinc-950 p-4 sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-white">Đăng hoặc lên lịch</h2>
              <button
                className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:bg-white/10"
                onClick={() => setPublishPanelOpen(false)}
                type="button"
              >
                Đóng
              </button>
            </div>

            <ChapterPublishChecklistPanel
              authorNote={authorNote}
              canPublish
              content={content}
              episodeId={episode.id}
              isSaved={!autosave.isDirty}
              seoDescription={seoDescription}
              storyId={story.id}
              storyInput={{
                status: story.status,
                title: story.title,
                visibility: story.visibility
              }}
              title={title}
            />

            <div className="mt-4">
              <SchedulePicker
                onScheduled={() => setPublishPanelOpen(false)}
                storyId={story.id}
                targetId={episode.id}
                targetType="chapter"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
