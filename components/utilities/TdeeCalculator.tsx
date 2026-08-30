"use client";

import { useCallback, useRef, useState } from "react";
import { UtilityActionBar, UtilityActionSecondaryButton } from "@/components/utilities/UtilityActionBar";
import { copyToClipboard } from "@/lib/utilities/copy-to-clipboard";
import {
  ACTIVITY_DESCRIPTIONS,
  ACTIVITY_LABELS,
  formatCalories,
  formatBMIValue,
  formatTDEEResultForCopy,
  generateTDEEResult,
  GENDER_LABELS,
  GOAL_LABELS,
  MACRO_PRESETS,
  validateTDEEInput,
  type ActivityLevel,
  type Gender,
  type Goal,
  type MacroPresetType,
  type TDEEInput,
  type TDEEResult
} from "@/lib/utilities/tdee-calculator";

const DEFAULT_GENDER: Gender = "male";
const DEFAULT_ACTIVITY: ActivityLevel = "light";
const DEFAULT_GOAL: Goal = "maintain";
const DEFAULT_MACRO: MacroPresetType = "balanced";

const SAMPLE = {
  gender: "male" as Gender,
  age: "25",
  heightCm: "170",
  weightKg: "70",
  activityLevel: "light" as ActivityLevel,
  goal: "maintain" as Goal
};

const QUICK_EXAMPLES = [
  {
    gender: "male" as Gender,
    age: "25",
    heightCm: "170",
    weightKg: "70",
    activityLevel: "light" as ActivityLevel,
    goal: "maintain" as Goal,
    label: "Nam, 25 tuổi, 170 cm, 70 kg, vận động nhẹ",
    tdee: "2.259"
  },
  {
    gender: "female" as Gender,
    age: "25",
    heightCm: "160",
    weightKg: "55",
    activityLevel: "light" as ActivityLevel,
    goal: "maintain" as Goal,
    label: "Nữ, 25 tuổi, 160 cm, 55 kg, vận động nhẹ",
    tdee: "1.738"
  },
  {
    gender: "male" as Gender,
    age: "30",
    heightCm: "175",
    weightKg: "80",
    activityLevel: "moderate" as ActivityLevel,
    goal: "maintain" as Goal,
    label: "Nam, 30 tuổi, 175 cm, 80 kg, vận động vừa",
    tdee: "2.711"
  }
] as const;

const ACTIVITY_LEVELS: ActivityLevel[] = ["sedentary", "light", "moderate", "active", "very_active"];
const GOALS: Goal[] = ["maintain", "mild_loss", "moderate_loss", "mild_gain", "moderate_gain"];
const MACRO_PRESET_KEYS: MacroPresetType[] = ["balanced", "fat_loss", "muscle_gain", "low_carb"];

export function TdeeCalculator() {
  const ageRef = useRef<HTMLInputElement>(null);
  const [gender, setGender] = useState<Gender | "">(DEFAULT_GENDER);
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | "">(DEFAULT_ACTIVITY);
  const [goal, setGoal] = useState<Goal>(DEFAULT_GOAL);
  const [macroPreset, setMacroPreset] = useState<MacroPresetType>(DEFAULT_MACRO);
  const [result, setResult] = useState<TDEEResult | null>(null);
  const [lastInput, setLastInput] = useState<TDEEInput | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoWarnings, setInfoWarnings] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const reportStatus = useCallback((message: string) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(null), 3000);
  }, []);

  const runCalculate = useCallback(
    (values: {
      gender: Gender | "";
      age: string;
      heightCm: string;
      weightKg: string;
      activityLevel: ActivityLevel | "";
      goal: Goal;
      macroPreset: MacroPresetType;
    }) => {
      const validation = validateTDEEInput(values);

      if (!validation.isValid || !validation.input) {
        setResult(null);
        setLastInput(null);
        setInfoWarnings([]);
        setErrorMessage(validation.error ?? "Vui lòng nhập đầy đủ thông tin cần tính TDEE.");
        return false;
      }

      setErrorMessage(null);
      setInfoWarnings(validation.warnings ?? []);
      const computed = generateTDEEResult(validation.input);
      setLastInput(validation.input);
      setResult(computed);
      return true;
    },
    []
  );

  const getFormValues = () => ({
    gender,
    age,
    heightCm,
    weightKg,
    activityLevel,
    goal,
    macroPreset
  });

  const handleCalculate = () => {
    setStatusMessage(null);
    runCalculate(getFormValues());
  };

  const handleClear = () => {
    setGender(DEFAULT_GENDER);
    setAge("");
    setHeightCm("");
    setWeightKg("");
    setActivityLevel(DEFAULT_ACTIVITY);
    setGoal(DEFAULT_GOAL);
    setMacroPreset(DEFAULT_MACRO);
    setResult(null);
    setLastInput(null);
    setErrorMessage(null);
    setInfoWarnings([]);
    setStatusMessage(null);
    ageRef.current?.focus();
  };

  const handlePasteSample = () => {
    setGender(SAMPLE.gender);
    setAge(SAMPLE.age);
    setHeightCm(SAMPLE.heightCm);
    setWeightKg(SAMPLE.weightKg);
    setActivityLevel(SAMPLE.activityLevel);
    setGoal(SAMPLE.goal);
    setMacroPreset(DEFAULT_MACRO);
    setStatusMessage(null);
    runCalculate({ ...SAMPLE, macroPreset: DEFAULT_MACRO });
  };

  const handleExampleClick = (example: (typeof QUICK_EXAMPLES)[number]) => {
    setGender(example.gender);
    setAge(example.age);
    setHeightCm(example.heightCm);
    setWeightKg(example.weightKg);
    setActivityLevel(example.activityLevel);
    setGoal(example.goal);
    setMacroPreset(DEFAULT_MACRO);
    setStatusMessage(null);
    runCalculate({ ...example, macroPreset: DEFAULT_MACRO });
  };

  const handleCopyResult = async () => {
    if (!result || !lastInput) {
      reportStatus("Chưa có kết quả để sao chép.");
      return;
    }

    const ok = await copyToClipboard(formatTDEEResultForCopy(lastInput, result));
    reportStatus(ok ? "Đã sao chép kết quả TDEE!" : "Không thể sao chép. Hãy thử chọn thủ công.");
  };

  const handleCopyValue = async (text: string, successMessage: string) => {
    const ok = await copyToClipboard(text);
    reportStatus(ok ? successMessage : "Không thể sao chép. Hãy thử chọn thủ công.");
  };

  const allWarnings = [...infoWarnings, ...(result?.warnings ?? [])];
  const uniqueWarnings = [...new Set(allWarnings)];

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/90">Tiện ích</p>
        <h1 className="text-xl font-bold text-zinc-50 sm:text-2xl">Công Cụ Tính TDEE</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          Tính BMR, TDEE, calo duy trì, calo giảm cân, calo tăng cân và macro tham khảo dựa trên thông tin cơ thể và
          mức độ vận động.
        </p>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          TDEE là tổng năng lượng cơ thể tiêu hao trong một ngày, bao gồm năng lượng nghỉ ngơi và năng lượng dùng cho
          hoạt động. Nhập thông tin của bạn để ước tính lượng calo duy trì, giảm cân hoặc tăng cân.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <section aria-labelledby="tdee-inputs" className="space-y-4">
          <h2 className="sr-only" id="tdee-inputs">
            Nhập liệu
          </h2>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-zinc-200">Giới tính</legend>
            <div className="flex flex-wrap gap-2">
              {(["male", "female"] as Gender[]).map((value) => (
                <label
                  className={`cursor-pointer rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                    gender === value
                      ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                      : "border-white/10 bg-zinc-900/80 text-zinc-300 hover:border-white/20"
                  }`}
                  key={value}
                >
                  <input
                    checked={gender === value}
                    className="sr-only"
                    name="tdee-gender"
                    onChange={() => setGender(value)}
                    type="radio"
                    value={value}
                  />
                  {GENDER_LABELS[value]}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-200" htmlFor="tdee-age">
                Tuổi
              </label>
              <input
                className="w-full rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
                id="tdee-age"
                inputMode="numeric"
                onChange={(event) => setAge(event.target.value)}
                placeholder="Ví dụ: 25"
                ref={ageRef}
                type="text"
                value={age}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-200" htmlFor="tdee-height">
                Chiều cao
              </label>
              <div className="flex items-center gap-2">
                <input
                  className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
                  id="tdee-height"
                  inputMode="decimal"
                  onChange={(event) => setHeightCm(event.target.value)}
                  placeholder="Ví dụ: 170"
                  type="text"
                  value={heightCm}
                />
                <span className="shrink-0 rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-3 text-sm font-medium text-zinc-300">
                  cm
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-200" htmlFor="tdee-weight">
                Cân nặng
              </label>
              <div className="flex items-center gap-2">
                <input
                  className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
                  id="tdee-weight"
                  inputMode="decimal"
                  onChange={(event) => setWeightKg(event.target.value)}
                  placeholder="Ví dụ: 70"
                  type="text"
                  value={weightKg}
                />
                <span className="shrink-0 rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-3 text-sm font-medium text-zinc-300">
                  kg
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-200" htmlFor="tdee-activity">
              Mức độ vận động
            </label>
            <select
              className="w-full rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
              id="tdee-activity"
              onChange={(event) => setActivityLevel(event.target.value as ActivityLevel)}
              value={activityLevel}
            >
              {ACTIVITY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {ACTIVITY_LABELS[level]}
                </option>
              ))}
            </select>
            {activityLevel ? (
              <p className="text-xs leading-relaxed text-zinc-500">{ACTIVITY_DESCRIPTIONS[activityLevel]}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-200" htmlFor="tdee-goal">
              Mục tiêu
            </label>
            <select
              className="w-full rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
              id="tdee-goal"
              onChange={(event) => setGoal(event.target.value as Goal)}
              value={goal}
            >
              {GOALS.map((item) => (
                <option key={item} value={item}>
                  {GOAL_LABELS[item]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-200" htmlFor="tdee-macro">
              Preset macro
            </label>
            <select
              className="w-full rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
              id="tdee-macro"
              onChange={(event) => setMacroPreset(event.target.value as MacroPresetType)}
              value={macroPreset}
            >
              {MACRO_PRESET_KEYS.map((key) => {
                const preset = MACRO_PRESETS[key];
                return (
                  <option key={key} value={key}>
                    {preset.label}: Protein {preset.protein}% / Carb {preset.carbs}% / Fat {preset.fat}%
                  </option>
                );
              })}
            </select>
          </div>

          {errorMessage ? (
            <p aria-live="polite" className="text-sm font-medium text-amber-300" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <UtilityActionBar primary={{ label: "Tính TDEE", onClick: handleCalculate }}>
            <UtilityActionSecondaryButton label="Xóa" onClick={handleClear} />
            <UtilityActionSecondaryButton label="Ví dụ" onClick={handlePasteSample} />
            <UtilityActionSecondaryButton label="Sao chép" onClick={() => void handleCopyResult()} />
          </UtilityActionBar>

          {statusMessage ? (
            <p aria-live="polite" className="text-sm font-medium text-cyan-200" role="status">
              {statusMessage}
            </p>
          ) : null}
        </section>

        <section aria-labelledby="tdee-results" className="space-y-3">
          <h2 className="text-sm font-bold text-zinc-200" id="tdee-results">
            Kết quả
          </h2>

          {result ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <ResultCard
                  label="BMR"
                  onCopy={() =>
                    handleCopyValue(`${formatCalories(result.bmr)} kcal/ngày`, "Đã sao chép BMR!")
                  }
                  value={`${formatCalories(result.bmr)} kcal/ngày`}
                />
                <ResultCard
                  highlight
                  label="TDEE"
                  onCopy={() =>
                    handleCopyValue(`${formatCalories(result.tdee)} kcal/ngày`, "Đã sao chép TDEE!")
                  }
                  value={`${formatCalories(result.tdee)} kcal/ngày`}
                />
              </div>

              <div className="rounded-2xl border border-cyan-300/30 bg-cyan-300/5 p-4 sm:p-5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-200/80">
                  Calo theo mục tiêu của bạn
                </p>
                <p className="mt-1 text-sm text-zinc-300">Mục tiêu của bạn: {result.goalLabel}</p>
                <p className="mt-2 text-2xl font-bold text-cyan-100 sm:text-3xl">
                  {formatCalories(result.targetCalories)} kcal/ngày
                </p>
                <button
                  className="mt-3 text-xs font-semibold text-cyan-200/90 underline-offset-2 hover:underline"
                  onClick={() =>
                    handleCopyValue(
                      `${formatCalories(result.targetCalories)} kcal/ngày`,
                      "Đã sao chép calo mục tiêu!"
                    )
                  }
                  type="button"
                >
                  Sao chép calo mục tiêu
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 sm:p-5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">BMI tham khảo</p>
                <p className="mt-1 text-lg font-semibold text-zinc-100">
                  {formatBMIValue(result.bmi.value)} — {result.bmi.label}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                  BMI chỉ là chỉ số tham khảo và không phản ánh đầy đủ tỷ lệ cơ, mỡ, tuổi, giới tính hoặc tình trạng
                  sức khỏe cá nhân.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Chi tiết calo</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  <CalorieDetailCard label="Giữ cân" value={formatCalories(result.calories.maintain)} />
                  <CalorieDetailCard label="Giảm cân nhẹ" value={formatCalories(result.calories.mildLoss)} />
                  <CalorieDetailCard label="Giảm cân vừa" value={formatCalories(result.calories.moderateLoss)} />
                  <CalorieDetailCard label="Tăng cân nhẹ" value={formatCalories(result.calories.mildGain)} />
                  <CalorieDetailCard label="Tăng cân vừa" value={formatCalories(result.calories.moderateGain)} />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Gợi ý macro tham khảo</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Preset: {result.macros.presetLabel} ({result.macros.ratio.protein}% /{" "}
                      {result.macros.ratio.carbs}% / {result.macros.ratio.fat}%)
                    </p>
                  </div>
                  <button
                    className="shrink-0 text-xs font-semibold text-cyan-200/90 underline-offset-2 hover:underline"
                    onClick={() =>
                      handleCopyValue(
                        `Protein: ${result.macros.proteinGrams}g/ngày\nCarb: ${result.macros.carbsGrams}g/ngày\nFat: ${result.macros.fatGrams}g/ngày`,
                        "Đã sao chép macro!"
                      )
                    }
                    type="button"
                  >
                    Sao chép macro
                  </button>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <MacroItem label="Protein" value={`${result.macros.proteinGrams}g/ngày`} />
                  <MacroItem label="Carb" value={`${result.macros.carbsGrams}g/ngày`} />
                  <MacroItem label="Fat" value={`${result.macros.fatGrams}g/ngày`} />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                  Macro chỉ là gợi ý tham khảo. Nhu cầu thực tế có thể khác tùy mục tiêu, tình trạng sức khỏe và chế
                  độ tập luyện.
                </p>
              </div>

              {uniqueWarnings.length > 0 ? (
                <div className="space-y-2">
                  {uniqueWarnings.map((warning) => (
                    <p
                      className="rounded-2xl border border-amber-300/20 bg-amber-300/5 px-4 py-3 text-xs leading-relaxed text-amber-100/90"
                      key={warning}
                    >
                      {warning}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 sm:p-5">
              <p className="text-sm text-zinc-500">
                Nhập thông tin cơ thể và bấm &ldquo;Tính TDEE&rdquo; để xem BMR, TDEE, calo theo mục tiêu và macro
                tham khảo.
              </p>
            </div>
          )}
        </section>
      </div>

      <p className="rounded-2xl border border-amber-300/20 bg-amber-300/5 px-4 py-3 text-xs leading-relaxed text-amber-100/90">
        <strong className="font-semibold">Lưu ý:</strong> Kết quả chỉ là ước tính tham khảo. Nhu cầu calo thực tế có
        thể thay đổi theo cơ địa, khối lượng cơ, mức vận động, giấc ngủ, bệnh lý và nhiều yếu tố cá nhân khác.
      </p>

      <p className="rounded-2xl border border-amber-300/20 bg-amber-300/5 px-4 py-3 text-xs leading-relaxed text-amber-100/90">
        <strong className="font-semibold">Lưu ý:</strong> Kết quả chỉ là ước tính tham khảo, không thay thế tư vấn y
        tế hoặc dinh dưỡng cá nhân hóa. Nếu bạn đang mang thai, cho con bú, dưới 18 tuổi, có bệnh lý nền, rối loạn ăn
        uống hoặc đang điều trị y tế, hãy tham khảo ý kiến chuyên gia trước khi thay đổi chế độ ăn.
      </p>

      <section aria-labelledby="tdee-examples" className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-200" id="tdee-examples">
          Ví dụ nhanh
        </h2>
        <div className="grid gap-2">
          {QUICK_EXAMPLES.map((example) => (
            <button
              className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 text-left text-sm transition hover:border-cyan-300/25 hover:bg-zinc-900/60"
              key={example.label}
              onClick={() => handleExampleClick(example)}
              type="button"
            >
              <span className="text-zinc-300">{example.label}</span>
              <span className="mx-2 text-zinc-600">→</span>
              <span className="text-cyan-100/90">TDEE khoảng {example.tdee} kcal/ngày</span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="tdee-guide" className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950/40 p-4 sm:p-5">
        <h2 className="text-sm font-bold text-zinc-200" id="tdee-guide">
          Cách sử dụng công cụ tính TDEE
        </h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-400">
          <li>Chọn giới tính.</li>
          <li>Nhập tuổi, chiều cao và cân nặng.</li>
          <li>Chọn mức độ vận động gần đúng với thói quen hằng ngày.</li>
          <li>Chọn mục tiêu: giữ cân, giảm cân hoặc tăng cân.</li>
          <li>Bấm &ldquo;Tính TDEE&rdquo; để xem lượng calo ước tính mỗi ngày.</li>
          <li>Dùng kết quả như một mốc tham khảo và theo dõi cân nặng thực tế để điều chỉnh.</li>
        </ol>
        <p className="text-sm leading-relaxed text-zinc-400">
          BMR là lượng năng lượng cơ thể tiêu hao khi nghỉ ngơi. TDEE là tổng năng lượng tiêu hao trong ngày sau khi
          tính thêm hoạt động. Nếu ăn gần bằng TDEE, cân nặng thường có xu hướng duy trì. Nếu ăn thấp hơn TDEE, cân
          nặng có thể giảm. Nếu ăn cao hơn TDEE, cân nặng có thể tăng.
        </p>
      </section>
    </div>
  );
}

function ResultCard({
  label,
  value,
  highlight = false,
  onCopy
}: {
  label: string;
  value: string;
  highlight?: boolean;
  onCopy: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight ? "border-cyan-300/30 bg-cyan-300/5" : "border-white/10 bg-zinc-950/50"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${highlight ? "text-cyan-100" : "text-zinc-100"}`}>{value}</p>
      <button
        className="mt-2 text-xs font-semibold text-cyan-200/90 underline-offset-2 hover:underline"
        onClick={onCopy}
        type="button"
      >
        Sao chép {label}
      </button>
    </div>
  );
}

function CalorieDetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-sm font-semibold text-zinc-200">{value} kcal/ngày</p>
    </div>
  );
}

function MacroItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-sm font-semibold text-zinc-200">{value}</p>
    </div>
  );
}
