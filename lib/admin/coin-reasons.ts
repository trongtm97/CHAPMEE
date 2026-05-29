import type { AdminCoinReasonCode, BulkCoinReasonCode } from "@/types/coins";

export const ADMIN_COIN_REASON_OPTIONS: Array<{
  code: AdminCoinReasonCode;
  label: string;
}> = [
  { code: "boi_hoan_loi_he_thong", label: "Bồi hoàn lỗi hệ thống" },
  { code: "boi_hoan_thanh_toan", label: "Bồi hoàn thanh toán" },
  { code: "khuyen_mai", label: "Khuyến mãi" },
  { code: "thuong_su_kien", label: "Thưởng sự kiện" },
  { code: "cham_soc_khach_hang", label: "Chăm sóc khách hàng" },
  { code: "thu_hoi_gian_lan", label: "Thu hồi do gian lận" },
  { code: "dieu_chinh_sai_lech", label: "Điều chỉnh sai lệch" },
  { code: "test_noi_bo", label: "Test nội bộ" },
  { code: "khac", label: "Khác" }
];

export const BULK_COIN_REASON_OPTIONS: Array<{
  code: BulkCoinReasonCode;
  label: string;
}> = [
  { code: "boi_hoan_loi_he_thong", label: "Bồi hoàn lỗi hệ thống" },
  { code: "boi_hoan_thanh_toan", label: "Bồi hoàn thanh toán" },
  { code: "khuyen_mai", label: "Khuyến mãi" },
  { code: "thuong_su_kien", label: "Thưởng sự kiện" },
  { code: "cham_soc_khach_hang", label: "Chăm sóc khách hàng" },
  { code: "thu_hoi_gian_lan", label: "Thu hồi do gian lận" },
  { code: "dieu_chinh_sai_lech", label: "Điều chỉnh sai lệch" },
  { code: "test_noi_bo", label: "Test nội bộ" },
  { code: "khac", label: "Khác" }
];

const REASON_LABEL_BY_CODE = new Map<string, string>(
  [
    ...ADMIN_COIN_REASON_OPTIONS.map((item) => [item.code, item.label] as const),
    ...BULK_COIN_REASON_OPTIONS.map((item) => [item.code, item.label] as const),
    ["phat_thu_hoi", "Thu hồi (mã cũ)"] as const
  ]
);

export function formatAdminCoinReason(code: string | null | undefined, fallback?: string) {
  if (!code) return fallback ?? "—";
  return REASON_LABEL_BY_CODE.get(code) ?? code;
}

export function buildAdminCoinReasonText(code: AdminCoinReasonCode, customNote?: string) {
  const label = formatAdminCoinReason(code);
  if (code === "khac" && customNote?.trim()) {
    return `${label}: ${customNote.trim()}`;
  }
  return label;
}

export function isValidBulkReasonCode(code: string): code is BulkCoinReasonCode {
  return BULK_COIN_REASON_OPTIONS.some((item) => item.code === code);
}

export function isValidFormReasonCode(code: string): code is AdminCoinReasonCode {
  return ADMIN_COIN_REASON_OPTIONS.some((item) => item.code === code);
}
