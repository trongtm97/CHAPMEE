/**
 * Self-test for safe days calculator utility.
 * Run: npm run test:safe-days-calculator
 */

import {
  calculateCautionWindow,
  calculateFertileWindow,
  calculateOvulationDate,
  createLocalDate,
  formatDateRangeVN,
  formatDateVN,
  generateCyclePrediction,
  IRREGULAR_CYCLE_NOTE,
  validateSafeDaysInput
} from "../lib/utilities/safe-days-utils";

let passed = 0;
let failed = 0;

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual === expected) {
    passed += 1;
    return;
  }

  failed += 1;
  console.error(`FAIL: ${label}`);
  console.error(`  expected: ${String(expected)}`);
  console.error(`  actual:   ${String(actual)}`);
}

function assertIncludes(haystack: string, needle: string, label: string) {
  if (haystack.includes(needle)) {
    passed += 1;
    return;
  }

  failed += 1;
  console.error(`FAIL: ${label}`);
  console.error(`  expected to include: ${needle}`);
  console.error(`  actual: ${haystack}`);
}

const june1 = createLocalDate(2026, 6, 1);

// Test 1: 28-day cycle
const test1 = generateCyclePrediction(june1, 28, 5, 0, "regular");
assertEqual(formatDateRangeVN(test1.periodRange), "01/06/2026 - 05/06/2026", "test 1 period");
assertEqual(formatDateVN(test1.nextPeriodDate), "29/06/2026", "test 1 next period");
assertEqual(formatDateVN(test1.ovulationDate), "15/06/2026", "test 1 ovulation");
assertEqual(formatDateRangeVN(test1.fertileWindow), "10/06/2026 - 16/06/2026", "test 1 fertile");
assertEqual(formatDateRangeVN(test1.cautionWindow), "09/06/2026 - 17/06/2026", "test 1 caution");

// Test 2: 30-day cycle
const test2Ovulation = calculateOvulationDate(june1, 30);
const test2Fertile = calculateFertileWindow(test2Ovulation);
const test2Caution = calculateCautionWindow(test2Ovulation);
assertEqual(formatDateVN(calculateOvulationDate(june1, 30)), "17/06/2026", "test 2 ovulation");
assertEqual(formatDateRangeVN(test2Fertile), "12/06/2026 - 18/06/2026", "test 2 fertile");
assertEqual(formatDateRangeVN(test2Caution), "11/06/2026 - 19/06/2026", "test 2 caution");
assertEqual(formatDateVN(createLocalDate(2026, 6, 1)), "01/06/2026", "test 2 period start");
assertEqual(
  formatDateVN(createLocalDate(2026, 6, 1)),
  "01/06/2026",
  "test 2 next period anchor"
);
assertEqual(
  formatDateVN(createLocalDate(2026, 7, 1)),
  "01/07/2026",
  "test 2 next period"
);

// Test 3: 26-day cycle
const test3Ovulation = calculateOvulationDate(june1, 26);
const test3Fertile = calculateFertileWindow(test3Ovulation);
const test3Caution = calculateCautionWindow(test3Ovulation);
assertEqual(formatDateVN(test3Ovulation), "13/06/2026", "test 3 ovulation");
assertEqual(formatDateRangeVN(test3Fertile), "08/06/2026 - 14/06/2026", "test 3 fertile");
assertEqual(formatDateRangeVN(test3Caution), "07/06/2026 - 15/06/2026", "test 3 caution");
assertEqual(
  formatDateVN(createLocalDate(2026, 6, 27)),
  "27/06/2026",
  "test 3 next period"
);

// Test 4: irregular cycle warning
const test4 = generateCyclePrediction(june1, 28, 5, 0, "irregular");
assertEqual(test4.note, IRREGULAR_CYCLE_NOTE, "test 4 irregular note");
const test4Validation = validateSafeDaysInput("2026-06-01", "28", "5", "irregular", 1);
assertIncludes(test4Validation.warnings.join(" "), IRREGULAR_CYCLE_NOTE, "test 4 irregular warning");

// Test 5: empty input
const test5 = validateSafeDaysInput("", "28", "5", "regular", 1);
assertEqual(test5.error, "Vui lòng chọn ngày bắt đầu kỳ kinh gần nhất.", "test 5 empty date");

// Test 6: invalid cycle length
const test6 = validateSafeDaysInput("2026-06-01", "0", "5", "regular", 1);
assertEqual(test6.error, "Vui lòng nhập độ dài chu kỳ hợp lệ.", "test 6 invalid cycle");

// Test 7: invalid period length
const test7 = validateSafeDaysInput("2026-06-01", "28", "20", "regular", 1);
assertEqual(test7.error, "Vui lòng nhập số ngày hành kinh hợp lệ.", "test 7 invalid period");

console.log(`\nsafe-days-calculator self-test: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
