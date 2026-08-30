export type CycleRegularity = "regular" | "irregular" | "unknown";

export type PredictionCount = 1 | 3 | 6;

export interface SafeDaysInput {
  lastPeriodStartDate: Date;
  cycleLength: number;
  periodLength: number;
  regularity: CycleRegularity;
  predictionCount: PredictionCount;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface CyclePrediction {
  cycleIndex: number;
  periodRange: DateRange;
  ovulationDate: Date;
  fertileWindow: DateRange;
  cautionWindow: DateRange;
  nextPeriodDate: Date;
  note?: string;
}

export type DayStatus = "period" | "fertile" | "ovulation" | "caution" | "lower_fertility" | "none";

export interface SafeDaysValidationResult {
  isValid: boolean;
  input?: SafeDaysInput;
  error?: string;
  warnings: string[];
}

export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_LENGTH = 5;
export const MIN_CYCLE_LENGTH = 15;
export const MAX_CYCLE_LENGTH = 60;
export const COMMON_CYCLE_MIN = 21;
export const COMMON_CYCLE_MAX = 35;
export const MIN_PERIOD_LENGTH = 1;
export const MAX_PERIOD_LENGTH = 15;

export const MAIN_DISCLAIMER =
  "Lưu ý: Kết quả chỉ là ước tính dựa trên chu kỳ kinh nguyệt. Không có ngày nào an toàn tuyệt đối. Nếu chưa muốn mang thai, nên sử dụng bao cao su hoặc biện pháp tránh thai phù hợp. Công cụ này không bảo vệ khỏi các bệnh lây qua đường tình dục.";

export const IRREGULAR_CYCLE_WARNING =
  "Chu kỳ không đều có thể làm kết quả ước tính kém chính xác. Bạn không nên chỉ dựa vào công cụ này để tránh thai.";

export const IRREGULAR_CYCLE_NOTE =
  "Do chu kỳ không đều, kết quả chỉ mang tính tham khảo và có thể sai lệch nhiều ngày.";

export const UNCERTAIN_REGULARITY_WARNING =
  "Nếu chu kỳ không đều, việc tính ngày rụng trứng bằng lịch chỉ mang tính tham khảo và có thể sai lệch nhiều ngày.";

export const MEDICAL_CONDITION_NOTE =
  "Kết quả có thể không phù hợp nếu bạn đang dùng thuốc tránh thai nội tiết, mới sinh, đang cho con bú, rối loạn kinh nguyệt hoặc có chu kỳ rất thất thường.";

export const CYCLE_OUT_OF_RANGE_WARNING =
  "Chu kỳ bạn nhập nằm ngoài khoảng phổ biến. Kết quả có thể kém chính xác.";

export const OVULATION_NOTE =
  "Ngày rụng trứng thực tế có thể sớm hoặc muộn hơn vài ngày tùy cơ thể và từng chu kỳ.";

export const FERTILE_WINDOW_NOTE =
  "Đây là khoảng ngày có khả năng thụ thai cao hơn, không phải ngày chắc chắn có thai.";

export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

export function formatDateVN(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateRangeVN(range: DateRange): string {
  return `${formatDateVN(range.start)} - ${formatDateVN(range.end)}`;
}

export function parseDateInput(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

export function dateToInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

export function isInRange(date: Date, range: DateRange): boolean {
  const time = date.getTime();
  return time >= range.start.getTime() && time <= range.end.getTime();
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parsePositiveInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (!/^\d+$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;

  return parsed;
}

function isDateInFuture(date: Date, today: Date = startOfDay(new Date())): boolean {
  return startOfDay(date).getTime() > today.getTime();
}

export function calculateNextPeriodDate(lastPeriodStartDate: Date, cycleLength: number): Date {
  return addDays(lastPeriodStartDate, cycleLength);
}

export function calculateOvulationDate(lastPeriodStartDate: Date, cycleLength: number): Date {
  const nextPeriod = calculateNextPeriodDate(lastPeriodStartDate, cycleLength);
  return addDays(nextPeriod, -14);
}

export function calculateFertileWindow(ovulationDate: Date): DateRange {
  return {
    start: addDays(ovulationDate, -5),
    end: addDays(ovulationDate, 1)
  };
}

export function calculateCautionWindow(ovulationDate: Date): DateRange {
  return {
    start: addDays(ovulationDate, -6),
    end: addDays(ovulationDate, 2)
  };
}

export function calculatePeriodRange(periodStartDate: Date, periodLength: number): DateRange {
  return {
    start: periodStartDate,
    end: addDays(periodStartDate, periodLength - 1)
  };
}

export function generateCyclePrediction(
  lastPeriodStartDate: Date,
  cycleLength: number,
  periodLength: number,
  cycleIndex: number,
  regularity: CycleRegularity
): CyclePrediction {
  const cycleStart = addDays(lastPeriodStartDate, cycleLength * cycleIndex);
  const nextPeriodDate = addDays(cycleStart, cycleLength);
  const ovulationDate = addDays(nextPeriodDate, -14);
  const periodRange = calculatePeriodRange(cycleStart, periodLength);
  const fertileWindow = calculateFertileWindow(ovulationDate);
  const cautionWindow = calculateCautionWindow(ovulationDate);

  const note =
    regularity === "irregular" || regularity === "unknown" ? IRREGULAR_CYCLE_NOTE : undefined;

  return {
    cycleIndex: cycleIndex + 1,
    periodRange,
    ovulationDate,
    fertileWindow,
    cautionWindow,
    nextPeriodDate,
    note
  };
}

export function generateMultipleCyclePredictions(input: SafeDaysInput): CyclePrediction[] {
  const predictions: CyclePrediction[] = [];

  for (let i = 0; i < input.predictionCount; i += 1) {
    predictions.push(
      generateCyclePrediction(
        input.lastPeriodStartDate,
        input.cycleLength,
        input.periodLength,
        i,
        input.regularity
      )
    );
  }

  return predictions;
}

export function validateSafeDaysInput(
  lastPeriodDateStr: string,
  cycleLengthStr: string,
  periodLengthStr: string,
  regularity: CycleRegularity,
  predictionCount: PredictionCount
): SafeDaysValidationResult {
  const warnings: string[] = [];

  if (!lastPeriodDateStr.trim()) {
    return { isValid: false, error: "Vui lòng chọn ngày bắt đầu kỳ kinh gần nhất.", warnings };
  }

  const lastPeriodStartDate = parseDateInput(lastPeriodDateStr);
  if (!lastPeriodStartDate) {
    return { isValid: false, error: "Vui lòng chọn ngày bắt đầu kỳ kinh hợp lệ.", warnings };
  }

  if (isDateInFuture(lastPeriodStartDate)) {
    return { isValid: false, error: "Vui lòng chọn ngày bắt đầu kỳ kinh hợp lệ.", warnings };
  }

  if (!cycleLengthStr.trim()) {
    return { isValid: false, error: "Vui lòng nhập độ dài chu kỳ hợp lệ.", warnings };
  }

  const cycleLength = parsePositiveInteger(cycleLengthStr);
  if (cycleLength === null || cycleLength < MIN_CYCLE_LENGTH || cycleLength > MAX_CYCLE_LENGTH) {
    return { isValid: false, error: "Vui lòng nhập độ dài chu kỳ hợp lệ.", warnings };
  }

  if (cycleLength < COMMON_CYCLE_MIN || cycleLength > COMMON_CYCLE_MAX) {
    warnings.push(CYCLE_OUT_OF_RANGE_WARNING);
  }

  let periodLength = DEFAULT_PERIOD_LENGTH;
  if (periodLengthStr.trim()) {
    const parsedPeriod = parsePositiveInteger(periodLengthStr);
    if (parsedPeriod === null || parsedPeriod < MIN_PERIOD_LENGTH || parsedPeriod > MAX_PERIOD_LENGTH) {
      return { isValid: false, error: "Vui lòng nhập số ngày hành kinh hợp lệ.", warnings };
    }
    periodLength = parsedPeriod;
  }

  if (regularity === "irregular") {
    warnings.push(IRREGULAR_CYCLE_WARNING);
    warnings.push(IRREGULAR_CYCLE_NOTE);
  } else if (regularity === "unknown") {
    warnings.push(UNCERTAIN_REGULARITY_WARNING);
    warnings.push(IRREGULAR_CYCLE_WARNING);
  }

  return {
    isValid: true,
    input: {
      lastPeriodStartDate,
      cycleLength,
      periodLength,
      regularity,
      predictionCount
    },
    warnings
  };
}

export function classifyDayStatus(date: Date, predictions: CyclePrediction[]): DayStatus {
  const day = startOfDay(date);
  let status: DayStatus = "none";

  const priority: Record<DayStatus, number> = {
    none: 0,
    lower_fertility: 1,
    caution: 2,
    fertile: 3,
    ovulation: 4,
    period: 5
  };

  for (const prediction of predictions) {
    let candidate: DayStatus = "none";

    if (isInRange(day, prediction.periodRange)) {
      candidate = "period";
    } else if (isSameDay(day, prediction.ovulationDate)) {
      candidate = "ovulation";
    } else if (isInRange(day, prediction.fertileWindow)) {
      candidate = "fertile";
    } else if (isInRange(day, prediction.cautionWindow)) {
      candidate = "caution";
    } else {
      const cycleStart = prediction.periodRange.start;
      const cycleEnd = addDays(prediction.nextPeriodDate, -1);
      if (day.getTime() >= cycleStart.getTime() && day.getTime() <= cycleEnd.getTime()) {
        candidate = "lower_fertility";
      }
    }

    if (priority[candidate] > priority[status]) {
      status = candidate;
    }
  }

  return status;
}

export interface CalendarMonth {
  year: number;
  month: number;
  days: { date: Date; status: DayStatus; inMonth: boolean }[];
}

export function getMonthsForPredictions(predictions: CyclePrediction[]): { year: number; month: number }[] {
  const monthKeys = new Set<string>();

  for (const prediction of predictions) {
    let cursor = startOfDay(prediction.periodRange.start);
    const end = startOfDay(addDays(prediction.nextPeriodDate, 7));

    while (cursor.getTime() <= end.getTime()) {
      monthKeys.add(`${cursor.getFullYear()}-${cursor.getMonth()}`);
      cursor = addDays(cursor, 1);
    }
  }

  return Array.from(monthKeys)
    .map((key) => {
      const [year, month] = key.split("-").map(Number);
      return { year, month };
    })
    .sort((a, b) => a.year - b.year || a.month - b.month);
}

export function buildCalendarMonth(
  year: number,
  month: number,
  predictions: CyclePrediction[]
): CalendarMonth {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: CalendarMonth["days"] = [];

  for (let i = 0; i < startWeekday; i += 1) {
    const date = addDays(firstOfMonth, -(startWeekday - i));
    days.push({ date, status: classifyDayStatus(date, predictions), inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    days.push({ date, status: classifyDayStatus(date, predictions), inMonth: true });
  }

  while (days.length % 7 !== 0) {
    const last = days[days.length - 1].date;
    const date = addDays(last, 1);
    days.push({ date, status: classifyDayStatus(date, predictions), inMonth: false });
  }

  return { year, month, days };
}

export function formatLowerFertilityText(cautionWindow: DateRange): string {
  return `Các ngày ngoài khoảng ${formatDateVN(cautionWindow.start)} - ${formatDateVN(cautionWindow.end)}`;
}

export function formatSafeDaysResultForCopy(
  input: SafeDaysInput,
  primaryCycle: CyclePrediction
): string {
  return [
    "Kết quả ước tính chu kỳ:",
    `Ngày bắt đầu kỳ kinh gần nhất: ${formatDateVN(input.lastPeriodStartDate)}`,
    `Độ dài chu kỳ: ${input.cycleLength} ngày`,
    `Ngày dự kiến rụng trứng: ${formatDateVN(primaryCycle.ovulationDate)}`,
    `Khoảng dễ thụ thai: ${formatDateRangeVN(primaryCycle.fertileWindow)}`,
    `Ngày dự kiến kỳ kinh tiếp theo: ${formatDateVN(primaryCycle.nextPeriodDate)}`,
    "",
    "Lưu ý: Kết quả chỉ là ước tính, không phải biện pháp tránh thai chắc chắn."
  ].join("\n");
}

/** Create a local date for tests and samples (month is 1-based). */
export function createLocalDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}
