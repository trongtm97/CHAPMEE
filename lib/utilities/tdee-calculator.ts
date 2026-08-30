import { calculateBMI } from "@/lib/utilities/bmi-calculator";

export type Gender = "male" | "female";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

export type Goal = "maintain" | "mild_loss" | "moderate_loss" | "mild_gain" | "moderate_gain";

export type MacroPresetType = "balanced" | "fat_loss" | "muscle_gain" | "low_carb";

export interface TDEEInput {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  macroPreset?: MacroPresetType;
}

export interface MacroRatio {
  protein: number;
  carbs: number;
  fat: number;
}

export interface MacroResult {
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  ratio: MacroRatio;
  presetLabel: string;
}

export interface TDEEResult {
  bmr: number;
  tdee: number;
  targetCalories: number;
  goalLabel: string;
  activityLabel: string;
  genderLabel: string;
  calories: {
    maintain: number;
    mildLoss: number;
    moderateLoss: number;
    mildGain: number;
    moderateGain: number;
  };
  macros: MacroResult;
  bmi: {
    value: number;
    label: string;
  };
  warnings: string[];
}

export interface TDEEValidationResult {
  isValid: boolean;
  input?: TDEEInput;
  error?: string;
  warnings?: string[];
}

export const MIN_AGE = 10;
export const MAX_AGE = 100;
export const MIN_HEIGHT_CM = 80;
export const MAX_HEIGHT_CM = 250;
export const MIN_WEIGHT_KG = 20;
export const MAX_WEIGHT_KG = 300;

export const LOW_CALORIE_THRESHOLD = {
  female: 1200,
  male: 1500
} as const;

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Ít vận động",
  light: "Vận động nhẹ",
  moderate: "Vận động vừa",
  active: "Vận động nhiều",
  very_active: "Vận động rất nhiều"
};

export const ACTIVITY_DESCRIPTIONS: Record<ActivityLevel, string> = {
  sedentary: "Ít hoặc không tập luyện, chủ yếu ngồi nhiều.",
  light: "Tập nhẹ 1–3 buổi/tuần.",
  moderate: "Tập 3–5 buổi/tuần.",
  active: "Tập 6–7 buổi/tuần hoặc công việc vận động nhiều.",
  very_active: "Tập nặng, lao động nặng hoặc vận động cường độ cao gần như mỗi ngày."
};

export const GOAL_LABELS: Record<Goal, string> = {
  maintain: "Giữ cân",
  mild_loss: "Giảm cân nhẹ",
  moderate_loss: "Giảm cân vừa",
  mild_gain: "Tăng cân nhẹ",
  moderate_gain: "Tăng cân vừa"
};

export const GENDER_LABELS: Record<Gender, string> = {
  male: "Nam",
  female: "Nữ"
};

export const MACRO_PRESETS: Record<
  MacroPresetType,
  { label: string; protein: number; carbs: number; fat: number }
> = {
  balanced: { label: "Cân bằng", protein: 30, carbs: 40, fat: 30 },
  fat_loss: { label: "Giảm cân", protein: 35, carbs: 35, fat: 30 },
  muscle_gain: { label: "Tăng cơ", protein: 30, carbs: 45, fat: 25 },
  low_carb: { label: "Ít carb", protein: 35, carbs: 25, fat: 40 }
};

export const UNDER_18_WARNING =
  "Kết quả TDEE cho người dưới 18 tuổi chỉ mang tính tham khảo. Nhu cầu năng lượng của trẻ em và thanh thiếu niên nên được đánh giá theo tuổi, giới, tốc độ phát triển và tư vấn chuyên môn nếu cần.";

export const LOW_CALORIE_WARNING =
  "Mức calo gợi ý khá thấp. Hãy cân nhắc điều chỉnh mục tiêu hoặc tham khảo chuyên gia nếu cần.";

export const GOAL_DEFICIT_WARNING =
  "Không nên cắt giảm calo quá mạnh trong thời gian dài nếu không có hướng dẫn chuyên môn.";

function parsePositiveNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return parsed;
}

function parseAge(value: string): number | null {
  const parsed = parsePositiveNumber(value);
  if (parsed === null) return null;
  if (!Number.isInteger(parsed)) return null;
  return parsed;
}

export function calculateBMR(input: {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
}): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  return input.gender === "male" ? base + 5 : base - 161;
}

export function getActivityMultiplier(activityLevel: ActivityLevel): number {
  return ACTIVITY_MULTIPLIERS[activityLevel];
}

export function calculateTDEE(bmr: number, activityMultiplier: number): number {
  return Math.round(Math.round(bmr) * activityMultiplier);
}

export function calculateGoalCalories(tdee: number, goal: Goal): number {
  switch (goal) {
    case "maintain":
      return tdee;
    case "mild_loss":
      return tdee - 250;
    case "moderate_loss":
      return tdee - 500;
    case "mild_gain":
      return tdee + 250;
    case "moderate_gain":
      return tdee + 500;
  }
}

export function calculateCaloriesByGoal(tdee: number): TDEEResult["calories"] {
  return {
    maintain: tdee,
    mildLoss: tdee - 250,
    moderateLoss: tdee - 500,
    mildGain: tdee + 250,
    moderateGain: tdee + 500
  };
}

export function calculateMacros(calories: number, preset: MacroPresetType): MacroResult {
  const config = MACRO_PRESETS[preset];

  return {
    proteinGrams: Math.round((calories * config.protein) / 100 / 4),
    carbsGrams: Math.round((calories * config.carbs) / 100 / 4),
    fatGrams: Math.round((calories * config.fat) / 100 / 9),
    ratio: {
      protein: config.protein,
      carbs: config.carbs,
      fat: config.fat
    },
    presetLabel: config.label
  };
}

export function classifyBMI(bmi: number): string {
  if (bmi < 18.5) return "Thiếu cân";
  if (bmi < 25) return "Bình thường";
  if (bmi < 30) return "Thừa cân";
  return "Béo phì";
}

export function formatCalories(value: number): string {
  const rounded = Math.round(value);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatBMIValue(value: number): string {
  return value.toFixed(2);
}

function collectWarnings(input: TDEEInput, targetCalories: number): string[] {
  const warnings: string[] = [];

  if (input.age < 18) {
    warnings.push(UNDER_18_WARNING);
  }

  if (input.goal === "mild_loss" || input.goal === "moderate_loss") {
    warnings.push(GOAL_DEFICIT_WARNING);
  }

  const threshold = LOW_CALORIE_THRESHOLD[input.gender];
  if (targetCalories < threshold) {
    warnings.push(LOW_CALORIE_WARNING);
  }

  return warnings;
}

export function validateTDEEInput(input: {
  gender?: Gender | "";
  age?: string;
  heightCm?: string;
  weightKg?: string;
  activityLevel?: ActivityLevel | "";
  goal?: Goal;
  macroPreset?: MacroPresetType;
}): TDEEValidationResult {
  const warnings: string[] = [];

  if (!input.gender) {
    return { isValid: false, error: "Vui lòng chọn giới tính." };
  }

  const ageTrimmed = input.age?.trim() ?? "";
  const heightTrimmed = input.heightCm?.trim() ?? "";
  const weightTrimmed = input.weightKg?.trim() ?? "";

  if (!ageTrimmed && !heightTrimmed && !weightTrimmed) {
    return { isValid: false, error: "Vui lòng nhập đầy đủ thông tin cần tính TDEE." };
  }

  if (!ageTrimmed || !heightTrimmed || !weightTrimmed) {
    return { isValid: false, error: "Vui lòng nhập đầy đủ thông tin cần tính TDEE." };
  }

  const age = parseAge(ageTrimmed);
  if (age === null) {
    return { isValid: false, error: "Vui lòng nhập tuổi hợp lệ." };
  }

  if (age < MIN_AGE || age > MAX_AGE) {
    return { isValid: false, error: `Vui lòng nhập tuổi từ ${MIN_AGE} đến ${MAX_AGE}.` };
  }

  const heightCm = parsePositiveNumber(heightTrimmed);
  if (heightCm === null) {
    return { isValid: false, error: "Vui lòng nhập chiều cao hợp lệ." };
  }

  if (heightCm < MIN_HEIGHT_CM || heightCm > MAX_HEIGHT_CM) {
    return {
      isValid: false,
      error: `Vui lòng nhập chiều cao từ ${MIN_HEIGHT_CM} cm đến ${MAX_HEIGHT_CM} cm.`
    };
  }

  const weightKg = parsePositiveNumber(weightTrimmed);
  if (weightKg === null) {
    return { isValid: false, error: "Vui lòng nhập cân nặng hợp lệ." };
  }

  if (weightKg < MIN_WEIGHT_KG || weightKg > MAX_WEIGHT_KG) {
    return {
      isValid: false,
      error: `Vui lòng nhập cân nặng từ ${MIN_WEIGHT_KG} kg đến ${MAX_WEIGHT_KG} kg.`
    };
  }

  if (!input.activityLevel) {
    return { isValid: false, error: "Vui lòng chọn mức độ vận động." };
  }

  const goal = input.goal ?? "maintain";
  const macroPreset = input.macroPreset ?? "balanced";

  if (age < 18) {
    warnings.push(UNDER_18_WARNING);
  }

  return {
    isValid: true,
    input: {
      gender: input.gender,
      age,
      heightCm,
      weightKg,
      activityLevel: input.activityLevel,
      goal,
      macroPreset
    },
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

export function generateTDEEResult(input: TDEEInput): TDEEResult {
  const rawBmr = calculateBMR(input);
  const bmr = Math.round(rawBmr);
  const multiplier = getActivityMultiplier(input.activityLevel);
  const tdee = calculateTDEE(rawBmr, multiplier);
  const targetCalories = calculateGoalCalories(tdee, input.goal);
  const calories = calculateCaloriesByGoal(tdee);
  const macros = calculateMacros(targetCalories, input.macroPreset ?? "balanced");
  const bmiValue = calculateBMI(input.weightKg, input.heightCm);

  return {
    bmr,
    tdee,
    targetCalories,
    goalLabel: GOAL_LABELS[input.goal],
    activityLabel: ACTIVITY_LABELS[input.activityLevel],
    genderLabel: GENDER_LABELS[input.gender],
    calories,
    macros,
    bmi: {
      value: bmiValue,
      label: classifyBMI(bmiValue)
    },
    warnings: collectWarnings(input, targetCalories)
  };
}

export function formatTDEEResultForCopy(
  input: TDEEInput,
  result: TDEEResult
): string {
  return [
    "Kết quả tính TDEE:",
    `Giới tính: ${result.genderLabel}`,
    `Tuổi: ${input.age}`,
    `Chiều cao: ${input.heightCm} cm`,
    `Cân nặng: ${input.weightKg} kg`,
    `Mức vận động: ${result.activityLabel}`,
    "",
    `BMR: ${formatCalories(result.bmr)} kcal/ngày`,
    `TDEE: ${formatCalories(result.tdee)} kcal/ngày`,
    `Mục tiêu: ${result.goalLabel}`,
    `Calo gợi ý: ${formatCalories(result.targetCalories)} kcal/ngày`,
    "",
    "Macro tham khảo:",
    `Protein: ${result.macros.proteinGrams}g/ngày`,
    `Carb: ${result.macros.carbsGrams}g/ngày`,
    `Fat: ${result.macros.fatGrams}g/ngày`,
    "",
    "Lưu ý: Kết quả chỉ là ước tính tham khảo."
  ].join("\n");
}
