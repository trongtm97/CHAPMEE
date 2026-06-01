import { parseEpisodePresentationFields } from "@/lib/creator/parse-episode-presentation";
import { modeUsesStructuredContent } from "@/lib/presentation/constants";
import { runComposerImportValidation } from "@/lib/composer/publish-validation";
import { buildPlainContentFallback } from "@/lib/presentation/plain-fallback-content";
import {
  parseSeoDescriptionField,
  parseSeoKeywordsField,
  parseSeoTitleField
} from "@/lib/seo/parse-seo-form";
import { validateKeywordsList } from "@/lib/seo/suggest-keywords";
import { createExcerpt } from "@/lib/text/createExcerpt";
import { countWords } from "@/lib/text/countWords";
import type { ContentFormat, PresentationMode } from "@/types/presentation";

export type EpisodeFormValues = {
  episodeNumber: number;
  title: string;
  content: string;
  excerpt: string;
  wordCount: number;
  status: "draft" | "pending";
  poll: {
    question: string;
    status: "active" | "closed";
    optionTexts: string[];
  } | null;
  monetization: {
    isPaid: boolean;
    coinPrice: number | null;
    freePreviewEnabled: boolean;
    freePreviewPercent: number | null;
    freePreviewChars: number | null;
  };
  earlyAccess: {
    enabled: boolean;
    coinPrice: number | null;
    freeAt: string | null;
    freeAfterHours: number | null;
  };
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
  presentationMode: PresentationMode;
  contentFormat: ContentFormat | null;
  structuredContent: unknown | null;
  chapterPresentationMode: string | null;
};

export type EpisodeValidationResult =
  | { ok: true; values: EpisodeFormValues }
  | { ok: false; error: string };

export function parseEpisodeFormData(formData: FormData): EpisodeValidationResult {
  const episodeNumber = Number(formData.get("episode_number"));
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const excerptInput = String(formData.get("excerpt") ?? "").trim();
  const intent = String(formData.get("intent") ?? "draft");
  const pollQuestion = String(formData.get("poll_question") ?? "").trim();
  const pollStatus = String(formData.get("poll_status") ?? "active");
  const pollOptions = [1, 2, 3, 4].map((index) =>
    String(formData.get(`poll_option_${index}`) ?? "").trim()
  );
  const isPaid = formData.get("is_paid") === "true";
  const coinPriceRaw = String(formData.get("coin_price") ?? "").trim();
  const freePreviewEnabled = formData.get("free_preview_enabled") === "true";
  const freePreviewPercentRaw = String(
    formData.get("free_preview_percent") ?? ""
  ).trim();
  const freePreviewCharsRaw = String(
    formData.get("free_preview_chars") ?? ""
  ).trim();
  const earlyAccessEnabled = formData.get("early_access_enabled") === "true";
  const earlyAccessCoinPriceRaw = String(
    formData.get("early_access_coin_price") ?? ""
  ).trim();
  const earlyAccessFreeAtRaw = String(
    formData.get("early_access_free_at") ?? ""
  ).trim();
  const earlyAccessFreeAfterHoursRaw = String(
    formData.get("early_access_free_after_hours") ?? ""
  ).trim();

  if (!Number.isInteger(episodeNumber) || episodeNumber <= 0) {
    return { ok: false, error: "Vui lòng nhập số chap hợp lệ." };
  }

  if (!title) {
    return { ok: false, error: "Vui lòng nhập tiêu đề chap." };
  }

  const storyPresentationMode = String(
    formData.get("story_presentation_mode") ?? "standard_prose"
  ).trim();

  const presentationParsed = parseEpisodePresentationFields(
    formData,
    storyPresentationMode
  );
  if (!presentationParsed.ok) {
    return presentationParsed;
  }

  const usesStructured =
    modeUsesStructuredContent(presentationParsed.values.presentationMode) &&
    presentationParsed.values.structuredContent !== null &&
    (presentationParsed.values.contentFormat === "structured_json" ||
      presentationParsed.values.contentFormat === "structured_blocks");

  if (!content && !usesStructured) {
    return { ok: false, error: "Vui lòng nhập nội dung chap." };
  }

  if (!usesStructured && content.length < 100) {
    return {
      ok: false,
      error: "Nội dung chap nên có ít nhất 100 ký tự."
    };
  }

  if (usesStructured && content.length > 0 && content.length < 20) {
    return {
      ok: false,
      error:
        "Bản văn xuôi dự phòng (nếu có) nên có ít nhất 20 ký tự hoặc để trống."
    };
  }

  if (
    intent === "review" &&
    presentationParsed.values.contentFormat === "structured_blocks" &&
    presentationParsed.values.structuredContent
  ) {
    const composerCheck = runComposerImportValidation(
      presentationParsed.values.presentationMode,
      presentationParsed.values.structuredContent
    );
    if (!composerCheck.ok) {
      return { ok: false, error: composerCheck.error };
    }
  }

  if (intent === "review" && formData.get("guidelines_ack") !== "on") {
    return {
      ok: false,
      error:
        "Vui lòng xác nhận tuân thủ Quy định cộng đồng trước khi gửi chương duyệt."
    };
  }

  const hasPollInput = Boolean(pollQuestion || pollOptions.some(Boolean));
  const validPollOptions = pollOptions.filter(Boolean);

  if (hasPollInput) {
    if (!pollQuestion) {
      return { ok: false, error: "Vui lòng nhập câu hỏi poll." };
    }

    if (validPollOptions.length < 2) {
      return { ok: false, error: "Poll cần ít nhất 2 lựa chọn." };
    }
  }

  const seoKeywords = parseSeoKeywordsField(formData);
  const keywordCheck = validateKeywordsList(seoKeywords);

  if (!keywordCheck.ok) {
    return { ok: false, error: keywordCheck.error };
  }

  const resolvedContent = usesStructured
    ? buildPlainContentFallback(
        presentationParsed.values.presentationMode,
        presentationParsed.values.structuredContent,
        content
      )
    : content;

  return {
    ok: true,
    values: {
      episodeNumber,
      title,
      content: resolvedContent,
      excerpt:
        excerptInput ||
        createExcerpt(
          content ||
            (usesStructured
              ? JSON.stringify(presentationParsed.values.structuredContent)
              : "")
        ),
      wordCount: usesStructured
        ? Math.max(1, countWords(JSON.stringify(presentationParsed.values.structuredContent)))
        : countWords(content),
      status: intent === "review" ? "pending" : "draft",
      poll: hasPollInput
        ? {
            optionTexts: pollOptions,
            question: pollQuestion,
            status: pollStatus === "closed" ? "closed" : "active"
          }
        : null,
      monetization: {
        isPaid,
        coinPrice: coinPriceRaw && Number.isFinite(Number(coinPriceRaw))
          ? Number(coinPriceRaw)
          : null,
        freePreviewEnabled,
        freePreviewPercent: freePreviewPercentRaw
          ? Number.isFinite(Number(freePreviewPercentRaw))
            ? Number(freePreviewPercentRaw)
            : null
          : null,
        freePreviewChars: freePreviewCharsRaw
          ? Number.isFinite(Number(freePreviewCharsRaw))
            ? Number(freePreviewCharsRaw)
            : null
          : null,
      },
      earlyAccess: {
        enabled: earlyAccessEnabled,
        coinPrice: earlyAccessCoinPriceRaw
          ? Number.isFinite(Number(earlyAccessCoinPriceRaw))
            ? Number(earlyAccessCoinPriceRaw)
            : null
          : null,
        freeAt: earlyAccessFreeAtRaw ? new Date(earlyAccessFreeAtRaw).toISOString() : null,
        freeAfterHours: earlyAccessFreeAfterHoursRaw
          ? Number.isFinite(Number(earlyAccessFreeAfterHoursRaw))
            ? Number(earlyAccessFreeAfterHoursRaw)
            : null
          : null
      },
      seoTitle: parseSeoTitleField(formData) || null,
      seoDescription: parseSeoDescriptionField(formData) || null,
      seoKeywords,
      presentationMode: presentationParsed.values.presentationMode,
      contentFormat: presentationParsed.values.contentFormat,
      structuredContent: presentationParsed.values.structuredContent,
      chapterPresentationMode: presentationParsed.values.chapterPresentationMode
    }
  };
}
