import {
  getDefaultComposerAdminSettings,
  isBlockTypeActive,
  isModeActiveForCreators,
  type ComposerAdminSettingsBundle,
  type ComposerValidationSettings
} from "@/lib/composer/composer-settings-defaults";
import { getAllowedBlocksForMode, isBlockAllowedForMode } from "@/lib/composer/modes";
import { parseComposerDocument, isComposerStructuredDocument } from "@/lib/composer/serializer";
import { sanitizePlainContent } from "@/lib/editor/sanitize-content";
import type {
  ComposerBlockUnion,
  ComposerMode,
  ComposerStructuredContent,
  ComposerValidationIssue,
  ComposerValidationLevel,
  ComposerValidationReport
} from "@/lib/composer/types";

const FORBIDDEN_URL_PATTERN = /https?:\/\//i;
const DANGEROUS_HTML_PATTERN =
  /<script\b|<iframe\b|javascript:|on\w+\s*=|<style\b/i;
const DATE_LIKE = /^\d{4}-\d{2}-\d{2}$/;

export type ValidateComposerContentOptions = {
  strictPublish?: boolean;
  settings?: ComposerValidationSettings;
  adminSettings?: ComposerAdminSettingsBundle;
  knownMediaIds?: Set<string>;
  storyContentWarningsConfirmed?: boolean;
  storyHasContentWarnings?: boolean;
  previewViewed?: boolean;
};

function issue(
  level: ComposerValidationLevel,
  code: string,
  message: string,
  blockId?: string,
  field?: string
): ComposerValidationIssue {
  return { level, severity: level, code, message, blockId, field };
}

function push(
  target: ComposerValidationIssue[],
  item: ComposerValidationIssue
) {
  target.push(item);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textHasUnsafeContent(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  if (DANGEROUS_HTML_PATTERN.test(trimmed)) {
    return true;
  }
  if (FORBIDDEN_URL_PATTERN.test(trimmed) && !trimmed.includes("media_id")) {
    return true;
  }
  return false;
}

function scanTextFields(
  block: ComposerBlockUnion,
  errors: ComposerValidationIssue[],
  warnings: ComposerValidationIssue[]
) {
  const raw = JSON.stringify(block.data);
  if (textHasUnsafeContent(raw)) {
    push(
      errors,
      issue(
        "error",
        "UNSAFE_TEXT",
        "Nội dung chứa HTML/script/URL ngoài không được phép.",
        block.id
      )
    );
  }
  const data = block.data as Record<string, unknown>;
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string" && textHasUnsafeContent(value)) {
      push(
        errors,
        issue(
          "error",
          "UNSAFE_TEXT",
          `Trường "${key}" chứa nội dung không an toàn.`,
          block.id,
          `data.${key}`
        )
      );
    }
  }
}

function blockHasExternalUrl(block: ComposerBlockUnion): boolean {
  const raw = JSON.stringify(block.data);
  return FORBIDDEN_URL_PATTERN.test(raw) && !raw.includes("media_id");
}

function isBlockStructurallyEmpty(block: ComposerBlockUnion): boolean {
  const data = block.data as Record<string, unknown>;
  const textFields = [
    "text",
    "content",
    "body",
    "dialogue",
    "action",
    "summary",
    "transcript",
    "title",
    "label",
    "objective",
    "name"
  ];
  for (const key of textFields) {
    if (typeof data[key] === "string" && data[key].trim()) {
      return false;
    }
  }
  if (block.type === "image" && typeof data.media_id === "string" && data.media_id.trim()) {
    return false;
  }
  if (Array.isArray(data.items) && data.items.length > 0) {
    const hasItem = data.items.some((item) => {
      if (!isRecord(item)) {
        return false;
      }
      return Object.values(item).some(
        (v) => (typeof v === "string" && v.trim()) || (typeof v === "number" && v > 0)
      );
    });
    if (hasItem) {
      return false;
    }
  }
  if (block.type === "divider") {
    return false;
  }
  return true;
}

function validateBlockContent(
  mode: ComposerMode,
  block: ComposerBlockUnion,
  options: ValidateComposerContentOptions,
  errors: ComposerValidationIssue[],
  warnings: ComposerValidationIssue[],
  info: ComposerValidationIssue[],
  stats: { empty_blocks: number }
) {
  const strict = options.strictPublish ?? false;
  const emptyLevel: ComposerValidationLevel = strict ? "error" : "warning";

  scanTextFields(block, errors, warnings);

  if (blockHasExternalUrl(block)) {
    push(
      errors,
      issue(
        "error",
        "EXTERNAL_URL",
        "Không được dùng URL ảnh/embed ngoài; dùng media_id nội bộ.",
        block.id
      )
    );
  }

  if (!isBlockAllowedForMode(mode, block.type)) {
    push(
      errors,
      issue(
        "error",
        "BLOCK_NOT_ALLOWED",
        `Block "${block.type}" không được phép trong mode ${mode}.`,
        block.id
      )
    );
  }

  const admin = options.adminSettings ?? getDefaultComposerAdminSettings();
  if (!isBlockTypeActive(admin, mode, block.type)) {
    push(
      errors,
      issue(
        "error",
        "BLOCK_DISABLED",
        `Block "${block.type}" đã bị tắt bởi quản trị viên.`,
        block.id
      )
    );
  }

  if (isBlockStructurallyEmpty(block) && block.type !== "divider") {
    stats.empty_blocks += 1;
    push(
      emptyLevel === "error" ? errors : warnings,
      issue(emptyLevel, "BLOCK_EMPTY", "Block đang trống.", block.id)
    );
  }

  switch (block.type) {
    case "heading":
      if (!(block.data as { text?: string }).text?.trim()) {
        push(errors, issue("error", "BLOCK_EMPTY", "Tiêu đề trống.", block.id, "data.text"));
      }
      break;
    case "prose":
      if (!(block.data as { text?: string }).text?.trim()) {
        push(errors, issue("error", "BLOCK_EMPTY", "Đoạn văn trống.", block.id, "data.text"));
      }
      break;
    case "quote":
      if (!(block.data as { text?: string }).text?.trim()) {
        push(errors, issue("error", "BLOCK_EMPTY", "Trích dẫn trống.", block.id, "data.text"));
      }
      break;
    case "image": {
      const mediaId = (block.data as { media_id?: string }).media_id?.trim() ?? "";
      if (!mediaId) {
        push(
          errors,
          issue("error", "IMAGE_MISSING_MEDIA", "Block ảnh cần media_id nội bộ.", block.id, "data.media_id")
        );
      } else if (options.knownMediaIds && !options.knownMediaIds.has(mediaId)) {
        push(
          errors,
          issue(
            "error",
            "IMAGE_MEDIA_INVALID",
            "media_id không tồn tại hoặc không thuộc truyện này.",
            block.id,
            "data.media_id"
          )
        );
      }
      break;
    }
    case "chat_message": {
      const data = block.data as {
        character_name?: string;
        character_id?: string;
        text?: string;
        side?: string;
        status?: string;
      };
      if (!data.character_name?.trim() && !data.character_id?.trim()) {
        push(
          errors,
          issue(
            "error",
            "CHAT_MISSING_CHARACTER",
            "Tin nhắn cần character_name hoặc character_id.",
            block.id,
            "data.character_name"
          )
        );
      }
      if (!data.text?.trim()) {
        push(errors, issue("error", "CHAT_EMPTY", "Tin nhắn trống.", block.id, "data.text"));
      }
      if (data.side && data.side !== "left" && data.side !== "right") {
        push(
          errors,
          issue("error", "CHAT_INVALID_SIDE", "side phải là left hoặc right.", block.id, "data.side")
        );
      }
      if (
        data.status &&
        !["sent", "delivered", "seen"].includes(data.status)
      ) {
        push(
          errors,
          issue(
            "error",
            "CHAT_INVALID_STATUS",
            "status phải là sent, delivered hoặc seen.",
            block.id,
            "data.status"
          )
        );
      }
      break;
    }
    case "chat_voice_note": {
      const duration = Number((block.data as { duration_seconds?: number }).duration_seconds ?? 0);
      if (duration <= 0) {
        push(
          errors,
          issue(
            "error",
            "VOICE_NOTE_DURATION",
            "Voice note cần duration_seconds > 0.",
            block.id,
            "data.duration_seconds"
          )
        );
      }
      break;
    }
    case "case_summary": {
      const data = block.data as { title?: string; summary?: string };
      if (!data.title?.trim() && !data.summary?.trim()) {
        push(
          errors,
          issue("error", "CASE_SUMMARY_EMPTY", "Tóm tắt vụ án thiếu tiêu đề và nội dung.", block.id)
        );
      }
      break;
    }
    case "case_timeline": {
      const items = (block.data as { items?: Array<{ content?: string }> }).items ?? [];
      if (items.length === 0 || items.every((i) => !i.content?.trim())) {
        push(
          errors,
          issue("error", "CASE_TIMELINE_EMPTY", "Timeline không có mục hợp lệ.", block.id)
        );
      }
      break;
    }
    case "case_evidence": {
      const items =
        (block.data as { items?: Array<{ label?: string; content?: string; media_id?: string | null }> })
          .items ?? [];
      if (
        items.length === 0 ||
        items.every((i) => !i.content?.trim() && !i.label?.trim() && !i.media_id?.trim())
      ) {
        push(
          errors,
          issue("error", "CASE_EVIDENCE_EMPTY", "Bằng chứng không có mục hợp lệ.", block.id)
        );
      }
      break;
    }
    case "case_suspect": {
      if (!(block.data as { name?: string }).name?.trim()) {
        push(
          errors,
          issue("error", "CASE_SUSPECT_NAME", "Nghi phạm thiếu tên.", block.id, "data.name")
        );
      }
      break;
    }
    case "diary_entry": {
      if (!(block.data as { content?: string }).content?.trim()) {
        push(
          errors,
          issue("error", "DIARY_EMPTY", "Mục nhật ký thiếu nội dung.", block.id, "data.content")
        );
      }
      const date = (block.data as { date?: string }).date?.trim();
      if (date && !DATE_LIKE.test(date)) {
        push(
          warnings,
          issue(
            "warning",
            "DIARY_DATE_FORMAT",
            "Ngày nhật ký nên dùng định dạng YYYY-MM-DD.",
            block.id,
            "data.date"
          )
        );
      }
      break;
    }
    case "system_notice": {
      if (!(block.data as { content?: string }).content?.trim()) {
        push(
          errors,
          issue("error", "SYSTEM_NOTICE_EMPTY", "Thông báo hệ thống trống.", block.id, "data.content")
        );
      }
      const tone = (block.data as { tone?: string }).tone;
      if (tone && !["info", "success", "warning", "danger"].includes(tone)) {
        push(
          warnings,
          issue("warning", "SYSTEM_NOTICE_TONE", "tone không hợp lệ.", block.id, "data.tone")
        );
      }
      break;
    }
    case "system_stats": {
      const items = (block.data as { items?: Array<{ label?: string; value?: string }> }).items ?? [];
      if (items.length === 0) {
        push(errors, issue("error", "SYSTEM_STATS_EMPTY", "Stats không có item.", block.id));
      } else if (items.some((i) => !i.label?.trim() || !i.value?.trim())) {
        push(
          errors,
          issue("error", "SYSTEM_STATS_ITEM", "Mỗi stat cần label và value.", block.id, "data.items")
        );
      }
      break;
    }
    case "system_quest": {
      if (!(block.data as { objective?: string }).objective?.trim()) {
        push(
          errors,
          issue("error", "SYSTEM_QUEST_OBJECTIVE", "Nhiệm vụ thiếu objective.", block.id, "data.objective")
        );
      }
      break;
    }
    case "system_reward": {
      const items = (block.data as { items?: unknown[] }).items ?? [];
      if (items.length === 0) {
        push(errors, issue("error", "SYSTEM_REWARD_EMPTY", "Phần thưởng cần ít nhất 1 item.", block.id));
      }
      break;
    }
    case "script_dialogue": {
      const data = block.data as { character_name?: string; dialogue?: string };
      if (!data.character_name?.trim()) {
        push(
          errors,
          issue("error", "SCRIPT_CHARACTER", "Thoại thiếu character_name.", block.id, "data.character_name")
        );
      }
      if (!data.dialogue?.trim()) {
        push(errors, issue("error", "SCRIPT_DIALOGUE", "Thoại trống.", block.id, "data.dialogue"));
      }
      break;
    }
    case "script_action": {
      if (!(block.data as { action?: string }).action?.trim()) {
        push(errors, issue("error", "SCRIPT_ACTION", "Hành động trống.", block.id, "data.action"));
      }
      break;
    }
    case "choice_node": {
      if (!(block.data as { node_id?: string }).node_id?.trim()) {
        push(
          errors,
          issue("error", "BRANCH_NODE_ID", "choice_node cần node_id.", block.id, "data.node_id")
        );
      }
      break;
    }
    case "choice_option": {
      if (!(block.data as { target_node_id?: string }).target_node_id?.trim()) {
        push(
          errors,
          issue(
            "error",
            "BRANCH_TARGET",
            "choice_option cần target_node_id.",
            block.id,
            "data.target_node_id"
          )
        );
      }
      break;
    }
    default:
      break;
  }

  if (block.type === "chat_message" || block.type === "prose") {
    const text =
      block.type === "chat_message"
        ? (block.data as { text?: string }).text ?? ""
        : (block.data as { text?: string }).text ?? "";
    const cleaned = sanitizePlainContent(text);
    if (cleaned !== text.trim() && text.trim()) {
      push(
        info,
        issue("info", "TEXT_SANITIZED", "Một số ký tự không an toàn sẽ bị loại khi hiển thị.", block.id)
      );
    }
  }
}

function validateModeRules(
  doc: ComposerStructuredContent,
  options: ValidateComposerContentOptions,
  errors: ComposerValidationIssue[],
  warnings: ComposerValidationIssue[],
  settings: ComposerValidationSettings
) {
  const blocks = doc.blocks;

  if (doc.mode === "chat_story") {
    const messages = blocks.filter((b) => b.type === "chat_message");
    const systems = blocks.filter((b) => b.type === "chat_system");
    if (systems.length > 0 && messages.length === 0) {
      push(
        warnings,
        issue(
          "warning",
          "CHAT_ONLY_SYSTEM",
          "Chương chỉ có tin hệ thống, chưa có tin nhắn nhân vật."
        )
      );
    }
    const names = messages
      .map((b) => (b.data as { character_name?: string }).character_name?.trim().toLowerCase())
      .filter(Boolean) as string[];
    const unique = new Set(names);
    if (names.length >= 4 && unique.size < names.length - 1) {
      push(
        warnings,
        issue(
          "warning",
          "CHAT_SIMILAR_NAMES",
          "Nhiều tên nhân vật gần giống nhau — kiểm tra chính tả."
        )
      );
    }
  }

  if (doc.mode === "case_file") {
    const summaryIndex = blocks.findIndex((b) => b.type === "case_summary");
    const firstHeavy = blocks.findIndex((b) =>
      ["case_evidence", "case_timeline", "case_suspect"].includes(b.type)
    );
    if (firstHeavy >= 0 && (summaryIndex < 0 || summaryIndex > firstHeavy)) {
      push(
        warnings,
        issue(
          "warning",
          "CASE_SUMMARY_ORDER",
          "Nên đặt case_summary trước timeline/bằng chứng/nghi phạm."
        )
      );
    }
    if (
      blocks.some((b) => ["case_evidence", "case_suspect"].includes(b.type)) &&
      !options.storyHasContentWarnings
    ) {
      push(
        warnings,
        issue(
          "warning",
          "CASE_CONTENT_WARNING",
          "Hồ sơ có bằng chứng/nghi phạm — hãy tự kiểm tra và gắn cảnh báo nội dung truyện nếu cần."
        )
      );
    }
  }

  if (doc.mode === "diary") {
    const emptyDiary = blocks.filter(
      (b) => b.type === "diary_entry" && !(b.data as { content?: string }).content?.trim()
    );
    if (emptyDiary.length > 1) {
      push(
        errors,
        issue("error", "DIARY_MULTIPLE_EMPTY", "Có nhiều mục nhật ký trống.", emptyDiary[0]?.id)
      );
    }
  }

  if (doc.mode === "branching_story") {
    if (!settings.allow_branching_public) {
      push(
        errors,
        issue(
          "error",
          "BRANCHING_DISABLED",
          "Truyện nhánh chưa được bật công khai — không thể xuất bản."
        )
      );
    }
    validateBranchingGraph(doc, settings, errors, warnings);
  }

  if (doc.mode === "mixed_media" && !settings.allow_mixed_media) {
    push(
      errors,
      issue("error", "MIXED_MEDIA_DISABLED", "Mode hỗn hợp đã bị tắt bởi quản trị viên.")
    );
  }
}

function validateBranchingGraph(
  doc: ComposerStructuredContent,
  settings: ComposerValidationSettings,
  errors: ComposerValidationIssue[],
  warnings: ComposerValidationIssue[]
) {
  const nodeBlocks = doc.blocks.filter((b) => b.type === "choice_node");
  const nodeIds = new Set(
    nodeBlocks.map((b) => (b.data as { node_id: string }).node_id).filter(Boolean)
  );

  if (nodeIds.size === 0) {
    push(
      errors,
      issue("error", "BRANCH_NO_NODES", "Truyện nhánh cần ít nhất một choice_node.")
    );
    return;
  }

  const optionsByNode = new Map<string, number>();
  let lastNodeId: string | null = null;

  for (const block of doc.blocks) {
    if (block.type === "choice_node") {
      lastNodeId = (block.data as { node_id: string }).node_id;
      if (!optionsByNode.has(lastNodeId)) {
        optionsByNode.set(lastNodeId, 0);
      }
    }
    if (block.type === "choice_option" && lastNodeId) {
      optionsByNode.set(lastNodeId, (optionsByNode.get(lastNodeId) ?? 0) + 1);
      const target = (block.data as { target_node_id: string }).target_node_id;
      if (target && !nodeIds.has(target)) {
        const level: ComposerValidationLevel = settings.branching_missing_options_is_error
          ? "error"
          : "warning";
        push(
          level === "error" ? errors : warnings,
          issue(
            level,
            "BRANCH_DANGLING",
            `Lựa chọn trỏ tới node không tồn tại (${target}).`,
            block.id,
            "data.target_node_id"
          )
        );
      }
    }
  }

  for (const [nodeId, count] of optionsByNode) {
    if (count === 0) {
      const level: ComposerValidationLevel = settings.branching_missing_options_is_error
        ? "error"
        : "warning";
      push(
        level === "error" ? errors : warnings,
        issue(level, "BRANCH_NO_OPTIONS", `Node "${nodeId}" chưa có lựa chọn.`)
      );
    }
  }

  const referenced = new Set<string>();
  for (const block of doc.blocks) {
    if (block.type === "choice_option") {
      const target = (block.data as { target_node_id: string }).target_node_id;
      if (target) {
        referenced.add(target);
      }
    }
  }
  for (const nodeId of nodeIds) {
    if (!referenced.has(nodeId) && nodeIds.size > 1) {
      push(
        warnings,
        issue("warning", "BRANCH_UNREACHABLE", `Node "${nodeId}" có thể không tới được.`)
      );
    }
  }
}

function validateDocumentStructure(
  raw: unknown,
  mode: ComposerMode,
  errors: ComposerValidationIssue[],
  warnings: ComposerValidationIssue[]
): ComposerStructuredContent | null {
  if (!isComposerStructuredDocument(raw)) {
    push(
      errors,
      issue("error", "INVALID_DOCUMENT", "structured_content không phải Composer v1 hợp lệ.")
    );
    return null;
  }

  const parsed = parseComposerDocument(raw);
  if (!parsed.ok) {
    push(errors, issue("error", "INVALID_DOCUMENT", parsed.error));
    return null;
  }

  if (parsed.data.mode !== mode) {
    push(
      warnings,
      issue(
        "warning",
        "MODE_MISMATCH",
        `Mode trong JSON (${parsed.data.mode}) khác mode yêu cầu (${mode}).`
      )
    );
  }

  const ids = new Set<string>();
  const orders = new Set<number>();
  for (const block of parsed.data.blocks) {
    if (ids.has(block.id)) {
      push(
        errors,
        issue("error", "DUPLICATE_BLOCK_ID", `Block id trùng: ${block.id}.`, block.id)
      );
    }
    ids.add(block.id);
    if (orders.has(block.order)) {
      push(
        warnings,
        issue("warning", "DUPLICATE_ORDER", `Thứ tự block trùng: ${block.order}.`, block.id)
      );
    }
    orders.add(block.order);
    if (!isRecord(block.data)) {
      push(
        errors,
        issue("error", "INVALID_BLOCK_DATA", "data block phải là object.", block.id)
      );
    }
  }

  return parsed.data;
}

function validateLimits(
  doc: ComposerStructuredContent,
  settings: ComposerValidationSettings,
  errors: ComposerValidationIssue[]
) {
  if (doc.blocks.length > settings.max_blocks_per_chapter) {
    push(
      errors,
      issue(
        "error",
        "BLOCK_LIMIT",
        `Vượt giới hạn ${settings.max_blocks_per_chapter} block/chương.`
      )
    );
  }

  for (const block of doc.blocks) {
    if (block.type === "case_timeline") {
      const count = (block.data as { items?: unknown[] }).items?.length ?? 0;
      if (count > settings.max_timeline_items) {
        push(
          errors,
          issue(
            "error",
            "TIMELINE_LIMIT",
            `Timeline vượt ${settings.max_timeline_items} mục.`,
            block.id
          )
        );
      }
    }
    if (block.type === "system_stats") {
      const count = (block.data as { items?: unknown[] }).items?.length ?? 0;
      if (count > settings.max_stats_items) {
        push(
          errors,
          issue("error", "STATS_LIMIT", `Stats vượt ${settings.max_stats_items} mục.`, block.id)
        );
      }
    }
    if (block.type === "case_evidence") {
      const count = (block.data as { items?: unknown[] }).items?.length ?? 0;
      if (count > settings.max_evidence_items) {
        push(
          errors,
          issue(
            "error",
            "EVIDENCE_LIMIT",
            `Bằng chứng vượt ${settings.max_evidence_items} mục.`,
            block.id
          )
        );
      }
    }
  }
}

function validatePublishingContext(
  options: ValidateComposerContentOptions,
  errors: ComposerValidationIssue[],
  warnings: ComposerValidationIssue[],
  settings: ComposerValidationSettings
) {
  if (options.strictPublish && settings.require_preview_before_publish && !options.previewViewed) {
    push(
      warnings,
      issue("warning", "PREVIEW_REQUIRED", "Nên xem trước (preview) trước khi xuất bản.")
    );
  }

  if (options.strictPublish && options.storyContentWarningsConfirmed === false) {
    push(
      errors,
      issue(
        "error",
        "CONTENT_WARNING_UNCONFIRMED",
        "Truyện chưa xác nhận cảnh báo nội dung — không thể xuất bản."
      )
    );
  }
}

/**
 * Central Composer validator — errors block publish, warnings need acknowledgement.
 */
export function validateComposerContent(
  mode: ComposerMode,
  structuredContent: unknown,
  options: ValidateComposerContentOptions = {}
): ComposerValidationReport {
  const admin = options.adminSettings ?? getDefaultComposerAdminSettings();
  const settings = options.settings ?? admin.validation;
  const errors: ComposerValidationIssue[] = [];
  const warnings: ComposerValidationIssue[] = [];
  const info: ComposerValidationIssue[] = [];

  if (!isModeActiveForCreators(admin, mode)) {
    push(
      warnings,
      issue("warning", "MODE_DISABLED", `Mode ${mode} không khả dụng cho tác giả.`)
    );
  }

  const doc = validateDocumentStructure(structuredContent, mode, errors, warnings);
  const stats = {
    block_count: doc?.blocks.length ?? 0,
    media_count: 0,
    empty_blocks: 0,
    unsupported_blocks: 0
  };

  if (!doc) {
    return { valid: false, errors, warnings, info, stats };
  }

  validateLimits(doc, settings, errors);

  for (const block of doc.blocks) {
    if (block.type === "image") {
      stats.media_count += 1;
    }
    if (block.type === "case_evidence") {
      const items = (block.data as { items?: Array<{ media_id?: string | null }> }).items ?? [];
      stats.media_count += items.filter((i) => i.media_id?.trim()).length;
    }
    if (!getAllowedBlocksForMode(doc.mode).includes(block.type)) {
      stats.unsupported_blocks += 1;
    }
    validateBlockContent(doc.mode, block, options, errors, warnings, info, stats);
  }

  validateModeRules(doc, options, errors, warnings, settings);
  validatePublishingContext(options, errors, warnings, settings);

  if (options.strictPublish) {
    const hasRenderable = doc.blocks.some((b) => !isBlockStructurallyEmpty(b));
    if (!hasRenderable) {
      push(
        errors,
        issue("error", "PUBLISH_EMPTY", "Không thể xuất bản: chương không có nội dung hiển thị.")
      );
    }
  }

  if (doc.blocks.length === 0) {
    push(
      options.strictPublish ? errors : warnings,
      issue(
        options.strictPublish ? "error" : "warning",
        "NO_BLOCKS",
        "Chương chưa có block nào."
      )
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info,
    stats
  };
}

export function reportToLegacyResult(report: ComposerValidationReport): {
  ok: boolean;
  errors: ComposerValidationIssue[];
  warnings: ComposerValidationIssue[];
} {
  return {
    ok: report.valid,
    errors: report.errors,
    warnings: report.warnings
  };
}
