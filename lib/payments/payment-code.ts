import { randomInt } from "crypto";

export function generateNumericPaymentCode(length = 12) {
  const safeLength = Math.min(Math.max(length, 8), 18);
  let code = "";
  while (code.length < safeLength) {
    code += String(randomInt(0, 10));
  }
  if (code[0] === "0") {
    code = String(randomInt(1, 10)) + code.slice(1);
  }
  return code;
}

export function extractNumericPaymentCodes(text: string | null | undefined, length = 12) {
  if (!text) return [];
  const matches = text.match(new RegExp(`\\d{${length}}`, "g")) ?? [];
  return [...new Set(matches)];
}
