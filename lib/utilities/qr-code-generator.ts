export type QRType =
  | "url"
  | "text"
  | "phone"
  | "email"
  | "sms"
  | "wifi"
  | "vcard"
  | "custom";

export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export interface QRStyleOptions {
  size: number;
  foregroundColor: string;
  backgroundColor: string;
  errorCorrectionLevel: ErrorCorrectionLevel;
}

export interface QRBuildResult {
  content: string;
  error?: string;
  warning?: string;
}

export interface WifiQRData {
  ssid: string;
  password?: string;
  encryption: "WPA" | "WEP" | "nopass";
  hidden: boolean;
}

export interface VCardQRData {
  fullName: string;
  phone?: string;
  email?: string;
  company?: string;
  title?: string;
  website?: string;
  address?: string;
  note?: string;
}

export interface EmailQRData {
  email: string;
  subject?: string;
  body?: string;
}

export interface SmsQRData {
  phone: string;
  body?: string;
}

export type QRFormData = {
  url: string;
  text: string;
  phone: string;
  email: string;
  emailSubject: string;
  emailBody: string;
  smsPhone: string;
  smsBody: string;
  wifiSsid: string;
  wifiPassword: string;
  wifiEncryption: WifiQRData["encryption"];
  wifiHidden: boolean;
  vcardFullName: string;
  vcardPhone: string;
  vcardEmail: string;
  vcardCompany: string;
  vcardTitle: string;
  vcardWebsite: string;
  vcardAddress: string;
  vcardNote: string;
  custom: string;
};

export const QR_TYPE_LABELS: Record<QRType, string> = {
  url: "Liên kết website",
  text: "Văn bản",
  phone: "Số điện thoại",
  email: "Email",
  sms: "Tin nhắn SMS",
  wifi: "WiFi",
  vcard: "Danh thiếp",
  custom: "Tùy chỉnh"
};

export const QR_SIZE_OPTIONS = [256, 512, 1024] as const;

export const ERROR_CORRECTION_OPTIONS: {
  value: ErrorCorrectionLevel;
  label: string;
}[] = [
  { value: "L", label: "Thấp" },
  { value: "M", label: "Trung bình" },
  { value: "Q", label: "Cao" },
  { value: "H", label: "Rất cao" }
];

export const DEFAULT_QR_STYLE: QRStyleOptions = {
  size: 512,
  foregroundColor: "#000000",
  backgroundColor: "#FFFFFF",
  errorCorrectionLevel: "M"
};

export const TEXT_LENGTH_WARNING_THRESHOLD = 500;

export const EMPTY_QR_FORM_DATA: QRFormData = {
  url: "",
  text: "",
  phone: "",
  email: "",
  emailSubject: "",
  emailBody: "",
  smsPhone: "",
  smsBody: "",
  wifiSsid: "",
  wifiPassword: "",
  wifiEncryption: "WPA",
  wifiHidden: false,
  vcardFullName: "",
  vcardPhone: "",
  vcardEmail: "",
  vcardCompany: "",
  vcardTitle: "",
  vcardWebsite: "",
  vcardAddress: "",
  vcardNote: "",
  custom: ""
};

const EMPTY_CONTENT_ERROR = "Vui lòng nhập nội dung cần tạo mã QR.";
const INVALID_URL_ERROR = "Vui lòng nhập liên kết hợp lệ.";
const INVALID_EMAIL_ERROR = "Vui lòng nhập email hợp lệ.";
const WIFI_SSID_ERROR = "Vui lòng nhập tên WiFi.";
const WIFI_PASSWORD_ERROR = "Vui lòng nhập mật khẩu WiFi.";
const VCARD_NAME_ERROR = "Vui lòng nhập họ tên.";
const TEXT_TOO_LONG_WARNING =
  "Nội dung quá dài có thể làm mã QR khó quét. Hãy rút gọn nội dung nếu cần.";
const COLOR_CONTRAST_WARNING =
  "Màu mã QR và màu nền quá giống nhau, có thể khó quét.";

/** Normalize URL — prepend https:// when scheme is missing. */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

/** Basic URL validation after normalization. */
export function isValidUrl(input: string): boolean {
  const normalized = normalizeUrl(input);
  if (!normalized) return false;

  try {
    const url = new URL(normalized);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Basic email format check. */
export function isValidEmail(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/** Keep digits and leading + for phone numbers. */
export function cleanPhoneNumber(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

function escapeWifiValue(value: string): string {
  return value.replace(/([\\;,"':])/g, "\\$1");
}

/** Build WiFi QR payload per ZXing spec. */
export function buildWifiQR(data: WifiQRData): string {
  const encryption = data.encryption;
  const password = encryption === "nopass" ? "" : (data.password ?? "");
  const hidden = data.hidden ? "true" : "false";

  return `WIFI:T:${encryption};S:${escapeWifiValue(data.ssid)};P:${escapeWifiValue(password)};H:${hidden};;`;
}

function escapeVCardValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

/** Build vCard 3.0 payload — omit empty optional fields. */
export function buildVCardQR(data: VCardQRData): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${escapeVCardValue(data.fullName)}`];

  if (data.company?.trim()) {
    lines.push(`ORG:${escapeVCardValue(data.company.trim())}`);
  }
  if (data.title?.trim()) {
    lines.push(`TITLE:${escapeVCardValue(data.title.trim())}`);
  }
  if (data.phone?.trim()) {
    lines.push(`TEL:${cleanPhoneNumber(data.phone)}`);
  }
  if (data.email?.trim()) {
    lines.push(`EMAIL:${data.email.trim()}`);
  }
  if (data.website?.trim()) {
    const website = normalizeUrl(data.website.trim());
    lines.push(`URL:${website}`);
  }
  if (data.address?.trim()) {
    lines.push(`ADR:;;${escapeVCardValue(data.address.trim())}`);
  }
  if (data.note?.trim()) {
    lines.push(`NOTE:${escapeVCardValue(data.note.trim())}`);
  }

  lines.push("END:VCARD");
  return lines.join("\n");
}

function buildEmailQR(data: EmailQRData): string {
  const email = data.email.trim();
  const params = new URLSearchParams();

  if (data.subject?.trim()) {
    params.set("subject", data.subject.trim());
  }
  if (data.body?.trim()) {
    params.set("body", data.body.trim());
  }

  const query = params.toString();
  return query ? `mailto:${email}?${query}` : `mailto:${email}`;
}

function buildSmsQR(data: SmsQRData): string {
  const phone = cleanPhoneNumber(data.phone);
  if (!data.body?.trim()) {
    return `sms:${phone}`;
  }

  const params = new URLSearchParams();
  params.set("body", data.body.trim());
  return `sms:${phone}?${params.toString()}`;
}

function appendWarnings(result: QRBuildResult, warnings: string[]): QRBuildResult {
  if (warnings.length === 0) return result;
  const warning = warnings.join(" ");
  return result.warning ? { ...result, warning: `${result.warning} ${warning}` } : { ...result, warning };
}

/** Relative luminance for sRGB hex color (0–1). */
function getLuminance(hex: string): number {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return 0.5;

  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const toLinear = (channel: number) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

  const rl = toLinear(r);
  const gl = toLinear(g);
  const bl = toLinear(b);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/** Warn when foreground/background colors are too similar for scanning. */
export function getColorContrastWarning(
  foregroundColor: string,
  backgroundColor: string
): string | undefined {
  const fg = getLuminance(foregroundColor);
  const bg = getLuminance(backgroundColor);
  const contrast = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);

  if (contrast < 2.5) {
    return COLOR_CONTRAST_WARNING;
  }

  return undefined;
}

/** Build encoded QR content for the given type and form data. */
export function buildQRContent(type: QRType, data: QRFormData): QRBuildResult {
  const warnings: string[] = [];

  switch (type) {
    case "url": {
      const raw = data.url.trim();
      if (!raw) return { content: "", error: EMPTY_CONTENT_ERROR };

      const normalized = normalizeUrl(raw);
      if (!isValidUrl(raw)) {
        return { content: "", error: INVALID_URL_ERROR };
      }

      return { content: normalized };
    }

    case "text": {
      const text = data.text;
      if (!text.trim()) return { content: "", error: EMPTY_CONTENT_ERROR };

      const result: QRBuildResult = { content: text };
      if (text.length > TEXT_LENGTH_WARNING_THRESHOLD) {
        return appendWarnings(result, [TEXT_TOO_LONG_WARNING]);
      }
      return result;
    }

    case "phone": {
      const phone = cleanPhoneNumber(data.phone);
      if (!phone) return { content: "", error: EMPTY_CONTENT_ERROR };
      return { content: `tel:${phone}` };
    }

    case "email": {
      const email = data.email.trim();
      if (!email) return { content: "", error: EMPTY_CONTENT_ERROR };
      if (!isValidEmail(email)) return { content: "", error: INVALID_EMAIL_ERROR };
      return { content: buildEmailQR(data) };
    }

    case "sms": {
      const phone = cleanPhoneNumber(data.smsPhone);
      if (!phone) return { content: "", error: EMPTY_CONTENT_ERROR };
      return { content: buildSmsQR({ phone: data.smsPhone, body: data.smsBody }) };
    }

    case "wifi": {
      const ssid = data.wifiSsid.trim();
      if (!ssid) return { content: "", error: WIFI_SSID_ERROR };

      if (data.wifiEncryption !== "nopass" && !data.wifiPassword.trim()) {
        return { content: "", error: WIFI_PASSWORD_ERROR };
      }

      return {
        content: buildWifiQR({
          ssid,
          password: data.wifiPassword,
          encryption: data.wifiEncryption,
          hidden: data.wifiHidden
        })
      };
    }

    case "vcard": {
      const fullName = data.vcardFullName.trim();
      if (!fullName) return { content: "", error: VCARD_NAME_ERROR };

      return {
        content: buildVCardQR({
          fullName,
          phone: data.vcardPhone,
          email: data.vcardEmail,
          company: data.vcardCompany,
          title: data.vcardTitle,
          website: data.vcardWebsite,
          address: data.vcardAddress,
          note: data.vcardNote
        })
      };
    }

    case "custom": {
      const custom = data.custom;
      if (!custom.trim()) return { content: "", error: EMPTY_CONTENT_ERROR };

      const result: QRBuildResult = { content: custom };
      if (custom.length > TEXT_LENGTH_WARNING_THRESHOLD) {
        return appendWarnings(result, [TEXT_TOO_LONG_WARNING]);
      }
      return result;
    }

    default:
      return { content: "", error: EMPTY_CONTENT_ERROR };
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
