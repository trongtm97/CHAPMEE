import {
  parseSeoDescriptionField,
  parseSeoKeywordsField,
  parseSeoTitleField
} from "@/lib/seo/parse-seo-form";
import { validateKeywordsList } from "@/lib/seo/suggest-keywords";
import { createExcerpt } from "@/lib/text/createExcerpt";
import { countWords } from "@/lib/text/countWords";

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

  if (!content) {
    return { ok: false, error: "Vui lòng nhập nội dung chap." };
  }

  if (content.length < 100) {
    return {
      ok: false,
      error: "Nội dung chap nên có ít nhất 100 ký tự."
    };
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

  return {
    ok: true,
    values: {
      episodeNumber,
      title,
      content,
      excerpt: excerptInput || createExcerpt(content),
      wordCount: countWords(content),
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
      seoKeywords
    }
  };
}
