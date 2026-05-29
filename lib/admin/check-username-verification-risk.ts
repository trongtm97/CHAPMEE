"use server";

import { getActiveUsernamePolicyRules } from "@/lib/username/get-policy-rules";
import { findPolicyViolation } from "@/lib/username/policy-matcher";
import { normalizePolicyText } from "@/lib/username/normalize-policy-text";

const SENSITIVE_PATTERNS = [
  "official",
  "chinhthuc",
  "chinh-thuc",
  "chapofficial",
  "chapmeeofficial",
  "vietnam",
  "viet-nam",
  "vnofficial"
];

export async function checkUsernameVerificationRisk(username: string | null | undefined) {
  if (!username?.trim()) {
    return { risky: false, warning: null as string | null };
  }

  const normalized = normalizePolicyText(username.trim());
  const { rules } = await getActiveUsernamePolicyRules();

  const reserved = findPolicyViolation(rules, {
      normalized,
      raw: username.trim(),
      field: "username",
      userId: null
    }
  );

  const protectedWord = reserved ? null : findPolicyViolation(rules, {
      normalized,
      raw: username.trim(),
      field: "username",
      userId: null
    }
  );

  const sensitivePattern = SENSITIVE_PATTERNS.some((pattern) =>
    normalized.includes(normalizePolicyText(pattern))
  );

  if (reserved || protectedWord || sensitivePattern) {
    return {
      risky: true,
      warning:
        "Username này thuộc nhóm nhạy cảm/được bảo lưu. Hãy kiểm tra trước khi cấp xác thực."
    };
  }

  return { risky: false, warning: null };
}
