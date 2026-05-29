/** Mask account number — chỉ giữ 4 ký tự cuối. */
export function maskAccountNumber(value: string): string {
  const digits = value.replace(/\s/g, "");
  if (digits.length <= 4) {
    return `****${digits}`;
  }
  return `****${digits.slice(-4)}`;
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) {
    return `****${digits}`;
  }
  return `****${digits.slice(-4)}`;
}
