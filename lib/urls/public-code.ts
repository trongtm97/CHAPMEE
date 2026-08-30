import { randomInt } from "node:crypto";

import {
  ENTITY_TABLE,
  PUBLIC_CODE_DEFAULT_LENGTH,
  PUBLIC_CODE_MAX_LENGTH,
  PUBLIC_CODE_MIN_LENGTH,
  NUMERIC_PUBLIC_CODE_REGEX,
  type PublicEntityType
} from "@/lib/urls/constants";

export function isValidNumericPublicCode(code: string): boolean {
  return NUMERIC_PUBLIC_CODE_REGEX.test(code);
}

/**
 * Generate a crypto-safe numeric string (first digit 1–9, rest 0–9).
 */
export function generateNumericCodeString(
  length = PUBLIC_CODE_DEFAULT_LENGTH
): string {
  if (length < PUBLIC_CODE_MIN_LENGTH || length > PUBLIC_CODE_MAX_LENGTH) {
    throw new Error(
      `public_code length must be between ${PUBLIC_CODE_MIN_LENGTH} and ${PUBLIC_CODE_MAX_LENGTH}`
    );
  }

  let code = String(randomInt(1, 10));
  for (let i = 1; i < length; i += 1) {
    code += String(randomInt(0, 10));
  }
  return code;
}

export async function isPublicCodeTaken(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  entityType: PublicEntityType,
  code: string
): Promise<boolean> {
  const table = ENTITY_TABLE[entityType];
  const { data } = await db
    .from(table)
    .select("id")
    .eq("public_code", code)
    .maybeSingle();
  return Boolean(data);
}

export async function generateNumericPublicCode(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  entityType: PublicEntityType,
  options?: { length?: number; maxRetries?: number }
): Promise<string> {
  const length = options?.length ?? PUBLIC_CODE_DEFAULT_LENGTH;
  const maxRetries = options?.maxRetries ?? 8;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const code = generateNumericCodeString(length);
    const taken = await isPublicCodeTaken(db, entityType, code);
    if (!taken) {
      return code;
    }
  }

  throw new Error(
    `Không thể tạo public_code duy nhất cho ${entityType} sau ${maxRetries} lần thử.`
  );
}
