/**
 * Thần số học (numerology) cho scoring engine.
 * Pure functions, không phụ thuộc DOM/network, deterministic.
 *
 * Quy ước:
 *  - Input tên phải được normalize trước (UPPERCASE, A-Z + space).
 *  - Input ngày sinh là chuỗi ISO YYYY-MM-DD.
 *  - Mọi hàm trả về { rawSum, number, explanation }.
 *  - KHÔNG tính điểm tương hợp ở file này — chỉ tính chỉ số.
 */

export interface NumerologyResult {
  rawSum: number;
  number: number;
  explanation: string;
}

// =============================================================================
// Letter maps
// =============================================================================

const PYTHAGOREAN_MAP: Record<string, number> = {
  A: 1, J: 1, S: 1,
  B: 2, K: 2, T: 2,
  C: 3, L: 3, U: 3,
  D: 4, M: 4, V: 4,
  E: 5, N: 5, W: 5,
  F: 6, O: 6, X: 6,
  G: 7, P: 7, Y: 7,
  H: 8, Q: 8, Z: 8,
  I: 9, R: 9,
};

const CHALDEAN_MAP: Record<string, number> = {
  A: 1, I: 1, J: 1, Q: 1, Y: 1,
  B: 2, K: 2, R: 2,
  C: 3, G: 3, L: 3, S: 3,
  D: 4, M: 4, T: 4,
  E: 5, H: 5, N: 5, X: 5,
  U: 6, V: 6, W: 6,
  O: 7, Z: 7,
  F: 8, P: 8,
};

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U', 'Y']);

const MASTER_NUMBERS = new Set([11, 22, 33]);

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// =============================================================================
// Love meaning table (1..9, 11, 22, 33)
// =============================================================================

const LOVE_MEANING: Record<number, string> = {
  1: 'chủ động, dẫn dắt mối quan hệ',
  2: 'hoà giải, đồng điệu cảm xúc',
  3: 'vui tươi, sáng tạo trong tình yêu',
  4: 'ổn định, xây nền tảng vững chắc',
  5: 'tự do, phiêu lưu cùng người ấy',
  6: 'yêu thương, chăm sóc gia đình',
  7: 'chiêm nghiệm, tìm hiểu chiều sâu',
  8: 'mạnh mẽ, cùng nhau thành đạt',
  9: 'nhân ái, bao dung và tha thứ',
  11: 'trực giác mạnh, kết nối tâm linh',
  22: 'kiến tạo một tình yêu lớn',
  33: 'chữa lành, hy sinh vì người mình yêu',
};

function describe(n: number): string {
  return LOVE_MEANING[n] ?? 'cân bằng, dung hoà giữa hai người';
}

// =============================================================================
// Internals
// =============================================================================

function sumByMap(name: string, map: Record<string, number>): number {
  if (typeof name !== 'string') return 0;
  let sum = 0;
  for (const ch of name.toUpperCase()) {
    const v = map[ch];
    if (typeof v === 'number') sum += v;
  }
  return sum;
}

function parseDobParts(dob: string): { year: number; month: number; day: number } | null {
  if (typeof dob !== 'string') return null;
  const match = ISO_DATE_RE.exec(dob.trim());
  if (!match) return null;
  const yearStr = match[1];
  const monthStr = match[2];
  const dayStr = match[3];
  if (!yearStr || !monthStr || !dayStr) return null;

  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;

  return { year: Number(yearStr), month, day };
}

function sumDigits(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  let v = Math.trunc(n);
  let s = 0;
  while (v > 0) {
    s += v % 10;
    v = Math.trunc(v / 10);
  }
  return s;
}

function invalidResult(message = 'Ngày sinh không hợp lệ.'): NumerologyResult {
  return { rawSum: 0, number: 0, explanation: message };
}

// =============================================================================
// 1. reduceNumber
// =============================================================================

/**
 * Cộng chữ số cho đến khi còn 1 chữ số.
 * Nếu keepMaster = true, dừng lại ở 11, 22, 33 (master numbers).
 */
export function reduceNumber(n: number, keepMaster = false): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  let value = Math.trunc(n);
  if (value <= 9) return value;

  while (value >= 10) {
    if (keepMaster && MASTER_NUMBERS.has(value)) return value;
    value = sumDigits(value);
    if (value <= 9) return value;
  }
  return value;
}

// =============================================================================
// 2. calculatePythagoreanName
// =============================================================================

/**
 * Tính chỉ số tên theo hệ Pythagorean — phản ánh năng lượng tổng thể
 * mà tên toả ra trong mắt người khác.
 */
export function calculatePythagoreanName(normalizedName: string): NumerologyResult {
  const rawSum = sumByMap(normalizedName, PYTHAGOREAN_MAP);
  const number = reduceNumber(rawSum, true);
  return {
    rawSum,
    number,
    explanation: `Chỉ số Pythagorean ${number} (Expression Number) phản ánh cách tên bạn toả ra năng lượng tổng thể — trong tình yêu, đó là ${describe(number)}.`,
  };
}

// =============================================================================
// 3. calculateChaldeanName
// =============================================================================

/**
 * Tính chỉ số tên theo hệ Chaldean — hệ cổ xưa, dùng để soi
 * rung động tên trước khi quyết định một mối quan hệ.
 */
export function calculateChaldeanName(normalizedName: string): NumerologyResult {
  const rawSum = sumByMap(normalizedName, CHALDEAN_MAP);
  const number = reduceNumber(rawSum, true);
  return {
    rawSum,
    number,
    explanation: `Chỉ số Chaldean ${number} theo truyền thống cổ xưa phản ánh rung động tên — trong tình yêu, bạn toả ra ${describe(number)}.`,
  };
}

// =============================================================================
// 4. calculateSoulUrge
// =============================================================================

/**
 * Tính từ các nguyên âm (A, E, I, O, U, Y). Cho biết khát vọng sâu thẳm
 * trong tình yêu — điều bạn thật sự khao khát ở một mối quan hệ.
 */
export function calculateSoulUrge(normalizedName: string): NumerologyResult {
  if (typeof normalizedName !== 'string') return invalidResult('Tên không hợp lệ.');
  let sum = 0;
  for (const ch of normalizedName.toUpperCase()) {
    if (VOWELS.has(ch)) {
      const v = PYTHAGOREAN_MAP[ch];
      if (typeof v === 'number') sum += v;
    }
  }
  const number = reduceNumber(sum, true);
  return {
    rawSum: sum,
    number,
    explanation: `Soul Urge ${number} (Desire Number) tiết lộ khát vọng sâu thẳm — trong tình yêu, bạn khao khát được ${describe(number)}.`,
  };
}

// =============================================================================
// 5. calculatePersonalityNumber
// =============================================================================

/**
 * Tính từ các phụ âm. Cho biết ấn tượng đầu tiên mà bạn tạo ra —
 * cách người ấy "đọc" bạn trong vài giây đầu gặp mặt.
 */
export function calculatePersonalityNumber(normalizedName: string): NumerologyResult {
  if (typeof normalizedName !== 'string') return invalidResult('Tên không hợp lệ.');
  let sum = 0;
  for (const ch of normalizedName.toUpperCase()) {
    if (ch < 'A' || ch > 'Z') continue;
    if (VOWELS.has(ch)) continue;
    const v = PYTHAGOREAN_MAP[ch];
    if (typeof v === 'number') sum += v;
  }
  const number = reduceNumber(sum, true);
  return {
    rawSum: sum,
    number,
    explanation: `Personality Number ${number} là lớp vỏ bên ngoài — ấn tượng đầu tiên bạn tạo ra là ${describe(number)}.`,
  };
}

// =============================================================================
// 6. calculateGivenNameNumber
// =============================================================================

/**
 * Tính chỉ số Pythagorean cho riêng tên (given name) — bản sắc cá nhân,
 * không gồm họ. Thường dùng kết hợp với full name để phân biệt
 * "mình trong gia đình" và "mình trước thế giới".
 */
export function calculateGivenNameNumber(givenName: string): NumerologyResult {
  const rawSum = sumByMap(givenName, PYTHAGOREAN_MAP);
  const number = reduceNumber(rawSum, true);
  return {
    rawSum,
    number,
    explanation: `Given Name Number ${number} là bản sắc riêng của tên — trong tình yêu, bạn thể hiện mình là ${describe(number)}.`,
  };
}

// =============================================================================
// 7. calculateLifePath
// =============================================================================

/**
 * Tính từ tất cả chữ số trong YYYY-MM-DD, có giữ master number.
 * Ví dụ: 1998-06-16 → 1+9+9+8+0+6+1+6 = 40 → 4.
 */
export function calculateLifePath(dob: string): NumerologyResult {
  const parts = parseDobParts(dob);
  if (!parts) return invalidResult();
  const rawSum = sumDigits(parts.year) + sumDigits(parts.month) + sumDigits(parts.day);
  const number = reduceNumber(rawSum, true);
  return {
    rawSum,
    number,
    explanation: `Life Path ${number} là con đường đời — trong tình yêu, bạn hướng tới ${describe(number)}.`,
  };
}

// =============================================================================
// 8. calculateBirthdayNumber
// =============================================================================

/**
 * Tính từ ngày trong tháng. Ngày 16 → 1+6 = 7. Đây là "món quà"
 * bạn mang theo từ lúc chào đời, không thay đổi.
 */
export function calculateBirthdayNumber(dob: string): NumerologyResult {
  const parts = parseDobParts(dob);
  if (!parts) return invalidResult();
  const rawSum = sumDigits(parts.day);
  const number = reduceNumber(rawSum, true);
  return {
    rawSum,
    number,
    explanation: `Birthday Number ${number} là món quà bẩm sinh — nó tô điểm cho tình yêu của bạn bằng ${describe(number)}.`,
  };
}

// =============================================================================
// 9. calculateAttitudeNumber
// =============================================================================

/**
 * Tính từ ngày + tháng. Ví dụ 16/06 → 1+6+0+6 = 13 → 4.
 * Cho biết cách bạn đối diện thế giới bên ngoài — và cả cách bạn
 * "bước vào" một mối quan hệ mới.
 */
export function calculateAttitudeNumber(dob: string): NumerologyResult {
  const parts = parseDobParts(dob);
  if (!parts) return invalidResult();
  const rawSum = sumDigits(parts.day) + sumDigits(parts.month);
  const number = reduceNumber(rawSum, true);
  return {
    rawSum,
    number,
    explanation: `Attitude Number ${number} là cách bạn đối diện thế giới — đặc biệt trong hẹn hò, bạn thể hiện ${describe(number)}.`,
  };
}

// =============================================================================
// 10. calculatePersonalYear
// =============================================================================

/**
 * Tính từ ngày + tháng + năm hiện tại. Ví dụ 16/06 và năm 2025
 * → 1+6+0+6+2+0+2+5 = 22 (giữ master). Đổi mỗi năm.
 */
export function calculatePersonalYear(dob: string, currentYear: number): NumerologyResult {
  const parts = parseDobParts(dob);
  if (!parts) return invalidResult();
  if (!Number.isInteger(currentYear) || currentYear < 1) {
    return invalidResult('Năm hiện tại không hợp lệ.');
  }
  const rawSum = sumDigits(parts.day) + sumDigits(parts.month) + sumDigits(currentYear);
  const number = reduceNumber(rawSum, true);
  return {
    rawSum,
    number,
    explanation: `Năm cá nhân ${currentYear} mang chỉ số ${number} — đây là chủ đề tình yêu bạn sẽ đi qua trong 12 tháng tới: ${describe(number)}.`,
  };
}
