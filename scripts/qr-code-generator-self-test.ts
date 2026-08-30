/**
 * Self-test for QR code generator utility.
 * Run: npm run test:qr-code-generator
 */

import {
  buildQRContent,
  buildVCardQR,
  buildWifiQR,
  cleanPhoneNumber,
  EMPTY_QR_FORM_DATA,
  isValidEmail,
  isValidUrl,
  normalizeUrl,
  type QRFormData
} from "../lib/utilities/qr-code-generator";

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

function assertBuild(
  type: Parameters<typeof buildQRContent>[0],
  data: Partial<QRFormData>,
  expected: { content?: string; error?: string; warning?: string },
  label: string
) {
  const form: QRFormData = { ...EMPTY_QR_FORM_DATA, ...data };
  const result = buildQRContent(type, form);

  if (expected.content !== undefined) {
    assertEqual(result.content, expected.content, `${label} → content`);
  }
  if (expected.error !== undefined) {
    assertEqual(result.error, expected.error, `${label} → error`);
  }
  if (expected.warning !== undefined) {
    assertEqual(result.warning, expected.warning, `${label} → warning`);
  }
}

assertEqual(normalizeUrl("https://example.com"), "https://example.com", "normalizeUrl full");
assertEqual(normalizeUrl("example.com"), "https://example.com", "normalizeUrl missing scheme");
assertEqual(isValidUrl("https://example.com"), true, "isValidUrl full");
assertEqual(isValidUrl("example.com"), true, "isValidUrl bare domain");
assertEqual(isValidUrl("www.example.com"), true, "isValidUrl www");
assertEqual(isValidEmail("contact@example.com"), true, "isValidEmail valid");
assertEqual(isValidEmail("invalid"), false, "isValidEmail invalid");
assertEqual(cleanPhoneNumber("090 123 4567"), "0901234567", "cleanPhoneNumber spaces");
assertEqual(cleanPhoneNumber("+84 901 234 567"), "+84901234567", "cleanPhoneNumber plus");

assertBuild(
  "url",
  { url: "https://example.com" },
  { content: "https://example.com" },
  "Test 1: URL đầy đủ"
);

assertBuild(
  "url",
  { url: "example.com" },
  { content: "https://example.com" },
  "Test 2: URL thiếu https"
);

assertBuild(
  "text",
  { text: "Xin chào Việt Nam" },
  { content: "Xin chào Việt Nam" },
  "Test 3: Văn bản tiếng Việt"
);

assertBuild(
  "phone",
  { phone: "090 123 4567" },
  { content: "tel:0901234567" },
  "Test 4: Điện thoại"
);

assertBuild(
  "email",
  { email: "contact@example.com" },
  { content: "mailto:contact@example.com" },
  "Test 5: Email"
);

assertBuild(
  "sms",
  { smsPhone: "0901234567", smsBody: "Xin chào" },
  { content: "sms:0901234567?body=Xin+ch%C3%A0o" },
  "Test 6: SMS"
);

assertEqual(
  buildWifiQR({
    ssid: "MyHomeWiFi",
    password: "12345678",
    encryption: "WPA",
    hidden: false
  }),
  "WIFI:T:WPA;S:MyHomeWiFi;P:12345678;H:false;;",
  "Test 7: WiFi có mật khẩu"
);

assertEqual(
  buildWifiQR({
    ssid: "FreeWifi",
    encryption: "nopass",
    hidden: false
  }),
  "WIFI:T:nopass;S:FreeWifi;P:;H:false;;",
  "Test 8: WiFi không mật khẩu"
);

assertEqual(
  buildVCardQR({
    fullName: "Nguyễn Văn A",
    phone: "0901234567",
    email: "contact@example.com",
    website: "https://example.com"
  }),
  [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Nguyễn Văn A",
    "TEL:0901234567",
    "EMAIL:contact@example.com",
    "URL:https://example.com",
    "END:VCARD"
  ].join("\n"),
  "Test 9: Danh thiếp"
);

assertBuild(
  "url",
  { url: "" },
  { content: "", error: "Vui lòng nhập nội dung cần tạo mã QR." },
  "Test 10: Input rỗng"
);

console.log(`\nqr-code-generator self-test: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
