export function formatAdRevenueVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Math.round(value));
}

export function formatAdRevenueNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function formatAdRevenueDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}
