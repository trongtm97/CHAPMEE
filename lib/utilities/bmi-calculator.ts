export type BmiLevel =
  | "underweight"
  | "normal"
  | "overweight"
  | "obese_1"
  | "obese_2"
  | "obese_3";

export interface BmiInput {
  weightKg: number;
  heightCm: number;
}

export interface BmiClassification {
  label: string;
  level: BmiLevel;
  message: string;
}

export interface BmiHealthyWeightRange {
  min: number;
  max: number;
}

export interface BmiResult {
  bmi: number;
  bmiFormatted: string;
  category: string;
  level: BmiLevel;
  message: string;
  healthyWeightRange: BmiHealthyWeightRange;
  weightKg: number;
  heightCm: number;
}

export interface BmiValidationResult {
  isValid: boolean;
  weightKg?: number;
  heightCm?: number;
  error?: string;
}

export const MIN_WEIGHT_KG = 10;
export const MAX_WEIGHT_KG = 500;
export const MIN_HEIGHT_CM = 50;
export const MAX_HEIGHT_CM = 250;

const WEIGHT_RANGE_ERROR = `Vui lòng nhập cân nặng từ ${MIN_WEIGHT_KG} kg đến ${MAX_WEIGHT_KG} kg.`;
const HEIGHT_RANGE_ERROR = `Vui lòng nhập chiều cao từ ${MIN_HEIGHT_CM} cm đến ${MAX_HEIGHT_CM} cm.`;

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function formatBMI(value: number): string {
  return value.toFixed(2);
}

export function classifyBMI(bmi: number): BmiClassification {
  if (bmi < 18.5) {
    return {
      label: "Thiếu cân",
      level: "underweight",
      message:
        "Bạn đang ở dưới mức cân nặng tham khảo. Hãy duy trì chế độ ăn uống đầy đủ và theo dõi sức khỏe nếu cần."
    };
  }

  if (bmi < 25) {
    return {
      label: "Bình thường",
      level: "normal",
      message:
        "Chỉ số BMI của bạn nằm trong khoảng tham khảo bình thường. Hãy tiếp tục duy trì lối sống lành mạnh."
    };
  }

  if (bmi < 30) {
    return {
      label: "Thừa cân",
      level: "overweight",
      message:
        "Chỉ số BMI của bạn nằm trong nhóm thừa cân. Bạn có thể cân nhắc điều chỉnh chế độ ăn uống và vận động phù hợp."
    };
  }

  if (bmi < 35) {
    return {
      label: "Béo phì độ I",
      level: "obese_1",
      message:
        "Chỉ số BMI của bạn nằm trong nhóm béo phì độ I. Nên theo dõi sức khỏe và cân nhắc tham khảo ý kiến chuyên gia nếu cần."
    };
  }

  if (bmi < 40) {
    return {
      label: "Béo phì độ II",
      level: "obese_2",
      message:
        "Chỉ số BMI của bạn nằm trong nhóm béo phì độ II. Nên chú ý theo dõi sức khỏe và tham khảo ý kiến chuyên gia nếu cần."
    };
  }

  return {
    label: "Béo phì độ III",
    level: "obese_3",
    message:
      "Chỉ số BMI của bạn rất cao. Nên tham khảo ý kiến chuyên gia y tế để được tư vấn phù hợp."
  };
}

export function calculateHealthyWeightRange(heightCm: number): BmiHealthyWeightRange {
  const heightM = heightCm / 100;
  const heightSquared = heightM * heightM;

  return {
    min: 18.5 * heightSquared,
    max: 24.9 * heightSquared
  };
}

export function formatWeightKg(value: number): string {
  return value.toFixed(1);
}

export function formatHealthyWeightRange(heightCm: number, range?: BmiHealthyWeightRange): string {
  const { min, max } = range ?? calculateHealthyWeightRange(heightCm);
  return `Khoảng cân nặng tham khảo cho chiều cao ${heightCm} cm: ${formatWeightKg(min)} kg — ${formatWeightKg(max)} kg`;
}

function parsePositiveNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return parsed;
}

export function validateBMIInput(weight: string, height: string): BmiValidationResult {
  const weightTrimmed = weight.trim();
  const heightTrimmed = height.trim();

  if (!weightTrimmed && !heightTrimmed) {
    return { isValid: false, error: "Vui lòng nhập cân nặng và chiều cao." };
  }

  if (!weightTrimmed) {
    return { isValid: false, error: "Vui lòng nhập cân nặng hợp lệ." };
  }

  if (!heightTrimmed) {
    return { isValid: false, error: "Vui lòng nhập chiều cao hợp lệ." };
  }

  const weightKg = parsePositiveNumber(weightTrimmed);
  if (weightKg === null) {
    return { isValid: false, error: "Vui lòng nhập cân nặng hợp lệ." };
  }

  const heightCm = parsePositiveNumber(heightTrimmed);
  if (heightCm === null) {
    return { isValid: false, error: "Vui lòng nhập chiều cao hợp lệ." };
  }

  if (weightKg < MIN_WEIGHT_KG || weightKg > MAX_WEIGHT_KG) {
    return { isValid: false, error: WEIGHT_RANGE_ERROR };
  }

  if (heightCm < MIN_HEIGHT_CM || heightCm > MAX_HEIGHT_CM) {
    return { isValid: false, error: HEIGHT_RANGE_ERROR };
  }

  return { isValid: true, weightKg, heightCm };
}

export function computeBMIResult(weightKg: number, heightCm: number): BmiResult {
  const bmi = calculateBMI(weightKg, heightCm);
  const classification = classifyBMI(bmi);
  const healthyWeightRange = calculateHealthyWeightRange(heightCm);

  return {
    bmi,
    bmiFormatted: formatBMI(bmi),
    category: classification.label,
    level: classification.level,
    message: classification.message,
    healthyWeightRange,
    weightKg,
    heightCm
  };
}

export function formatBMIResultForCopy(result: BmiResult): string {
  return [
    `BMI: ${result.bmiFormatted}`,
    `Phân loại: ${result.category}`,
    `Cân nặng: ${result.weightKg} kg`,
    `Chiều cao: ${result.heightCm} cm`
  ].join("\n");
}

/** Visual scale range for the BMI bar (min–max on the axis). */
export const BMI_SCALE_MIN = 15;
export const BMI_SCALE_MAX = 45;

/** WHO-style adult BMI thresholds used for segments and classification. */
export const BMI_SCALE_THRESHOLDS = {
  underweightMax: 18.5,
  normalMax: 25,
  overweightMax: 30
} as const;

export const BMI_SCALE_SEGMENTS = [
  { id: "underweight", from: BMI_SCALE_MIN, to: BMI_SCALE_THRESHOLDS.underweightMax },
  { id: "normal", from: BMI_SCALE_THRESHOLDS.underweightMax, to: BMI_SCALE_THRESHOLDS.normalMax },
  { id: "overweight", from: BMI_SCALE_THRESHOLDS.normalMax, to: BMI_SCALE_THRESHOLDS.overweightMax },
  { id: "obese", from: BMI_SCALE_THRESHOLDS.overweightMax, to: BMI_SCALE_MAX }
] as const;

export type BmiScaleSegmentId = (typeof BMI_SCALE_SEGMENTS)[number]["id"];

export function getBmiScaleSegmentWidth(from: number, to: number): number {
  return ((to - from) / (BMI_SCALE_MAX - BMI_SCALE_MIN)) * 100;
}

/** Map BMI to a 0–100 position on the reference scale bar. */
export function getBmiScalePosition(bmi: number): number {
  const clamped = Math.min(Math.max(bmi, BMI_SCALE_MIN), BMI_SCALE_MAX);
  return ((clamped - BMI_SCALE_MIN) / (BMI_SCALE_MAX - BMI_SCALE_MIN)) * 100;
}

export function getBmiScaleSegmentId(level: BmiLevel): BmiScaleSegmentId {
  if (level === "underweight") return "underweight";
  if (level === "normal") return "normal";
  if (level === "overweight") return "overweight";
  return "obese";
}

export const BMI_LEVEL_COLORS: Record<BmiLevel, string> = {
  underweight: "text-sky-300",
  normal: "text-emerald-300",
  overweight: "text-amber-300",
  obese_1: "text-orange-300",
  obese_2: "text-orange-400",
  obese_3: "text-red-300"
};
