/**
 * Self-test for TDEE calculator utility.
 * Run: npm run test:tdee-calculator
 */

import {
  calculateBMR,
  calculateCaloriesByGoal,
  calculateGoalCalories,
  calculateMacros,
  calculateTDEE,
  classifyBMI,
  formatCalories,
  generateTDEEResult,
  getActivityMultiplier,
  LOW_CALORIE_WARNING,
  validateTDEEInput
} from "../lib/utilities/tdee-calculator";
import { calculateBMI } from "../lib/utilities/bmi-calculator";

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

function assertClose(actual: number, expected: number, label: string, tolerance = 1) {
  if (Math.abs(actual - expected) <= tolerance) {
    passed += 1;
    return;
  }

  failed += 1;
  console.error(`FAIL: ${label}`);
  console.error(`  expected: ${expected}`);
  console.error(`  actual:   ${actual}`);
}

function assertIncludes(actual: string[], expected: string, label: string) {
  if (actual.includes(expected)) {
    passed += 1;
    return;
  }

  failed += 1;
  console.error(`FAIL: ${label}`);
  console.error(`  expected warnings to include: ${expected}`);
  console.error(`  actual:   ${JSON.stringify(actual)}`);
}

// Test 1: Nam, vận động nhẹ
const test1 = generateTDEEResult({
  gender: "male",
  age: 25,
  heightCm: 170,
  weightKg: 70,
  activityLevel: "light",
  goal: "maintain"
});
assertEqual(formatCalories(test1.bmr), "1.643", "test 1 BMR formatted");
assertEqual(formatCalories(test1.tdee), "2.259", "test 1 TDEE formatted");
assertEqual(formatCalories(test1.calories.maintain), "2.259", "test 1 maintain calories");

// Test 2: Nữ, vận động nhẹ
const test2 = generateTDEEResult({
  gender: "female",
  age: 25,
  heightCm: 160,
  weightKg: 55,
  activityLevel: "light",
  goal: "maintain"
});
assertEqual(formatCalories(test2.bmr), "1.264", "test 2 BMR formatted");
assertEqual(formatCalories(test2.tdee), "1.738", "test 2 TDEE formatted");

// Test 3: Giảm cân vừa
assertEqual(calculateGoalCalories(2259, "moderate_loss"), 1759, "test 3 moderate loss");
assertEqual(formatCalories(test1.calories.moderateLoss), "1.759", "test 3 moderate loss formatted");

// Test 4: Tăng cân nhẹ
assertEqual(calculateGoalCalories(2259, "mild_gain"), 2509, "test 4 mild gain");
assertEqual(formatCalories(test1.calories.mildGain), "2.509", "test 4 mild gain formatted");

// Test 5: Macro cân bằng
const macros = calculateMacros(2000, "balanced");
assertEqual(macros.proteinGrams, 150, "test 5 protein grams");
assertEqual(macros.carbsGrams, 200, "test 5 carb grams");
assertEqual(macros.fatGrams, 67, "test 5 fat grams");

// Test 6: BMI
assertClose(calculateBMI(70, 170), 24.22, "test 6 BMI value", 0.01);
assertEqual(classifyBMI(24.22), "Bình thường", "test 6 BMI classification");

// Test 7: Input rỗng
assertEqual(
  validateTDEEInput({ gender: "male", age: "", heightCm: "", weightKg: "", activityLevel: "light" }).error,
  "Vui lòng nhập đầy đủ thông tin cần tính TDEE.",
  "test 7 empty input"
);

// Test 8: Tuổi sai
assertEqual(
  validateTDEEInput({
    gender: "male",
    age: "abc",
    heightCm: "170",
    weightKg: "70",
    activityLevel: "light"
  }).error,
  "Vui lòng nhập tuổi hợp lệ.",
  "test 8 invalid age"
);

// Test 9: Chiều cao sai
assertEqual(
  validateTDEEInput({
    gender: "male",
    age: "25",
    heightCm: "-170",
    weightKg: "70",
    activityLevel: "light"
  }).error,
  "Vui lòng nhập chiều cao hợp lệ.",
  "test 9 invalid height"
);

// Test 10: Calo quá thấp
assertEqual(calculateGoalCalories(1500, "moderate_loss"), 1000, "test 10 target calories from TDEE 1500");
const test10 = generateTDEEResult({
  gender: "female",
  age: 25,
  heightCm: 160,
  weightKg: 55,
  activityLevel: "sedentary",
  goal: "moderate_loss"
});
assertIncludes(test10.warnings, LOW_CALORIE_WARNING, "test 10 low calorie warning");

// Additional checks
assertClose(calculateBMR({ gender: "male", age: 25, heightCm: 170, weightKg: 70 }), 1642.5, "BMR formula", 0.01);
assertEqual(getActivityMultiplier("light"), 1.375, "activity multiplier light");
assertEqual(calculateTDEE(1642.5, 1.375), 2259, "TDEE calculation");
assertEqual(
  calculateCaloriesByGoal(2259).moderateLoss,
  1759,
  "calculateCaloriesByGoal moderate loss"
);
assertEqual(
  validateTDEEInput({ gender: "", age: "25", heightCm: "170", weightKg: "70", activityLevel: "light" }).error,
  "Vui lòng chọn giới tính.",
  "missing gender"
);
assertEqual(
  validateTDEEInput({
    gender: "male",
    age: "25",
    heightCm: "170",
    weightKg: "70",
    activityLevel: ""
  }).error,
  "Vui lòng chọn mức độ vận động.",
  "missing activity"
);

console.log(`\ntdee-calculator self-test: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
