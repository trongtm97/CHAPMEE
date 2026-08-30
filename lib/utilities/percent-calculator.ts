import { cleanMoneyInput as cleanMoneyInputString } from "@/lib/utilities/money-to-words-vn";

export type PercentageMode =
  | "percent_of_number"
  | "number_is_what_percent"
  | "increase_decrease"
  | "percent_change"
  | "discount_price"
  | "original_price";

export type ChangeType = "increase" | "decrease";

export interface PercentOfNumberInput {
  percent: number;
  value: number;
}

export interface NumberIsWhatPercentInput {
  part: number;
  total: number;
}

export interface IncreaseDecreaseInput {
  originalValue: number;
  percent: number;
  changeType: ChangeType;
}

export interface PercentChangeInput {
  oldValue: number;
  newValue: number;
}

export interface DiscountPriceInput {
  originalPrice: number;
  discountPercent: number;
}

export interface OriginalPriceInput {
  finalPrice: number;
  discountPercent: number;
}

export interface PercentageResult {
  mainValue: number;
  secondaryValue?: number;
  percentValue?: number;
  mainLabel: string;
  secondaryLabel?: string;
  label: string;
  description: string;
}

export const PERCENTAGE_MODE_LABELS: Record<PercentageMode, string> = {
  percent_of_number: "Tính % của một số",
  number_is_what_percent: "Tính tỷ lệ %",
  increase_decrease: "Tăng / giảm %",
  percent_change: "Phần trăm thay đổi",
  discount_price: "Giá sau giảm giá",
  original_price: "Tìm giá gốc"
};

export const PERCENTAGE_MODE_QUESTIONS: Record<PercentageMode, string> = {
  percent_of_number: "X% của Y bằng bao nhiêu?",
  number_is_what_percent: "A là bao nhiêu % của B?",
  increase_decrease: "Tăng hoặc giảm X% từ một giá trị ban đầu",
  percent_change: "Từ giá trị cũ sang giá trị mới thay đổi bao nhiêu %?",
  discount_price: "Giá sau khi giảm X% là bao nhiêu?",
  original_price: "Biết giá sau giảm và % giảm, giá gốc là bao nhiêu?"
};

export const PERCENTAGE_MODE_FORMULAS: Record<PercentageMode, string[]> = {
  percent_of_number: ["Kết quả = Giá trị × Phần trăm / 100"],
  number_is_what_percent: ["Tỷ lệ phần trăm = A / B × 100"],
  increase_decrease: [
    "Tăng: Giá trị mới = Giá trị ban đầu × (1 + phần trăm / 100)",
    "Giảm: Giá trị mới = Giá trị ban đầu × (1 - phần trăm / 100)"
  ],
  percent_change: ["Phần trăm thay đổi = (Giá trị mới - Giá trị cũ) / Giá trị cũ × 100"],
  discount_price: [
    "Số tiền giảm = Giá gốc × phần trăm giảm / 100",
    "Giá sau giảm = Giá gốc - số tiền giảm"
  ],
  original_price: ["Giá gốc = Giá sau giảm / (1 - phần trăm giảm / 100)"]
};

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function cleanNumberInput(input: string): number {
  const cleaned = cleanMoneyInputString(input);
  if (!cleaned) return NaN;

  const normalized = cleaned.replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return NaN;

  return parsed;
}

export function cleanPercentInput(input: string): number {
  let value = input.trim();
  if (!value) return NaN;

  value = value.replace(/%/g, "").replace(/\s+/g, "").replace(",", ".");
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return NaN;

  return parsed;
}

export function formatNumberVN(value: number): string {
  const rounded = roundTo2(value);
  const sign = rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);
  const intPart = Math.floor(abs);
  const decimal = abs - intPart;

  const formattedInt = intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  if (decimal < 0.000_000_1) {
    return `${sign}${formattedInt}`;
  }

  const decimalStr = decimal
    .toFixed(2)
    .slice(2)
    .replace(/0+$/, "");

  return decimalStr ? `${sign}${formattedInt},${decimalStr}` : `${sign}${formattedInt}`;
}

export function formatPercentVN(value: number): string {
  const rounded = roundTo2(value);
  const sign = rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);
  const intPart = Math.floor(abs);
  const decimal = abs - intPart;

  if (decimal < 0.000_000_1) {
    return `${sign}${intPart}%`;
  }

  const decimalStr = decimal
    .toFixed(2)
    .slice(2)
    .replace(/0+$/, "");

  return decimalStr ? `${sign}${intPart},${decimalStr}%` : `${sign}${intPart}%`;
}

function validateNumberField(value: string): { isValid: boolean; number?: number; error?: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { isValid: false, error: "Vui lòng nhập số hợp lệ." };
  }

  const number = cleanNumberInput(value);
  if (!Number.isFinite(number)) {
    return { isValid: false, error: "Vui lòng nhập số hợp lệ." };
  }

  return { isValid: true, number };
}

function validatePercentField(value: string): { isValid: boolean; percent?: number; error?: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { isValid: false, error: "Vui lòng nhập phần trăm hợp lệ." };
  }

  const percent = cleanPercentInput(value);
  if (!Number.isFinite(percent)) {
    return { isValid: false, error: "Vui lòng nhập phần trăm hợp lệ." };
  }

  return { isValid: true, percent };
}

export function validatePercentageInput(
  mode: PercentageMode,
  input: Record<string, string | ChangeType>
): { isValid: boolean; error?: string } {
  switch (mode) {
    case "percent_of_number": {
      const percentValidation = validatePercentField(String(input.percent ?? ""));
      if (!percentValidation.isValid) return { isValid: false, error: percentValidation.error };

      const valueValidation = validateNumberField(String(input.value ?? ""));
      if (!valueValidation.isValid) return { isValid: false, error: valueValidation.error };

      return { isValid: true };
    }
    case "number_is_what_percent": {
      const partValidation = validateNumberField(String(input.part ?? ""));
      if (!partValidation.isValid) return { isValid: false, error: partValidation.error };

      const totalValidation = validateNumberField(String(input.total ?? ""));
      if (!totalValidation.isValid) return { isValid: false, error: totalValidation.error };

      if (totalValidation.number === 0) {
        return { isValid: false, error: "Giá trị B phải khác 0." };
      }

      return { isValid: true };
    }
    case "increase_decrease": {
      const originalValidation = validateNumberField(String(input.originalValue ?? ""));
      if (!originalValidation.isValid) return { isValid: false, error: originalValidation.error };

      const percentValidation = validatePercentField(String(input.percent ?? ""));
      if (!percentValidation.isValid) return { isValid: false, error: percentValidation.error };

      const changeType = input.changeType as ChangeType;
      if (changeType === "decrease" && percentValidation.percent! > 100) {
        return {
          isValid: false,
          error: "Phần trăm giảm lớn hơn 100% sẽ làm kết quả âm. Vui lòng kiểm tra lại."
        };
      }

      return { isValid: true };
    }
    case "percent_change": {
      const oldValidation = validateNumberField(String(input.oldValue ?? ""));
      if (!oldValidation.isValid) return { isValid: false, error: oldValidation.error };

      const newValidation = validateNumberField(String(input.newValue ?? ""));
      if (!newValidation.isValid) return { isValid: false, error: newValidation.error };

      if (oldValidation.number === 0) {
        return { isValid: false, error: "Giá trị cũ phải khác 0 để tính phần trăm thay đổi." };
      }

      return { isValid: true };
    }
    case "discount_price": {
      const priceValidation = validateNumberField(String(input.originalPrice ?? ""));
      if (!priceValidation.isValid) return { isValid: false, error: priceValidation.error };

      const percentValidation = validatePercentField(String(input.discountPercent ?? ""));
      if (!percentValidation.isValid) return { isValid: false, error: percentValidation.error };

      if (percentValidation.percent! > 100) {
        return {
          isValid: false,
          error: "Phần trăm giảm lớn hơn 100% sẽ làm kết quả âm. Vui lòng kiểm tra lại."
        };
      }

      return { isValid: true };
    }
    case "original_price": {
      const finalValidation = validateNumberField(String(input.finalPrice ?? ""));
      if (!finalValidation.isValid) return { isValid: false, error: finalValidation.error };

      const percentValidation = validatePercentField(String(input.discountPercent ?? ""));
      if (!percentValidation.isValid) return { isValid: false, error: percentValidation.error };

      if (percentValidation.percent! >= 100) {
        return { isValid: false, error: "Phần trăm giảm phải nhỏ hơn 100%." };
      }

      return { isValid: true };
    }
    default:
      return { isValid: false, error: "Vui lòng nhập số hợp lệ." };
  }
}

export function calculatePercentOfNumber(input: PercentOfNumberInput): PercentageResult {
  const result = roundTo2((input.value * input.percent) / 100);

  return {
    mainValue: result,
    percentValue: input.percent,
    mainLabel: "Kết quả",
    label: formatNumberVN(result),
    description: `${formatPercentVN(input.percent)} của ${formatNumberVN(input.value)} là ${formatNumberVN(result)}`
  };
}

export function calculateNumberIsWhatPercent(input: NumberIsWhatPercentInput): PercentageResult {
  const percent = roundTo2((input.part / input.total) * 100);

  return {
    mainValue: percent,
    mainLabel: "Kết quả",
    label: formatPercentVN(percent),
    description: `${formatNumberVN(input.part)} bằng ${formatPercentVN(percent)} của ${formatNumberVN(input.total)}`
  };
}

export function calculateIncreaseDecrease(input: IncreaseDecreaseInput): PercentageResult {
  let newValue: number;
  let difference: number;

  if (input.changeType === "increase") {
    newValue = input.originalValue * (1 + input.percent / 100);
    difference = newValue - input.originalValue;
  } else {
    newValue = input.originalValue * (1 - input.percent / 100);
    difference = input.originalValue - newValue;
  }

  const roundedNew = roundTo2(newValue);
  const roundedDiff = roundTo2(difference);
  const changeLabel = input.changeType === "increase" ? "Tăng" : "Giảm";

  return {
    mainValue: roundedNew,
    secondaryValue: roundedDiff,
    mainLabel: "Giá trị mới",
    secondaryLabel: "Chênh lệch",
    label: formatNumberVN(roundedNew),
    description: `${changeLabel} ${formatPercentVN(input.percent)} từ ${formatNumberVN(input.originalValue)} còn ${formatNumberVN(roundedNew)}`
  };
}

export function calculatePercentChange(input: PercentChangeInput): PercentageResult {
  const percentChange = roundTo2(((input.newValue - input.oldValue) / input.oldValue) * 100);
  const difference = roundTo2(input.newValue - input.oldValue);
  const isIncrease = percentChange >= 0;
  const direction = isIncrease ? "Tăng" : "Giảm";
  const absPercent = Math.abs(percentChange);
  const movement = isIncrease ? "lên" : "xuống";

  return {
    mainValue: percentChange,
    secondaryValue: difference,
    percentValue: percentChange,
    mainLabel: "Mức thay đổi",
    secondaryLabel: "Chênh lệch",
    label: `${direction} ${formatPercentVN(absPercent)}`,
    description: `Từ ${formatNumberVN(input.oldValue)} ${movement} ${formatNumberVN(input.newValue)} là ${direction.toLowerCase()} ${formatPercentVN(absPercent)}`
  };
}

export function calculateDiscountPrice(input: DiscountPriceInput): PercentageResult {
  const discountAmount = roundTo2((input.originalPrice * input.discountPercent) / 100);
  const finalPrice = roundTo2(input.originalPrice - discountAmount);

  return {
    mainValue: finalPrice,
    secondaryValue: discountAmount,
    mainLabel: "Giá sau giảm",
    secondaryLabel: "Số tiền giảm",
    label: formatNumberVN(finalPrice),
    description: `Giá gốc ${formatNumberVN(input.originalPrice)} giảm ${formatPercentVN(input.discountPercent)} còn ${formatNumberVN(finalPrice)}`
  };
}

export function calculateOriginalPrice(input: OriginalPriceInput): PercentageResult {
  const originalPrice = roundTo2(input.finalPrice / (1 - input.discountPercent / 100));
  const discountAmount = roundTo2(originalPrice - input.finalPrice);

  return {
    mainValue: originalPrice,
    secondaryValue: discountAmount,
    mainLabel: "Giá gốc",
    secondaryLabel: "Số tiền đã giảm",
    label: formatNumberVN(originalPrice),
    description: `Giá sau giảm ${formatNumberVN(input.finalPrice)} với mức giảm ${formatPercentVN(input.discountPercent)} thì giá gốc là ${formatNumberVN(originalPrice)}`
  };
}

export function calculateByMode(
  mode: PercentageMode,
  input: Record<string, string | ChangeType>
): PercentageResult {
  switch (mode) {
    case "percent_of_number":
      return calculatePercentOfNumber({
        percent: cleanPercentInput(String(input.percent)),
        value: cleanNumberInput(String(input.value))
      });
    case "number_is_what_percent":
      return calculateNumberIsWhatPercent({
        part: cleanNumberInput(String(input.part)),
        total: cleanNumberInput(String(input.total))
      });
    case "increase_decrease":
      return calculateIncreaseDecrease({
        originalValue: cleanNumberInput(String(input.originalValue)),
        percent: cleanPercentInput(String(input.percent)),
        changeType: input.changeType as ChangeType
      });
    case "percent_change":
      return calculatePercentChange({
        oldValue: cleanNumberInput(String(input.oldValue)),
        newValue: cleanNumberInput(String(input.newValue))
      });
    case "discount_price":
      return calculateDiscountPrice({
        originalPrice: cleanNumberInput(String(input.originalPrice)),
        discountPercent: cleanPercentInput(String(input.discountPercent))
      });
    case "original_price":
      return calculateOriginalPrice({
        finalPrice: cleanNumberInput(String(input.finalPrice)),
        discountPercent: cleanPercentInput(String(input.discountPercent))
      });
    default:
      throw new Error(`Unknown mode: ${mode satisfies never}`);
  }
}

export function formatPercentageResultForCopy(mode: PercentageMode, result: PercentageResult): string {
  const lines = [`Kết quả tính phần trăm — ${PERCENTAGE_MODE_LABELS[mode]}:`, `${result.mainLabel}: ${result.label}`];

  if (result.secondaryLabel && result.secondaryValue !== undefined) {
    const secondaryDisplay =
      mode === "percent_change" && result.secondaryLabel === "Chênh lệch"
        ? formatNumberVN(result.secondaryValue)
        : mode === "number_is_what_percent"
          ? result.label
          : formatNumberVN(result.secondaryValue);
    lines.push(`${result.secondaryLabel}: ${secondaryDisplay}`);
  }

  lines.push(`Diễn giải: ${result.description}`);
  return lines.join("\n");
}
