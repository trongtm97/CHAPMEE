import { createHash } from "node:crypto";
import { SNIPPET_CODE_MAX_BYTES } from "@/lib/snippets/constants";
import {
  inlineScriptSource,
  looksLikeSnippetHtml,
  parseSnippetMarkup
} from "@/lib/snippets/parse-snippet-markup";
import type { SnippetFormInput, SnippetType, SnippetValidationResult } from "@/lib/snippets/types";

const HIGH_RISK_SCRIPT_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /document\.cookie/i, label: "document.cookie" },
  { pattern: /localStorage/i, label: "localStorage" },
  { pattern: /sessionStorage/i, label: "sessionStorage" },
  { pattern: /\bfetch\s*\(/i, label: "fetch()" },
  { pattern: /XMLHttpRequest/i, label: "XMLHttpRequest" },
  { pattern: /\beval\s*\(/i, label: "eval()" },
  { pattern: /new\s+Function\s*\(/i, label: "new Function()" },
  { pattern: /javascript:/i, label: "javascript:" }
];

const BLOCKED_SCRIPT_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\beval\s*\(/i, label: "eval()" },
  { pattern: /new\s+Function\s*\(/i, label: "new Function()" }
];

const SUSPICIOUS_CSS_PATTERNS = [
  /expression\s*\(/i,
  /javascript:/i,
  /behavior\s*:/i,
  /-moz-binding/i
];

const OBFUSCATED_PATTERN = /[A-Za-z0-9+/]{200,}={0,2}/;

export function computeSnippetChecksum(code: string) {
  return createHash("sha256").update(code, "utf8").digest("hex");
}

function byteLength(value: string) {
  return Buffer.byteLength(value, "utf8");
}

function collectScriptRisks(code: string) {
  const warnings: string[] = [];
  let blocked = false;

  for (const { pattern, label } of BLOCKED_SCRIPT_PATTERNS) {
    if (pattern.test(code)) {
      blocked = true;
      warnings.push(`Bị chặn: ${label}`);
    }
  }

  for (const { pattern, label } of HIGH_RISK_SCRIPT_PATTERNS) {
    if (pattern.test(code)) {
      warnings.push(`Cảnh báo cao: ${label}`);
    }
  }

  if (OBFUSCATED_PATTERN.test(code)) {
    warnings.push("Cảnh báo: chuỗi mã hoá/base64 dài");
  }

  return { warnings, blocked };
}

function validateCss(code: string): SnippetValidationResult {
  const warnings: string[] = [];
  if (/@import\s+/i.test(code)) {
    warnings.push("Cảnh báo: @import URL ngoài có thể ảnh hưởng hiệu năng");
  }
  for (const pattern of SUSPICIOUS_CSS_PATTERNS) {
    if (pattern.test(code)) {
      return {
        status: "block",
        message: "CSS chứa mẫu không an toàn.",
        warnings: ["Bị chặn: mẫu CSS nguy hiểm"],
        blocked: true,
        requiresSuperConfirm: false
      };
    }
  }
  if (warnings.length) {
    return {
      status: "warn",
      message: warnings.join("; "),
      warnings,
      blocked: false,
      requiresSuperConfirm: false
    };
  }
  return {
    status: "ok",
    message: "CSS hợp lệ.",
    warnings: [],
    blocked: false,
    requiresSuperConfirm: false
  };
}

function validateScriptOrHtmlPaste(
  code: string,
  confirmHighRisk: boolean
): SnippetValidationResult {
  if (!looksLikeSnippetHtml(code)) {
    return validateScript(code, confirmHighRisk);
  }

  const parsed = parseSnippetMarkup(code);
  const inline = inlineScriptSource(code);
  if (inline.trim()) {
    const scriptResult = validateScript(inline, confirmHighRisk);
    if (scriptResult.blocked || scriptResult.requiresSuperConfirm || scriptResult.warnings.length) {
      return scriptResult;
    }
  }

  if (parsed.scripts.length === 0 && parsed.headElements.length === 0) {
    return validateScript(code, confirmHighRisk);
  }

  const message =
    parsed.headElements.length > 0 && parsed.scripts.length > 0
      ? "HTML script/meta/link sẽ được parse và inject đúng vị trí."
      : parsed.headElements.length > 0
        ? "Meta/link sẽ được chèn vào <head>."
        : "Thẻ <script> HTML sẽ được parse và inject đúng vị trí.";

  return {
    status: "ok",
    message,
    warnings: [],
    blocked: false,
    requiresSuperConfirm: false
  };
}

function validateScript(code: string, confirmHighRisk: boolean): SnippetValidationResult {
  const { warnings, blocked } = collectScriptRisks(code);
  if (blocked) {
    return {
      status: "block",
      message: "Script chứa mẫu bị cấm (eval / new Function).",
      warnings,
      blocked: true,
      requiresSuperConfirm: false
    };
  }
  const requiresSuperConfirm = warnings.some((w) => w.startsWith("Cảnh báo cao"));
  if (requiresSuperConfirm && !confirmHighRisk) {
    return {
      status: "warn",
      message: "Cần xác nhận quyền cao nhất trước khi lưu/kích hoạt.",
      warnings,
      blocked: false,
      requiresSuperConfirm: true
    };
  }
  if (warnings.length) {
    return {
      status: "warn",
      message: warnings.join("; "),
      warnings,
      blocked: false,
      requiresSuperConfirm
    };
  }
  return {
    status: "ok",
    message: "Script đã qua kiểm tra cơ bản.",
    warnings: [],
    blocked: false,
    requiresSuperConfirm: false
  };
}

function validateSafeHtml(code: string): SnippetValidationResult {
  if (/<script\b/i.test(code) || /<iframe\b/i.test(code) || /<form\b/i.test(code)) {
    return {
      status: "block",
      message: "HTML an toàn không cho phép script/iframe/form — dùng loại Script snippet.",
      warnings: [],
      blocked: true,
      requiresSuperConfirm: false
    };
  }

  const hasHeadTags = /<\s*(meta|link)\b/i.test(code);
  const message = hasHeadTags
    ? "Meta/link sẽ vào <head>; phần HTML còn lại render trong body."
    : "HTML sẽ được sanitize trước khi render.";

  if (/on\w+\s*=/i.test(code) || /javascript:/i.test(code)) {
    return {
      status: "warn",
      message: "Thuộc tính sự kiện hoặc javascript: sẽ bị loại khi render.",
      warnings: ["onclick/onerror/onload/javascript: sẽ bị strip"],
      blocked: false,
      requiresSuperConfirm: false
    };
  }
  return {
    status: "ok",
    message,
    warnings: [],
    blocked: false,
    requiresSuperConfirm: false
  };
}

export function validateSnippetInput(
  input: Pick<SnippetFormInput, "type" | "code" | "confirmHighRisk">
): SnippetValidationResult {
  const code = input.code ?? "";
  if (!code.trim()) {
    return {
      status: "block",
      message: "Nội dung snippet không được trống.",
      warnings: [],
      blocked: true,
      requiresSuperConfirm: false
    };
  }
  if (byteLength(code) > SNIPPET_CODE_MAX_BYTES) {
    return {
      status: "block",
      message: `Vượt giới hạn ${SNIPPET_CODE_MAX_BYTES} bytes.`,
      warnings: [],
      blocked: true,
      requiresSuperConfirm: false
    };
  }

  switch (input.type as SnippetType) {
    case "custom_css":
      return validateCss(code);
    case "head_script":
    case "body_start_script":
    case "footer_script":
      return validateScriptOrHtmlPaste(code, Boolean(input.confirmHighRisk));
    case "safe_html":
      return validateSafeHtml(code);
    default:
      return {
        status: "block",
        message: "Loại snippet không hợp lệ.",
        warnings: [],
        blocked: true,
        requiresSuperConfirm: false
      };
  }
}

export function validationStatusFromResult(result: SnippetValidationResult) {
  if (result.blocked) return "error" as const;
  if (result.status === "warn") return "warn" as const;
  return "ok" as const;
}
