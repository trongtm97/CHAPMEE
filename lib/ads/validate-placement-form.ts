import type { AdPlacementFormInput } from "@/types/ads";

const KEY_RE = /^[a-z0-9_]+$/;

export type PlacementFormValidation = {
  ok: boolean;
  errors: Record<string, string>;
  warnings: string[];
  needsReelsLiveConfirm: boolean;
};

export function slugifyPlacementKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .slice(0, 64);
}

export function validatePlacementForm(
  input: AdPlacementFormInput,
  options?: { isEdit?: boolean }
): PlacementFormValidation {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];
  let needsReelsLiveConfirm = false;

  const key = input.placement_key?.trim() ?? "";
  if (!key) {
    errors.placement_key = "Key placement là bắt buộc.";
  } else if (!KEY_RE.test(key)) {
    errors.placement_key = "Key chỉ gồm chữ thường, số và gạch dưới.";
  }

  if (!input.name?.trim()) {
    errors.name = "Tên placement là bắt buộc.";
  }
  if (!input.surface?.trim()) {
    errors.surface = "Surface là bắt buộc.";
  }
  if (!input.device) {
    errors.device = "Thiết bị là bắt buộc.";
  }
  if (!input.position) {
    errors.position = "Vị trí hiển thị là bắt buộc.";
  }
  if (!input.ad_format) {
    errors.ad_format = "Định dạng là bắt buộc.";
  }
  if (!input.size_mode) {
    errors.size_mode = "Chế độ kích thước là bắt buộc.";
  }

  const maxPage = input.max_per_page ?? 0;
  const maxChapter = input.max_ads_per_chapter ?? 0;
  const minDist = input.min_distance_px ?? 0;

  if (maxPage < 0) errors.max_per_page = "max_per_page phải ≥ 0.";
  if (maxChapter < 0) errors.max_ads_per_chapter = "max_ads_per_chapter phải ≥ 0.";
  if (minDist < 0) errors.min_distance_px = "min_distance_px phải ≥ 0.";

  const isLive = input.is_enabled && !input.is_test_mode;
  if (isLive) {
    if (!input.adsense_client_id?.trim()) {
      errors.adsense_client_id = "Client AdSense bắt buộc khi chạy live.";
    }
    if (!input.adsense_slot_id?.trim()) {
      errors.adsense_slot_id = "Slot AdSense bắt buộc khi chạy live.";
    }
  }

  if (input.sticky_allowed) {
    warnings.push("Sticky quảng cáo có thể ảnh hưởng trải nghiệm đọc — cân nhắc kỹ.");
  }

  if (
    key.includes("reels") &&
    isLive &&
    input.position === "between_items"
  ) {
    needsReelsLiveConfirm = true;
    warnings.push("Bật live quảng cáo giữa Reels — cần xác nhận vì dễ ảnh hưởng trải nghiệm.");
  }

  if (input.position === "mid_content" && (input.min_paragraphs_before ?? 0) < 4) {
    warnings.push("Nên đặt tối thiểu 4–6 đoạn trước quảng cáo giữa nội dung.");
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    warnings,
    needsReelsLiveConfirm
  };
}

export function maskAdSenseClient(clientId: string | null | undefined): string {
  if (!clientId?.trim()) return "—";
  const c = clientId.trim();
  if (c.length <= 8) return "••••";
  return `${c.slice(0, 6)}…${c.slice(-4)}`;
}
