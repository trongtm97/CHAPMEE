/**
 * Self-test for BMI calculator utility.
 * Run: npm run test:bmi-calculator
 */

import {
  calculateBMI,
  classifyBMI,
  computeBMIResult,
  formatBMI,
  formatHealthyWeightRange,
  getBmiScalePosition,
  getBmiScaleSegmentWidth,
  validateBMIInput
} from "../lib/utilities/bmi-calculator";

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

function assertClose(actual: number, expected: number, label: string, tolerance = 0.01) {
  if (Math.abs(actual - expected) <= tolerance) {
    passed += 1;
    return;
  }

  failed += 1;
  console.error(`FAIL: ${label}`);
  console.error(`  expected: ${expected}`);
  console.error(`  actual:   ${actual}`);
}

// Test 1
const test1 = computeBMIResult(70, 170);
assertEqual(test1.bmiFormatted, "24.22", "test 1 BMI");
assertEqual(test1.category, "Bình thường", "test 1 category");
assertEqual(
  formatHealthyWeightRange(170, test1.healthyWeightRange),
  "Khoảng cân nặng tham khảo cho chiều cao 170 cm: 53.5 kg — 72.0 kg",
  "test 1 healthy range"
);

// Test 2
const test2 = computeBMIResult(50, 170);
assertEqual(test2.bmiFormatted, "17.30", "test 2 BMI");
assertEqual(test2.category, "Thiếu cân", "test 2 category");

// Test 3
const test3 = computeBMIResult(80, 170);
assertEqual(test3.bmiFormatted, "27.68", "test 3 BMI");
assertEqual(test3.category, "Thừa cân", "test 3 category");

// Test 4
const test4 = computeBMIResult(95, 170);
assertEqual(test4.bmiFormatted, "32.87", "test 4 BMI");
assertEqual(test4.category, "Béo phì độ I", "test 4 category");

// Test 5
const test5 = computeBMIResult(110, 170);
assertEqual(test5.bmiFormatted, "38.06", "test 5 BMI");
assertEqual(test5.category, "Béo phì độ II", "test 5 category");

// Test 6
const test6 = computeBMIResult(130, 170);
assertEqual(test6.bmiFormatted, "44.98", "test 6 BMI");
assertEqual(test6.category, "Béo phì độ III", "test 6 category");

// Test 7
assertEqual(validateBMIInput("", "").error, "Vui lòng nhập cân nặng và chiều cao.", "test 7 empty");

// Test 8
assertEqual(validateBMIInput("abc", "170").error, "Vui lòng nhập cân nặng hợp lệ.", "test 8 invalid weight");

// Test 9
assertEqual(validateBMIInput("70", "abc").error, "Vui lòng nhập chiều cao hợp lệ.", "test 9 invalid height");

// Test 10
assertEqual(validateBMIInput("-70", "170").error, "Vui lòng nhập cân nặng hợp lệ.", "test 10 negative weight");

// Additional checks
assertClose(calculateBMI(70, 170), 24.2215, "calculateBMI formula");
assertEqual(formatBMI(24.2215), "24.22", "formatBMI");
assertEqual(classifyBMI(18.49).label, "Thiếu cân", "boundary underweight");
assertEqual(classifyBMI(18.5).label, "Bình thường", "boundary normal");
assertEqual(classifyBMI(24.99).label, "Bình thường", "boundary normal upper");
assertEqual(classifyBMI(25).label, "Thừa cân", "boundary overweight");
assertEqual(validateBMIInput("70", "").error, "Vui lòng nhập chiều cao hợp lệ.", "empty height");
assertEqual(validateBMIInput("", "170").error, "Vui lòng nhập cân nặng hợp lệ.", "empty weight");

// Scale bar alignment with WHO thresholds on 15–45 axis
assertClose(getBmiScalePosition(18.5), getBmiScaleSegmentWidth(15, 18.5), "underweight/normal boundary");
assertClose(getBmiScalePosition(25), getBmiScaleSegmentWidth(15, 25), "normal/overweight boundary");
assertClose(getBmiScalePosition(30), getBmiScaleSegmentWidth(15, 30), "overweight/obese boundary");
assertClose(getBmiScalePosition(27.1), 40.33, "overweight BMI 27.1 position", 0.05);

console.log(`\nbmi-calculator self-test: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
