import type { FocalPoint } from "@/lib/images/crop-with-focal-point";

export const DEFAULT_FOCAL_POINT: FocalPoint = { x: 0.5, y: 0.5 };

export function clampFocalValue(value: number) {
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  return Math.min(1, Math.max(0, value));
}

export function normalizeFocalPoint(focal: FocalPoint): FocalPoint {
  return {
    x: clampFocalValue(focal.x),
    y: clampFocalValue(focal.y)
  };
}

export function parseFocalPointFromFormData(formData: FormData): FocalPoint {
  const rawX = formData.get("focalX");
  const rawY = formData.get("focalY");

  if (rawX == null && rawY == null) {
    return DEFAULT_FOCAL_POINT;
  }

  return normalizeFocalPoint({
    x: rawX != null ? Number(rawX) : 0.5,
    y: rawY != null ? Number(rawY) : 0.5
  });
}

export function focalToObjectPosition(focal: FocalPoint) {
  const normalized = normalizeFocalPoint(focal);
  return `${normalized.x * 100}% ${normalized.y * 100}%`;
}
