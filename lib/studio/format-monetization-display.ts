export function formatMonetizationVnd(value: number) {
  return `${Math.max(0, value).toLocaleString("vi-VN")} ₫`;
}

export function formatMonetizationCoin(value: number, coinName: string) {
  return `${Math.max(0, value).toLocaleString("vi-VN")} ${coinName}`;
}

export function formatMonetizationVndReference(value: number, coinName: string, rateVnd: number) {
  if (!rateVnd || rateVnd <= 0) {
    return null;
  }

  const vnd = Math.round(value * rateVnd);
  return `≈ ${formatMonetizationVnd(vnd)} (tham khảo, 1 ${coinName} = ${rateVnd.toLocaleString("vi-VN")} ₫)`;
}
