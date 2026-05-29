/** VND — làm tròn số nguyên theo chính sách ChapMee. */
export function roundVnd(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}
